const calculateOverheadTank = async (req, res) => {
    try {
        const { dimensions, mixRatio, columns } = req.body;

        // Validate inputs
        if (!dimensions || !mixRatio) {
            return res.status(400).json({ error: 'Dimensions and mix ratio are required.' });
        }
        const requiredFields = ['length', 'width', 'height', 'wallThickness', 'bottomThickness', 'roofThickness', 'manholeLength', 'manholeWidth'];
        for (const field of requiredFields) {
            if (!dimensions[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }
        if (!mixRatio.cement || !mixRatio.sand || !mixRatio.crush) {
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
                inches = parseFloat(parts[1].replace('"', '').replace("''", '')) || 0;
            }
            return feet + inches / 12;
        };

        // Parse dimensions
        const L = parseFeetInches(dimensions.length);
        const W = parseFeetInches(dimensions.width);
        const H = parseFeetInches(dimensions.height);
        const wall = parseFeetInches(dimensions.wallThickness);
        const bottom = parseFeetInches(dimensions.bottomThickness);
        const roof = parseFeetInches(dimensions.roofThickness);
        const mhL = parseFeetInches(dimensions.manholeLength);
        const mhW = parseFeetInches(dimensions.manholeWidth);

        // Validate parsed dimensions
        if ([L, W, H, wall, bottom, roof, mhL, mhW].some(val => val === 0)) {
            return res.status(400).json({ error: 'Invalid dimension format. Use format like 4\'6" or 4\'.' });
        }

        // Calculate volumes
        const outerL = L + 2 * wall;
        const outerW = W + 2 * wall;
        const bottomVolume = outerL * outerW * bottom;
        const wallVolume = 2 * (L * H * wall) + 2 * (W * H * wall);
        const roofSlabVolume = outerL * outerW * roof;
        const manholeOpeningVolume = mhL * mhW * roof;
        const roofVolume = roofSlabVolume - manholeOpeningVolume;

        // Calculate column volumes and shuttering
        let columnVolume = 0;
        let columnShuttering = 0;
        if (columns && Array.isArray(columns) && columns.length === 4) {
            columns.forEach(col => {
                const cl = parseFeetInches(col.length);
                const cw = parseFeetInches(col.width);
                const ch = parseFeetInches(col.height);
                if (cl > 0 && cw > 0 && ch > 0) {
                    columnVolume += cl * cw * ch;
                    columnShuttering += 2 * (cl + cw) * ch;
                }
            });
        } else {
            return res.status(400).json({ error: 'Four column dimensions are required.' });
        }

        const totalVolume = bottomVolume + wallVolume + roofVolume + columnVolume;

        // Calculate shuttering
        const wallShuttering = 2 * (L + W) * H + 2 * ((L - 2 * wall) + (W - 2 * wall));
        const roofShuttering = (L * W) + 2 * (L + W) * roof + 2 * (mhL + mhW) * roof;
        const totalShuttering = wallShuttering + roofShuttering + columnShuttering;

        // Material estimation
        const totalParts = parseInt(mixRatio.cement) + parseInt(mixRatio.sand) + parseInt(mixRatio.crush);
        if (totalParts === 0) {
            return res.status(400).json({ error: 'Mix ratio parts cannot sum to zero.' });
        }
        const dryVolume = totalVolume * 1.54; // 54% increase for dry volume
        const cementVolume = (dryVolume * parseInt(mixRatio.cement)) / totalParts;
        const sandVolume = (dryVolume * parseInt(mixRatio.sand)) / totalParts;
        const crushVolume = (dryVolume * parseInt(mixRatio.crush)) / totalParts;
        const cementBags = cementVolume / 1.25;  
        const waterLiters = cementBags * 30; // 30 liters per bag (from HTML logic)

        res.json({
            results: {
                bottomVolume,
                wallVolume,
                roofVolume,
                columnVolume,
                totalVolume,
                wallShuttering,
                roofShuttering,
                columnShuttering,
                totalShuttering,
                cementBags,
                sandVolume,
                crushVolume,
                waterLiters,
            },
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export { calculateOverheadTank };