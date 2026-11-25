const calculatePlinthLeanBeam = async (req, res) => {
    try {
        const { beams, mixRatio } = req.body;

        // --- Validation code unchanged ---
        if (!beams || !Array.isArray(beams) || beams.length === 0) {
            return res.status(400).json({ error: 'At least one plinth beam is required.' });
        }
        if (!mixRatio || !mixRatio.cement || !mixRatio.sand || !mixRatio.crush) {
            return res.status(400).json({ error: 'Valid mix ratio (cement, sand, crush) is required.' });
        }

        const validateRatio = (input) => {
            const regex = /^\d+$/;
            return regex.test(input) && parseInt(input) > 0;
        };
        if (
            !validateRatio(mixRatio.cement) ||
            !validateRatio(mixRatio.sand) ||
            !validateRatio(mixRatio.crush)
        ) {
            return res.status(400).json({ error: 'Mix ratios must be positive integers.' });
        }

        const validateDimension = (input) => {
            if (!input) return false;
            const regex = /^(?:(\d+)'(\d+)?("|'')?|(\d+)(?:in|"|'')?)$/i;
            return regex.test(input.trim());
        };

        const parseFeetInches = (value) => {
            if (!value) return 0;
            value = value.replace(/\s/g, '').toLowerCase();
            const match = value.match(/(?:(\d+)(?:'|ft))?\s*(?:(\d+)(?:\"|in))?/);
            if (!match) return parseFloat(value) || 0;
            const feet = parseFloat(match[1]) || 0;
            const inches = parseFloat(match[2]) || 0;
            return feet + (inches / 12);
        };

        for (const [index, beam] of beams.entries()) {
            if (!beam.length || !beam.width || !beam.height) {
                return res.status(400).json({ error: `All beams must have length, width, and height for beam ${index + 1}.` });
            }
            if (
                !validateDimension(beam.length) ||
                !validateDimension(beam.width) ||
                !validateDimension(beam.height)
            ) {
                return res.status(400).json({ error: `Beam ${index + 1} dimensions must be in the format 1'6", 0'9", or 9in.` });
            }
        }

        const { cement, sand, crush } = mixRatio;
        const totalRatio = parseFloat(cement) + parseFloat(sand) + parseFloat(crush);
        if (totalRatio === 0) {
            return res.status(400).json({ error: 'Mix ratio parts cannot sum to zero.' });
        }

        let totalVolume = 0;
        let totalCementBags = 0;
        let totalSandVolume = 0;
        let totalCrushVolume = 0;
        let totalWaterLiter = 0;
        let totalFormworkFt2 = 0; // total formwork area in ft²

        const processedBeams = beams.map(beam => {
            const length = parseFeetInches(beam.length);
            const width = parseFeetInches(beam.width);
            const height = parseFeetInches(beam.height);

            const volFt3 = length * width * height;
            const volM3 = volFt3 * 0.0283168;
            const dryVolume = volFt3 * 1.54; // Dry volume factor
            const cementVolume = ((cement / totalRatio) * dryVolume);
            const cementBags = (cementVolume / 1.25); // 1 bag = 1.25 ft³
            const sandVolume = ((sand / totalRatio) * dryVolume);
            const crushVolume = ((crush / totalRatio) * dryVolume);
            const waterLiter = (cementBags * 25); // 25 liters per bag

            // --- Formwork Calculation ---
            const formworkFt2 = 2 * (length * height) + (length * width);
            const formworkM2 = formworkFt2 * 0.092903; // ft² → m²

            totalVolume += volFt3;
            totalCementBags += cementBags;
            totalSandVolume += sandVolume;
            totalCrushVolume += crushVolume;
            totalWaterLiter += waterLiter;
            totalFormworkFt2 += formworkFt2;

            return {
                ...beam,
                volFt3: volFt3.toFixed(2),
                volM3: volM3.toFixed(2),
                cementBags: cementBags,
                sandVolume: sandVolume,
                crushVolume: crushVolume,
                waterLiter: waterLiter,
                formworkFt2: formworkFt2,
                formworkM2: formworkM2,
            };
        });

        res.json({
            results: {
                beams: processedBeams,
                totalVolume: totalVolume.toFixed(2),
                totalM3: (totalVolume * 0.0283168).toFixed(2),
                cementBags: totalCementBags.toFixed(2),
                sandVolume: totalSandVolume.toFixed(2),
                crushVolume: totalCrushVolume.toFixed(2),
                waterLiter: totalWaterLiter.toFixed(2),
                totalFormworkFt2: totalFormworkFt2.toFixed(2),
                totalFormworkM2: (totalFormworkFt2 * 0.092903).toFixed(2),
            },
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export { calculatePlinthLeanBeam };