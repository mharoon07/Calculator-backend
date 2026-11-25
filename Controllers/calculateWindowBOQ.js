// Helper function to parse feet-inches format to decimal feet
const feetInchesToDecimal = (feetInches) => {
    if (!feetInches || feetInches === '') return 0;
    const str = feetInches.toString().trim();
    const match = str.match(/^(\d+(?:\.\d+)?)[''](\d+(?:\.\d+)?)[""]?$/) || str.match(/^(\d+(?:\.\d+)?)\s*['']?\s*(\d+(?:\.\d+)?)?\s*[""]?$/);
    if (!match) {
        const num = parseFloat(str);
        return Number.isFinite(num) ? num : 0;
    }
    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;
    if (inches >= 12) {
        const extraFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return feet + extraFeet + remainingInches / 12;
    }
    return feet + inches / 12;
};

const round = (n, p = 2) => {
    const f = 10 ** p;
    return Math.round((Number(n) + Number.EPSILON) * f) / f;
};

const CONSTS = {
    cornerAnglesPerWindow: 4,
    angleBracketsPerWindow: 4,
    screwsPerWindow: 16,
    fasteningScrewsPerWindow: 12
};

// Spacer length for double glazed = sum of perimeters over all panels: 2*(panelW + H)
const calcSpacerLenDouble = (panelWidths, H) => {
    let sum = 0;
    panelWidths.forEach(w => { sum += 2 * (w + H); });
    return sum;
};

// Weather for sliding panels (equal widths)
const calcWeatherForSlidingPanels = (numPanels, panelW, H) => {
    const seal = numPanels * 4 * (panelW + H);
    const brush = 2 * seal;
    return { seal, brush };
};

const compute = (w) => {
    const W = feetInchesToDecimal(w.width);
    const H = feetInchesToDecimal(w.height);
    if (!(W > 0 && H > 0)) return null;

    const push = (group, list, item) => list.push({ group, ...item });
    const parts = [];

    if (w.type === 'two-panel-sliding' || w.type === 'three-panel-center-fixed') {
        push('Cross Sections (Profiles)', parts, { desc: 'Top Cross Section (Profile) – Section 1', qty: 1, size: `${W} ft`, type: 'lf', val: W });
        push('Cross Sections (Profiles)', parts, { desc: 'Bottom & Side Cross Section (Profile) – Section 2', qty: 1, size: `${W} ft`, type: 'lf', val: W });
        push('Cross Sections (Profiles)', parts, { desc: 'Bottom & Side Cross Section (Profile) – Section 2', qty: 2, size: `${H} ft`, type: 'lf', val: H });
    } else if (w.type === 'fixed') {
        push('Cross Sections (Profiles)', parts, { desc: 'Fixed Frame Cross Section (Profile)', qty: 2, size: `${W} ft`, type: 'lf', val: W });
        push('Cross Sections (Profiles)', parts, { desc: 'Fixed Frame Cross Section (Profile)', qty: 2, size: `${H} ft`, type: 'lf', val: H });
    }

    if (w.type === 'two-panel-sliding') {
        const panelW = round(W / 2, 2);
        push('Cross Sections (Profiles)', parts, { desc: 'Sliding Sash Cross Section (Profile) – Top/Bottom', qty: 4, size: `${panelW} ft`, type: 'lf', val: panelW });
        push('Cross Sections (Profiles)', parts, { desc: 'Sliding Sash Cross Section (Profile) – Left Side', qty: 2, size: `${H} ft`, type: 'lf', val: H });
        push('Cross Sections (Profiles)', parts, { desc: 'Sliding Sash Cross Section (Profile) – Right Side', qty: 2, size: `${H} ft`, type: 'lf', val: H });

        const gdesc = w.glazing === 'double' ? 'Double Glazed Glass Panel' : 'Single Glazed Glass Panel';
        push('Glass Panels', parts, { desc: gdesc, qty: 2, size: `${panelW} x ${H} ft`, type: 'area', val: panelW * H });

        if (w.glazing === 'double') {
            const spacerLen = calcSpacerLenDouble([panelW, panelW], H);
            push('Glass Panels', parts, { desc: 'Spacer Bars', qty: 1, size: `${round(spacerLen, 2)} ft`, type: 'lf', val: spacerLen });
        }

        if (w.mesh === 'yes') {
            const meshPerimeter = round(W + 2 * H, 2);
            push('Cross Sections (Profiles)', parts, { desc: 'Mesh Sash Aluminium Cross Section (Profile)', qty: 1, size: `${meshPerimeter} ft`, type: 'lf', val: meshPerimeter });
            push('Glass Panels', parts, { desc: 'Mesh Panel Screen (Single Panel)', qty: 1, size: `${panelW} x ${H} ft`, type: 'area', val: panelW * H });
        }

        push('Accessories', parts, { desc: 'Rollers', qty: 4, size: 'Standard', type: 'pcs', val: 1 });
        push('Accessories', parts, { desc: w.lock === 'per-panel' ? 'Locks (Per Panel)' : 'Lock (Central)', qty: w.lock === 'per-panel' ? 2 : 1, size: 'Standard', type: 'pcs', val: 1 });

        const weather = calcWeatherForSlidingPanels(2, panelW, H);
        push('Accessories', parts, { desc: 'Weather Seal', qty: 1, size: `${round(weather.seal, 2)} ft`, type: 'lf', val: weather.seal });
        push('Accessories', parts, { desc: 'Weather Brush', qty: 1, size: `${round(weather.brush, 2)} ft`, type: 'lf', val: weather.brush });
    } else if (w.type === 'three-panel-center-fixed') {
        const fixedW = round(W / 2, 2);
        const slideW = round(W / 4, 2);
        push('Cross Sections (Profiles)', parts, { desc: 'Sliding Sash Cross Section (Profile) – Top/Bottom', qty: 4, size: `${slideW} ft`, type: 'lf', val: slideW });
        push('Cross Sections (Profiles)', parts, { desc: 'Sliding Sash Cross Section (Profile) – Left Side', qty: 2, size: `${H} ft`, type: 'lf', val: H });
        push('Cross Sections (Profiles)', parts, { desc: 'Sliding Sash Cross Section (Profile) – Right Side', qty: 2, size: `${H} ft`, type: 'lf', val: H });
        push('Cross Sections (Profiles)', parts, { desc: 'Fixed Middle Cross Section (Profile)', qty: 2, size: `${fixedW} ft`, type: 'lf', val: fixedW });
        push('Cross Sections (Profiles)', parts, { desc: 'Fixed Middle Cross Section (Profile)', qty: 2, size: `${H} ft`, type: 'lf', val: H });

        const gdesc = w.glazing === 'double' ? 'Double Glazed Glass Panel' : 'Single Glazed Glass Panel';
        push('Glass Panels', parts, { desc: gdesc + ' (Fixed Center)', qty: 1, size: `${fixedW} x ${H} ft`, type: 'area', val: fixedW * H });
        push('Glass Panels', parts, { desc: gdesc + ' (Sliding Panels)', qty: 2, size: `${slideW} x ${H} ft`, type: 'area', val: slideW * H });

        if (w.glazing === 'double') {
            const spacerLen = calcSpacerLenDouble([fixedW, slideW, slideW], H);
            push('Glass Panels', parts, { desc: 'Spacer Bars', qty: 1, size: `${round(spacerLen, 2)} ft`, type: 'lf', val: spacerLen });
        }

        if (w.mesh === 'yes') {
            const meshPerimeter = round(W + 2 * H, 2);
            push('Cross Sections (Profiles)', parts, { desc: 'Mesh Sash Aluminium Cross Section (Profile)', qty: 1, size: `${meshPerimeter} ft`, type: 'lf', val: meshPerimeter });
            push('Glass Panels', parts, { desc: 'Mesh Panel Screen (Single Panel)', qty: 1, size: `${slideW} x ${H} ft`, type: 'area', val: slideW * H });
        }

        push('Accessories', parts, { desc: 'Rollers', qty: 4, size: 'Standard', type: 'pcs', val: 1 });
        push('Accessories', parts, { desc: w.lock === 'central' ? 'Central Locks (2/window)' : 'Locks (Per Panel) (2/window)', qty: 2, size: 'Standard', type: 'pcs', val: 1 });

        const sealFixed = 2 * (2 * fixedW + 2 * H);
        const sealSliding = 2 * 2 * (2 * slideW + 2 * H);
        const sealTotal = sealFixed + sealSliding;
        const brushTotal = 2 * sealTotal;
        push('Accessories', parts, { desc: 'Weather Seal', qty: 1, size: `${round(sealTotal, 2)} ft`, type: 'lf', val: sealTotal });
        push('Accessories', parts, { desc: 'Weather Brush', qty: 1, size: `${round(brushTotal, 2)} ft`, type: 'lf', val: brushTotal });
    } else if (w.type === 'fixed') {
        const gdesc = w.glazing === 'double' ? 'Double Glazed Glass Panel' : 'Single Glazed Glass Panel';
        push('Glass Panels', parts, { desc: gdesc, qty: 1, size: `${W} x ${H} ft`, type: 'area', val: W * H });

        if (w.glazing === 'double') {
            const spacerLen = calcSpacerLenDouble([W], H);
            push('Glass Panels', parts, { desc: 'Spacer Bars', qty: 1, size: `${round(spacerLen, 2)} ft`, type: 'lf', val: spacerLen });
        }
    }

    // Common accessories
    push('Accessories', parts, { desc: 'Corner Angles (1" × 1")', qty: CONSTS.cornerAnglesPerWindow, size: '1" × 1"', type: 'pcs', val: 1 });
    push('Accessories', parts, { desc: 'Angle Brackets', qty: CONSTS.angleBracketsPerWindow, size: 'Standard', type: 'pcs', val: 1 });
    push('Accessories', parts, { desc: 'Screws', qty: CONSTS.screwsPerWindow, size: 'Standard', type: 'pcs', val: 1 });
    push('Accessories', parts, { desc: 'Fastening Screws', qty: CONSTS.fasteningScrewsPerWindow, size: 'Standard', type: 'pcs', val: 1 });

    return { W, H, qty: Math.max(1, parseInt(w.qty || '1', 10)), parts };
};

const aggregate = (parts, qty) => {
    const map = {};
    parts.forEach((p) => {
        const key = `${p.group}::${p.desc}`;
        if (!map[key]) map[key] = { group: p.group, desc: p.desc, qtyPerWindow: 0, totalQty: 0, sizes: new Set(), totals: { lf: 0, area: 0, pcs: 0 } };
        const b = map[key];
        b.qtyPerWindow += p.qty;
        b.totalQty += p.qty * qty;
        b.sizes.add(p.size);
        if (p.type === 'lf') b.totals.lf += p.val * p.qty * qty;
        if (p.type === 'area') b.totals.area += p.val * p.qty * qty;
        if (p.type === 'pcs') b.totals.pcs += 1 * p.qty * qty;
    });
    return Object.values(map);
};

const calculateWindowBOQ = async (req, res) => {
    try {
        const { windows } = req.body;

        // Validation
        if (!windows || !Array.isArray(windows) || windows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one window is required'
            });
        }

        const windowResults = [];
        const allAggregated = {};

        windows.forEach((w, idx) => {
            const data = compute(w);
            if (!data) return;

            const windowLabel = `#${idx + 1} — ${round(data.W, 2)} ft × ${round(data.H, 2)} ft • Qty: ${data.qty}`;
            const aggregated = aggregate(data.parts, data.qty);

            // Group aggregated items
            const grouped = {};
            aggregated.forEach((item) => {
                if (!grouped[item.group]) grouped[item.group] = [];
                grouped[item.group].push({
                    desc: item.desc,
                    qtyPerWindow: item.qtyPerWindow,
                    totalQty: item.totalQty,
                    sizes: Array.from(item.sizes).filter(Boolean),
                    totals: {
                        lf: round(item.totals.lf, 2),
                        area: round(item.totals.area, 2),
                        pcs: round(item.totals.pcs, 0)
                    },
                    finalQuantity: `${item.totals.lf > 0 ? round(item.totals.lf, 2) + ' ft' : ''}${item.totals.lf > 0 && (item.totals.area > 0 || item.totals.pcs > 0) ? ' / ' : ''}${item.totals.area > 0 ? round(item.totals.area, 2) + ' ft²' : ''}${item.totals.area > 0 && item.totals.pcs > 0 ? ' / ' : ''}${item.totals.pcs > 0 ? round(item.totals.pcs, 0) + ' pcs' : ''}`
                });
            });

            windowResults.push({
                windowNumber: idx + 1,
                windowLabel,
                width: round(data.W, 2),
                height: round(data.H, 2),
                qty: data.qty,
                type: w.type,
                groupedItems: grouped
            });

            // Aggregate across all windows
            aggregated.forEach((item) => {
                const key = `${item.group}::${item.desc}`;
                if (!allAggregated[key]) {
                    allAggregated[key] = {
                        group: item.group,
                        desc: item.desc,
                        qtyPerWindow: 0,
                        totalQty: 0,
                        sizes: new Set(),
                        totals: { lf: 0, area: 0, pcs: 0 }
                    };
                }
                const agg = allAggregated[key];
                agg.qtyPerWindow += item.qtyPerWindow;
                agg.totalQty += item.totalQty;
                item.sizes.forEach(s => agg.sizes.add(s));
                agg.totals.lf += item.totals.lf;
                agg.totals.area += item.totals.area;
                agg.totals.pcs += item.totals.pcs;
            });
        });

        // Format overall aggregated results
        const overallAggregated = Object.values(allAggregated).map(item => ({
            group: item.group,
            desc: item.desc,
            qtyPerWindow: round(item.qtyPerWindow, 2),
            totalQty: round(item.totalQty, 2),
            sizes: Array.from(item.sizes).filter(Boolean),
            totals: {
                lf: round(item.totals.lf, 2),
                area: round(item.totals.area, 2),
                pcs: round(item.totals.pcs, 0)
            },
            finalQuantity: `${item.totals.lf > 0 ? round(item.totals.lf, 2) + ' ft' : ''}${item.totals.lf > 0 && (item.totals.area > 0 || item.totals.pcs > 0) ? ' / ' : ''}${item.totals.area > 0 ? round(item.totals.area, 2) + ' ft²' : ''}${item.totals.area > 0 && item.totals.pcs > 0 ? ' / ' : ''}${item.totals.pcs > 0 ? round(item.totals.pcs, 0) + ' pcs' : ''}`
        }));

        return res.status(200).json({
            success: true,
            results: {
                windows: windowResults,
                overallAggregated
            }
        });
    } catch (err) {
        console.error('Error in calculateWindowBOQ:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateWindowBOQ };


