
const calculateTile = async (req, res) => {
    try {
        const { rooms, globalParams } = req.body;

        // Validation
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            return res.status(400).json({ error: 'At least one room is required' });
        }
        if (!globalParams || !globalParams.tileL || !globalParams.tileW) {
            return res.status(400).json({ error: 'Tile length and width must be provided and greater than 0' });
        }

        // Helper functions
        const mmToFt = mm => mm * 0.0032808399;
        const inToFt = i => i / 12;
        const ft2ToM2 = ft2 => ft2 * 0.09290304;
        const ceil = n => Math.ceil(n);
        const safeNum = v => (isFinite(parseFloat(v)) ? parseFloat(v) : 0);

        // Extract global parameters
        const {
            tileL,
            tileW,
            jointMM,
            tileThkMM,
            bondIn,
            overPct,
            currency,
            tilesPerBox,
            tileCostM2,
            bondCost,
            groutYield,
            groutCost: groutCostParam, // Renamed to avoid conflict
            bondYield,
        } = globalParams;

        if (tileL <= 0 || tileW <= 0) {
            return res.status(400).json({ error: 'Tile length and width must be greater than 0' });
        }

        const tileFt2 = tileL * tileW; // Tile area (ft²)
        const jointPerFt2 = 1 / tileL + 1 / tileW; // Joint length per ft²
        const over = overPct / 100;

        // Process each room
        const results = {
            rooms: [],
            summary: {
                totalTiles: 0,
                totalM2Over: 0,
                totalGroutBags: 0,
                totalBondBags: 0,
                totalCost: 0,
            },
        };

        for (const room of rooms) {
            const { id, tag, L, W, doors, skirtIn } = room;
            const floorFt2 = safeNum(L) * safeNum(W);
            const skirtLen = Math.max(0, 2 * (safeNum(L) + safeNum(W)) - safeNum(doors));
            const skirtFt2 = skirtLen * inToFt(safeNum(skirtIn));
            const combined = floorFt2 + skirtFt2;

            const tilesRaw = tileFt2 > 0 ? combined / tileFt2 : 0;
            const tilesOver = ceil(tilesRaw * (1 + over));
            const areaFt2Over = combined * (1 + over);
            const areaM2Over = ft2ToM2(areaFt2Over);
            const groutFt3 = mmToFt(safeNum(jointMM)) * mmToFt(safeNum(tileThkMM)) * jointPerFt2 * combined;
            const bondFt3 = floorFt2 * inToFt(safeNum(bondIn)) * 1.15; // +15% waste
            const groutBags = groutFt3 > 0 && groutYield > 0 ? ceil(groutFt3 / groutYield) : 0;
            const bondBags = bondFt3 > 0 && bondYield > 0 ? ceil(bondFt3 / bondYield) : 0;
            const tileCost = areaM2Over * safeNum(tileCostM2);
            const groutCost = groutBags * safeNum(groutCostParam); // Use renamed variable
            const bondCostValue = bondBags * safeNum(bondCost); // Renamed to avoid conflict
            const totalCost = tileCost + groutCost + bondCostValue;
            console.log({ tileCost, groutCost, bondCostValue, totalCost });

            results.rooms.push({
                id,
                tag,
                floorFt2,
                skirtFt2,
                tilesRaw,
                tilesOver,
                areaM2Over,
                groutFt3,
                bondFt3,
                groutBags,
                bondBags,
                tileCost,
                groutCost,
                bondCost: bondCostValue,
                totalCost,
            });

            results.summary.totalTiles += tilesOver;
            results.summary.totalM2Over += areaM2Over;
            results.summary.totalGroutBags += groutBags;
            results.summary.totalBondBags += bondBags;
            results.summary.totalCost += totalCost;
        }

        return res.status(200).json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
};

export { calculateTile };
