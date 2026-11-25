const calculatePowerLoad = async (req, res) => {
    try {
        const { rooms, voltage = 230, currency = 'PKR', rate = 20 } = req.body;

        // Validation
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one room with appliances is required'
            });
        }

        // Helper function to calculate appliance stats
        const calcApplianceStats = (appliance, voltageValue) => {
            const qty = Number(appliance.qty) || 0;
            const watt = Number(appliance.watt) || 0;
            const hrs = Number(appliance.hours) || 0;
            const days = Number(appliance.days) || 0;
            const applianceWatts = qty * watt;
            const energy = (applianceWatts * hrs * days) / 1000; // kWh/month
            const avgHourly = energy / (days * hrs || 1);
            const current = applianceWatts / voltageValue;
            return { applianceWatts, energy, avgHourly, current };
        };

        // Calculate totals
        let totalWatts = 0;
        let totalEnergy = 0;
        const allApplianceResults = [];

        rooms.forEach(room => {
            if (!room.appliances || !Array.isArray(room.appliances)) {
                return;
            }

            room.appliances.forEach(appliance => {
                const { applianceWatts, energy, avgHourly, current } = calcApplianceStats(appliance, voltage);
                totalWatts += applianceWatts;
                totalEnergy += energy;
                allApplianceResults.push({
                    roomType: room.type || 'Unknown',
                    appliance: appliance.name || 'Unknown',
                    qty: appliance.qty || 0,
                    watt: appliance.watt || 0,
                    hrs: appliance.hours || 0,
                    days: appliance.days || 0,
                    applianceWatts,
                    energy,
                    avgHourly,
                    current
                });
            });
        });

        // Calculate summary values
        const totalKW = totalWatts / 1000;
        const amps = totalWatts / voltage;
        const avgKwhPerHr = totalEnergy / 720;
        const rawCost = totalEnergy * rate;

        const costNumber = Number(rawCost).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const needsSpace = /^[A-Za-z]+$/.test((currency || '').trim());
        const formattedCost = currency
            ? `${currency.trim()}${needsSpace ? ' ' : ''}${costNumber}`
            : costNumber;

        return res.status(200).json({
            success: true,
            totalKW: Number(totalKW.toFixed(2)),
            amps: Number(amps.toFixed(2)),
            avgKwhPerHr: Number(avgKwhPerHr.toFixed(2)),
            totalEnergy: Number(totalEnergy.toFixed(1)),
            cost: formattedCost,
            appliances: allApplianceResults.map(a => ({
                ...a,
                applianceWatts: Number(a.applianceWatts.toFixed(2)),
                energy: Number(a.energy.toFixed(1)),
                avgHourly: Number(a.avgHourly.toFixed(2)),
                current: Number(a.current.toFixed(2))
            }))
        });
    } catch (err) {
        console.error('Error in calculatePowerLoad:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculatePowerLoad };

