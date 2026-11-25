const calculateTemporarySitePreparation = async (req, res) => {
    try {
        const {
            plotLength,
            plotWidth,
            plotUnit,
            barricationSheetLength,
            soilLevelingRequired,
            soilLevelingLumpsumRate,
            barricationSideLength,
            barricationSideWidth,
            barricationSideLength2,
            barricationSideWidth2,
            footingLength,
            footingWidth,
            footingDepth,
            footingUnit,
            trenchOnLength1,
            trenchOnWidth1,
            trenchOnLength2,
            trenchOnWidth2,
            trenchWidth,
            trenchDepth,
            trenchUnit,
            cementBagPrice,
            sandFt3Price,
            waterLiterPrice,
            laborDayRate,
            numberOfLabor,
            entranceExitSignCost,
            anglePostPrice,
            barricationSheetPrice,
            excavationRatePerFt3,
            cementRatio = 1,
            sandRatio = 3,
            waterRatio = 0.5
        } = req.body;

        // Helper functions
        const parseNonNeg = (v) => {
            const n = parseFloat(v);
            return isFinite(n) && n >= 0 ? n : NaN;
        };

        const convertToFt = (value, unit) => {
            if (Number.isNaN(value)) return NaN;
            switch (unit) {
                case 'ft': return value;
                case 'in': return value / 12;
                case 'mm': return value / 304.8; // 1 ft = 304.8 mm
                default: return value;
            }
        };

        // Parse inputs
        const plotL = convertToFt(parseNonNeg(plotLength), plotUnit || 'ft');
        const plotW = convertToFt(parseNonNeg(plotWidth), plotUnit || 'ft');
        const barricationSheetL = parseNonNeg(barricationSheetLength);
        const footingL = convertToFt(parseNonNeg(footingLength), footingUnit || 'ft');
        const footingW = convertToFt(parseNonNeg(footingWidth), footingUnit || 'ft');
        const footingD = convertToFt(parseNonNeg(footingDepth), footingUnit || 'ft');
        const trenchW = convertToFt(parseNonNeg(trenchWidth), trenchUnit || 'ft');
        const trenchD = convertToFt(parseNonNeg(trenchDepth), trenchUnit || 'ft');

        // Validation
        if (Number.isNaN(plotL) || Number.isNaN(plotW)) {
            return res.status(400).json({
                success: false,
                error: 'Enter valid plot dimensions.'
            });
        }

        // Calculate barrication length
        let totalBarricationLength = 0;
        if (barricationSideLength) totalBarricationLength += plotL;
        if (barricationSideWidth) totalBarricationLength += plotW;
        if (barricationSideLength2) totalBarricationLength += plotL;
        if (barricationSideWidth2) totalBarricationLength += plotW;

        const numberOfBarricationSheets = (barricationSheetL > 0 && !Number.isNaN(barricationSheetL))
            ? Math.ceil(totalBarricationLength / barricationSheetL)
            : 0;
        const numberOfAnglePosts = numberOfBarricationSheets > 0 ? numberOfBarricationSheets + 1 : 1;
        const numberOfFootings = numberOfAnglePosts;

        // Footing excavation
        const footingExcavationVolume = (!Number.isNaN(footingL) && !Number.isNaN(footingW) && !Number.isNaN(footingD))
            ? footingL * footingW * footingD
            : 0; // ft³
        const totalFootingExcavationVolume = numberOfFootings * footingExcavationVolume; // ft³

        // Total concrete (PCC) required = Total excavation
        const totalConcreteVolume = totalFootingExcavationVolume; // ft³

        // Calculate cement, sand, water for PCC
        let bagsOfCement = 0;
        let sandFt3 = 0;
        let waterLiters = 0;

        if (totalConcreteVolume > 0) {
            // Step 1: Calculate dry mortar/concrete volume
            const dryMortar = totalConcreteVolume * 1.54; // Dry volume factor

            // Step 2: Define mix ratio parts
            const cementPart = cementRatio || 1;
            const sandPart = sandRatio || 3;
            const totalParts = cementPart + sandPart;

            // Step 3: Calculate cement volume
            const cementVol = (dryMortar * (cementPart / totalParts)) / 1.25;

            // Step 4: Convert cement volume to bags (1 bag = 1.226 ft³)
            bagsOfCement = Math.ceil(cementVol / 1.226);

            // Step 5: Calculate sand volume
            const sandVol = dryMortar * (sandPart / totalParts);
            sandFt3 = sandVol;

            // Step 6: Calculate water required (25 liters per bag)
            waterLiters = bagsOfCement * 25;
        }

        // Trench excavation
        let totalTrenchLength = 0;
        if (trenchOnLength1) totalTrenchLength += plotL;
        if (trenchOnWidth1) totalTrenchLength += plotW;
        if (trenchOnLength2) totalTrenchLength += plotL;
        if (trenchOnWidth2) totalTrenchLength += plotW;

        const trenchExcavationVolume = (!Number.isNaN(trenchW) && !Number.isNaN(trenchD) && totalTrenchLength > 0)
            ? totalTrenchLength * trenchW * trenchD
            : 0; // ft³

        // Cost calculations
        const sheetCost = (!Number.isNaN(barricationSheetPrice) && numberOfBarricationSheets > 0)
            ? numberOfBarricationSheets * parseNonNeg(barricationSheetPrice)
            : 0;
        const cementCost = (!Number.isNaN(cementBagPrice) && bagsOfCement > 0)
            ? bagsOfCement * parseNonNeg(cementBagPrice)
            : 0;
        const sandCost = (!Number.isNaN(sandFt3Price) && sandFt3 > 0)
            ? sandFt3 * parseNonNeg(sandFt3Price)
            : 0;
        const anglePostCost = (!Number.isNaN(anglePostPrice) && numberOfAnglePosts > 0)
            ? numberOfAnglePosts * parseNonNeg(anglePostPrice)
            : 0;

        // Footing excavation cost
        const footingExcavationDays = numberOfFootings > 0 ? Math.ceil(numberOfFootings / 10) : 0; // Rough estimate: 10 footings per day
        const footingExcavationCost = (!Number.isNaN(numberOfLabor) && !Number.isNaN(laborDayRate) && footingExcavationDays > 0)
            ? parseNonNeg(numberOfLabor) * footingExcavationDays * parseNonNeg(laborDayRate)
            : 0;

        // Trench excavation cost
        const trenchExcavationCost = (!Number.isNaN(excavationRatePerFt3) && trenchExcavationVolume > 0)
            ? trenchExcavationVolume * parseNonNeg(excavationRatePerFt3)
            : 0;

        // Soil leveling cost
        const soilLevelingCost = (soilLevelingRequired === 'Yes' && !Number.isNaN(soilLevelingLumpsumRate))
            ? parseNonNeg(soilLevelingLumpsumRate)
            : 0;

        // Labor cost
        const laborCost = (!Number.isNaN(numberOfLabor) && !Number.isNaN(laborDayRate))
            ? parseNonNeg(numberOfLabor) * parseNonNeg(laborDayRate)
            : 0;

        // Total cost
        const entranceExitSignCostValue = parseNonNeg(entranceExitSignCost) || 0;
        const totalCost = sheetCost + cementCost + sandCost + anglePostCost +
            footingExcavationCost + trenchExcavationCost +
            soilLevelingCost + laborCost + entranceExitSignCostValue;

        return res.status(200).json({
            success: true,
            results: {
                // Intermediate calculations
                totalBarricationLength,
                numberOfBarricationSheets,
                numberOfAnglePosts,
                numberOfFootings,
                footingExcavationVolume,
                totalFootingExcavationVolume,
                totalConcreteVolume,
                bagsOfCement,
                sandFt3,
                waterLiters,
                trenchExcavationVolume,
                totalTrenchLength,

                // Cost calculations
                sheetCost,
                cementCost,
                sandCost,
                anglePostCost,
                footingExcavationCost,
                footingExcavationDays,
                trenchExcavationCost,
                soilLevelingCost,
                laborCost,
                entranceExitSignCost: entranceExitSignCostValue,
                totalCost,

                // Input values for reference
                plotL,
                plotW
            }
        });
    } catch (err) {
        console.error('Error in calculateTemporarySitePreparation:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateTemporarySitePreparation };


