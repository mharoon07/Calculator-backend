const safeNum = (value, defaultValue = 0) => {
    const num = parseFloat(value);
    return isFinite(num) && num >= 0 ? num : defaultValue;
};

const validateMixRatio = (mixRatio) => {
    const parts = mixRatio.split(':').map(Number);
    if (parts.length !== 3 || parts.some(p => !isFinite(p) || p <= 0)) {
        throw new Error('Mix ratio must be in the format "C:S:A" with positive numbers (e.g., "1:2:4").');
    }
    return parts;
};

const concreteCalculatorController = {
    calculate: async (req, res) => {
        try {
            const {
                concreteVolume,
                mixRatio,
                cementRate,
                sandRate,
                aggregateRate,
                waterRate,
                admixtureRate,
                laborRate,
                dryVolumeFactor,
                wastagePercent,
                cementBagSize,
                cementDensity,
                sandDensity,
                aggregateDensity,
            } = req.body;

            // Input validation
            if (!concreteVolume || safeNum(concreteVolume) <= 0) {
                return res.status(400).json({ error: 'Concrete volume must be a positive number.' });
            }
            if (!mixRatio) {
                return res.status(400).json({ error: 'Mix ratio is required.' });
            }
            if (!cementRate || safeNum(cementRate) <= 0) {
                return res.status(400).json({ error: 'Cement rate must be a positive number.' });
            }
            if (!cementBagSize || safeNum(cementBagSize) <= 0) {
                return res.status(400).json({ error: 'Cement bag size must be a positive number.' });
            }
            if (!cementDensity || safeNum(cementDensity) <= 0) {
                return res.status(400).json({ error: 'Cement density must be a positive number.' });
            }
            if (!sandDensity || safeNum(sandDensity) <= 0) {
                return res.status(400).json({ error: 'Sand density must be a positive number.' });
            }
            if (!aggregateDensity || safeNum(aggregateDensity) <= 0) {
                return res.status(400).json({ error: 'Aggregate density must be a positive number.' });
            }

            // Parse and validate inputs
            const volume = safeNum(concreteVolume);
            const [cementRatio, sandRatio, aggregateRatio] = validateMixRatio(mixRatio);
            const totalRatio = cementRatio + sandRatio + aggregateRatio;
            const dryVolumeFactorNum = safeNum(dryVolumeFactor, 1.54);
            const wastagePercentNum = safeNum(wastagePercent, 3);
            const cementBagSizeNum = safeNum(cementBagSize, 50);
            const cementDensityNum = safeNum(cementDensity, 1440);
            const sandDensityNum = safeNum(sandDensity, 1600);
            const aggregateDensityNum = safeNum(aggregateDensity, 1450);
            const cementRateNum = safeNum(cementRate);
            const sandRateNum = safeNum(sandRate, 0);
            const aggregateRateNum = safeNum(aggregateRate, 0);
            const waterRateNum = safeNum(waterRate, 0);
            const admixtureRateNum = safeNum(admixtureRate, 0);
            const laborRateNum = safeNum(laborRate, 0);
            const FT3_TO_M3 = 1 / 35.3147; // Conversion factor: ft³ to m³

            // Calculate dry volume with wastage
            const dryVolume = volume * dryVolumeFactorNum;
            const dryVolumeWithWastage = dryVolume * (1 + wastagePercentNum / 100);

            // Calculate volumes for each material
            const cementVolume = (dryVolumeWithWastage * cementRatio) / totalRatio;
            const sandVolume = (dryVolumeWithWastage * sandRatio) / totalRatio;
            const aggregateVolume = (dryVolumeWithWastage * aggregateRatio) / totalRatio;

            // Convert volumes to masses (ft³ to m³ for density calculations)
            const cementMass = cementVolume * FT3_TO_M3 * cementDensityNum; // kg
            const sandMass = sandVolume * FT3_TO_M3 * sandDensityNum; // kg
            const aggregateMass = aggregateVolume * FT3_TO_M3 * aggregateDensityNum; // kg

            // Calculate number of cement bags
            const cementBags = cementMass / cementBagSizeNum;

            // Calculate costs
            const cementCost = cementBags * cementRateNum;
            const sandCost = sandVolume * sandRateNum;
            const aggregateCost = aggregateVolume * aggregateRateNum;
            const waterCost = volume * waterRateNum;
            const admixtureCost = volume * admixtureRateNum;
            const laborCost = volume * laborRateNum;

            const totalCost = cementCost + sandCost + aggregateCost + waterCost + admixtureCost + laborCost;

            // Calculate percentages
            const cementPercent = totalCost > 0 ? (cementCost / totalCost) * 100 : 0;
            const sandPercent = totalCost > 0 ? (sandCost / totalCost) * 100 : 0;
            const aggregatePercent = totalCost > 0 ? (aggregateCost / totalCost) * 100 : 0;
            const waterPercent = totalCost > 0 ? (waterCost / totalCost) * 100 : 0;
            const admixturePercent = totalCost > 0 ? (admixtureCost / totalCost) * 100 : 0;
            const laborPercent = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;

            // Build cost breakdown dynamically
            const costBreakdown = [
                { item: 'Cement', cost: cementCost, percentage: cementPercent },
                { item: 'Sand', cost: sandCost, percentage: sandPercent },
                { item: 'Aggregate', cost: aggregateCost, percentage: aggregatePercent },
            ];
            if (waterRateNum > 0) {
                costBreakdown.push({ item: 'Water', cost: waterCost, percentage: waterPercent });
            }
            if (admixtureRateNum > 0) {
                costBreakdown.push({ item: 'Admixture', cost: admixtureCost, percentage: admixturePercent });
            }
            if (laborRateNum > 0) {
                costBreakdown.push({ item: 'Labor', cost: laborCost, percentage: laborPercent });
            }

            // Prepare response
            const results = {
                totalCost,
                wetVolume: volume,
                dryVolumeWithWastage,
                cementBags,
                materialQuantities: [
                    { material: 'Cement Bags', volume: cementBags, mass: cementBags },
                    { material: 'Sand', volume: sandVolume, mass: sandMass },
                    { material: 'Aggregate', volume: aggregateVolume, mass: aggregateMass },
                ],
                costBreakdown,
            };

            return res.status(200).json(results);
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Calculation failed.' });
        }
    },
};

 export  {concreteCalculatorController};