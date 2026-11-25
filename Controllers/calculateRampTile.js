const calculateRampTile = async (req, res) => {
    try {
        const { areas } = req.body;

        // Validation
        if (!areas || !Array.isArray(areas) || areas.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'At least one area is required' 
            });
        }

        // Helper function to convert to feet
        const convertToFeet = (value, unit) => {
            if (unit === "feet") return value;
            if (unit === "meter") return value * 3.28084;
            if (unit === "inches") return value / 12;
            return value;
        };

        // Helper function to parse non-negative number
        const parseNonNeg = (value) => {
            const num = parseFloat(value);
            return isFinite(num) && num >= 0 ? num : NaN;
        };

        const areaResults = [];
        let totalTiles = 0;

        for (let i = 0; i < areas.length; i++) {
            const area = areas[i];
            
            const width = parseNonNeg(area.width);
            const length = parseNonNeg(area.length);
            const tileWidth = parseNonNeg(area.tileWidth);
            const tileLength = parseNonNeg(area.tileLength);

            // Validate all dimensions
            if ([width, length, tileWidth, tileLength].some(Number.isNaN)) {
                return res.status(400).json({ 
                    success: false,
                    error: `Area ${i + 1}: Please enter valid non-negative numbers for all dimensions.` 
                });
            }

            // Convert all dimensions to feet
            const widthFeet = convertToFeet(width, area.widthUnit || 'feet');
            const lengthFeet = convertToFeet(length, area.lengthUnit || 'feet');
            const areaSqFt = widthFeet * lengthFeet;

            const tileWidthFeet = convertToFeet(tileWidth, area.tileWidthUnit || 'inches');
            const tileLengthFeet = convertToFeet(tileLength, area.tileLengthUnit || 'inches');
            const tileAreaSqFt = tileWidthFeet * tileLengthFeet;

            // Calculate tiles needed
            const tilesNeeded = tileAreaSqFt > 0 ? Math.ceil(areaSqFt / tileAreaSqFt) : 0;

            areaResults.push({
                id: area.id || i,
                width,
                widthUnit: area.widthUnit || 'feet',
                length,
                lengthUnit: area.lengthUnit || 'feet',
                tileWidth,
                tileWidthUnit: area.tileWidthUnit || 'inches',
                tileLength,
                tileLengthUnit: area.tileLengthUnit || 'inches',
                areaSqFt,
                tileAreaSqFt,
                tilesNeeded
            });

            totalTiles += tilesNeeded;
        }

        return res.status(200).json({
            success: true,
            results: {
                areaResults,
                totalTiles
            }
        });
    } catch (err) {
        console.error('Error in calculateRampTile:', err);
        return res.status(500).json({ 
            success: false,
            error: err.message || 'Server error' 
        });
    }
};

export { calculateRampTile };



