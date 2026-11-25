// controllers/foundationConcreteController.js
const calculateFoundationConcrete = async (req, res) => {
    try {
        const { rows, mixRatio } = req.body;

        // Validate inputs
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'At least one foundation entry is required.' });
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
                // Remove quotes and parse inches
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
        let totalDryVolume = 0;
        let totalCementBags = 0;
        let totalSandVolume = 0;
        let totalCrushVolume = 0;

        const entries = rows.map(row => {
            const { tag, shape, length, width, depth, addonLength, addonWidth, quantity } = row;

            // Validate row inputs
            if (!tag || !length || !width || !depth || !quantity) {
                throw new Error('All required fields must be provided for each entry.');
            }
            if (!validateDimension(length) || !validateDimension(width) || !validateDimension(depth)) {
                throw new Error('Dimensions must be in the format 4\'6" or 4\'0".');
            }
            if (shape === 'CF' && (!addonLength || !addonWidth)) {
                throw new Error('Add-on dimensions are required for CF shape.');
            }
            if (shape === 'CF' && (!validateDimension(addonLength) || !validateDimension(addonWidth))) {
                throw new Error('Add-on dimensions must be in the format 4\'6" or 4\'0".');
            }

            const lengthFt = parseFeetInches(length);
            const widthFt = parseFeetInches(width);
            const depthFt = parseFeetInches(depth);
            const qty = parseInt(quantity) || 1;

            let volume = 0;
            let perimeter = 0;
            if (shape === 'Rectangular') {
                volume = lengthFt * widthFt * depthFt * qty;
                perimeter = 2 * (lengthFt + widthFt);
            } else if (shape === 'CF') {
                const addonLengthFt = parseFeetInches(addonLength);
                const addonWidthFt = parseFeetInches(addonWidth);
                volume = ((lengthFt * widthFt) + (addonLengthFt * addonWidthFt)) * depthFt * qty;
                perimeter = 2 * lengthFt + 2 * widthFt + 2 * addonLengthFt;
            } else {
                throw new Error('Invalid shape specified.');
            }

            const formworkPerUnit = perimeter * depthFt;
            const formworkTotal = formworkPerUnit * qty;

            const foundationdryVolume = volume * 1.54;
            const foundationcementVolume = (foundationdryVolume * parseInt(mixRatio.cement)) / totalParts;
            const foundationsandVolume = (foundationdryVolume * parseInt(mixRatio.sand)) / totalParts;
            const foundationcrushVolume = (foundationdryVolume * parseInt(mixRatio.crush)) / totalParts;
            const foundationcementBags = foundationcementVolume / 1.25;

            totalVolume += volume;
            totalFormwork += formworkTotal;
            totalDryVolume += foundationdryVolume;
            totalCementBags += foundationcementBags;
            totalSandVolume += foundationsandVolume;
            totalCrushVolume += foundationcrushVolume;

            return {
                tag,
                shape,
                volume,
                foundationdryVolume,
                foundationcementVolume,
                foundationsandVolume,
                foundationcrushVolume,
                foundationcementBags,
                formworkPerUnit,
                formworkTotal,
            };
        });

        const waterLiters = totalCementBags * 25; // 25 liters per bag

        res.json({
            results: {
                entries,
                totalVolume: totalVolume,
                totalVolumeM3: totalVolume / 35.3147,
                totalFormwork: totalFormwork,
                cementBags: totalCementBags,
                sandVolume: totalSandVolume,
                crushVolume: totalCrushVolume,
                waterLiters: waterLiters,
            },
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export { calculateFoundationConcrete };