// controllers/rccColumnController.js
const calculateRCCColumn = async (req, res) => {
    try {
        const { rows, mixRatio } = req.body;
        console.log(req.body);

        // Validate inputs
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'At least one column entry is required.' });
        }
        if (!mixRatio || !mixRatio.cement || !mixRatio.sand || !mixRatio.crush) {
            return res.status(400).json({ error: 'Valid mix ratio is required.' });
        }

        // Validate dimension format (e.g., 4'6" or 4')
        const validateDimension = (input) => {
            if (!input) return false;
            const regex = /^\d+'(\d*("|''))?$/; // Matches 4'6", 4'0", or 4'
            return regex.test(input);
        };

        // Parse feet'inches" to decimal feet
        const parseFeetInches = (input) => {
            if (!input || !validateDimension(input)) return 0;
            const parts = input.split("'");
            const feet = parseFloat(parts[0]) || 0;
            let inches = 0;
            if (parts[1]) {
                inches = parseFloat(parts[1].replace('"', '').replace("''", '')) || 0;
            }
            return feet + inches / 12;
        };

        const totalParts = parseInt(mixRatio.cement) + parseInt(mixRatio.sand) + parseInt(mixRatio.crush);
        if (totalParts === 0) {
            throw new Error('Mix ratio parts cannot sum to zero.');
        }
        let totalVolume = 0;
        let totalFormwork = 0;
        const entries = rows.map(row => {
            const { tag, type, width, thickness, height, baseWidth, baseThickness, legWidth, legThickness, quantity } = row;

            // Validate row inputs
            if (!tag || !width || !thickness || !height || !quantity) {
                throw new Error('All required fields must be provided for each entry.');
            }
            if (!validateDimension(width) || !validateDimension(thickness) || !validateDimension(height)) {
                throw new Error('Dimensions must be in the format 4\'6" or 4\'0".');
            }
            if ((type === 'LShape' || type === 'UShape') &&
                (!baseWidth || !baseThickness || !legWidth || !legThickness)) {
                throw new Error('Base and leg dimensions are required for L-Shape or U-Shape.');
            }
            if ((type === 'LShape' || type === 'UShape') &&
                (!validateDimension(baseWidth) || !validateDimension(baseThickness) ||
                    !validateDimension(legWidth) || !validateDimension(legThickness))) {
                throw new Error('Base and leg dimensions must be in the format 4\'6" or 4\'0".');
            }

            const w = parseFeetInches(width);
            const t = parseFeetInches(thickness);
            const h = parseFeetInches(height);
            const bw = parseFeetInches(baseWidth);
            const bt = parseFeetInches(baseThickness);
            const lw = parseFeetInches(legWidth);
            const lt = parseFeetInches(legThickness);
            const qty = parseInt(quantity) || 1;

            let volume = 0;
            let formwork = 0;

            if (type === 'LShape') {
                volume = ((bw * bt) + (lw * lt)) * h * qty;
                formwork = (2 * (bw + bt) + (2 * lw + lt)) * h * qty;
            } else if (type === 'UShape') {
                volume = ((bw * bt) + 2 * (lw * lt)) * h * qty;
                formwork = (bw + 2 * bt + bw - 2 * lt + 4 * lw + 2 * lt) * h * qty;
            } else {
                volume = w * t * h * qty;
                formwork = 2 * (w + t) * h * qty;
            }

            // Accumulate totals
            totalVolume += volume;
            totalFormwork += formwork;

            // Calculate materials for individual entry
            const dryVolume = volume * 1.54;
            const cementVolume = (dryVolume * parseInt(mixRatio.cement)) / totalParts;
            const sandVolume = (dryVolume * parseInt(mixRatio.sand)) / totalParts;
            const crushVolume = (dryVolume * parseInt(mixRatio.crush)) / totalParts;
            const cementBags = cementVolume / 1.25;

            return {
                tag,
                type,
                volume,
                cementBags,
                sandVolume,
                crushVolume,
                formwork,
            };
        });

        // Material estimation
        // const totalParts = parseInt(mixRatio.cement) + parseInt(mixRatio.sand) + parseInt(mixRatio.crush);
        // if (totalParts === 0) {
        //     throw new Error('Mix ratio parts cannot sum to zero.');
        // }

        // Calculate total materials based on accumulated total volume
        const dryVolume = totalVolume * 1.54;
        const cementVolume = (dryVolume * parseInt(mixRatio.cement)) / totalParts;
        const sandVolume = (dryVolume * parseInt(mixRatio.sand)) / totalParts;
        const crushVolume = (dryVolume * parseInt(mixRatio.crush)) / totalParts;
        const cementBags = cementVolume / 1.25;
        const waterLiters = cementBags * 25;
        console.log({
            entries,
            totalVolume: totalVolume,
            totalVolumeM3: totalVolume * 0.0283168, // 1 ft³ = 0.0283168 m³
            totalFormwork: totalFormwork,
            cementBags: cementBags,
            sandVolume: sandVolume,
            crushVolume: crushVolume,
            waterLiters: waterLiters,
        });
        // Send response
        res.json({
            results: {
                entries,
                totalVolume: totalVolume,
                totalVolumeM3: totalVolume * 0.0283168, // 1 ft³ = 0.0283168 m³
                totalFormwork: totalFormwork,
                cementBags: cementBags,
                sandVolume: sandVolume,
                crushVolume: crushVolume,
                waterLiters: waterLiters,
            },
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export { calculateRCCColumn };