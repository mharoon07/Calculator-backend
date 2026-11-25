// Constants
const FT_TO_M = 0.3048;
const M2_PER_FT2 = 0.09290304;
const FT2_PER_M2 = 1 / M2_PER_FT2;

const PRODUCTS = [
    { id: 'agenda-25ec', name: 'Agenda® 25 EC (Bayer)', dilution: 400, pricePerL: 12500 },
    { id: 'local-alpha', name: 'Local Termiticide A', dilution: 300, pricePerL: 9800 },
    { id: 'local-beta', name: 'Local Termiticide B', dilution: 500, pricePerL: 11200 },
];

 
// Helpers
const n = (v) => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
};
const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '0.00');
const toMeters = (val, unit) => (unit === 'feet' ? n(val) * FT_TO_M : n(val));

// Controller
const calculateTermiteTreatment = (req, res) => {
    try {
        console.log('Calculating termite treatment with input:', req.body);

        const {
            length,
            width,
            excavationDepth,
            unit,
            applicationRate,
            contingency,
            labor,
            product,
            dilution,
            chemicalPrice,
        } = req.body;

        // Validate inputs
        const requiredFields = [
            'length',
            'width',
            'excavationDepth',
            'unit',
            'applicationRate',
            'contingency',
            'labor',
            'dilution',
            'chemicalPrice',
        ];
        for (const field of requiredFields) {
            if (req.body[field] === undefined || req.body[field] === '' || req.body[field] === null) {
                return res.status(400).json({ error: `Missing ${field}` });
            }
        }
        for (const field of [
            'length',
            'width',
            'excavationDepth',
            'applicationRate',
            'contingency',
            'labor',
            'dilution',
            'chemicalPrice',
        ]) {
            if (isNaN(req.body[field]) || n(req.body[field]) <= 0) {
                return res.status(400).json({ error: `Invalid ${field}: must be a positive number` });
            }
        }

        if (!['meters', 'feet'].includes(unit)) {
            return res.status(400).json({ error: "Invalid unit: must be 'meters' or 'feet'" });
        }
        if (!product || !PRODUCTS.find((p) => p.name === product)) {
            return res
                .status(400)
                .json({ error: `Invalid product: must be one of ${PRODUCTS.map((p) => p.name).join(', ')}` });
        }

        // Convert inputs
        const Lm = toMeters(length, unit);
        const Wm = toMeters(width, unit);
        const Dm = toMeters(excavationDepth, unit);
        const rate = n(applicationRate);
        const waste = n(contingency);
        const laborRate = n(labor);
        const dilutionRatio = n(dilution);
        const pricePerL = n(chemicalPrice);

        // Geometry
        const baseArea = Lm * Wm;
        const perimeterM = 2 * (Lm + Wm);
        const sideArea = perimeterM * Dm;
        const totalArea = baseArea + sideArea;
        const baseFt2 = baseArea * FT2_PER_M2;
        const sideFt2 = sideArea * FT2_PER_M2;
        const totalFt2 = totalArea * FT2_PER_M2;
        const excavationVolume = baseArea * Dm;

        // Solution & chemical
        const solutionBase = totalArea * rate;
        const solutionWithWaste = solutionBase * (1 + waste / 100);
        const chemL = solutionWithWaste / dilutionRatio;
        const waterL = solutionWithWaste - chemL;

        // Costs
        const chemicalCost = chemL * pricePerL;
        const laborCost = laborRate * totalArea;
        const totalCost = chemicalCost + laborCost;

        // ✅ Send response
        return res.json({
            results: {
                length: parseFloat(fmt(n(length))),
                width: parseFloat(fmt(n(width))),
                excavationDepth: parseFloat(fmt(n(excavationDepth))),
                unit,
                perimeterM: parseFloat(fmt(perimeterM)),
                baseArea: parseFloat(fmt(baseArea)),
                sideArea: parseFloat(fmt(sideArea)),
                totalArea: parseFloat(fmt(totalArea)),
                baseFt2: parseFloat(fmt(baseFt2, 0)),
                sideFt2: parseFloat(fmt(sideFt2, 0)),
                totalFt2: parseFloat(fmt(totalFt2, 0)),
                excavationVolume: parseFloat(fmt(excavationVolume)),
                solutionBase: parseFloat(fmt(solutionBase)),
                chemicalVolumeNeeded: parseFloat(fmt(solutionWithWaste)),
                concentrateNeeded: parseFloat(fmt(chemL)),
                waterNeeded: parseFloat(fmt(waterL)),
                chemicalCost: parseFloat(fmt(chemicalCost)),
                laborCost: parseFloat(fmt(laborCost)),
                totalCost: parseFloat(fmt(totalCost)),
                applicationRate: parseFloat(fmt(rate)),
                contingency: parseFloat(fmt(waste)),
                laborRate: parseFloat(fmt(laborRate)),
                dilution: parseFloat(fmt(dilutionRatio)),
                chemicalPrice: parseFloat(fmt(pricePerL)),
                product,
            },
        });
    } catch (error) {
        console.error('Error calculating termite treatment:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

export { calculateTermiteTreatment };
