// Helper function to parse feet-inches format to decimal feet
const feetInchesToDecimal = (feetInches) => {
    if (feetInches === null || feetInches === undefined) return 0;
    const str = String(feetInches).trim();
    if (str === '') return 0;
    const match = str.match(/^(\d+(?:\.\d+)?)[''](\d+(?:\.\d+)?)\"?$/) || str.match(/^(\d+(?:\.\d+)?)\s*['']?\s*(\d+(?:\.\d+)?)?\s*\"?$/);
    if (!match) {
        const n = parseFloat(str);
        return Number.isFinite(n) ? n : 0;
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

const getNum = (v) => parseFloat(v) || 0;

const calculateMSSpiralStair = async (req, res) => {
    try {
        const {
            R, H, T, D, h, r, w, l, t, tPrime, L, W, Lt, d, th, k, lPrime, balPerTread, railingSides,
            rates // Expecting an object: { "Center Column": 300, "Tread Frame Angle": 300, ... }
        } = req.body;

        // Validation
        if (!R || !H || !h || !r) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: R (center column radius), H (height), h (riser height), r (stair outer radius)'
            });
        }

        const pi = Math.PI;
        const safeRates = rates || {}; // Handling if rates are not passed

        // Convert to SI units
        const R_m = feetInchesToDecimal(R) * 0.3048;         // ft -> m
        const H_m = feetInchesToDecimal(H) * 0.3048;         // ft -> m
        const T_m = getNum(T) / 1000;           // mm -> m
        const D_kgm3 = getNum(D) || 7840;        // kg/m³ (default steel)
        const h_m = feetInchesToDecimal(h) * 0.3048;         // ft -> m
        const r_m = feetInchesToDecimal(r) * 0.3048;         // ft -> m
        const w_m = getNum(w) / 1000;           // mm -> m
        const l_m = getNum(l) / 1000;           // mm -> m
        const t_m = getNum(t) / 1000;           // mm -> m
        const tPrime_m = getNum(tPrime) / 1000; // mm -> m
        const L_m = feetInchesToDecimal(L) * 0.3048;         // ft -> m
        const W_m = feetInchesToDecimal(W) * 0.3048;         // ft -> m
        const Lt_m = getNum(Lt) / 1000;         // mm -> m
        const d_m = getNum(d) / 1000;           // mm -> m
        const th_m = getNum(th) / 1000;         // mm -> m
        const k_m = feetInchesToDecimal(k) * 0.3048;         // ft -> m
        const lPrime_m = feetInchesToDecimal(lPrime) * 0.3048; // ft -> m
        const balPerTread_val = Math.max(0, Math.floor(getNum(balPerTread)));
        const railingSides_val = Math.max(0, Math.floor(getNum(railingSides)));


        // Geometry calculations
        const numTreads = Math.floor(H_m / h_m);
        const treadAngleLen = (2.615 * r_m - 1.385 * R_m);
        const treadFrameLen = treadAngleLen * numTreads; // m
        const treadFrameWeight = ((w_m + l_m) * t_m) * treadFrameLen * D_kgm3; // kg

        const treadBaseArea = 0.3075 * (r_m + R_m) * (r_m - R_m) * numTreads; // m²
        const treadBaseWeight = treadBaseArea * tPrime_m * D_kgm3; // kg

        // Handrail section area (pipe annulus)
        const handrailArea = pi * (Math.pow(d_m / 2, 2) - Math.pow((d_m / 2 - th_m), 2));

        // Stair handrail
        const stairLength = Math.sqrt(h_m * h_m + Math.pow(0.625 * r_m, 2));
        const handrailLenStair = stairLength * numTreads; // m
        const handrailWeightStair = handrailLenStair * handrailArea * D_kgm3; // kg

        // Stair balusters
        const stairBalCount = numTreads * balPerTread_val;
        const stairBalLen = stairBalCount * lPrime_m;
        const stairBalWeight = stairBalLen * handrailArea * D_kgm3;

        // Landing handrail perimeter by sides
        let landingPerimeter = 0;
        if (railingSides_val === 1) landingPerimeter = L_m;
        else if (railingSides_val === 2) landingPerimeter = L_m + W_m;
        else if (railingSides_val === 3) landingPerimeter = 2 * L_m + W_m;
        else landingPerimeter = 2 * (L_m + W_m); // For railingSides >= 4, use all 4 sides

        const handrailLenLanding = landingPerimeter;
        const handrailWeightLanding = handrailLenLanding * handrailArea * D_kgm3;

        // Landing balusters
        const landingBalCount = k_m > 0 ? Math.ceil(landingPerimeter / k_m) : 0;
        const landingBalLen = landingBalCount * lPrime_m;
        const landingBalWeight = landingBalLen * handrailArea * D_kgm3;

        // Totals
        const totalHandrailLen = handrailLenStair + handrailLenLanding;
        const totalHandrailWeight = handrailWeightStair + handrailWeightLanding;
        const totalBalCount = stairBalCount + landingBalCount;
        const totalBalLen = stairBalLen + landingBalLen;
        const totalBalWeight = stairBalWeight + landingBalWeight;

        // Helper to create item with cost
        const createItem = (desc, lenArea, weight, type) => {
            const rate = getNum(safeRates[desc]) || 0; // Default to 0 if no rate provided
            const cost = weight * rate;
            return {
                desc,
                lenArea,
                weight,
                type,
                rate,
                cost: Math.round(cost)
            };
        };

        // Build items array
        const items = [];

        // Center Column
        const centerColumnWeight = Math.PI * (Math.pow(R_m, 2) - Math.pow((R_m - T_m), 2)) * H_m * D_kgm3;
        items.push(createItem('Center Column', H_m, centerColumnWeight, 'length'));

        // Tread Frame Angle
        items.push(createItem('Tread Frame Angle', treadFrameLen, treadFrameWeight, 'length'));

        // Tread Base Plate
        items.push(createItem('Tread Base Plate', treadBaseArea, treadBaseWeight, 'area'));

        // Landing Base Plate
        const landingBaseWeight = L_m * W_m * Lt_m * D_kgm3;
        items.push(createItem('Landing Base Plate', L_m * W_m, landingBaseWeight, 'area'));

        // Landing Base Frame
        const landingFrameWeight = ((w_m + l_m) * t_m) * 2 * (L_m + W_m) * D_kgm3;
        items.push(createItem('Landing Base Frame', 2 * (L_m + W_m), landingFrameWeight, 'length'));

        // Handrail Pipe
        items.push(createItem('Handrail Pipe', totalHandrailLen, totalHandrailWeight, 'length'));

        // Baluster Pipes
        items.push(createItem('Baluster Pipes', totalBalLen, totalBalWeight, 'length'));

        // Calculate total weight and cost
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

        return res.status(200).json({
            success: true,
            results: {
                items,
                totalWeight,
                totalCost,
                numTreads
            }
        });
    } catch (err) {
        console.error('Error in calculateMSSpiralStair:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateMSSpiralStair };


