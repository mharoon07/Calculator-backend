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

const calculateServiceDuctDoor = async (req, res) => {
    try {
        const {
            material = 'MS',
            height,
            width,
            outerWeb,
            outerThickness,
            innerPipeSize,
            innerPipeThickness,
            plateThickness,
            numShutters = 1,
            numHinges = 3,
            numLocks = 1,
            rateMaterial = 300,
            rateHinge = 250,
            rateLock = 1200,
            currency = 'PKR'
        } = req.body;

        // Validation
        if (!height || !width) {
            return res.status(400).json({
                success: false,
                error: 'Height and width are required'
            });
        }

        const densities = { MS: 7850, SS: 8000 };
        const density = densities[material] || 7850;
        const mmToM = 0.001;
        const ftToM = 0.3048;

        // Convert inputs to SI
        const H = feetInchesToDecimal(height) * ftToM;
        const W = feetInchesToDecimal(width) * ftToM;
        const w = (parseFloat(outerWeb) || 0) * mmToM;
        const t = (parseFloat(outerThickness) || 0) * mmToM;
        const wp = (parseFloat(innerPipeSize) || 0) * mmToM;
        const tp = (parseFloat(innerPipeThickness) || 0) * mmToM;
        const tpp = (parseFloat(plateThickness) || 0) * mmToM;
        const N = Math.max(1, parseInt(numShutters || '1', 10));
        const h = Math.max(0, parseInt(numHinges || '0', 10));
        const lm = Math.max(0, parseInt(numLocks || '0', 10));
        const rateMat = Math.max(0, parseFloat(rateMaterial) || 0);
        const rateHingeVal = Math.max(0, parseFloat(rateHinge) || 0);
        const rateLockVal = Math.max(0, parseFloat(rateLock) || 0);

        // Calculations
        const L_outer = 2 * (H + W);
        const A_outer = 2 * w * t; // L-angle approx area for two legs
        const V_outer = L_outer * A_outer;
        const W_outer = V_outer * density;
        const cost_outer = W_outer * rateMat;

        const X = H / N;
        const l_inner = N * 2 * (X + W);
        const A_inner = Math.pow(wp, 2) - Math.pow((wp - 2 * tp), 2); // hollow square area
        const W_inner = A_inner * l_inner * density;
        const cost_inner = W_inner * rateMat;

        const area_plate = H * W;
        const W_plate = area_plate * tpp * density;
        const cost_plate = W_plate * rateMat;

        const totalHinges = N * h;
        const cost_hinges = totalHinges * rateHingeVal;

        const totalLocks = N * lm;
        const cost_locks = totalLocks * rateLockVal;

        const totalCost = cost_outer + cost_inner + cost_plate + cost_hinges + cost_locks;

        // Build results array
        const rows = [
            {
                desc: 'Outer Frame Angle',
                qty: `${L_outer.toFixed(2)} m`,
                weight: parseFloat(W_outer.toFixed(2)),
                rate: `${currency} ${rateMat.toFixed(2)}/kg`,
                cost: Math.round(cost_outer)
            },
            {
                desc: 'Inner Frame Pipe',
                qty: `${l_inner.toFixed(2)} m`,
                weight: parseFloat(W_inner.toFixed(2)),
                rate: `${currency} ${rateMat.toFixed(2)}/kg`,
                cost: Math.round(cost_inner)
            },
            {
                desc: 'Shutter Door Plate',
                qty: `${area_plate.toFixed(2)} m²`,
                weight: parseFloat(W_plate.toFixed(2)),
                rate: `${currency} ${rateMat.toFixed(2)}/kg`,
                cost: Math.round(cost_plate)
            },
            {
                desc: 'Total Hinges',
                qty: `${totalHinges} Nos`,
                weight: null,
                rate: `${currency} ${rateHingeVal.toFixed(2)}/unit`,
                cost: Math.round(cost_hinges)
            },
            {
                desc: 'Total Locks',
                qty: `${totalLocks} Nos`,
                weight: null,
                rate: `${currency} ${rateLockVal.toFixed(2)}/unit`,
                cost: Math.round(cost_locks)
            }
        ];

        return res.status(200).json({
            success: true,
            results: {
                material,
                dimensions: {
                    height: parseFloat(H.toFixed(2)),
                    width: parseFloat(W.toFixed(2)),
                    heightFt: parseFloat(feetInchesToDecimal(height).toFixed(2)),
                    widthFt: parseFloat(feetInchesToDecimal(width).toFixed(2))
                },
                items: rows,
                summary: {
                    totalWeight: parseFloat((W_outer + W_inner + W_plate).toFixed(2)),
                    totalCost: Math.round(totalCost),
                    currency
                }
            }
        });
    } catch (err) {
        console.error('Error in calculateServiceDuctDoor:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateServiceDuctDoor };


