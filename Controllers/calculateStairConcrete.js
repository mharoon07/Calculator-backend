
// Helper function to convert feet-inches string to decimal feet
function feetInchesToDecimal(ftin) {
    if (typeof ftin === 'number') return ftin;
    if (!ftin || typeof ftin !== 'string') return 0;
    const str = ftin.trim();
    // Regex to handle 5'6", 5' 6", 5ft 6in, with support for standard (") and curly (”) quotes
    const match = str.match(/^([0-9.]+)'\s*([0-9.]*)["”]?$/) || str.match(/^([0-9.]+)\s*(?:ft|')?\s*([0-9.]*)\s*(?:in|["”]|''|["”])?$/);
    if (match) {
        const feet = parseFloat(match[1]) || 0;
        const inches = parseFloat(match[2]) || 0;
        return feet + inches / 12;
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

const toFeet = (val) => (typeof val === 'string' ? feetInchesToDecimal(val) : +val);
const toM3 = x => x * 0.0283168;
const hypot2 = (a, b) => Math.hypot(a, b);

function flightVolume(W, G, R, t, n) {
    const S = hypot2(n * G, n * R);
    return W * (t * S + n * 0.5 * R * G);
}

function winderStepVolume(W, R, Gw) {
    return W * 0.5 * R * Gw;
}

// Calculate a single stair
function calcStair(stairData) {
    const i = stairData.fields;
    const type = i.type;
    const W = toFeet(i.W);
    const G = toFeet(i.G);
    const R = toFeet(i.R);
    const Tw = toFeet(i.Tw);
    const Tl = toFeet(i.Tl);
    let stairV = 0, slabV = 0;

    if (type === 'straight') {
        const N = parseInt(i.N_straight) || 0;
        const L_bot = toFeet(i.L_bot);
        const W_bot = toFeet(i.W_bot);
        const L_top = toFeet(i.L_top);
        const W_top = toFeet(i.W_top);
        stairV += flightVolume(W, G, R, Tw, N);
        if (L_bot > 0 && W_bot > 0) slabV += L_bot * W_bot * Tl;
        if (L_top > 0 && W_top > 0) slabV += L_top * W_top * Tl;
    } else if (type === 'L_landing' || type === 'U_landing') {
        const N1 = parseInt(i.N1) || 0;
        const N2 = parseInt(i.N2) || 0;
        const L_mid = toFeet(i.L_mid);
        const W_mid = toFeet(i.W_mid);
        stairV += flightVolume(W, G, R, Tw, N1) + flightVolume(W, G, R, Tw, N2);
        if (L_mid > 0 && W_mid > 0) slabV += L_mid * W_mid * Tl;
    } else if (type === 'L_winder' || type === 'U_winder') {
        const N1 = parseInt(i.N1) || 0;
        const N2 = parseInt(i.N2) || 0;
        const l1 = toFeet(i.l1);
        const w1 = toFeet(i.w1);
        const nv1 = parseInt(i.nv1) || 0;
        stairV += flightVolume(W, G, R, Tw, N1);
        if (l1 > 0 && w1 > 0) slabV += l1 * w1 * Tl;

        const winderMethod = i.winderMethod;
        const Gw = toFeet(i.Gw);
        const g_winder = winderMethod === 'walking' ? Gw : (W / Math.SQRT2);

        if (nv1 > 0) stairV += nv1 * winderStepVolume(W, R, g_winder);

        if (type === 'U_winder') {
            const L_mid = toFeet(i.L_mid);
            const W_mid = toFeet(i.W_mid);
            if (L_mid > 0 && W_mid > 0) slabV += L_mid * W_mid * Tl;

            stairV += flightVolume(W, G, R, Tw, N2);

            const l2 = toFeet(i.l2);
            const w2 = toFeet(i.w2);
            const nv2 = parseInt(i.nv2) || 0;

            if (l2 > 0 && w2 > 0) slabV += l2 * w2 * Tl;
            if (nv2 > 0) stairV += nv2 * winderStepVolume(W, R, g_winder);
        } else {
            // L_winder only has flight 2 maybe? 
            // Checking frontend: 
            // } else { stairV += flightVolume(W, G, R, Tw, N2); }
            stairV += flightVolume(W, G, R, Tw, N2);
        }
    }
    const totalV = stairV + slabV;
    return { type, stairV, slabV, totalV, m3: toM3(totalV) };
}

// Grand mix total for all stairs
function grandMix(totalFt3, mixValues) {
    const { c, s, a, dryFactor, wc, bagKg, bagFt3 } = mixValues;
    const sumMix = (+c) + (+s) + (+a) || 1;
    const Vdry = totalFt3 * dryFactor;
    const Vcement = Vdry * (c / sumMix);
    const Vsand = Vdry * (s / sumMix);
    const Vagg = Vdry * (a / sumMix);
    const bags = Vcement / bagFt3;
    const cementKg = bags * bagKg;
    const waterL = cementKg * wc;
    return { Vcement, Vsand, Vagg, bags, cementKg, waterL };
}

const calculateStairConcrete = (req, res) => {
    try {
        const { stairs, mixValues } = req.body;

        if (!stairs || !Array.isArray(stairs) || stairs.length === 0) {
            return res.status(400).json({ error: 'Stairs array is required and must not be empty' });
        }

        // Validate each stair
        for (let i = 0; i < stairs.length; i++) {
            const stair = stairs[i];
            if (!stair.fields || !stair.fields.type) {
                return res.status(400).json({ error: `Stair ${i + 1}: fields and type are required` });
            }
        }

        // Default mix values
        const DEF_MIX = { c: 1, s: 2, a: 4, dryFactor: 1.54, wc: 0.5, bagKg: 50, bagFt3: 1.25 };
        const mix = mixValues || DEF_MIX;

        // Calculate each stair
        const stairResults = stairs.map(s => ({
            ...calcStair(s),
            name: s.name || `Stair ${stairs.indexOf(s) + 1}`,
            typeLabel: s.typeLabel || s.fields.type
        }));

        // Calculate totals
        const totals = stairResults.reduce((acc, s) => {
            acc.stair += s.stairV;
            acc.slab += s.slabV;
            acc.total += s.totalV;
            return acc;
        }, { stair: 0, slab: 0, total: 0 });

        // Calculate mix summary
        const mixSummary = grandMix(totals.total, mix);

        // Return results
        res.json({
            stairResults,
            totals,
            mixSummary,
            mixValues: mix
        });
    } catch (error) {
        console.error('Error calculating stair concrete:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateStairConcrete };
