// Helper functions
const FT2MM = 304.8;
const IN2MM = 25.4;
const MM2M = 0.001;

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

function ftToMm(ft) { return ft * FT2MM; }
function inToMm(inch) { return inch * IN2MM; }
function mmToM(mm) { return mm * MM2M; }

function geomToMM(foundation, unitSystem) {
    let Lx, Ly, thickness, sideCover, topCover, bottomCover;
    
    if (unitSystem === 'metric') {
        Lx = parseFloat(foundation.Lx) || 0;
        Ly = parseFloat(foundation.Ly) || 0;
        thickness = parseFloat(foundation.thickness) || 0;
        sideCover = parseFloat(foundation.sideCover) || 0;
        topCover = parseFloat(foundation.topCover) || 0;
        bottomCover = parseFloat(foundation.bottomCover) || 0;
    } else {
        Lx = ftToMm(feetInchesToDecimal(foundation.Lx));
        Ly = ftToMm(feetInchesToDecimal(foundation.Ly));
        thickness = ftToMm(feetInchesToDecimal(foundation.thickness));
        sideCover = ftToMm(feetInchesToDecimal(foundation.sideCover));
        topCover = ftToMm(feetInchesToDecimal(foundation.topCover));
        bottomCover = ftToMm(feetInchesToDecimal(foundation.bottomCover));
    }
    
    return { Lx_mm: Lx, Ly_mm: Ly, t_mm: thickness, cSide_mm: sideCover, cTop_mm: topCover, cBot_mm: bottomCover };
}

function spacingToMM(v, unitSystem) {
    if (unitSystem === 'metric') {
        return parseFloat(v) || 0;
    } else {
        if (typeof v === 'string' && v.includes("'")) {
            const decimalFeet = feetInchesToDecimal(v);
            return ftToMm(decimalFeet);
        } else {
            const inches = parseFloat(v) || 0;
            return inToMm(inches);
        }
    }
}

function stockToMM(foundation, unitSystem) {
    if (unitSystem === 'metric') {
        return parseFloat(foundation.stockLength) || 0;
    } else {
        return ftToMm(feetInchesToDecimal(foundation.stockLength));
    }
}

function lapLength_mm(d, foundation) {
    return foundation.lapMode === 'xd' ? foundation.lapValue * d : foundation.lapValue;
}

function bendAllowance90_mm(d, foundation) {
    return foundation.bendMode === 'xd' ? foundation.bendValue * d : foundation.bendValue;
}

function tailAfter90_mm(d, foundation) {
    return foundation.tailMode === 'xd' ? foundation.tailValue * d : foundation.tailValue;
}

function computePieces(Lclear_mm, stock_mm, anch, dia_mm, Llap_mm, foundation) {
    const bend = anch === '90' ? bendAllowance90_mm(dia_mm, foundation) : 0;
    const tail = anch === '90' ? tailAfter90_mm(dia_mm, foundation) : 0;
    const strategy = foundation.spliceStrategy || 'auto';
    const kMax = 20;
    const lengthsForK = (k) => {
        if (k <= 0) return null;
        if (k === 1) {
            const len = Lclear_mm + (anch === '90' ? (2 * bend + 2 * tail) : 0);
            return [len];
        }
        const axialShare = (Lclear_mm - (k - 1) * Llap_mm) / k;
        if (axialShare < 0) return null;
        const arr = [];
        for (let i = 0; i < k; i++) {
            let len = axialShare + (i === 0 || i === k - 1 ? Llap_mm : 2 * Llap_mm);
            if (anch === '90' && (i === 0 || i === k - 1)) len += (bend + tail);
            arr.push(len);
        }
        return arr;
    };
    if (strategy === 'force1') {
        const Ls = lengthsForK(1);
        return { k: 1, lens: Ls, note: anch === '90' ? 'One piece; 2×(90°+tail)' : 'One piece; straight', warn: Ls[0] > stock_mm };
    }
    if (strategy === 'force2') {
        const Ls = lengthsForK(2);
        return { k: 2, lens: Ls, note: anch === '90' ? 'Two pieces; ends 90°+tail' : 'Two pieces; lap per rule', warn: Math.max(...Ls) > stock_mm };
    }
    for (let k = 1; k <= kMax; k++) {
        const Ls = lengthsForK(k);
        if (!Ls) continue;
        if (Math.max(...Ls) <= stock_mm) {
            const note = k === 1
                ? (anch === '90' ? 'One piece; 2×(90°+tail)' : 'One piece; straight')
                : (anch === '90' ? `Multi-piece (${k}); outer ends 90°+tail` : `Multi-piece (${k}); lap per rule`);
            return { k, lens: Ls, note, warn: false };
        }
    }
    const Ls = lengthsForK(kMax) || [Lclear_mm];
    return { k: kMax, lens: Ls, note: `Multi-piece (${kMax})`, warn: true };
}

const barList = [
    { label: '8 mm (0.395 kg/m)', dia_mm: 8.0, uw_kgpm: 0.395 },
    { label: '10 mm (0.617 kg/m)', dia_mm: 10.0, uw_kgpm: 0.617 },
    { label: '12 mm (0.888 kg/m)', dia_mm: 12.0, uw_kgpm: 0.888 },
    { label: '16 mm (1.58 kg/m)', dia_mm: 16.0, uw_kgpm: 1.58 },
    { label: '20 mm (2.47 kg/m)', dia_mm: 20.0, uw_kgpm: 2.47 },
    { label: '25 mm (3.85 kg/m)', dia_mm: 25.0, uw_kgpm: 3.85 },
    { label: '32 mm (6.31 kg/m)', dia_mm: 32.0, uw_kgpm: 6.31 }
];

const layerDefs = [
    { mark: 'B1', orient: 'X', level: 'Bottom' },
    { mark: 'B2', orient: 'Y', level: 'Bottom' },
    { mark: 'T1', orient: 'X', level: 'Top' },
    { mark: 'T2', orient: 'Y', level: 'Top' }
];

function formatSpacing(spacing_mm) {
    return spacing_mm.toFixed(0) + ' mm';
}

function calculateSingleFoundationBBS(foundation, unitSystem) {
    const { Lx_mm, Ly_mm, t_mm, cSide_mm, cTop_mm, cBot_mm } = geomToMM(foundation, unitSystem);
    const stock_mm = stockToMM(foundation, unitSystem);
    
    if (!(Lx_mm > 0 && Ly_mm > 0 && t_mm > 0)) {
        throw new Error('Enter valid geometry.');
    }
    if (!(cTop_mm > 0 && cBot_mm > 0 && cSide_mm > 0 && (cTop_mm + cBot_mm) < t_mm)) {
        throw new Error('Covers must be >0 and top+bottom < thickness.');
    }
    const rows = [];
    let totalKg = 0;
    const warnings = [];
    
    // LAYERS
    for (let i = 0; i < 4; i++) {
        const layer = foundation.layers[i];
        if (!layer) continue;
        const barIndex = Math.min(layer.barSize, barList.length - 1);
        const bar = barList[barIndex] || barList[0];
        const spacing_mm = spacingToMM(layer.spacing, unitSystem);
        const anch = layer.anchorage || 'straight';
        const Lclear = (layerDefs[i].orient === 'X' ? Lx_mm : Ly_mm) - 2 * cSide_mm;
        const clearPerp = (layerDefs[i].orient === 'X' ? Ly_mm : Lx_mm) - 2 * cSide_mm;
        const count = Math.floor(clearPerp / Math.max(spacing_mm, 1)) + 1;
        
        const d = bar.dia_mm;
        const Llap = lapLength_mm(d, foundation);
        const splice = computePieces(Lclear, stock_mm, anch, d, Llap, foundation);
        if (!splice || !splice.lens || splice.lens.some(x => !isFinite(x) || x <= 0)) {
            warnings.push(`${layerDefs[i].mark}: splicing failed (check lap/bend rules).`);
            continue;
        }
        if (splice.warn) {
            warnings.push(`${layerDefs[i].mark}: piece length exceeds stock with current settings.`);
        }
        const k = splice.k;
        const lens = splice.lens;
        const perPieceLenMax = Math.max(...lens);
        const perPieceLenMin = Math.min(...lens);
        const splicesPerBar = Math.max(0, k - 1);
        const len_m = mmToM(perPieceLenMax);
        const wt_each_kg = len_m * bar.uw_kgpm;
        const pieces = count * k * foundation.quantity;
        const tot_kg = wt_each_kg * pieces;
        totalKg += tot_kg;
        
        let rangeNote = '';
        if (perPieceLenMin !== perPieceLenMax) {
            rangeNote = ` (range ${perPieceLenMin.toFixed(0)}–${perPieceLenMax.toFixed(0)} mm)`;
        }
        rows.push({
            mark: layerDefs[i].mark,
            shape: `Straight${anch === '90' ? ' + 90° end' : ''}`,
            size: bar.label,
            spacing: formatSpacing(spacing_mm),
            clearL: Lclear.toFixed(0),
            orient: layerDefs[i].orient,
            level: layerDefs[i].level,
            piecesPerBar: k,
            splicesPerBar: splicesPerBar,
            cutLength: perPieceLenMax.toFixed(0),
            noOfPieces: pieces,
            wtEach: wt_each_kg.toFixed(2),
            wtTotal: tot_kg.toFixed(1),
            notes: `${splice.note}${rangeNote}`,
            anchorage: anch
        });
    }
    
    // CHAIRS
    if (foundation.chairs && foundation.chairs.enabled) {
        const chairBarIndex = Math.min(foundation.chairs.barSize, barList.length - 1);
        const cBar = barList[chairBarIndex] || barList[0];
        
        let gridX, gridY, foot, seat;
        if (unitSystem === 'metric') {
            gridX = parseFloat(foundation.chairs.gridX) || 0;
            gridY = parseFloat(foundation.chairs.gridY) || 0;
            foot = parseFloat(foundation.chairs.footLength) || 0;
            seat = parseFloat(foundation.chairs.seatLength) || 0;
        } else {
            gridX = ftToMm(feetInchesToDecimal(foundation.chairs.gridX));
            gridY = ftToMm(feetInchesToDecimal(foundation.chairs.gridY));
            foot = ftToMm(feetInchesToDecimal(foundation.chairs.footLength));
            seat = ftToMm(feetInchesToDecimal(foundation.chairs.seatLength));
        }
        
        const nx = Math.ceil(Lx_mm / Math.max(gridX, 1));
        const ny = Math.ceil(Ly_mm / Math.max(gridY, 1));
        const nChairs = nx * ny * foundation.quantity;
        const h = t_mm - (cTop_mm + cBot_mm);
        const bends = foundation.chairs.bends || 4;
        const per90 = bendAllowance90_mm(cBar.dia_mm, foundation);
        
        const cl = (2 * h + 2 * foot + seat) + bends * per90;
        const cl_m = mmToM(cl);
        const w_each_kg = cl_m * cBar.uw_kgpm;
        const w_tot_kg = w_each_kg * nChairs;
        totalKg += w_tot_kg;
        
        rows.push({
            mark: 'C1',
            shape: 'Chair (bent)',
            size: cBar.label,
            spacing: Math.round(gridX) + '×' + Math.round(gridY),
            clearL: '–',
            orient: '-',
            level: 'Supports',
            piecesPerBar: 1,
            splicesPerBar: 0,
            cutLength: cl.toFixed(0),
            noOfPieces: nChairs,
            wtEach: w_each_kg.toFixed(2),
            wtTotal: w_tot_kg.toFixed(1),
            notes: `Left Leg: ${Math.round(h)}mm, Right Leg: ${Math.round(h)}mm, Top Bar: ${Math.round(seat)}mm, Left Foot: ${Math.round(foot)}mm, Right Foot: ${Math.round(foot)}mm, Bends: ${Math.round(bends * per90)}mm`,
            anchorage: 'bent'
        });
    }
    
    return { rows, totalKg, warnings };
}

const calculateRaftFoundation = (req, res) => {
    try {
        const { foundations, unitSystem } = req.body;

        if (!foundations || !Array.isArray(foundations) || foundations.length === 0) {
            return res.status(400).json({ error: 'Foundations array is required' });
        }

        const allRows = [];
        let totalKg = 0;
        const allWarnings = [];
        
        foundations.forEach((foundation, fIndex) => {
            try {
                const result = calculateSingleFoundationBBS(foundation, unitSystem || 'metric');
                result.rows.forEach(row => {
                    allRows.push({
                        ...row,
                        foundationNumber: fIndex + 1,
                        foundationId: foundation.id
                    });
                });
                totalKg += result.totalKg;
                allWarnings.push(...result.warnings.map(w => `Foundation ${fIndex + 1}: ${w}`));
            } catch (err) {
                allWarnings.push(`Foundation ${fIndex + 1}: ${err.message}`);
            }
        });
        
        if (allRows.length === 0) {
            return res.status(400).json({ error: 'No valid foundations to calculate.' });
        }
        
        res.json({
            rows: allRows,
            totalSteel: totalKg.toFixed(0) + ' kg',
            warnings: allWarnings
        });
    } catch (error) {
        console.error('Error calculating raft foundation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateRaftFoundation };
