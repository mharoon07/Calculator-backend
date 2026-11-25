const toFeet = (value, unit) => {
    if (!value) return 0;
    return unit === 'inches' ? parseFloat(value) / 12 : parseFloat(value);
};

const calculateUShapedWinderStair = async (req, res) => {
    try {
        const {
            N, // Total No. of Straight Steps
            W, // Width of Steps
            WUnit = 'feet',
            D, // Depth of Steps
            DUnit = 'feet',
            l1, // Length of First Winder Slab
            l1Unit = 'feet',
            n1, // Number of Winder Steps (first)
            L, // Length of Middle Landing
            LUnit = 'feet',
            l2, // Length of Second Winder Slab
            l2Unit = 'feet',
            n2, // Number of Winder Steps (second)
            R, // Riser Height
            RUnit = 'feet',
            h, // Skirting Height
            hUnit = 'feet',
            TSC, // Top Surface Granite Cost
            RC, // Riser Granite Cost
            SK // Skirting Granite Cost
        } = req.body;

        // Validation
        if (!N || !W || !D || !l1 || !n1 || !L || !l2 || !n2 || !R || !h) {
            return res.status(400).json({
                success: false,
                error: 'All dimensions and step counts are required'
            });
        }

        if (!TSC || !RC || !SK) {
            return res.status(400).json({
                success: false,
                error: 'All cost rates are required'
            });
        }

        const n = parseInt(N);
        const w = toFeet(W, WUnit);
        const d = toFeet(D, DUnit);
        const l1_ft = toFeet(l1, l1Unit);
        const n1_val = parseInt(n1);
        const l = toFeet(L, LUnit);
        const l2_ft = toFeet(l2, l2Unit);
        const n2_val = parseInt(n2);
        const r = toFeet(R, RUnit);
        const h_val = toFeet(h, hUnit);
        const tsc = parseFloat(TSC);
        const rc = parseFloat(RC);
        const sk = parseFloat(SK);

        // Area Calculations
        const S1 = n * w * d; // Straight steps area
        const S2 = l1_ft * w; // First winder slab area
        const S3 = l2_ft * w; // Second winder slab area
        const S4 = l * w; // Middle landing area
        const SA = S1 + S2 + S3 + S4; // Total top surface area

        // Riser Area
        const R1 = (n + 2) * w * r; // Straight risers
        const R2 = ((n1_val + n2_val) / 2) * (Math.sqrt(2) * w) * r; // Winder risers (diagonal)
        const R3 = ((n1_val + n2_val) / 2) * w * r; // Additional winder risers
        const RA = R1 + R2 + R3; // Total riser area

        // Skirting Area
        const Sk1 = n * d * h_val; // Skirting along step depth
        const Sk2 = n * w * h_val; // Skirting along step width
        const Sk3 = l * h_val; // Skirting along landing
        const Sk4 = (n + 2) * r * h_val; // Skirting along risers
        const Sk5 = ((n1_val + n2_val) / 2) * r * h_val; // Skirting along winder risers
        const SKA = Sk1 + Sk2 + Sk3 + Sk4 + Sk5; // Total skirting area

        // Costs
        const topCost = SA * tsc;
        const riserCost = RA * rc;
        const skirtingCost = SKA * sk;
        const totalCost = topCost + riserCost + skirtingCost;

        return res.status(200).json({
            success: true,
            results: {
                areas: {
                    top: parseFloat(SA.toFixed(2)),
                    straightSteps: parseFloat(S1.toFixed(2)),
                    firstWinderSlab: parseFloat(S2.toFixed(2)),
                    secondWinderSlab: parseFloat(S3.toFixed(2)),
                    middleLanding: parseFloat(S4.toFixed(2)),
                    riser: parseFloat(RA.toFixed(2)),
                    riserStraight: parseFloat(R1.toFixed(2)),
                    riserWinderDiagonal: parseFloat(R2.toFixed(2)),
                    riserWinderAdditional: parseFloat(R3.toFixed(2)),
                    skirting: parseFloat(SKA.toFixed(2)),
                    skirtingDepth: parseFloat(Sk1.toFixed(2)),
                    skirtingWidth: parseFloat(Sk2.toFixed(2)),
                    skirtingLanding: parseFloat(Sk3.toFixed(2)),
                    skirtingRisers: parseFloat(Sk4.toFixed(2)),
                    skirtingWinderRisers: parseFloat(Sk5.toFixed(2)),
                    total: parseFloat((SA + RA + SKA).toFixed(2))
                },
                costs: {
                    top: parseFloat(topCost.toFixed(2)),
                    riser: parseFloat(riserCost.toFixed(2)),
                    skirting: parseFloat(skirtingCost.toFixed(2)),
                    total: parseFloat(totalCost.toFixed(2))
                },
                rates: {
                    top: tsc,
                    riser: rc,
                    skirting: sk
                }
            }
        });
    } catch (err) {
        console.error('Error in calculateUShapedWinderStair:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateUShapedWinderStair };


