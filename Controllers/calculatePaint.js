const calculatePaint = async (req, res) => {
    try {
        const { walls } = req.body;
        console.log (walls)

        // Validation
        if (!walls || !Array.isArray(walls) || walls.length === 0) {
            return res.status(400).json({ error: 'At least one wall or roof is required' });
        }

        // Helper functions
        const safeNum = v => (isFinite(parseFloat(v)) ? parseFloat(v) : 0);

        // Application rates (Berger, using midpoint values)
        const rates = {
            primer: 13, // m²/L
            putty: 6, // m²/kg
            SPD: 14, // m²/L
            Emulsion: 15, // m²/L
            WeatherCoat: 12.5, // m²/L
        };

        // Process each wall
        const results = {
            walls: [],
            summary: {
                primer: 0,
                putty: 0,
                SPD: 0,
                Emulsion: 0,    
                WeatherCoat: 0,
            },
        };

        for (const wall of walls) {
            const { id, tag, wallType, wallLength, wallHeight, windows, doors, primerCoats, puttyCoats, paintCoats, paintType } = wall;

            // Validate inputs
            if (!['internal', 'external', 'roof'].includes(wallType)) {
                return res.status(400).json({ error: `Invalid type for ${tag}` });
            }
            if (wallType === 'external' && paintType !== 'WeatherCoat') {
                return res.status(400).json({ error: `External walls must use WeatherCoat for ${tag}` });
            }
            if ((wallType === 'internal' || wallType === 'roof') && !['SPD', 'Emulsion'].includes(paintType)) {
                return res.status(400).json({ error: `Internal walls or roofs must use SPD or Emulsion for ${tag}` });
            }
            if (wallType === 'roof' && (windows?.length > 0 || doors?.length > 0)) {
                return res.status(400).json({ error: `Roofs cannot have windows or doors for ${tag}` });
            }

            // Calculate areas
            const totalAreaFt = safeNum(wallLength) * safeNum(wallHeight); // For roofs, wallHeight is width
            let windowArea = 0;
            if (wallType !== 'roof' && windows && Array.isArray(windows)) {
                windowArea = windows.reduce((sum, win) => sum + safeNum(win.width) * safeNum(win.height), 0);
            }
            let doorArea = 0;
            if (wallType !== 'roof' && doors && Array.isArray(doors)) {
                doorArea = doors.reduce((sum, door) => sum + safeNum(door.width) * safeNum(door.height), 0);
            }
            const paintableAreaFt = totalAreaFt - windowArea - doorArea;
            const paintableAreaM2 = paintableAreaFt * 0.092903;

            // Calculate quantities
            const primerQty = safeNum(primerCoats) * paintableAreaM2 / rates.primer;
            const puttyQty = (wallType === 'internal' || wallType === 'roof') ? safeNum(puttyCoats) * paintableAreaM2 / rates.putty : 0;
            const paintQty = safeNum(paintCoats) * paintableAreaM2 / rates[paintType];

            results.walls.push({
                id,
                tag,
                wallType,
                wallLength: safeNum(wallLength),
                wallHeight: safeNum(wallHeight), // For roofs, this is width
                windowArea,
                doorArea,
                areaFt: paintableAreaFt,
                areaM2: paintableAreaM2,
                primerQty,
                puttyQty,
                paintType,
                paintQty,
            });

            results.summary.primer += primerQty;
            results.summary.putty += puttyQty;
            results.summary[paintType] += paintQty;
        }

        return res.status(200).json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
};

export { calculatePaint };