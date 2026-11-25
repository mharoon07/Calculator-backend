// Helper functions
const FT2M = 0.3048;
const IN2M = 0.0254;
const MM2M = 0.001;

const imperialRebarData = {
    '#3': { dia_m: 0.009525, unitWt: 0.560 },
    '#4': { dia_m: 0.0127, unitWt: 0.994 },
    '#5': { dia_m: 0.015875, unitWt: 1.552 },
    '#6': { dia_m: 0.01905, unitWt: 2.235 },
    '#7': { dia_m: 0.022225, unitWt: 3.042 },
    '#8': { dia_m: 0.0254, unitWt: 3.973 }
};

const metricRebarData = {
    '4': { dia_m: 0.004, unitWt: 0.267 },
    '8': { dia_m: 0.008, unitWt: 0.395 },
    '10': { dia_m: 0.010, unitWt: 0.617 },
    '12': { dia_m: 0.012, unitWt: 0.888 },
    '16': { dia_m: 0.016, unitWt: 1.579 },
    '20': { dia_m: 0.020, unitWt: 2.466 },
    '25': { dia_m: 0.025, unitWt: 3.854 }
};

const hookDefaults = { '90': 12, '135': 8, 'none': 0 };

function feetInchesToDecimal(feetInches) {
    if (!feetInches || feetInches === '') return 0;
    const str = feetInches.toString().trim();
    const match = str.match(/^(\d+(?:\.\d+)?)[''](\d+(?:\.\d+)?)[""]?$/) || str.match(/^(\d+(?:\.\d+)?)\s*['']?\s*(\d+(?:\.\d+)?)?\s*[""]?$/);
    if (!match) {
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;
    if (inches >= 12) {
        const extraFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return feet + extraFeet + (remainingInches / 12);
    }
    return feet + (inches / 12);
}

function ft2m(ft) { return ft * FT2M; }
function mm2m(mm) { return mm * MM2M; }

function getRebarData(unitSystem) {
    return unitSystem === 'metric' ? metricRebarData : imperialRebarData;
}

function barCount(eff, spacing) {
    return Math.floor(eff / spacing) + 1;
}

function cutLenWithLaps(cutLen_m, stockLen_m, lapLen_m) {
    if (stockLen_m <= 0) return { pieces: 1, laps: 0, len_m: cutLen_m };
    if (cutLen_m <= stockLen_m) return { pieces: 1, laps: 0, len_m: cutLen_m };
    let pieces = Math.ceil(cutLen_m / (stockLen_m - lapLen_m));
    if (pieces < 1) pieces = 1;
    const laps = Math.max(0, pieces - 1);
    const used = cutLen_m + laps * lapLen_m;
    return { pieces, laps, len_m: used };
}

function round2(x) {
    return Math.round(x * 100) / 100;
}

function layerTotals(tag, spacingAcross_m, cover_m, dia, hookFactorPerEnd_db, hookScope, qtyFootings, stockLen_m, lapDb, L_m, B_m, unitSystem) {
    const rebarData = getRebarData(unitSystem);
    const acrossEff = tag.startsWith('B1') || tag.startsWith('T1') ? (B_m - 2 * cover_m) : (L_m - 2 * cover_m);
    const nBars = barCount(acrossEff, spacingAcross_m);
    
    if (!rebarData[dia]) {
        return { rows: [], sumLen_m: 0, sumWt_kg: 0 };
    }
    
    const db = rebarData[dia].dia_m;
    const wpm = rebarData[dia].unitWt;
    
    const hookEnd = hookFactorPerEnd_db * db;
    const hookBoth = 2 * hookEnd;
    
    let nEdge = 0, nInt = 0;
    if (hookScope === 'edge') { nEdge = Math.min(2, nBars); nInt = Math.max(0, nBars - nEdge); }
    else if (hookScope === 'all') { nEdge = nBars; nInt = 0; }
    else { nEdge = 0; nInt = nBars; }
    
    const baseLen_m = tag.startsWith('B1') || tag.startsWith('T1') ? (L_m - 2 * cover_m) : (B_m - 2 * cover_m);
    const lenEdge_m = Math.max(0, baseLen_m + hookBoth);
    const lenInt_m = Math.max(0, baseLen_m);
    
    const lap_m = lapDb * db;
    const edgeCut = cutLenWithLaps(lenEdge_m, stockLen_m, lap_m);
    const intCut = cutLenWithLaps(lenInt_m, stockLen_m, lap_m);
    
    const totLen_m = (nEdge * edgeCut.len_m + nInt * intCut.len_m) * qtyFootings;
    const totWt_kg = totLen_m * wpm;
    
    const rows = [];
    if (nInt > 0) rows.push({
        mark: `${tag}-INT`,
        dia,
        qty: nInt * qtyFootings,
        cut_mm: Math.round(lenInt_m * 1000),
        totLen_mm: Math.round(nInt * intCut.len_m * qtyFootings * 1000),
        wt_kg: round2(nInt * intCut.len_m * wpm * qtyFootings),
        notes: `${nInt} interior; pieces/bar ${intCut.pieces}, laps/bar ${intCut.laps}`,
        hookType: 'none',
        hookScope: 'none'
    });
    if (nEdge > 0) rows.push({
        mark: `${tag}-EDGE`,
        dia,
        qty: nEdge * qtyFootings,
        cut_mm: Math.round(lenEdge_m * 1000),
        totLen_mm: Math.round(nEdge * edgeCut.len_m * qtyFootings * 1000),
        wt_kg: round2(nEdge * edgeCut.len_m * wpm * qtyFootings),
        notes: `${nEdge} with hooks = ${hookFactorPerEnd_db}db/end; pieces/bar ${edgeCut.pieces}, laps/bar ${edgeCut.laps}`,
        hookType: hookFactorPerEnd_db > 0 ? '90' : 'none',
        hookScope: hookScope
    });
    
    return { rows, sumLen_m: totLen_m, sumWt_kg: totWt_kg };
}

const calculateFootingRebar = (req, res) => {
    try {
        const { footings, globalSettings, unitSystem } = req.body;
        
        if (!footings || !Array.isArray(footings) || footings.length === 0) {
            return res.status(400).json({ error: 'Footings array is required' });
        }
        
        if (!globalSettings) {
            return res.status(400).json({ error: 'Global settings are required' });
        }
        
        const allRows = [];
        let grandLen_m = 0, grandWt_kg = 0;
        const rebarData = getRebarData(unitSystem || 'metric');
        
        footings.forEach(footing => {
            // Convert inputs to metric
            const L_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.length) || 0) : ft2m(feetInchesToDecimal(footing.length));
            const B_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.width) || 0) : ft2m(feetInchesToDecimal(footing.width));
            const cover_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.cover) || 0) : ft2m(feetInchesToDecimal(footing.cover));
            const qty = footing.quantity || 1;
            
            // Bottom hooks
            const customHookDb = parseFloat(footing.customHookDb) || 0;
            const hookFactorPerEnd_db = footing.hookType === 'none' ? 0 :
                customHookDb > 0 ? customHookDb : (hookDefaults[footing.hookType] ?? 0);
            
            // Top reinforcement
            const topOn = footing.topOn || false;
            const topHooks = footing.topHooks || 'none';
            
            // Dowels
            const dowOn = footing.dowOn || false;
            const dowCustomHookDb = parseFloat(footing.dowCustomHookDb) || 0;
            const dowHookFactorPerEnd_db = footing.dowHook === 'none' ? 0 :
                dowCustomHookDb > 0 ? dowCustomHookDb : (hookDefaults[footing.dowHook] ?? 0);
            
            // Laps & costing
            const stockLen_m = unitSystem === 'metric' ? mm2m(parseFloat(globalSettings.stockLen) || 0) : ft2m(feetInchesToDecimal(globalSettings.stockLen));
            const lapDb = globalSettings.lapDb || 40;
            
            const rows = [];
            let footingLen_m = 0, footingWt_kg = 0;
            
            // Bottom layers
            const bottomSpacingB_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.bottomSpacingB) || 0) : ft2m(feetInchesToDecimal(footing.bottomSpacingB));
            const bottomSpacingL_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.bottomSpacingL) || 0) : ft2m(feetInchesToDecimal(footing.bottomSpacingL));
            const B1 = layerTotals('B1', bottomSpacingB_m, cover_m, footing.bottomDia, hookFactorPerEnd_db, footing.hookScope, qty, stockLen_m, lapDb, L_m, B_m, unitSystem);
            const B2 = layerTotals('B2', bottomSpacingL_m, cover_m, footing.bottomDia, hookFactorPerEnd_db, footing.hookScope, qty, stockLen_m, lapDb, L_m, B_m, unitSystem);
            rows.push(...B1.rows, ...B2.rows);
            footingLen_m += B1.sumLen_m + B2.sumLen_m;
            footingWt_kg += B1.sumWt_kg + B2.sumWt_kg;
            
            // Top layers
            if (topOn) {
                const scopeTop = topHooks === 'none' ? 'none' : topHooks;
                const topSpacingB_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.topSpacingB) || 0) : ft2m(feetInchesToDecimal(footing.topSpacingB));
                const topSpacingL_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.topSpacingL) || 0) : ft2m(feetInchesToDecimal(footing.topSpacingL));
                const T1 = layerTotals('T1', topSpacingB_m, cover_m, footing.topDia, hookFactorPerEnd_db, scopeTop, qty, stockLen_m, lapDb, L_m, B_m, unitSystem);
                const T2 = layerTotals('T2', topSpacingL_m, cover_m, footing.topDia, hookFactorPerEnd_db, scopeTop, qty, stockLen_m, lapDb, L_m, B_m, unitSystem);
                rows.push(...T1.rows, ...T2.rows);
                footingLen_m += T1.sumLen_m + T2.sumLen_m;
                footingWt_kg += T1.sumWt_kg + T2.sumWt_kg;
            }
            
            // Dowels
            if (dowOn) {
                if (!rebarData[footing.dowDia]) {
                    return;
                }
                const db = rebarData[footing.dowDia].dia_m;
                const wpm = rebarData[footing.dowDia].unitWt;
                const baseHook_m = dowHookFactorPerEnd_db * db;
                const dowEmbed_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.dowEmbed) || 0) : ft2m(feetInchesToDecimal(footing.dowEmbed));
                const dowProj_m = unitSystem === 'metric' ? mm2m(parseFloat(footing.dowProj) || 0) : ft2m(feetInchesToDecimal(footing.dowProj));
                const dowCut_m = dowEmbed_m + dowProj_m + baseHook_m;
                const used = cutLenWithLaps(dowCut_m, stockLen_m, lapDb * db);
                const totalLen_m = used.len_m * footing.dowCount * qty;
                const totalWt_kg = totalLen_m * wpm;
                const embed_mm = Math.round(dowEmbed_m * 1000);
                const proj_mm = Math.round(dowProj_m * 1000);
                rows.push({
                    mark: 'DOWELS',
                    dia: footing.dowDia,
                    qty: footing.dowCount * qty,
                    cut_mm: Math.round(dowCut_m * 1000),
                    totLen_mm: Math.round(totalLen_m * 1000),
                    wt_kg: round2(totalWt_kg),
                    notes: `embed ${embed_mm} mm + proj ${proj_mm} mm${dowHookFactorPerEnd_db > 0 ? ` + base hook ${dowHookFactorPerEnd_db}db` : ''}; pieces/bar ${used.pieces}`,
                    hookType: footing.dowHook,
                    hookScope: 'all'
                });
                footingLen_m += totalLen_m;
                footingWt_kg += totalWt_kg;
            }
            
            // Loops
            if (footing.loopsOn && footing.loops && footing.loops.length > 0) {
                footing.loops.forEach(loop => {
                    if (!rebarData[loop.dia]) {
                        return;
                    }
                    const loopDb = rebarData[loop.dia].dia_m;
                    const loopWpm = rebarData[loop.dia].unitWt;
                    const loopCustomHookDb = parseFloat(loop.customHookDb) || 0;
                    const loopHookFactorPerEnd_db = loop.hookType === 'none' ? 0 :
                        loopCustomHookDb > 0 ? loopCustomHookDb : (hookDefaults[loop.hookType] ?? 0);
                    
                    const loopPerimeter_m = 2 * (L_m - 2 * cover_m) + 2 * (B_m - 2 * cover_m);
                    const loopHook_m = loopHookFactorPerEnd_db * loopDb;
                    const loopCut_m = loopPerimeter_m + loopHook_m;
                    
                    const loopSpacing_m = unitSystem === 'metric' ? mm2m(parseFloat(loop.spacing) || 0) : ft2m(feetInchesToDecimal(loop.spacing));
                    const nLoops = Math.floor((L_m - 2 * cover_m) / loopSpacing_m) + 1;
                    
                    const used = cutLenWithLaps(loopCut_m, stockLen_m, lapDb * loopDb);
                    const totalLen_m = used.len_m * nLoops * loop.quantity * qty;
                    const totalWt_kg = totalLen_m * loopWpm;
                    
                    rows.push({
                        mark: `LOOP-${loop.loopId}`,
                        dia: loop.dia,
                        qty: nLoops * loop.quantity * qty,
                        cut_mm: Math.round(loopCut_m * 1000),
                        totLen_mm: Math.round(totalLen_m * 1000),
                        wt_kg: round2(totalWt_kg),
                        notes: `perimeter ${Math.round(loopPerimeter_m * 1000)} mm${loopHookFactorPerEnd_db > 0 ? ` + hook ${loopHookFactorPerEnd_db}db` : ''}; pieces/bar ${used.pieces}`,
                        hookType: loop.hookType,
                        hookScope: 'all'
                    });
                    footingLen_m += totalLen_m;
                    footingWt_kg += totalWt_kg;
                });
            }
            
            rows.forEach(row => {
                row.footingId = footing.footingId;
                row.footingQty = qty;
            });
            allRows.push(...rows);
            grandLen_m += footingLen_m;
            grandWt_kg += footingWt_kg;
        });
        
        const cost = grandWt_kg * (globalSettings.costKg || 1.00);
        
        res.json({
            rows: allRows,
            totals: {
                grandLen_m,
                grandWt_kg,
                cost
            }
        });
    } catch (error) {
        console.error('Error calculating footing rebar:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateFootingRebar };
