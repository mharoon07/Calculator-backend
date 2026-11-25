// Helper function to parse feet-inches format to decimal feet
const feetInchesToDecimal = (feetInches) => {
    if (!feetInches || feetInches === '') return 0;
    const str = String(feetInches).trim();
    const match = str.match(/^(\d+(?:\.\d+)?)[''](\d+(?:\.\d+)?)[""]?$/) || str.match(/^(\d+(?:\.\d+)?)\s*['']?\s*(\d+(?:\.\d+)?)?\s*[""]?$/);
    if (!match) {
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;
    return feet + (inches / 12);
};

// Unit conversion functions
const toMeters = (val, unit) => {
    if (!val) return 0;
    let v;
    if (typeof val === 'string' && (val.includes("'") || val.includes('"'))) {
        v = feetInchesToDecimal(val);
        return v * 0.3048;
    } else {
        v = parseFloat(val);
        if (isNaN(v)) return 0;
    }

    switch (unit) {
        case 'mm': return v / 1000;
        case 'in': return v * 0.0254;
        case 'ft': return v * 0.3048;
        default: return v;
    }
};

const fromSqMeters = (val, unit) => {
    if (unit === 'ft2') return val * 10.7639104167;
    if (unit === 'in2') return val * 1550.0031;
    return val;
};

const readNumber = (value) => {
    const v = parseFloat(value);
    return Number.isFinite(v) ? v : 0;
};

const calculateKitchenCounterGranite = async (req, res) => {
    try {
        const {
            layout,
            unitArea = 'm2',
            straightLen,
            straightLenU = 'mm',
            depthStraight,
            depthStraightU = 'mm',
            parA,
            parAU = 'mm',
            parB,
            parBU = 'mm',
            depthParallel,
            depthParallelU = 'mm',
            lA,
            lAU = 'ft',
            lB,
            lBU = 'ft',
            depthL,
            depthLU = 'in',
            uA,
            uAU = 'ft',
            uB,
            uBU = 'ft',
            uC,
            uCU = 'ft',
            depthU,
            depthUU = 'in',
            dropHeight,
            dropHeightU = 'mm',
            bsHeight,
            bsHeightU = 'in',
            winEnabled = 'no',
            winWall = '0',
            winW,
            winWU = 'ft',
            winH,
            winHU = 'ft'
        } = req.body;

        // Validation
        if (!layout) {
            return res.status(400).json({
                success: false,
                error: 'Layout type is required'
            });
        }

        const getSegmentsM = () => {
            if (layout === 'straight') {
                return {
                    labels: ['Straight'],
                    lensM: [toMeters(straightLen, straightLenU)]
                };
            }
            if (layout === 'parallel') {
                return {
                    labels: ['Run A', 'Run B'],
                    lensM: [
                        toMeters(parA, parAU),
                        toMeters(parB, parBU)
                    ]
                };
            }
            if (layout === 'lshape') {
                return {
                    labels: ['Wall A', 'Wall B'],
                    lensM: [
                        toMeters(lA, lAU),
                        toMeters(lB, lBU)
                    ]
                };
            }
            return {
                labels: ['Wall A', 'Wall B (base)', 'Wall C'],
                lensM: [
                    toMeters(uA, uAU),
                    toMeters(uB, uBU),
                    toMeters(uC, uCU)
                ]
            };
        };

        const { labels, lensM } = getSegmentsM();

        // Get depth based on layout
        let depthM = 0;
        if (layout === 'straight') depthM = toMeters(depthStraight, depthStraightU);
        if (layout === 'parallel') depthM = toMeters(depthParallel, depthParallelU);
        if (layout === 'lshape') depthM = toMeters(depthL, depthLU);
        if (layout === 'ushape') depthM = toMeters(depthU, depthUU);

        const dropH = toMeters(dropHeight, dropHeightU);
        const bsH = toMeters(bsHeight, bsHeightU);

        const totalRun = lensM.reduce((a, b) => a + b, 0);

        // Inside-corner count
        let cornerCount = 0;
        if (layout === 'lshape') {
            cornerCount = (lensM[0] > 0 && lensM[1] > 0 && depthM > 0) ? 1 : 0;
        } else if (layout === 'ushape') {
            const aHas = lensM[0] > 0 && lensM[1] > 0;
            const cHas = lensM[2] > 0 && lensM[1] > 0;
            cornerCount = (depthM > 0 ? (aHas ? 1 : 0) + (cHas ? 1 : 0) : 0);
        }

        // Countertop area (corner overlap deduction)
        const grossCountertop_m2 = totalRun * depthM;
        const cornerDeduction_m2 = cornerCount * (depthM * depthM);
        const countertopArea_m2 = Math.max(0, grossCountertop_m2 - cornerDeduction_m2);

        // Backsplash per wall + window deduction on selected wall
        const perWallBS_m2 = lensM.map(len => len * bsH);
        let windowDeduct_m2 = 0;
        if (winEnabled === 'yes') {
            const wallIndex = parseInt(winWall || '0', 10);
            const wW = toMeters(winW, winWU);
            const wH = toMeters(winH, winHU);
            const effectiveH = Math.min(bsH, wH);
            windowDeduct_m2 = Math.max(0, wW * effectiveH);
            perWallBS_m2[wallIndex] = Math.max(0, perWallBS_m2[wallIndex] - windowDeduct_m2);
        }
        const backsplashArea_m2 = perWallBS_m2.reduce((a, b) => a + b, 0);

        // Drop panel: per-wall adjusted front lengths by junction counts
        let junctions = [];
        if (layout === 'straight') junctions = [0];
        else if (layout === 'parallel') junctions = [0, 0];
        else if (layout === 'lshape') junctions = [1, 1];
        else if (layout === 'ushape') junctions = [1, 2, 1];

        const perWallFrontLen_m = lensM.map((len, i) => Math.max(0, len - depthM * (junctions[i] || 0)));
        const perWallDrop_m2 = perWallFrontLen_m.map(len => len * dropH);
        const frontEdge = perWallFrontLen_m.reduce((a, b) => a + b, 0);
        const dropArea_m2 = perWallDrop_m2.reduce((a, b) => a + b, 0);

        const total_m2 = countertopArea_m2 + backsplashArea_m2 + dropArea_m2;

        // Outputs in selected unit
        const ct = fromSqMeters(countertopArea_m2, unitArea);
        const bs = fromSqMeters(backsplashArea_m2, unitArea);
        const dr = fromSqMeters(dropArea_m2, unitArea);
        const tt = fromSqMeters(total_m2, unitArea);

        return res.status(200).json({
            success: true,
            results: {
                unitArea,
                layout,
                labels,
                segments: lensM.map((len, i) => ({
                    label: labels[i],
                    lengthM: parseFloat(len.toFixed(3)),
                    // lengthFt: parseFloat((len / 0.3048).toFixed(3)),
                    // perWallFrontLen_m: parseFloat(perWallFrontLen_m[i].toFixed(3))
                    // lengthFt: parseFloat((len / 0.3048).toFixed(3)),
                    lengthM: parseFloat(perWallFrontLen_m[i].toFixed(3))
                })),
                depthM: parseFloat(depthM.toFixed(3)),
                dropH: parseFloat(dropH.toFixed(3)),
                bsH: parseFloat(bsH.toFixed(3)),
                totalRun: parseFloat(totalRun.toFixed(3)),
                cornerCount,
                frontEdge: parseFloat(frontEdge.toFixed(3)),
                areas: {
                    countertop: {
                        m2: parseFloat(countertopArea_m2.toFixed(3)),
                        [unitArea]: parseFloat(ct.toFixed(3)),
                        gross_m2: parseFloat(grossCountertop_m2.toFixed(3)),
                        cornerDeduction_m2: parseFloat(cornerDeduction_m2.toFixed(3))
                    },
                    backsplash: {
                        m2: parseFloat(backsplashArea_m2.toFixed(3)),
                        [unitArea]: parseFloat(bs.toFixed(3)),
                        perWall_m2: perWallBS_m2.map(a => parseFloat(a.toFixed(3))),
                        windowDeduction_m2: parseFloat(windowDeduct_m2.toFixed(3))
                    },
                    drop: {
                        m2: parseFloat(dropArea_m2.toFixed(3)),
                        [unitArea]: parseFloat(dr.toFixed(3)),
                        perWall_m2: perWallDrop_m2.map(a => parseFloat(a.toFixed(3))),
                        perWallFrontLen_m: perWallFrontLen_m.map(l => parseFloat(l.toFixed(3))),
                        frontEdge_m: parseFloat(frontEdge.toFixed(3))
                    },
                    total: {
                        m2: parseFloat(total_m2.toFixed(3)),
                        [unitArea]: parseFloat(tt.toFixed(3))
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error in calculateKitchenCounterGranite:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateKitchenCounterGranite };


