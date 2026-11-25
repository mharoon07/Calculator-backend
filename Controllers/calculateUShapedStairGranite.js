const convertToFeet = (value, unit) => {
    if (!value) return 0;
    const val = parseFloat(value);
    if (unit === 'inches') return val / 12;
    return val;
};

const calculateUShapedStairGranite = async (req, res) => {
    try {
        const {
            n, // Number of Steps
            w, // Tread Width
            wUnit = 'feet',
            d, // Tread Depth
            dUnit = 'feet',
            r, // Riser Height
            rUnit = 'feet',
            t, // Skirting Height
            tUnit = 'feet',
            l, // Landing Length
            lUnit = 'feet',
            w1, // Landing Width
            w1Unit = 'feet',
            C_top, // Top Granite Rate
            C_riser, // Riser Granite Rate
            C_skirting, // Skirting Granite Rate
            C_landing // Landing Granite Rate
        } = req.body;

        // Validation
        if (!n || !w || !d || !r || !t || !l || !w1) {
            return res.status(400).json({
                success: false,
                error: 'All dimensions are required'
            });
        }

        if (!C_top || !C_riser || !C_skirting || !C_landing) {
            return res.status(400).json({
                success: false,
                error: 'All cost rates are required'
            });
        }

        const n_val = parseInt(n);
        const w_ft = convertToFeet(w, wUnit);
        const d_ft = convertToFeet(d, dUnit);
        const r_ft = convertToFeet(r, rUnit);
        const t_ft = convertToFeet(t, tUnit);
        const l_ft = convertToFeet(l, lUnit);
        const w1_ft = convertToFeet(w1, w1Unit);
        const ct = parseFloat(C_top);
        const cr = parseFloat(C_riser);
        const cs = parseFloat(C_skirting);
        const cl = parseFloat(C_landing);

        // Fixed extension value in feet (1 inch = 1/12 feet)
        const e_ft = 1 / 12;

        // Calculations with 5% wastage factor
        const A_tread = n_val * (w_ft + e_ft) * (d_ft + e_ft) * 1.05;
        const A_riser = n_val * w_ft * r_ft * 1.05;
        const A_skirt_steps = n_val * ((d_ft + e_ft) + r_ft) * t_ft;
        const A_skirt_landing = ((2 * (w1_ft + e_ft)) + l_ft) * t_ft;
        const A_skirt_total = (A_skirt_steps + A_skirt_landing) * 1.05;
        const A_landing = (l_ft + e_ft) * w1_ft * 1.05;

        // Costs
        const cost_tread = A_tread * ct;
        const cost_riser = A_riser * cr;
        const cost_skirting = A_skirt_total * cs;
        const cost_landing = A_landing * cl;

        // Totals
        const total_area = A_tread + A_riser + A_skirt_total + A_landing;
        const total_cost = cost_tread + cost_riser + cost_skirting + cost_landing;

        return res.status(200).json({
            success: true,
            results: {
                areas: {
                    tread: parseFloat(A_tread.toFixed(2)),
                    riser: parseFloat(A_riser.toFixed(2)),
                    skirting: parseFloat(A_skirt_total.toFixed(2)),
                    skirtingSteps: parseFloat(A_skirt_steps.toFixed(2)),
                    skirtingLanding: parseFloat(A_skirt_landing.toFixed(2)),
                    landing: parseFloat(A_landing.toFixed(2)),
                    total: parseFloat(total_area.toFixed(2))
                },
                costs: {
                    tread: parseFloat(cost_tread.toFixed(2)),
                    riser: parseFloat(cost_riser.toFixed(2)),
                    skirting: parseFloat(cost_skirting.toFixed(2)),
                    landing: parseFloat(cost_landing.toFixed(2)),
                    total: parseFloat(total_cost.toFixed(2))
                },
                rates: {
                    tread: ct,
                    riser: cr,
                    skirting: cs,
                    landing: cl
                }
            }
        });
    } catch (err) {
        console.error('Error in calculateUShapedStairGranite:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateUShapedStairGranite };


