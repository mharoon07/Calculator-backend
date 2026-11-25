const calculatePlaster = (req, res) => {
    try {
        const { walls } = req.body;

        if (!walls || !Array.isArray(walls)) {
            return res.status(400).json({ error: "Invalid input: 'walls' must be an array." });
        }

        const results = walls.map((wall) => {
            const requiredFields = [
                'type',
                'height',
                'length',
                'plasterThickness',
                'mortarRatio',
                'waterCementRatio',
            ];

            for (const field of requiredFields) {
                if (wall[field] === undefined || wall[field] === null || wall[field] === '') {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Validate type
            if (!['wall', 'roof'].includes(wall.type)) {
                throw new Error("Invalid type: must be 'wall' or 'roof'.");
            }

            // Parse numeric values
            const height = parseFloat(wall.height);
            const length = parseFloat(wall.length);
            const plasterThicknessInches = parseFloat(wall.plasterThickness);
            const plasterThickness = plasterThicknessInches / 12;
            const [cementPart, sandPart] = wall.mortarRatio.split(':').map(Number);
            const waterCementRatio = parseFloat(wall.waterCementRatio);
            const wallThicknessInches = parseFloat(wall.wallThickness) || 6; // Default to 6 inches
            const wallThickness = wallThicknessInches / 12; // Convert inches to feet

            if (
                isNaN(height) ||
                isNaN(length) ||
                isNaN(plasterThickness) ||
                isNaN(waterCementRatio) ||
                isNaN(wallThickness) ||
                isNaN(cementPart) ||
                isNaN(sandPart)
            ) {
                throw new Error("Invalid numeric value for height, length, plaster thickness, wall thickness, mortar ratio, or water-cement ratio.");
            }

            if (height <= 0 || length <= 0 || plasterThickness <= 0 || wallThickness <= 0) {
                throw new Error("Height, length, plaster thickness, and wall thickness must be positive.");
            }

            if (cementPart <= 0 || sandPart <= 0) {
                throw new Error("Mortar ratio parts must be positive.");
            }

            // Calculate wall/roof area
            const wallArea = height * length;

            // Calculate window and door deductions (only for walls)
            let windowArea = 0;
            let windowJambArea = 0;
            let doorArea = 0;

            if (wall.type === 'wall') {
                if (wall.windows) {
                    if (!Array.isArray(wall.windows)) {
                        throw new Error("Windows must be an array.");
                    }
                    windowArea = wall.windows.reduce(
                        (sum, win) => {
                            const width = parseFloat(win.width) || 0;
                            const height = parseFloat(win.height) || 0;
                            if (width < 0 || height < 0) {
                                throw new Error("Window dimensions must be non-negative.");
                            }
                            // return (2 * (width + height) * wallThickness) / 2;

                            return sum + width * height;
                        },
                        0
                    );
                    // Calculate window jamb area: perimeter * wall thickness
                    windowJambArea = wall.windows.reduce((sum, win) => {
                        const width = parseFloat(win.width) || 0;
                        const height = parseFloat(win.height) || 0;
                        const perimeter = 2 * (width + height);



                        return sum + (perimeter * wallThickness) / 2;

                    }, 0);
                }

                if (wall.doors) {
                    if (!Array.isArray(wall.doors)) {
                        throw new Error("Doors must be an array.");
                    }
                    doorArea = wall.doors.reduce(
                        (sum, door) => {
                            const width = parseFloat(door.width) || 0;
                            const height = parseFloat(door.height) || 0;
                            if (width < 0 || height < 0) {
                                throw new Error("Door dimensions must be non-negative.");
                            }
                            return sum + width * height;
                        },
                        0
                    );
                }
            }

            // Net area after deductions
            const netWallArea = wallArea - windowArea + windowJambArea - doorArea;

            if (netWallArea < 0) {
                throw new Error("Net wall area cannot be negative after deductions.");
            }

            // Plaster volume (wet volume) in ft³
            const plasterVolume = netWallArea * plasterThickness.toFixed(3);
            // console.log( plasterThickness.toFixed(3)+"plasterThickness")
            // console.log(plasterVolume +"plasterVolume")

            // Dry mortar volume (33% more than wet volume)
            const dryMortar = plasterVolume * 1.54;
            console.log(dryMortar + "dryMortar")

            // Cement and sand volumes
            const totalParts = cementPart + sandPart;

            console.log(totalParts, "totalParts")

            const cementVol = dryMortar * (cementPart / totalParts);
            // const cementVol = plasterVolume / totalParts

            console.log(cementVol.toFixed(2) + "cementVol")

            const sandVol = (dryMortar  ) * (sandPart / totalParts);
           
            console.log(sandVol + "sandVol")

            // Cement in bags (1 bag = 1.25 ft³)
            const cementBags = cementVol.toFixed(2) / 1.25;

            // Water in liters (1 ft³ = 0.0283168 m³, 1 m³ cement = 1440 kg)
            const cementM3 = cementVol / 35.3147;
            console.log(cementM3, cementVol * 0.0283168)

            const cementKg = cementM3 * 1440;
            const waterLiters = cementKg * waterCementRatio;

            return {
                type: wall.type,
                tag: wall.tag || '-',
                grid: wall.grid || '-',
                wallLength: length,
                wallHeight: height,
                wallArea,
                windowArea,
                windowJambArea,
                doorArea,
                netWallArea,
                plasterThickness, // in feet
                plasterVolume, // in ft³
                cementVol,
                cementBags,
                sandVol,
                waterLiters,
            };
        });

        // Calculate totals
        const totalNetArea = results.reduce((sum, r) => sum + r.netWallArea, 0);
        const totalPlaster = results.reduce((sum, r) => sum + r.plasterVolume, 0);
        const totalCement = results.reduce((sum, r) => sum + r.cementVol, 0);
        const totalCementBags = results.reduce((sum, r) => sum + r.cementBags, 0);
        const totalSand = results.reduce((sum, r) => sum + r.sandVol, 0);
        const totalWater = results.reduce((sum, r) => sum + r.waterLiters, 0);

        res.status(200).json({
            success: true,
            results,
            totals: {
                totalNetArea,
                totalPlaster,
                totalCement,
                totalCementBags,
                totalSand,
                totalWater,
            },
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export { calculatePlaster };