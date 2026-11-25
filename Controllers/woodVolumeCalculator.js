const calculateWoodVolume = (req, res) => {
    const { frameWidth, frameWidthUnit, frameThickness, frameThicknessUnit, doors, pricePerCft } = req.body;
 console.log(req.body);
    // Input validation
    if (!frameWidth || !frameThickness || !doors || !Array.isArray(doors) || doors.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: frameWidth, frameThickness, and doors are required' });
    }

    if (!['in', 'ft'].includes(frameWidthUnit) || !['in', 'ft'].includes(frameThicknessUnit)) {
        return res.status(400).json({ error: 'Invalid unit: frameWidthUnit and frameThicknessUnit must be "in" or "ft"' });
    }

    try {
        // Convert units to feet
        const convertToFeet = (value, unit) => (unit === 'in' ? value / 12 : value);
        const fw = convertToFeet(Number(frameWidth), frameWidthUnit);
        const ft = convertToFeet(Number(frameThickness), frameThicknessUnit);

        // Validate numeric inputs
        if (isNaN(fw) || isNaN(ft)) {
            return res.status(400).json({ error: 'Frame width and thickness must be valid numbers' });
        }

        let totalVolume = 0;
        let totalPrice = 0;
        const doorVolumes = [];

        for (const door of doors) {
            const { height, width, quantity } = door;

            if (!height || !width || !quantity || isNaN(Number(height)) || isNaN(Number(width)) || isNaN(Number(quantity))) {
                return res.status(400).json({ error: 'Invalid door dimensions or quantity: height, width, and quantity must be valid numbers' });
            }
            if (quantity < 1) {
                return res.status(400).json({ error: 'Quantity must be at least 1' });
            }

            // Formula: (2 × Height + Width + 1) × Frame Width × Frame Thickness
            const perDoorVolume = (2 * Number(height) + Number(width) + 1) * fw * ft;
            const doorTotalVolume = perDoorVolume * Number(quantity);

            // Cost calculation (if pricePerCft provided)
            const perDoorCost = pricePerCft ? perDoorVolume * Number(pricePerCft) : 0;
            const doorTotalCost = pricePerCft ? doorTotalVolume * Number(pricePerCft) : 0;

            totalVolume += doorTotalVolume;
            totalPrice += doorTotalCost;

            doorVolumes.push({
                height,
                width,
                quantity,
                perDoorVolume: Number(perDoorVolume.toFixed(2)),
                doorTotalVolume: Number(doorTotalVolume.toFixed(2)),
                perDoorCost: Number(perDoorCost.toFixed(2)),
                doorTotalCost: Number(doorTotalCost.toFixed(2))
            });
        }

        res.status(200).json({
            pricePerCft: pricePerCft ? Number(pricePerCft) : 'N/A',
            totalVolume: Number(totalVolume.toFixed(2)),
            totalPrice: pricePerCft ? Number(totalPrice.toFixed(2)) : 'Price not provided',
            doorVolumes
        });
    } catch (error) {
        console.error('Error calculating wood volume:', error);
        res.status(500).json({ error: 'Internal server error during calculation' });
    }
};

export { calculateWoodVolume };
