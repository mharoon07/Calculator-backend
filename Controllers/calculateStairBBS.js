// Convert feet and inches to mm
function feetInchesToMM(feetInches) {
    if (!feetInches || feetInches === '') return 0;
    const str = feetInches.toString().trim();
    const IN2MM = 25.4;
    const FT2MM = 304.8;

    const match = str.match(/^(\d+(?:\.\d+)?)[''](\d+(?:\.\d+)?)[""]?$/) ||
        str.match(/^(\d+(?:\.\d+)?)\s*['']?\s*(\d+(?:\.\d+)?)?\s*[""]?$/);

    if (!match) {
        const num = parseFloat(str);
        if (isNaN(num)) return 0;
        return num < 100 ? num * IN2MM : num * FT2MM;
    }

    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;

    if (inches >= 12) {
        const extraFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return (feet + extraFeet) * FT2MM + remainingInches * IN2MM;
    }

    return feet * FT2MM + inches * IN2MM;
}

// Calculate BBS for a single floor
function calculateFloorBBS(inputs, floorNumber, hasTopSlab, numberOfFloors) {
    const {
        N1, N2, T, R, LL, Lslab,
        W_clear, W_mid, W_slab, cover,
        Ld_p, Ld_lb, Ld_ts,
        sm, sf, sL,
        phi_main, phi_extra, phi_dist
    } = inputs;

    // Validate inputs
    if (N1 === null || N1 === undefined || N1 === '' ||
        N2 === null || N2 === undefined || N2 === '' ||
        !T || !R || !LL || !W_clear || !cover) {
        return { rows: [], totals: null };
    }

    const floorHasTopSlab = hasTopSlab[floorNumber] || false;

    if (floorHasTopSlab && (!Lslab || !W_slab)) {
        return { rows: [], totals: null };
    }

    const isGroundFloor = floorNumber === 0;

    // Convert all dimensions to mm
    const N1_int = parseInt(N1);
    const N2_int = parseInt(N2);
    const T_mm = typeof T === 'string' ? feetInchesToMM(T) : T;
    const R_mm = typeof R === 'string' ? feetInchesToMM(R) : R;
    const LL_mm = typeof LL === 'string' ? feetInchesToMM(LL) : LL;
    const Lslab_mm = Lslab ? (typeof Lslab === 'string' ? feetInchesToMM(Lslab) : Lslab) : 0;
    const W_clear_mm = typeof W_clear === 'string' ? feetInchesToMM(W_clear) : W_clear;
    const W_mid_mm = W_mid ? (typeof W_mid === 'string' ? feetInchesToMM(W_mid) : W_mid) : 0;
    const W_slab_mm = W_slab ? (typeof W_slab === 'string' ? feetInchesToMM(W_slab) : W_slab) : 0;
    const cover_mm = typeof cover === 'string' ? feetInchesToMM(cover) : cover;
    const Ld_p_mm = Ld_p ? (typeof Ld_p === 'string' ? feetInchesToMM(Ld_p) : Ld_p) : 0;
    const Ld_lb_mm = typeof Ld_lb === 'string' ? feetInchesToMM(Ld_lb) : Ld_lb;
    const Ld_ts_mm = Ld_ts ? (typeof Ld_ts === 'string' ? feetInchesToMM(Ld_ts) : Ld_ts) : 0;
    const sm_mm = typeof sm === 'string' ? feetInchesToMM(sm) : sm;
    const sf_mm = typeof sf === 'string' ? feetInchesToMM(sf) : sf;
    const sL_mm = typeof sL === 'string' ? feetInchesToMM(sL) : sL;

    // Flight slopes (waist lengths)
    const Lw1 = Math.sqrt((N1_int * T_mm) ** 2 + (N1_int * R_mm) ** 2);
    const Lw2 = Math.sqrt((N2_int * T_mm) ** 2 + (N2_int * R_mm) ** 2);

    const Lw1_4 = Lw1 / 4;
    const Lw2_4 = Lw2 / 4;

    // Main bar quantity per stair width
    const qty_main_flight = Math.max(1, Math.floor(W_clear_mm / sm_mm) + 1);

    // Extra middle landing width
    const qty_main_mid = W_mid_mm > 0 ? Math.max(1, Math.floor(W_mid_mm / sm_mm) + 1) : 0;

    // Steel unit weights (kg/m) using φ^2 / 162
    const unitWtMain = phi_main > 0 ? (phi_main * phi_main) / 162.0 : 0;
    const unitWtExtra = phi_extra > 0 ? (phi_extra * phi_extra) / 162.0 : 0;
    const unitWtDist = phi_dist > 0 ? (phi_dist * phi_dist) / 162.0 : 0;

    const rows = [];

    // Pre-calculate distribution bar values
    const L_dist_stair = W_clear_mm - 2 * cover_mm;
    const L_dist_land = 2 * W_clear_mm + W_mid_mm - 2 * cover_mm;

    // ========== FLIGHT 1 SECTION ==========

    // Main bottom Flight 1
    const Mb1 = isGroundFloor
        ? Ld_p_mm + Math.sqrt(((N1_int + 1) * T_mm) ** 2 + (N1_int * R_mm) ** 2) + (LL_mm - T_mm) + Ld_lb_mm
        : Ld_lb_mm + Math.sqrt(((N1_int + 1) * T_mm) ** 2 + (N1_int * R_mm) ** 2) + (LL_mm - T_mm) + Ld_lb_mm;

    rows.push({
        name: 'Main bottom – Flight 1',
        len_mm: Mb1,
        qty: qty_main_flight,
        unitWt: unitWtMain,
        group: 'main',
        note: isGroundFloor
            ? `Plinth → slope (+1 tread) → landing − 1 tread → down into landing beam, s_m = ${sm_mm}, qty ≈ ${qty_main_flight} / flight width`
            : `Landing beam → slope (+1 tread) → landing − 1 tread → down into landing beam, s_m = ${sm_mm}, qty ≈ ${qty_main_flight} / flight width`,
    });

    // Distribution – Main bottom Flight 1
    const seg1 = Lw1;
    const qty1 = Math.max(1, Math.floor(seg1 / sf_mm) + 1);
    rows.push({
        name: 'Distribution – Main bottom Flight 1',
        len_mm: L_dist_stair,
        qty: qty1,
        unitWt: unitWtDist,
        group: 'dist',
        note: `Bars across width (W_clear − 2c). Span ≈ ${seg1.toFixed(0)} mm, s_f = ${sf_mm}, qty ≈ ${qty1}`,
    });

    // Extra top – Flight 1 plinth side (only for ground floor)
    if (isGroundFloor) {
        const Extra1 = Lw1 / 3 + Ld_p_mm;
        rows.push({
            name: 'Extra top – Flight 1 plinth side (Lw1/3 + Ld_p)',
            len_mm: Extra1,
            qty: qty_main_flight,
            unitWt: unitWtExtra,
            group: 'extra',
            note: `Extra top at plinth side of Flight 1, s_m = ${sm_mm}, qty ≈ ${qty_main_flight}`,
        });

        // Distribution – Extra top F1 (plinth side)
        const seg4 = Lw1_4;
        const qty4 = Math.max(1, Math.floor(seg4 / sf_mm) + 1);
        rows.push({
            name: 'Distribution – Extra top F1 (plinth side)',
            len_mm: L_dist_stair,
            qty: qty4,
            unitWt: unitWtDist,
            group: 'dist',
            note: `Bars across width under Lw1/4 near plinth. Span ≈ ${seg4.toFixed(0)} mm, s_f = ${sf_mm}, qty ≈ ${qty4}`,
        });
    }

    // Extra top – Flight 1 landing side
    const Lw1_3 = Lw1 / 3;
    const Extra2 = Lw1_3 + (LL_mm - T_mm) + Ld_lb_mm;
    rows.push({
        name: 'Extra top – Flight 1 landing side (Lw1/3 + landing − T + Ld_lb)',
        len_mm: Extra2,
        qty: qty_main_flight,
        unitWt: unitWtExtra,
        group: 'extra',
        note: `Flight 1 top L/3 + landing − 1 tread + Ld into landing beam, s_m = ${sm_mm}, qty ≈ ${qty_main_flight}`,
    });

    // Distribution – Extra top F1 (landing side)
    const seg5 = Lw1_3;
    const qty5 = Math.max(1, Math.floor(seg5 / sf_mm) + 1);
    rows.push({
        name: 'Distribution – Extra top F1 (landing side)',
        len_mm: L_dist_stair,
        qty: qty5,
        unitWt: unitWtDist,
        group: 'dist',
        note: `Bars across width under Lw1/3 near landing. Span ≈ ${seg5.toFixed(0)} mm, s_f = ${sf_mm}, qty ≈ ${qty5}`,
    });

    // ========== MIDDLE LANDING SECTION ==========

    // Main bottom – Landing extra width (mid strip) - if exists
    if (qty_main_mid > 0) {
        const L_main_mid = (LL_mm - 2 * cover_mm) + 2 * Ld_lb_mm;

        rows.push({
            name: 'Main bottom – Landing (mid strip)',
            len_mm: L_main_mid,
            qty: qty_main_mid,
            unitWt: unitWtMain,
            group: 'main',
            note: `Extra main bars only in middle strip (W_mid). Length ≈ (LL − 2c) + 2·Ld_beam. s_m = ${sm_mm}, qty ≈ ${qty_main_mid}`,
        });

        // Distribution – Main bottom Landing
        const seg2 = LL_mm;
        const qty2 = Math.max(1, Math.floor(seg2 / sL_mm) + 1);
        rows.push({
            name: 'Distribution – Main bottom Landing',
            len_mm: L_dist_land,
            qty: qty2,
            unitWt: unitWtDist,
            group: 'dist',
            note: `Bars across landing width (2·W_clear + W_mid − 2c). Span ≈ ${seg2.toFixed(0)} mm, s_L = ${sL_mm}, qty ≈ ${qty2}`,
        });

        // Extra top – Landing (mid strip)
        const L_extra_mid = (LL_mm - 2 * cover_mm) + 2 * Ld_lb_mm;

        rows.push({
            name: 'Extra top – Landing (mid strip)',
            len_mm: L_extra_mid,
            qty: qty_main_mid,
            unitWt: unitWtExtra,
            group: 'extra',
            note: `Top extra bars only in middle landing strip W_mid, s_m = ${sm_mm}, qty ≈ ${qty_main_mid}`,
        });

        // Distribution – Extra top Landing
        const seg6 = LL_mm;
        const qty6 = Math.max(1, Math.floor(seg6 / sL_mm) + 1);
        rows.push({
            name: 'Distribution – Extra top Landing',
            len_mm: L_dist_land,
            qty: qty6,
            unitWt: unitWtDist,
            group: 'dist',
            note: `Bars across full landing width. Span ≈ ${seg6.toFixed(0)} mm, s_L = ${sL_mm}, qty ≈ ${qty6}`,
        });
    } else {
        // If no mid strip, add landing distribution after Flight 1
        const seg2 = LL_mm;
        const qty2 = Math.max(1, Math.floor(seg2 / sL_mm) + 1);
        rows.push({
            name: 'Distribution – Main bottom Landing',
            len_mm: L_dist_land,
            qty: qty2,
            unitWt: unitWtDist,
            group: 'dist',
            note: `Bars across landing width (2·W_clear + W_mid − 2c). Span ≈ ${seg2.toFixed(0)} mm, s_L = ${sL_mm}, qty ≈ ${qty2}`,
        });

        // Distribution – Extra top Landing
        const seg6 = LL_mm;
        const qty6 = Math.max(1, Math.floor(seg6 / sL_mm) + 1);
        rows.push({
            name: 'Distribution – Extra top Landing',
            len_mm: L_dist_land,
            qty: qty6,
            unitWt: unitWtDist,
            group: 'dist',
            note: `Bars across full landing width. Span ≈ ${seg6.toFixed(0)} mm, s_L = ${sL_mm}, qty ≈ ${qty6}`,
        });
    }

    // ========== FLIGHT 2 SECTION ==========

    // Main bottom Flight 2
    const Mb2 = floorHasTopSlab
        ? Ld_lb_mm + (LL_mm - T_mm) + Math.sqrt(((N2_int + 1) * T_mm) ** 2 + (N2_int * R_mm) ** 2) + Ld_ts_mm
        : Ld_lb_mm + (LL_mm - T_mm) + Math.sqrt(((N2_int + 1) * T_mm) ** 2 + (N2_int * R_mm) ** 2);

    rows.push({
        name: 'Main bottom – Flight 2',
        len_mm: Mb2,
        qty: qty_main_flight,
        unitWt: unitWtMain,
        group: 'main',
        note: floorHasTopSlab
            ? `Landing beam → landing − 1 tread → slope (+1 tread) → into top slab, s_m = ${sm_mm}, qty ≈ ${qty_main_flight} / flight width`
            : `Landing beam → landing − 1 tread → slope (+1 tread), s_m = ${sm_mm}, qty ≈ ${qty_main_flight} / flight width`,
    });

    // Distribution – Main bottom Flight 2
    const seg3 = Lw2;
    const qty3 = Math.max(1, Math.floor(seg3 / sf_mm) + 1);
    rows.push({
        name: 'Distribution – Main bottom Flight 2',
        len_mm: L_dist_stair,
        qty: qty3,
        unitWt: unitWtDist,
        group: 'dist',
        note: `Bars across width (W_clear − 2c). Span ≈ ${seg3.toFixed(0)} mm, s_f = ${sf_mm}, qty ≈ ${qty3}`,
    });

    // Extra top – Flight 2 landing side
    const Extra3 = Lw2 / 3 + Ld_lb_mm;
    rows.push({
        name: 'Extra top – Flight 2 landing side (Lw2/3 + Ld_lb)',
        len_mm: Extra3,
        qty: qty_main_flight,
        unitWt: unitWtExtra,
        group: 'extra',
        note: `Extra top from landing beam up Flight 2, s_m = ${sm_mm}, qty ≈ ${qty_main_flight}`,
    });

    // Distribution – Extra top F2 (landing side)
    const seg7 = Lw2_4;
    const qty7 = Math.max(1, Math.floor(seg7 / sf_mm) + 1);
    rows.push({
        name: 'Distribution – Extra top F2 (landing side)',
        len_mm: L_dist_stair,
        qty: qty7,
        unitWt: unitWtDist,
        group: 'dist',
        note: `Bars across width under Lw2/4 from landing. Span ≈ ${seg7.toFixed(0)} mm, s_f = ${sf_mm}, qty ≈ ${qty7}`,
    });

    // Extra top – Flight 2 slab side (only if top slab exists for this floor)
    if (floorHasTopSlab) {
        const Lw2_3 = Lw2 / 3;
        const Extra4 = Ld_ts_mm + Lslab_mm + Lw2_3 - 2 * cover_mm;
        rows.push({
            name: 'Extra top – Flight 2 slab side (Ld_ts + Lslab + Lw2/3 − 2c)',
            len_mm: Extra4,
            qty: qty_main_flight,
            unitWt: unitWtExtra,
            group: 'extra',
            note: `Extra top up Flight 2 then into slab, s_m = ${sm_mm}, qty ≈ ${qty_main_flight}`,
        });

        // Distribution – Extra top F2 (slab side)
        const seg8 = Lw2_3;
        const qty8 = Math.max(1, Math.floor(seg8 / sf_mm) + 1);
        rows.push({
            name: 'Distribution – Extra top F2 (slab side)',
            len_mm: L_dist_stair,
            qty: qty8,
            unitWt: unitWtDist,
            group: 'dist',
            note: `Bars across width under Lw2/3 near slab. Span ≈ ${seg8.toFixed(0)} mm, s_f = ${sf_mm}, qty ≈ ${qty8}`,
        });
    }

    // ---------- TOP SLAB BARS (if top slab exists for this floor) ----------
    if (floorHasTopSlab && Lslab_mm && W_slab_mm) {
        const qty_slab = Math.max(1, Math.floor(W_slab_mm / sm_mm) + 1);

        // Top slab bottom bar
        const slab_bottom = Lslab_mm - 2 * cover_mm;
        rows.push({
            name: 'Top slab – Bottom bar',
            len_mm: slab_bottom,
            qty: qty_slab,
            unitWt: unitWtMain,
            group: 'main',
            note: `Bottom bars in top slab. Width = ${W_slab_mm.toFixed(0)} mm, s_m = ${sm_mm}, qty ≈ ${qty_slab}`,
        });

        // Top slab top bar
        const slab_top = Lslab_mm - 2 * cover_mm;
        rows.push({
            name: 'Top slab – Top bar',
            len_mm: slab_top,
            qty: qty_slab,
            unitWt: unitWtExtra,
            group: 'extra',
            note: `Top bars in top slab. Width = ${W_slab_mm.toFixed(0)} mm, s_m = ${sm_mm}, qty ≈ ${qty_slab}`,
        });

        // Top slab distribution bar
        const L_dist_slab = W_slab_mm - 2 * cover_mm;
        const slab_span = Lslab_mm;
        const qty_slab_dist = Math.max(1, Math.floor(slab_span / sL_mm) + 1);
        rows.push({
            name: 'Top slab – Distribution bar',
            len_mm: L_dist_slab,
            qty: qty_slab_dist,
            unitWt: unitWtDist,
            group: 'dist',
            note: `Distribution bars across slab width (W_slab − 2c). Span ≈ ${slab_span.toFixed(0)} mm, s_L = ${sL_mm}, qty ≈ ${qty_slab_dist}`,
        });
    }

    // Calculate totals
    let totalMainLen = 0, totalMainKg = 0;
    let totalExtraLen = 0, totalExtraKg = 0;
    let totalDistLen = 0, totalDistKg = 0;

    rows.forEach(row => {
        const len_m = row.len_mm / 1000.0;
        const totLenM = len_m * row.qty;
        const totKg = row.unitWt * totLenM;

        if (row.group === 'main') {
            totalMainLen += totLenM;
            totalMainKg += totKg;
        } else if (row.group === 'extra') {
            totalExtraLen += totLenM;
            totalExtraKg += totKg;
        } else if (row.group === 'dist') {
            totalDistLen += totLenM;
            totalDistKg += totKg;
        }
    });

    const grandLen = totalMainLen + totalExtraLen + totalDistLen;
    const grandKg = totalMainKg + totalExtraKg + totalDistKg;

    return {
        rows,
        totals: {
            main: { len: totalMainLen, kg: totalMainKg },
            extra: { len: totalExtraLen, kg: totalExtraKg },
            dist: { len: totalDistLen, kg: totalDistKg },
            grand: { len: grandLen, kg: grandKg },
        },
    };
}

const calculateStairBBS = (req, res) => {
    try {
        const { inputs, numberOfFloors, hasTopSlab } = req.body;

        if (!inputs) {
            return res.status(400).json({ error: 'Inputs are required' });
        }

        if (!numberOfFloors || numberOfFloors < 1) {
            return res.status(400).json({ error: 'Number of floors must be at least 1' });
        }

        const floorResults = [];
        for (let floor = 0; floor < numberOfFloors; floor++) {
            const floorResult = calculateFloorBBS(inputs, floor, hasTopSlab || {}, numberOfFloors);
            floorResults.push({
                floorNumber: floor,
                floorName: floor === 0 ? 'Ground Floor' : `Floor ${floor + 1}`,
                ...floorResult,
            });
        }

        // Calculate combined totals across all floors
        let combinedMainLen = 0, combinedMainKg = 0;
        let combinedExtraLen = 0, combinedExtraKg = 0;
        let combinedDistLen = 0, combinedDistKg = 0;

        floorResults.forEach(floorResult => {
            if (floorResult.totals) {
                combinedMainLen += floorResult.totals.main.len;
                combinedMainKg += floorResult.totals.main.kg;
                combinedExtraLen += floorResult.totals.extra.len;
                combinedExtraKg += floorResult.totals.extra.kg;
                combinedDistLen += floorResult.totals.dist.len;
                combinedDistKg += floorResult.totals.dist.kg;
            }
        });

        const combinedGrandLen = combinedMainLen + combinedExtraLen + combinedDistLen;
        const combinedGrandKg = combinedMainKg + combinedExtraKg + combinedDistKg;

        res.json({
            floorResults,
            combinedTotals: {
                main: { len: combinedMainLen, kg: combinedMainKg },
                extra: { len: combinedExtraLen, kg: combinedExtraKg },
                dist: { len: combinedDistLen, kg: combinedDistKg },
                grand: { len: combinedGrandLen, kg: combinedGrandKg },
            },
        });
    } catch (error) {
        console.error('Error calculating stair BBS:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateStairBBS };

