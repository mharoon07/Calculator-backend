// Helper functions
const FT2M = 0.3048;
const FT2MM = 304.8;
const IN2MM = 25.4;
const MM2IN = 1 / 25.4;
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

function toMM(val) {
    if (typeof val === 'string' && (val.includes("'") || val.includes('"'))) {
        const decimalFeet = feetInchesToDecimal(val);
        return Math.round(decimalFeet * 12 * IN2MM);
    }
    const numValue = typeof val === 'number' ? val : parseFloat(val);
    return numValue || 0;
}

function splitSideStraight(sideLenFt, stockLimitFt, lapFt) {
    if (stockLimitFt <= 0 || sideLenFt <= 0) {
        return { n: 0, laps: 0, lengths: [], totalLenFt: 0, remainderBase: 0 };
    }
    if (lapFt >= stockLimitFt) {
        return { n: 1, laps: 0, lengths: [sideLenFt], totalLenFt: sideLenFt, remainderBase: sideLenFt };
    }
    let n = 1;
    const maxIterations = 1000;
    let iterations = 0;
    while (n * stockLimitFt - (n - 1) * lapFt < sideLenFt && iterations < maxIterations) {
        n++;
        iterations++;
    }
    if (iterations >= maxIterations) {
        return { n: 1, laps: 0, lengths: [sideLenFt], totalLenFt: sideLenFt, remainderBase: sideLenFt };
    }
    const lengths = [];
    for (let i = 0; i < n - 1; i++) lengths.push(stockLimitFt);
    const remainderIncLap = sideLenFt - (n - 1) * stockLimitFt + (n - 1) * lapFt;
    const remainderBase = Math.max(0, sideLenFt - (n - 1) * stockLimitFt);
    lengths.push(Math.max(0.1, remainderIncLap));
    const totalLenFt = lengths.reduce((a, b) => a + b, 0);
    const laps = Math.max(0, n - 1);
    return { n, laps, lengths, totalLenFt, remainderBase };
}

function straightDistribution(clearLenFt, clearWidFt, stockLimitFt, lapFt) {
    const longSide = splitSideStraight(clearLenFt, stockLimitFt, lapFt);
    const shortSide = splitSideStraight(clearWidFt, stockLimitFt, lapFt);
    return { longSide, shortSide };
}

function coursesFromSpacing(spacing_in, gross_dim_ft) {
    if (!spacing_in || spacing_in <= 0 || !gross_dim_ft || gross_dim_ft <= 0) return 0;
    const D_in = gross_dim_ft * 12;
    return Math.floor(D_in / spacing_in) + 1;
}

const barCatalog = {
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

function fmt(n, d = 2) {
    const x = Number.isFinite(n) ? n : 0;
    return x.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

const calculateRetainingWallBBS = (req, res) => {
    try {
        const { wall, unitSystem } = req.body;

        if (!wall || !unitSystem) {
            return res.status(400).json({ error: 'Wall data and unit system are required' });
        }

        // Convert all inputs to mm for calculations
        const length_mm = toMM(wall.plotLength);
        const width_mm = toMM(wall.plotWidth);
        const wall_thk_mm = toMM(wall.wallThickness);
        const wall_height_mm = toMM(wall.wallHeight);
        const footing_width_mm = toMM(wall.footingWidth);
        const stock_limit_mm = toMM(wall.stockLimit);

        // Convert to feet for calculations
        const length_ft = length_mm / FT2MM;
        const width_ft = width_mm / FT2MM;
        const wall_thk_in = wall_thk_mm / IN2MM;
        const wall_height_ft = wall_height_mm / FT2MM;
        const footing_width_ft = footing_width_mm / FT2MM;
        const stock_limit_ft = stock_limit_mm / FT2MM;

        // Get bar data
        const catalogKey = unitSystem === 'imperial' ? 'us' : unitSystem;
        const catalog = barCatalog[catalogKey] || barCatalog.metric;
        const main_bar = catalog[wall.mainBarSize] || catalog[2];
        const dist_wall_bar = catalog[wall.distWallBarSize] || catalog[2];
        const dist_foot_bar = catalog[wall.distFootBarSize] || catalog[2];

        const dMain_in = main_bar.dia_mm * MM2IN;
        const dWall_in = dist_wall_bar.dia_mm * MM2IN;
        const dFoot_in = dist_foot_bar.dia_mm * MM2IN;

        const wtMain_kgpm = main_bar.uw_kgpm;
        const wtWall_kgpm = dist_wall_bar.uw_kgpm;
        const wtFoot_kgpm = dist_foot_bar.uw_kgpm;

        // Laps (in feet)
        const lap_main_ft = (wall.lapMainMode === '40d') ? (40 * dMain_in) / 12 : toMM(wall.lapMainCustom) / FT2MM;
        const lap_wall_ft = (wall.lapWallMode === '40d') ? (40 * dWall_in) / 12 : toMM(wall.lapWallCustom) / FT2MM;
        const lap_foot_ft = (wall.lapFootMode === '40d') ? (40 * dFoot_in) / 12 : toMM(wall.lapFootCustom) / FT2MM;

        // Spacing inputs
        const vert_spacing_in = toMM(wall.verticalSpacing) / IN2MM;
        const wall_spacing_long_in = toMM(wall.wallSpacingLong) / IN2MM;
        const wall_spacing_short_in = toMM(wall.wallSpacingShort) / IN2MM;
        const foot_spacing_long_in = toMM(wall.footSpacingLong) / IN2MM;
        const foot_spacing_short_in = toMM(wall.footSpacingShort) / IN2MM;

        // Covers
        const cov_v_wallface_in = toMM(wall.coverVWallFace) / IN2MM;
        const cov_v_bottom_in = toMM(wall.coverVBottom) / IN2MM;
        const cov_v_side_in = toMM(wall.coverVSide) / IN2MM;

        const cov_h_wall_end_in = toMM(wall.coverHWallEnd) / IN2MM;
        const cov_h_foot_end_in = toMM(wall.coverHFootEnd) / IN2MM;

        // Clear side lengths
        const clear_len_ft = Math.max(1, length_ft - 2 * (cov_h_wall_end_in) / 12);
        const clear_wid_ft = Math.max(1, width_ft - 2 * (cov_h_wall_end_in) / 12);
        const clear_len_foot_ft = Math.max(1, length_ft - 2 * (cov_h_foot_end_in) / 12);
        const clear_wid_foot_ft = Math.max(1, width_ft - 2 * (cov_h_foot_end_in) / 12);

        // Main vertical qty
        const perimeter = 2 * (length_ft + width_ft);
        const spacing_ft = vert_spacing_in > 0 ? (vert_spacing_in / 12) : 0;
        const vertical_qty = spacing_ft > 0 ? Math.floor(perimeter / spacing_ft) + 1 : 0;

        // Main vertical cutting length
        const footing_len_in = wall_thk_in + (footing_width_ft * 12);
        const H_in = wall_height_ft * 12;
        const Lap_in = lap_main_ft * 12;

        const Lh_in = Math.max(0, footing_len_in - cov_v_wallface_in - cov_v_side_in - 2 * dMain_in);
        const Lv_in = Math.max(0, H_in - cov_v_bottom_in);
        const L_total_in = Lh_in + Lv_in + Lap_in;
        const vertical_len_each_ft = L_total_in / 12;

        // Convert to mm for display
        const Lh_mm = Lh_in * IN2MM;
        const Lv_mm = Lv_in * IN2MM;
        const Lap_mm = Lap_in * IN2MM;
        const vertical_len_each_mm = vertical_len_each_ft * FT2MM;

        // Corner extras
        const corner_qty = wall.cornerEnable ? wall.cornerBarsEach * wall.cornerCount : 0;

        // Distribution
        const wallDist = straightDistribution(clear_len_ft, clear_wid_ft, stock_limit_ft, lap_wall_ft);
        const footDist = {
            longSide: splitSideStraight(clear_len_foot_ft, stock_limit_ft, lap_foot_ft),
            shortSide: splitSideStraight(clear_wid_foot_ft, stock_limit_ft, lap_foot_ft)
        };

        // Courses
        const wall_courses_long = coursesFromSpacing(wall_spacing_long_in, wall_height_ft);
        const wall_courses_short = coursesFromSpacing(wall_spacing_short_in, wall_height_ft);
        const foot_courses_long = coursesFromSpacing(foot_spacing_long_in, footing_width_ft);
        const foot_courses_short = coursesFromSpacing(foot_spacing_short_in, footing_width_ft);

        const rows = [];

        // Main verticals
        const v_perPiece_kg = vertical_len_each_ft * FT2M * wtMain_kgpm;
        
        rows.push({
            wallSide: 'Main bar vertical (all sides)',
            size: main_bar.label,
            desc: 'Main bar (vertical)',
            dia: `${fmt(main_bar.dia_mm, 1)} mm`,
            perPieceLen: `${Math.round(vertical_len_each_mm)} mm`,
            perPieceWt: `${fmt(v_perPiece_kg, 2)} kg`,
            qty: vertical_qty,
            totalLen: `${Math.round(vertical_qty * vertical_len_each_mm)} mm`,
            totalWt: `${fmt((vertical_qty * vertical_len_each_ft * FT2M * wtMain_kgpm), 2)} kg`,
            shape: 'Straight with 90° bend',
            dim: `Lh=${Math.round(Lh_mm)} mm (after −2d & covers), Lv=${Math.round(Lv_mm)} mm, Lap=${Math.round(Lap_mm)} mm; Cut=Lh+Lv+Lap`,
        });

        // Corner extras
        if (corner_qty > 0) {
            rows.push({
                wallSide: 'Corners (extras)',
                size: main_bar.label,
                desc: 'Main bar (corner extras)',
                dia: `${fmt(main_bar.dia_mm, 1)} mm`,
                perPieceLen: `${Math.round(vertical_len_each_mm)} mm`,
                perPieceWt: `${fmt(v_perPiece_kg, 2)} kg`,
                qty: corner_qty,
                totalLen: `${Math.round(corner_qty * vertical_len_each_mm)} mm`,
                totalWt: `${fmt((corner_qty * vertical_len_each_ft * FT2M * wtMain_kgpm), 2)} kg`,
                shape: 'Straight with 90° bend',
                dim: 'Same as main vertical',
            });
        }

        // Helper function to add distribution rows
        const addDistRows = (isLongSide, labelSide, distObj, size, diaIn, wt_kgpm, coursesPerSide, lapFt, stockLimitFt, cc_in, clear_side_ft, covers_note) => {
            const sides = isLongSide ? distObj.longSide : distObj.shortSide;
            if (!sides || sides.n === 0 || coursesPerSide <= 0) return;

            const pieces = sides.lengths;
            const nPerSide = sides.n;
            const lapsPerSide = sides.laps;

            pieces.forEach((lenFt, idx) => {
                if (lenFt <= 0) return;
                
                const isRemainder = (idx === nPerSide - 1);
                const pieceLabel = isRemainder ? `Piece ${idx + 1} (remainder + laps)` : `Piece ${idx + 1} (stock)`;

                let actualCuttingLengthFt = lenFt;
                if (isRemainder && lapsPerSide > 0) {
                    actualCuttingLengthFt = sides.remainderBase + (lapsPerSide * lapFt);
                }

                const len_mm = actualCuttingLengthFt * FT2MM;
                const qty = coursesPerSide * 2;
                const per_kg = actualCuttingLengthFt * FT2M * wt_kgpm;

                const sublabel = isRemainder && lapsPerSide > 0 ? `≈ ${Math.round(sides.remainderBase * FT2MM)} + ${lapsPerSide}×${Math.round(lapFt * FT2MM)} mm` : '';

                rows.push({
                    wallSide: labelSide,
                    size: size.label,
                    desc: 'Distribution bar',
                    dia: `${fmt(size.dia_mm, 1)} mm`,
                    perPieceLen: `${Math.round(len_mm)} mm`,
                    perPieceWt: `${fmt(per_kg, 2)} kg`,
                    qty: qty,
                    totalLen: `${Math.round(qty * len_mm)} mm`,
                    totalWt: `${fmt((qty * actualCuttingLengthFt * FT2M * wt_kgpm), 2)} kg`,
                    shape: 'Straight',
                    dim: `${pieceLabel}; Lap=${Math.round(lapFt * FT2MM)} mm; c/c=${Math.round(cc_in * IN2MM)} mm; Clear side=${Math.round(clear_side_ft * FT2MM)} mm; ${covers_note}`,
                });
            });
        };

        // Wall distribution rows
        addDistRows(true, 'Horizontal bar on Length side (wall)', wallDist, dist_wall_bar, dWall_in, wtWall_kgpm, wall_courses_long, lap_wall_ft, stock_limit_ft, wall_spacing_long_in, clear_len_ft, `End covers=${Math.round(cov_h_wall_end_in * IN2MM)} mm each`);
        addDistRows(false, 'Horizontal bar on Short side (wall)', wallDist, dist_wall_bar, dWall_in, wtWall_kgpm, wall_courses_short, lap_wall_ft, stock_limit_ft, wall_spacing_short_in, clear_wid_ft, `End covers=${Math.round(cov_h_wall_end_in * IN2MM)} mm each`);

        // Footing distribution rows
        addDistRows(true, 'Horizontal bar on Length side (footing)', footDist, dist_foot_bar, dFoot_in, wtFoot_kgpm, foot_courses_long, lap_foot_ft, stock_limit_ft, foot_spacing_long_in, clear_len_foot_ft, `End covers=${Math.round(cov_h_foot_end_in * IN2MM)} mm each`);
        addDistRows(false, 'Horizontal bar on Short side (footing)', footDist, dist_foot_bar, dFoot_in, wtFoot_kgpm, foot_courses_short, lap_foot_ft, stock_limit_ft, foot_spacing_short_in, clear_wid_foot_ft, `End covers=${Math.round(cov_h_foot_end_in * IN2MM)} mm each`);

        // Calculate grand total
        const grandTotal = rows.reduce((sum, row) => {
            const weightStr = row.totalWt.split(' ')[0];
            return sum + parseFloat(weightStr) || 0;
        }, 0);

        res.json({
            rows,
            grandTotal,
            inputs: {
                plotSize: `${length_mm} mm × ${width_mm} mm`,
                perimeter: `${Math.round(2 * (length_mm + width_mm))} mm`,
                vertical_qty,
                unitSystem
            }
        });
    } catch (error) {
        console.error('Error calculating retaining wall BBS:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateRetainingWallBBS };
