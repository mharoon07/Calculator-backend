const toFeet = (value, unit, padOneInch = false) => {
    if (!value) return 0;
    let val = parseFloat(value);
    if (unit === 'inches') val = val / 12;
    return val + (padOneInch ? (1 / 12) : 0);
};

// Logic for L-shaped Stair
const calculateLShaped = (data) => {
    const tw = toFeet(data.treadWidth, data.treadWidthUnit);
    const td = toFeet(data.treadDepth, data.treadDepthUnit);
    const rh = toFeet(data.riserHeight, data.riserHeightUnit);
    const ns = parseInt(data.numSteps);
    const sh = toFeet(data.skirtingHeight, data.skirtingHeightUnit);
    const lw = toFeet(data.landingWidth, data.landingWidthUnit);
    const ll = toFeet(data.landingLength, data.landingLengthUnit);
    const ct = parseFloat(data.costTread);
    const cr = parseFloat(data.costRiser);
    const cs = parseFloat(data.costSkirting);
    const cl = parseFloat(data.costLanding);

    const tw_adj = tw + (1 / 12);
    const td_adj = td + (1 / 12);
    const ll_adj = ll + (1 / 12);
    const lw_adj = lw + (1 / 12);

    const treadArea = tw_adj * td_adj * ns;
    const riserArea = (rh * ns) + (rh * ll_adj);
    const skirtingLength = ((td_adj + rh) * ns) + ll_adj + lw_adj;
    const skirtingArea = skirtingLength * sh;
    const landingArea = lw_adj * ll_adj;

    return {
        areas: {
            tread: Number(treadArea.toFixed(2)),
            riser: Number(riserArea.toFixed(2)),
            skirting: Number(skirtingArea.toFixed(2)),
            landing: Number(landingArea.toFixed(2)),
            total: Number((treadArea + riserArea + skirtingArea + landingArea).toFixed(2))
        },
        costs: {
            tread: Math.round(treadArea * ct),
            riser: Math.round(riserArea * cr),
            skirting: Math.round(skirtingArea * cs),
            landing: Math.round(landingArea * cl),
            total: Math.round(treadArea * ct + riserArea * cr + skirtingArea * cs + landingArea * cl)
        }
    };
};

// Logic for L-shaped Winder Stair
const calculateLShapedWinder = (data) => {
    const sw = toFeet(data.stepWidth, data.stepWidthUnit, true);
    const sd = toFeet(data.stepDepth, data.stepDepthUnit, true);
    const rh = toFeet(data.riserHeight, data.riserHeightUnit);
    const sl = toFeet(data.slabLength, data.slabLengthUnit, true);
    const sh = toFeet(data.skirtingHeight, data.skirtingHeightUnit);
    const ns = parseInt(data.numStraightSteps);
    const nw = parseInt(data.numWinderSteps);
    const rt = parseFloat(data.rateTop);
    const rr = parseFloat(data.rateRiser);
    const rs = parseFloat(data.rateSkirting);

    const treadArea = ns * sw * sd;
    const slabArea = sw * sl;
    const topArea = treadArea + slabArea;
    const riserStraightArea = ns * rh * sw;
    const riserWinderArea = nw * rh * sw * Math.SQRT2;
    const riserArea = riserStraightArea + riserWinderArea;

    let skirtingLength = sw * ns + sl;
    if (nw > 2) skirtingLength += sw;
    const skirtingArea = skirtingLength * sh * 2;

    return {
        areas: {
            topSurface: Number(topArea.toFixed(2)),
            riser: Number(riserArea.toFixed(2)),
            skirting: Number(skirtingArea.toFixed(2)),
            total: Number((topArea + riserArea + skirtingArea).toFixed(2))
        },
        costs: {
            topSurface: Math.round(topArea * rt),
            riser: Math.round(riserArea * rr),
            skirting: Math.round(skirtingArea * rs),
            total: Math.round(topArea * rt + riserArea * rr + skirtingArea * rs)
        }
    };
};

// Logic for Straight Stair / Landing
const calculateStraight = (data) => {
    const tw = toFeet(data.treadWidth, data.treadWidthUnit);
    const td = toFeet(data.treadDepth, data.treadDepthUnit);
    const rh = toFeet(data.riserHeight, data.riserHeightUnit);
    const ns = parseInt(data.numSteps);
    const sh = toFeet(data.skirtingHeight, data.skirtingHeightUnit);
    const hasLanding = data.hasLanding;
    const lw = hasLanding ? toFeet(data.landingWidth, data.landingWidthUnit) : 0;
    const ll = hasLanding ? toFeet(data.landingLength, data.landingLengthUnit) : 0;
    const ct = parseFloat(data.costTread);
    const cr = parseFloat(data.costRiser);
    const cs = parseFloat(data.costSkirting);
    const cl = hasLanding ? parseFloat(data.costLanding) : 0;

    const atw = tw + (1 / 12);
    const atd = td + (1 / 12);

    const treadArea = atw * atd * ns;
    const riserArea = tw * rh * ns;
    let skirtingLength = (td + rh) * ns;
    let landingArea = 0;

    if (hasLanding) {
        skirtingLength += ll;
        landingArea = lw * ll;
    }

    const skirtingArea = skirtingLength * sh;

    return {
        areas: {
            tread: Number(treadArea.toFixed(2)),
            riser: Number(riserArea.toFixed(2)),
            skirting: Number(skirtingArea.toFixed(2)),
            landing: Number(landingArea.toFixed(2)),
            total: Number((treadArea + riserArea + skirtingArea + landingArea).toFixed(2))
        },
        costs: {
            tread: Math.round(treadArea * ct),
            riser: Math.round(riserArea * cr),
            skirting: Math.round(skirtingArea * cs),
            landing: Math.round(landingArea * cl),
            total: Math.round(treadArea * ct + riserArea * cr + skirtingArea * cs + landingArea * cl)
        }
    };
};

// Logic for U-shaped Stair with Winder
const calculateUShapedWinder = (data) => {
    const n = parseInt(data.N);
    const w = toFeet(data.W, data.WUnit);
    const d = toFeet(data.D, data.DUnit);
    const l1_ft = toFeet(data.l1, data.l1Unit);
    const n1_val = parseInt(data.n1);
    const l = toFeet(data.L, data.LUnit);
    const l2_ft = toFeet(data.l2, data.l2Unit);
    const n2_val = parseInt(data.n2);
    const r = toFeet(data.R, data.RUnit);
    const h_val = toFeet(data.h, data.hUnit);
    const tsc = parseFloat(data.TSC);
    const rc_rate = parseFloat(data.RC);
    const sk_rate = parseFloat(data.SK);

    const S1 = n * w * d;
    const S2 = l1_ft * w;
    const S3 = l2_ft * w;
    const S4 = l * w;
    const SA = S1 + S2 + S3 + S4;

    const R1 = (n + 2) * w * r;
    const R2 = ((n1_val + n2_val) / 2) * (Math.sqrt(2) * w) * r;
    const R3 = ((n1_val + n2_val) / 2) * w * r;
    const RA = R1 + R2 + R3;

    const Sk1 = n * d * h_val;
    const Sk2 = n * w * h_val;
    const Sk3 = l * h_val;
    const Sk4 = (n + 2) * r * h_val;
    const Sk5 = ((n1_val + n2_val) / 2) * r * h_val;
    const SKA = Sk1 + Sk2 + Sk3 + Sk4 + Sk5;

    return {
        areas: {
            topSurface: Number(SA.toFixed(2)),
            riser: Number(RA.toFixed(2)),
            skirting: Number(SKA.toFixed(2)),
            total: Number((SA + RA + SKA).toFixed(2))
        },
        costs: {
            topSurface: Math.round(SA * tsc),
            riser: Math.round(RA * rc_rate),
            skirting: Math.round(SKA * sk_rate),
            total: Math.round(SA * tsc + RA * rc_rate + SKA * sk_rate)
        }
    };
};

// Logic for U-shaped Stair
const calculateUShaped = (data) => {
    const n_val = parseInt(data.n);
    const w_ft = toFeet(data.w, data.wUnit);
    const d_ft = toFeet(data.d, data.dUnit);
    const r_ft = toFeet(data.r, data.rUnit);
    const t_ft = toFeet(data.t, data.tUnit);
    const l_ft = toFeet(data.l, data.lUnit);
    const w1_ft = toFeet(data.w1, data.w1Unit);
    const ct = parseFloat(data.C_top);
    const cr = parseFloat(data.C_riser);
    const cs = parseFloat(data.C_skirting);
    const cl = parseFloat(data.C_landing);

    const e_ft = 1 / 12;

    const A_tread = n_val * (w_ft + e_ft) * (d_ft + e_ft) * 1.05;
    const A_riser = n_val * w_ft * r_ft * 1.05;
    const A_skirt_steps = n_val * ((d_ft + e_ft) + r_ft) * t_ft;
    const A_skirt_landing = ((2 * (w1_ft + e_ft)) + l_ft) * t_ft;
    const A_skirt_total = (A_skirt_steps + A_skirt_landing) * 1.05;
    const A_landing = (l_ft + e_ft) * w1_ft * 1.05;

    return {
        areas: {
            tread: Number(A_tread.toFixed(2)),
            riser: Number(A_riser.toFixed(2)),
            skirting: Number(A_skirt_total.toFixed(2)),
            landing: Number(A_landing.toFixed(2)),
            total: Number((A_tread + A_riser + A_skirt_total + A_landing).toFixed(2))
        },
        costs: {
            tread: Math.round(A_tread * ct),
            riser: Math.round(A_riser * cr),
            skirting: Math.round(A_skirt_total * cs),
            landing: Math.round(A_landing * cl),
            total: Math.round(A_tread * ct + A_riser * cr + A_skirt_total * cs + A_landing * cl)
        }
    };
};

const calculateCombinedStairGranite = async (req, res) => {
    try {
        const { calculatorType } = req.body;
        let result;

        switch (calculatorType) {
            case 'lshaped':
                result = calculateLShaped(req.body);
                break;
            case 'lshapedwinder':
                result = calculateLShapedWinder(req.body);
                break;
            case 'straight':
                result = calculateStraight(req.body);
                break;
            case 'ushapedwinder':
                result = calculateUShapedWinder(req.body);
                break;
            case 'ushaped':
                result = calculateUShaped(req.body);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid calculator type'
                });
        }

        return res.status(200).json({
            success: true,
            results: result
        });
    } catch (err) {
        console.error('Error in calculateCombinedStairGranite:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateCombinedStairGranite };
