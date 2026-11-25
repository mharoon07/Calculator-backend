// Helper functions
const FT2M = 0.3048;
const MM2M = 0.001;

const rebarData = {
    metric: [
        { label: '8 mm (0.395 kg/m)', dia_mm: 8.0, uw_kgpm: 0.395 },
        { label: '10 mm (0.617 kg/m)', dia_mm: 10.0, uw_kgpm: 0.617 },
        { label: '12 mm (0.888 kg/m)', dia_mm: 12.0, uw_kgpm: 0.888 },
        { label: '16 mm (1.58 kg/m)', dia_mm: 16.0, uw_kgpm: 1.58 },
        { label: '20 mm (2.47 kg/m)', dia_mm: 20.0, uw_kgpm: 2.47 },
        { label: '25 mm (3.85 kg/m)', dia_mm: 25.0, uw_kgpm: 3.85 },
        { label: '32 mm (6.31 kg/m)', dia_mm: 32.0, uw_kgpm: 6.31 }
    ],
    us: [
        { label: '#2 (Ø6.35 mm)', dia_mm: 6.35, uw_kgpm: 0.249 },
        { label: '#3 (Ø9.53 mm)', dia_mm: 9.53, uw_kgpm: 0.560 },
        { label: '#4 (Ø12.7 mm)', dia_mm: 12.7, uw_kgpm: 0.994 },
        { label: '#5 (Ø15.9 mm)', dia_mm: 15.9, uw_kgpm: 1.552 },
        { label: '#6 (Ø19.1 mm)', dia_mm: 19.1, uw_kgpm: 2.235 },
        { label: '#7 (Ø22.2 mm)', dia_mm: 22.2, uw_kgpm: 3.042 },
        { label: '#8 (Ø25.4 mm)', dia_mm: 25.4, uw_kgpm: 3.973 },
        { label: '#9 (Ø28.7 mm)', dia_mm: 28.7, uw_kgpm: 5.067 },
        { label: '#10 (Ø32.3 mm)', dia_mm: 32.3, uw_kgpm: 6.404 }
    ]
};

function num(v, fb = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
}

function round(v, p = 3) {
    return Math.round((v + Number.EPSILON) * Math.pow(10, p)) / Math.pow(10, p);
}

function mmToM(v) { return num(v) / 1000; }
function ftToM(v) { return num(v) / 3.28084; }

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

