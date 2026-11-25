const KG_PER_LB = 0.45359237;
const M_PER_FT = 0.3048;

const DEFAULT_DENSITIES = {
    'Carbon steel (TMT/Rebar)': 7850,
    'Mild steel': 7850,
    'Stainless steel': 8000,
    'Cast iron': 7200,
    'Aluminum (for comparison)': 2700,
    'Custom': 7850,
};

const REBAR_SIZES = [
    { name: '#3', dia_mm: 9.525, dia_in: 0.375 },
    { name: '#4', dia_mm: 12.7, dia_in: 0.5 },
    { name: '#5', dia_mm: 15.875, dia_in: 0.625 },
    { name: '#6', dia_mm: 19.05, dia_in: 0.75 },
    { name: '#7', dia_mm: 22.225, dia_in: 0.875 },
    { name: '#8', dia_mm: 25.4, dia_in: 1 },
    { name: '#9', dia_mm: 28.65, dia_in: 1.128 },
    { name: '#10', dia_mm: 32.26, dia_in: 1.27 },
    { name: '#11', dia_mm: 35.81, dia_in: 1.41 },
    { name: '#14', dia_mm: 43, dia_in: 1.693 },
    { name: '#18', dia_mm: 57.3, dia_in: 2.257 },
];

function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function lengthToMeters(v, units) {
    return units === 'metric' ? v : v * M_PER_FT;
}

function toMeters(v, units) {
    return units === 'metric' ? v / 1000 : v * 0.0254;
}

function areaM2(shape, dims, units) {
    const u = x => toMeters(toNumber(x), units);
    switch (shape) {
        case 'round': {
            const d = u(dims.d);
            return Math.PI * d * d / 4;
        }
        case 'pipe': {
            const od = u(dims.od);
            const t = u(dims.t);
            const id = Math.max(od - 2 * t, 0);
            return Math.PI * (od * od - id * id) / 4;
        }
        case 'square': {
            const a = u(dims.a);
            return a * a;
        }
        case 'rect': {
            const b = u(dims.b), h = u(dims.h);
            return b * h;
        }
        case 'hex': {
            const af = u(dims.af);
            const r = af / Math.sqrt(3);
            return (3 * Math.sqrt(3) / 2) * r * r;
        }
        case 'angle': {
            const b = u(dims.b), h = u(dims.h), t = u(dims.t);
            return Math.max(t * (b + h - t), 0);
        }
        case 'channel': {
            const h = u(dims.h), bf = u(dims.bf), tf = u(dims.tf), tw = u(dims.tw);
            return Math.max(tw * h + 2 * bf * tf, 0);
        }
        case 'ibeam': {
            const h = u(dims.h), bf = u(dims.bf), tf = u(dims.tf), tw = u(dims.tw);
            const webH = Math.max(h - 2 * tf, 0);
            return Math.max(tw * webH + 2 * bf * tf, 0);
        }
        default:
            return 0;
    }
}

const FT_PER_M = 1 / M_PER_FT;

function calcSection(sec) {
    const { units, shape, rebarMode, densityKey, customDensity, length, qty, dims } = sec;
    const density = densityKey === 'Custom' ? customDensity : DEFAULT_DENSITIES[densityKey];

    // Resolve rebar diameter if needed
    let dimsUsed = { ...dims };
    if (shape === 'round' && rebarMode === 'us') {
        const target = dims.rebar || '#4';
        const rb = REBAR_SIZES.find(r => r.name === target) || REBAR_SIZES[1];
        const dia_mm = units === 'metric' ? rb.dia_mm : rb.dia_in * 25.4;
        dimsUsed = { ...dimsUsed, d: dia_mm };
    }

    const A = areaM2(shape, dimsUsed, units);                // m²
    const perM = A * density;                                 // kg/m
    const perF = perM * FT_PER_M;                            // kg/ft
    const Lm = lengthToMeters(toNumber(length), units);
    const Wkg = perM * Lm * toNumber(qty, 1);

    return { A, perM, perF, Wkg };
}

const calculateSteelWeight = (req, res) => {
    try {
        const { sections } = req.body;

        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            return res.status(400).json({ error: 'Sections array is required and must not be empty' });
        }

        const sectionResults = sections.map(s => ({
            id: s.id || Date.now() + Math.random() * 10000,
            name: s.name || `Section ${sections.indexOf(s) + 1}`,
            ...calcSection(s),
        }));

        const totals = sectionResults.reduce((acc, r) => ({
            Wkg: acc.Wkg + r.Wkg,
        }), { Wkg: 0 });

        res.json({
            sectionResults,
            totals,
        });
    } catch (error) {
        console.error('Error calculating steel weight:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateSteelWeight };

