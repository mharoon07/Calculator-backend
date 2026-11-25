// Helper function to parse feet-inches format to decimal feet
const feetInchesToDecimal = (feetInches) => {
    if (!feetInches || feetInches === '') return 0;
    const str = String(feetInches).trim();
    const match = str.match(/^(\d+(?:\.\d+)?)[''](\d+(?:\.\d+)?)[""]?$/) || str.match(/^(\d+(?:\.\d+)?)\s*['']?\s*(\d+(?:\.\d+)?)?\s*[""]?$/);
    if (!match) {
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;
    if (inches >= 12) {
        const extraFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return feet + extraFeet + (remainingInches / 12);
    }
    return feet + (inches / 12);
};

// Convert feet-inches to meters
const ftInToM = (feetInches) => {
    const decimalFeet = feetInchesToDecimal(feetInches);
    return decimalFeet * 0.3048;
};

// Calculate tile area from feet-inches dimensions
const areaOfTileFtIn = (lftIn, wftIn) => {
    const mL = ftInToM(lftIn);
    const mW = ftInToM(wftIn);
    return Math.max(1e-9, mL * mW);
};

const calculateBathroomTile = async (req, res) => {
    try {
        const { bathrooms } = req.body;

        // Validation
        if (!bathrooms || !Array.isArray(bathrooms) || bathrooms.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one bathroom is required'
            });
        }

        const SQM2SQFT = 10.76391041671;
        const bathroomResults = [];
        let totals = {
            wallArea: 0,
            featureArea: 0,
            showerArea: 0,
            otherArea: 0,
            totalArea: 0,
            wallTiles: 0,
            featureTiles: 0,
            floorTiles: 0,
            showerTiles: 0,
            otherTiles: 0,
            groutKg: 0,
            adhesiveKg: 0,
            adhesiveBags: 0
        };

        // Process each bathroom
        for (const bath of bathrooms) {
            // Validate required fields
            if (!bath.roomHeight || !bath.roomLength || !bath.roomWidth) {
                return res.status(400).json({
                    success: false,
                    error: `Bathroom ${bath.name || 'unnamed'}: Room dimensions are required`
                });
            }

            // Apply defaults matching frontend defaults
            const wallTileWaste = bath.wallTileWaste !== undefined ? bath.wallTileWaste : 10;
            const featureTileWaste = bath.featureTileWaste !== undefined ? bath.featureTileWaste : 10;
            const showerFloorTileWaste = bath.showerFloorTileWaste !== undefined ? bath.showerFloorTileWaste : 10;
            const otherFloorTileWaste = bath.otherFloorTileWaste !== undefined ? bath.otherFloorTileWaste : 10;
            const groutRatio = bath.groutRatio !== undefined ? bath.groutRatio : 0.5;
            const groutWaste = bath.groutWaste !== undefined ? bath.groutWaste : 5;
            const adhAll = bath.adhAll !== undefined ? bath.adhAll : 3.5;
            const adhWaste = bath.adhWaste !== undefined ? bath.adhWaste : 5;
            const bagKg = bath.bagKg !== undefined ? bath.bagKg : 20;
            const floorTileMode = bath.floorTileMode || 'different';

            // Convert room dimensions to meters
            const H = ftInToM(bath.roomHeight);
            const L = ftInToM(bath.roomLength);
            const W = ftInToM(bath.roomWidth);
            const gH = H;

            // Calculate wall areas (matching frontend exactly)
            const wallAreas = (bath.walls || []).map(wall => {
                const wallLen = (wall.name === 'A' || wall.name === 'C') ? L : W;
                const rawArea = wallLen * gH;

                // Opening areas
                let openingArea = 0;
                if (wall.hasDoor) {
                    const doorCount = wall.doorCount !== undefined ? wall.doorCount : 1;
                    const doorArea = ftInToM(wall.doorW) * ftInToM(wall.doorH) * doorCount;
                    openingArea += doorArea;
                }
                if (wall.hasVent) {
                    const ventCount = wall.ventCount !== undefined ? wall.ventCount : 1;
                    const ventArea = ftInToM(wall.ventW) * ftInToM(wall.ventH) * ventCount;
                    openingArea += ventArea;
                }

                // Feature panel
                let featureArea = 0;
                if (wall.hasFeature) {
                    const featCount = wall.featCount !== undefined ? wall.featCount : 1;
                    const featH = wall.featH ? ftInToM(wall.featH) : gH;
                    featureArea = ftInToM(wall.featW) * featH * featCount;
                }

                const afterOpenings = Math.max(0, rawArea - openingArea);
                const mainArea = Math.max(0, afterOpenings - featureArea);

                return { mainArea, featureArea, totalArea: rawArea };
            });

            const wallMainArea = wallAreas.reduce((sum, w) => sum + w.mainArea, 0);
            const wallFeatureArea = wallAreas.reduce((sum, w) => sum + w.featureArea, 0);

            // Tile counts (matching frontend exactly)
            const wallTileArea = areaOfTileFtIn(bath.wallTileL, bath.wallTileW);
            const featureTileArea = areaOfTileFtIn(bath.featureTileL, bath.featureTileW);
            const showerTileArea = areaOfTileFtIn(bath.showerFloorTileL, bath.showerFloorTileW);
            const otherTileArea = floorTileMode === 'same'
                ? showerTileArea
                : areaOfTileFtIn(bath.otherFloorTileL, bath.otherFloorTileW);

            const wallTiles = Math.ceil((wallMainArea / wallTileArea) * (1 + wallTileWaste / 100));
            const featureTiles = Math.ceil((wallFeatureArea / featureTileArea) * (1 + featureTileWaste / 100));

            // Floor areas (matching frontend exactly)
            const showerArea = ftInToM(bath.showerFloorL) * ftInToM(bath.showerFloorW);
            const totalFloorArea = L * W; // room floor
            const otherArea = Math.max(0, totalFloorArea - showerArea);

            const showerFloorTiles = showerArea > 0 ? Math.ceil((showerArea / showerTileArea) * (1 + showerFloorTileWaste / 100)) : 0;
            const otherWastePct = floorTileMode === 'same' ? showerFloorTileWaste : otherFloorTileWaste;
            const otherFloorTiles = otherArea > 0 ? Math.ceil((otherArea / otherTileArea) * (1 + otherWastePct / 100)) : 0;
            const floorTiles = showerFloorTiles + otherFloorTiles;

            // Grouting (matching frontend exactly)
            const bathroomTotalArea = wallMainArea + wallFeatureArea + totalFloorArea;
            const groutKg = (bathroomTotalArea * groutRatio) * (1 + groutWaste / 100);

            // Adhesive (matching frontend exactly)
            const adhesiveKg = (
                (wallMainArea + wallFeatureArea + totalFloorArea) * adhAll
            ) * (1 + adhWaste / 100);
            const adhesiveBags = Math.ceil(adhesiveKg / bagKg);

            const bathroomResult = {
                id: bath.id,
                name: bath.name,
                wallAreaFt: Number((wallMainArea * SQM2SQFT).toFixed(1)),
                featureAreaFt: Number((wallFeatureArea * SQM2SQFT).toFixed(1)),
                showerAreaFt: Number((showerArea * SQM2SQFT).toFixed(1)),
                otherAreaFt: Number((otherArea * SQM2SQFT).toFixed(1)),
                totalAreaFt: Number((bathroomTotalArea * SQM2SQFT).toFixed(1)),
                wallTiles,
                featureTiles,
                floorTiles,
                showerFloorTiles,
                otherFloorTiles,
                groutKg: Number(groutKg.toFixed(1)),
                adhesiveKg: Number(adhesiveKg.toFixed(1)),
                adhesiveBags
            };

            bathroomResults.push(bathroomResult);

            // Update totals
            totals.wallArea += wallMainArea;
            totals.featureArea += wallFeatureArea;
            totals.showerArea += showerArea;
            totals.otherArea += otherArea;
            totals.totalArea += bathroomTotalArea;
            totals.wallTiles += wallTiles;
            totals.featureTiles += featureTiles;
            totals.floorTiles += floorTiles;
            totals.showerTiles += showerFloorTiles;
            totals.otherTiles += otherFloorTiles;
            totals.groutKg += groutKg;
            totals.adhesiveKg += adhesiveKg;
            totals.adhesiveBags += adhesiveBags;
        }

        // Round totals at the end
        totals.wallAreaFt = Number((totals.wallArea * SQM2SQFT).toFixed(1));
        totals.featureAreaFt = Number((totals.featureArea * SQM2SQFT).toFixed(1));
        totals.showerAreaFt = Number((totals.showerArea * SQM2SQFT).toFixed(1));
        totals.otherAreaFt = Number((totals.otherArea * SQM2SQFT).toFixed(1));
        totals.totalAreaFt2 = Number((totals.totalArea * SQM2SQFT).toFixed(1));
        totals.groutKg = Number(totals.groutKg.toFixed(1));
        totals.adhesiveKg = Number(totals.adhesiveKg.toFixed(1));

        return res.status(200).json({
            success: true,
            results: {
                bathrooms: bathroomResults,
                totals
            }
        });
    } catch (err) {
        console.error('Error in calculateBathroomTile:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateBathroomTile };


