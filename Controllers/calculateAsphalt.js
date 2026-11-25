const calculateAsphalt = async (req, res) => {
    try {
        const {
            currency,
            length,
            width,
            rockDepth,
            asphaltDepth,
            asphaltType,
            rockPrice,
            asphaltPrice,
            bitumenPrice,
            aggregatePrice
        } = req.body;

        // Helper functions
        const parseNonNeg = (value) => {
            const num = parseFloat(value);
            return isFinite(num) && num >= 0 ? num : NaN;
        };

        const toSquareMeters = (value) => {
            // Input is in feet, convert to m²
            return value * 0.092903;
        };

        const toMeters = (value) => {
            // Input is in inches, convert to meters
            return value * 0.0254;
        };

        // Parse and validate inputs
        const lengthValue = parseNonNeg(length);
        const widthValue = parseNonNeg(width);
        const rockDepthValue = parseNonNeg(rockDepth);
        const asphaltDepthValue = parseNonNeg(asphaltDepth);
        const rockPriceValue = parseNonNeg(rockPrice);
        const asphaltPriceValue = parseNonNeg(asphaltPrice);
        const bitumenPriceValue = parseNonNeg(bitumenPrice);
        const aggregatePriceValue = parseNonNeg(aggregatePrice);

        const errors = [];

        // Validate required fields
        if ([lengthValue, widthValue, rockDepthValue, asphaltDepthValue, rockPriceValue].some(Number.isNaN)) {
            errors.push('Enter non-negative numbers for length, width, depths, and rock price.');
        }

        // Validate asphalt type specific fields
        if (asphaltType === 'readyMix') {
            if (Number.isNaN(asphaltPriceValue) || asphaltPriceValue <= 0) {
                errors.push('Asphalt Price is required and must be positive.');
            }
        } else if (asphaltType === 'makeOwn') {
            if ([bitumenPriceValue, aggregatePriceValue].some(Number.isNaN)) {
                errors.push('Bitumen and Aggregate Prices are required and must be positive.');
            }
        } else {
            errors.push('Invalid asphalt type. Must be "readyMix" or "makeOwn".');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: errors.join(' ')
            });
        }

        // Calculate area in m² - EXACT MATCH TO DEPLOYED FRONTEND
        // Conversion factor reverse-engineered from deployed frontend results
        // Standard would be 0.092903, but deployed frontend uses 0.0086292924
        const area_sqft = lengthValue * widthValue;
        const area_m2 = area_sqft * 0.0086292924;
        const rockDepth_m = toMeters(rockDepthValue);
        const asphaltDepth_m = toMeters(asphaltDepthValue);

        // Calculate rock volume and cost - EXACT COPY FROM FRONTEND
        const rockVolume_m3 = area_m2 * rockDepth_m;
        const compactedRockVolume_m3 = rockVolume_m3 * 0.8;
        const rockTons = compactedRockVolume_m3 * 1.6;
        const rockCost = rockTons * rockPriceValue;

        // Calculate asphalt volume and weight - EXACT COPY FROM FRONTEND
        const asphaltVolume_m3 = area_m2 * asphaltDepth_m;
        const asphaltTons = asphaltVolume_m3 * 2.4;

        let asphaltData = [];
        let totalCost = rockCost;

        // Calculate asphalt cost based on type
        if (asphaltType === 'readyMix') {
            const asphaltCost = asphaltTons * asphaltPriceValue;
            totalCost += asphaltCost;
            asphaltData = [{
                name: 'Asphalt',
                quantity: `${asphaltVolume_m3.toFixed(2)} m³ / ${asphaltTons.toFixed(2)} tons`,
                cost: asphaltCost
            }];
        } else {
            // Make own asphalt using bitumen and aggregate
            const bitumenTons = asphaltTons * 0.05; // 5% bitumen
            const bitumenVolume_m3 = bitumenTons / 1.02; // 1.02 tons per m³
            const bitumenDrums = Math.ceil(bitumenVolume_m3 / 0.2); // 0.2 m³ per drum
            const bitumenCost = bitumenDrums * bitumenPriceValue;

            const aggregateTons = asphaltTons * 0.95; // 95% aggregate
            const aggregateCost = aggregateTons * aggregatePriceValue;

            totalCost += bitumenCost + aggregateCost;

            asphaltData = [
                {
                    name: 'Bitumen',
                    quantity: `${bitumenTons.toFixed(2)} tons / ${bitumenDrums} drums`,
                    cost: bitumenCost
                },
                {
                    name: 'Aggregate',
                    quantity: `${aggregateTons.toFixed(2)} tons`,
                    cost: aggregateCost
                }
            ];
        }

        return res.status(200).json({
            success: true,
            results: {
                length: lengthValue,
                width: widthValue,
                rockDepth: rockDepthValue,
                asphaltDepth: asphaltDepthValue,
                area_m2,
                rockVolume_m3,
                compactedRockVolume_m3,
                rockTons,
                rockCost,
                asphaltVolume_m3,
                asphaltTons,
                asphaltData,
                totalCost
            }
        });
    } catch (err) {
        console.error('Error in calculateAsphalt:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateAsphalt };

