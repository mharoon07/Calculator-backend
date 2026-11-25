
/**
 * Calculates materials and costs for False Ceiling (Gypsum/POP)
 */
export const calculateFalseCeiling = async (req, res) => {
    try {
        const { rooms, rates, options } = req.body;

        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            return res.status(400).json({ error: 'At least one room is required' });
        }

        const safeNum = v => (isFinite(parseFloat(v)) ? parseFloat(v) : 0);

        // Default rates if not provided
        const defaultRates = {
            gypsumSheet: 1200, // per sheet
            mainChannel: 350,  // per 12ft length
            furringChannel: 250, // per 12ft length
            perimeterChannel: 200, // per 12ft length
            jointCompound: 1500, // per 20kg bag
            screwBox: 800, // per 1000 screws
            laborPerSqFt: 35,
            ...rates
        };

        const results = {
            rooms: [],
            summary: {
                totalAreaSqFt: 0,
                totalCost: 0,
                materials: {
                    gypsumSheets: 0,
                    mainChannels: 0,
                    furringChannels: 0,
                    perimeterChannels: 0,
                    jointCompoundBags: 0,
                    screwsNeeded: 0
                }
            }
        };

        for (const room of rooms) {
            const length = safeNum(room.length);
            const width = safeNum(room.width);
            const area = length * width;
            const perimeter = 2 * (length + width);

            // Material Estimation Logic (Standard Industry Specs)
            // 1 Gypsum Sheet (4'x8') covers 32 sqft
            const sheets = Math.ceil(area / 32 * 1.05); // +5% waste

            // Channels - rough estimates based on 4ft spacing for mains and 16in for furring
            const mainChannels = Math.ceil((area / 4) / 12 * 1.1);
            const furringChannels = Math.ceil((area / 1.33) / 12 * 1.1);
            const perimeterChannels = Math.ceil(perimeter / 12 * 1.05);

            // Accessories
            const screws = Math.ceil(area * 1.5); // ~1.5 screws per sqft
            const compoundBags = Math.ceil(area / 500); // 1 bag per 500 sqft

            const materialCost = (sheets * defaultRates.gypsumSheet) +
                (mainChannels * defaultRates.mainChannel) +
                (furringChannels * defaultRates.furringChannel) +
                (perimeterChannels * defaultRates.perimeterChannel) +
                (compoundBags * defaultRates.jointCompound) +
                (Math.ceil(screws / 1000) * defaultRates.screwBox);

            const laborCost = area * defaultRates.laborPerSqFt;
            const totalRoomCost = materialCost + laborCost;

            results.rooms.push({
                tag: room.tag || 'Room',
                area,
                sheets,
                mainChannels,
                furringChannels,
                perimeterChannels,
                totalRoomCost
            });

            results.summary.totalAreaSqFt += area;
            results.summary.totalCost += totalRoomCost;
            results.summary.materials.gypsumSheets += sheets;
            results.summary.materials.mainChannels += mainChannels;
            results.summary.materials.furringChannels += furringChannels;
            results.summary.materials.perimeterChannels += perimeterChannels;
            results.summary.materials.screwsNeeded += screws;
            results.summary.materials.jointCompoundBags += compoundBags;
        }

        return res.status(200).json({ success: true, ...results });

    } catch (err) {
        console.error('Error in calculateFalseCeiling:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};