function calculateSingleColumn(column, colIndex, unitSystem) {
    const isMetric = unitSystem === 'metric';
    const colW = isMetric ? mmToM(parseFloat(column.colW) || 0) : ftToM(feetInchesToDecimal(column.colW));
    const colH = isMetric ? mmToM(parseFloat(column.colH) || 0) : ftToM(feetInchesToDecimal(column.colH));
    const hClear = isMetric ? mmToM(parseFloat(column.hClear) || 0) : ftToM(feetInchesToDecimal(column.hClear));
    const slabThk = isMetric ? mmToM(parseFloat(column.slabThk) || 0) : ftToM(feetInchesToDecimal(column.slabThk));
    const mbDia = num(column.mbDia);
    const mbCount = num(column.mbCount);
    const colQuantity = num(column.quantity, 1);
    const d_m = mbDia / 1000;
    const mbLapTop = num(column.mbLapTopXd) * d_m;
    const mbDevBotXd = num(column.mbDevBotXd);
    const bend90MulXd = num(column.bend90MulXd);
    const mbDevBotRaw = mbDevBotXd * d_m;
    const bendDed_m = bend90MulXd * d_m;
    const mbDevBot = Math.max(0, mbDevBotRaw - bendDed_m);
    const mbHookExtraXd = num(column.mbHookExtra);
    const mbHookExtra = mbHookExtraXd * d_m;

    const mbRebar = rebarData[unitSystem].find((r) => Math.abs(r.dia_mm - mbDia) < 0.01) || rebarData[unitSystem][0];
    const mbUW = mbRebar.uw_kgpm;
    const mbLenEach = hClear + slabThk + mbLapTop + mbDevBot + 2 * mbHookExtra;
    const mbTotLen = mbLenEach * mbCount * colQuantity;
    const mbTotWt = mbTotLen * mbUW;

    const rows = [];
    rows.push({
        Item: 'Main Bars',
        BarDia: mbRebar.label,
        Count: mbCount * colQuantity,
        LenEach: round(mbLenEach * 1000, 0),
        TotLen: round(mbTotLen * 1000, 0),
        UW: round(mbUW, 3),
        TotWt: round(mbTotWt, 2),
        Shape: 'Straight bar with optional 90° bottom bend',
        Cut: `${round(hClear * 1000, 0)} + ${round(slabThk * 1000, 0)} + (${round(mbLapTop * 1000, 0)} top) + (${round(mbDevBotRaw * 1000, 0)} − ${round(bendDed_m * 1000, 0)} bottom) + 2×${round(mbHookExtra * 1000, 0)} = ${round(mbLenEach * 1000, 0)} mm`,
        Notes: `Top ${column.mbLapTopXd}d; Bottom ${mbDevBotXd}d · 90° deduction ${bend90MulXd}d · Hook extra ${mbHookExtraXd}d for ${colQuantity} column${colQuantity > 1 ? 's' : ''}`,
        columnNumber: colIndex + 1,
        columnQuantity: colQuantity
    });

    let tiesTotalLen = 0, tiesTotalWt = 0;
    column.ties.forEach((t, i) => {
        const dia = num(t.dia);
        const clearW = isMetric ? mmToM(parseFloat(t.clearW) || 0) : ftToM(feetInchesToDecimal(t.clearW));
        const clearH = isMetric ? mmToM(parseFloat(t.clearH) || 0) : ftToM(feetInchesToDecimal(t.clearH));
        const spacing = t.spacing === '' ? null : (isMetric ? mmToM(parseFloat(t.spacing) || 0) : ftToM(feetInchesToDecimal(t.spacing)));
        const effH = t.effH === '' ? hClear : (isMetric ? mmToM(parseFloat(t.effH) || 0) : ftToM(feetInchesToDecimal(t.effH)));
        const countOverride = t.count === '' ? null : parseInt(t.count, 10);
        const hooks = parseInt(String(t.hooks || 2), 10);
        const hookMul = num(t.hookMul || 10);
        const hookAllowance = hooks * hookMul * (dia / 1000);
        const lenEach = 2 * (clearW + clearH) + hookAllowance;
        const count = countOverride != null ? countOverride : (spacing ? Math.ceil(effH / spacing) : 0);
        const totLen = lenEach * count * colQuantity;
        const tieRebar = rebarData[unitSystem].find((r) => Math.abs(r.dia_mm - dia) < 0.01) || rebarData[unitSystem][0];
        const uw = tieRebar.uw_kgpm;
        const totWt = totLen * uw;
        tiesTotalLen += totLen; tiesTotalWt += totWt;
        rows.push({
            Item: `Ties Set ${i + 1}`,
            BarDia: tieRebar.label,
            Count: count * colQuantity,
            LenEach: round(lenEach * 1000, 0),
            TotLen: round(totLen * 1000, 0),
            UW: round(uw, 3),
            TotWt: round(totWt, 2),
            Shape: `Rectangular tie (${hooks} hooks)`,
            Cut: `2×(${round(clearW * 1000, 0)} + ${round(clearH * 1000, 0)}) + hooks(${hooks}×${hookMul}×${(dia / 1000).toFixed(3)}) = ${round(lenEach * 1000, 0)} mm`,
            Notes: `Clear ${Math.round(clearW * 1000)}×${Math.round(clearH * 1000)} mm · ` + (spacing ? `@${round(spacing * 1000, 0)} mm c/c over ${round(effH * 1000, 0)} mm` : `${count} nos`) + ` for ${colQuantity} column${colQuantity > 1 ? 's' : ''}`,
            columnNumber: colIndex + 1,
            columnQuantity: colQuantity
        });
    });

    return { rows, mbTotWt, tiesTotalWt };
}

const calculateColumnBBS = (req, res) => {
    try {
        const { columns, unitSystem } = req.body;

        if (!columns || !Array.isArray(columns) || columns.length === 0) {
            return res.status(400).json({ error: 'Columns array is required' });
        }

        const allRows = [];
        let totalWt = 0;
        let totalLen = 0;

        columns.forEach((column, colIndex) => {
            const result = calculateSingleColumn(column, colIndex, unitSystem || 'metric');
            allRows.push(...result.rows);
            totalWt += result.mbTotWt + result.tiesTotalWt;
            result.rows.forEach(row => {
                totalLen += row.TotLen;
            });
        });

        const totalQuantity = columns.reduce((sum, col) => sum + num(col.quantity, 1), 0);

        res.json({
            rows: allRows,
            totals: {
                TotLen: round(totalLen, 0),
                TotWt: round(totalWt, 2)
            },
            meta: { columnCount: columns.length, totalQuantity }
        });
    } catch (error) {
        console.error('Error calculating column BBS:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateColumnBBS };
