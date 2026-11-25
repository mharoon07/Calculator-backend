const calculateResidentialElectricalWiring = async (req, res) => {
    try {
        const {
            siteData,
            rooms = []
        } = req.body;

        // Validation
        if (!siteData) {
            return res.status(400).json({
                success: false,
                error: 'siteData is required'
            });
        }

        // Constants
        const FT2M = 0.3048; // feet to meters

        // Helper functions
        const num = (v) => {
            const x = parseFloat(v);
            return isNaN(x) ? 0 : x;
        };

        const fmt = (n, d = 2) => {
            const x = Number.isFinite(n) ? n : 0;
            return x.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
        };

        // Extract site data
        const plotW = Math.max(0, num(siteData.plotWidth));
        const plotL = Math.max(0, num(siteData.plotLength));
        const back = Math.max(0, num(siteData.backOpen));
        const front = Math.max(0, num(siteData.frontOpen));
        const side = Math.max(0, num(siteData.sideOpen));
        const W = Math.max(0, plotW - side); // effective covered width
        const L = Math.max(0, plotL - back - front); // effective covered length

        const coverage = Math.min(1, Math.max(0, num(siteData.coveragePct) / 100));
        const fl = Math.max(1, Math.round(num(siteData.floorCount)));
        const coil_m = Math.max(1, num(siteData.coilLen));
        const dropLF_ft = Math.max(0, num(siteData.dropLenLF));
        const earthFrac = Math.min(1, Math.max(0, num(siteData.earthPct) / 100));

        // Totals across all rooms
        const validRooms = rooms.filter(Boolean);
        let nRooms = validRooms.length;
        let nL = 0, nF = 0, nS = 0, nAC = 0, nAp = 0;

        // Device counts per floor
        const perFloorMCB = {};
        const perFloorPlatesSockets = {};

        validRooms.forEach(r => {
            const floor = r.floor || 'Ground';
            const roof = num(r.roof);
            const wall = num(r.wall);
            const fans = num(r.fans);
            const sockets = num(r.sockets);
            const acs = num(r.acs);
            const apps = num(r.apps);

            const lights = roof + wall;
            nL += lights;
            nF += fans;
            nS += sockets;
            nAC += acs;
            nAp += apps;

            // Initialize floor buckets
            if (!perFloorMCB[floor]) perFloorMCB[floor] = { a10: 0, a16: 0, a20: 0, total: 0 };
            if (!perFloorPlatesSockets[floor]) perFloorPlatesSockets[floor] = { plates: 0, sockets: 0 };

            // Switch plates: one per area if there are any lights or fans
            const hasLF = (lights + fans) > 0;
            if (hasLF) perFloorPlatesSockets[floor].plates += 1;
            perFloorPlatesSockets[floor].sockets += sockets;

            // MCB rules (rooms that are Bedroom or any Bathroom type)
            const isBed = r.type === 'Bedroom';
            const isBath = /Bathroom/i.test(r.type);
            if (isBed || isBath) {
                if (hasLF) perFloorMCB[floor].a10 += 1; // 10A for Lights & Fans
                if (sockets > 0) perFloorMCB[floor].a16 += 1; // 16A for Sockets
                perFloorMCB[floor].a20 += acs + apps; // 20A for each AC and appliance
            }
        });

        // Tally totals
        const mcbTotals = { a10: 0, a16: 0, a20: 0, total: 0 };
        Object.values(perFloorMCB).forEach(f => {
            f.total = f.a10 + f.a16 + f.a20;
            mcbTotals.a10 += f.a10;
            mcbTotals.a16 += f.a16;
            mcbTotals.a20 += f.a20;
            mcbTotals.total += f.total;
        });

        const platesSocketsTotals = { plates: 0, sockets: 0 };
        Object.values(perFloorPlatesSockets).forEach(f => {
            platesSocketsTotals.plates += f.plates;
            platesSocketsTotals.sockets += f.sockets;
        });

        // Geometry
        const halfDiag_ft = 0.5 * Math.sqrt(W * W + L * L);
        const covered_ft2 = W * L * coverage * fl;

        // Conductor-only (ft) calculations
        const c329_con = (nL + nF) * dropLF_ft; // 3/29: switch→unit (lights+fans)
        const c729_switch_con = nRooms * halfDiag_ft; // 7/29: DB→switch per room
        const c729_sockets_con = nS * halfDiag_ft; // 7/29: DB→sockets
        const c736_con = (nAC + nAp) * halfDiag_ft; // 7/36: DB→AC + Appliances

        // Expand with Neutral = Conductor, Earth = % of Conductor
        const expand = (con_ft) => {
            const neu_ft = con_ft;
            const ear_ft = con_ft * earthFrac;
            const total_ft = con_ft + neu_ft + ear_ft;
            const total_m = total_ft * FT2M;
            return { con_ft, neu_ft, ear_ft, total_ft, total_m };
        };

        const buckets = {
            '3/29 (Switch→Unit, Lights+Fans)': expand(c329_con),
            '7/29 (DB→Switch, per Room)': expand(c729_switch_con),
            '7/29 (DB→Sockets)': expand(c729_sockets_con),
            '7/36 (DB→AC + Appliances)': expand(c736_con),
        };

        // Wire type totals
        const sumBuckets = (keys) => {
            const acc = { con_ft: 0, neu_ft: 0, ear_ft: 0, total_ft: 0, total_m: 0 };
            keys.forEach(k => {
                const b = buckets[k];
                acc.con_ft += b.con_ft;
                acc.neu_ft += b.neu_ft;
                acc.ear_ft += b.ear_ft;
                acc.total_ft += b.total_ft;
                acc.total_m += b.total_m;
            });
            return acc;
        };

        const wireTotals = {
            '3/29': sumBuckets(['3/29 (Switch→Unit, Lights+Fans)']),
            '7/29': sumBuckets(['7/29 (DB→Switch, per Room)', '7/29 (DB→Sockets)']),
            '7/36': sumBuckets(['7/36 (DB→AC + Appliances)']),
        };

        const coils = {
            '3/29': Math.ceil(wireTotals['3/29'].total_m / coil_m),
            '7/29': Math.ceil(wireTotals['7/29'].total_m / coil_m),
            '7/36': Math.ceil(wireTotals['7/36'].total_m / coil_m),
        };

        // Breaker counts
        const floorsPresent = Object.keys(perFloorMCB);
        const breakers = {
            floors: floorsPresent,
            main63A4P: 1,
            perFloor32ATP: 1,
            perFloor30mARCCB: 1
        };

        // Format results
        const formatBucket = (bucket) => ({
            con_ft: parseFloat(bucket.con_ft.toFixed(2)),
            neu_ft: parseFloat(bucket.neu_ft.toFixed(2)),
            ear_ft: parseFloat(bucket.ear_ft.toFixed(2)),
            total_ft: parseFloat(bucket.total_ft.toFixed(2)),
            total_m: parseFloat(bucket.total_m.toFixed(2))
        });

        const formatWireTotal = (wire) => ({
            con_ft: parseFloat(wire.con_ft.toFixed(2)),
            neu_ft: parseFloat(wire.neu_ft.toFixed(2)),
            ear_ft: parseFloat(wire.ear_ft.toFixed(2)),
            total_ft: parseFloat(wire.total_ft.toFixed(2)),
            total_m: parseFloat(wire.total_m.toFixed(2))
        });

        return res.status(200).json({
            success: true,
            results: {
                inputs: {
                    plotW: parseFloat(plotW.toFixed(2)),
                    plotL: parseFloat(plotL.toFixed(2)),
                    back: parseFloat(back.toFixed(2)),
                    front: parseFloat(front.toFixed(2)),
                    side: parseFloat(side.toFixed(2)),
                    W: parseFloat(W.toFixed(2)),
                    L: parseFloat(L.toFixed(2)),
                    coverage: parseFloat(coverage.toFixed(4)),
                    fl,
                    coil_m: parseFloat(coil_m.toFixed(2)),
                    dropLF_ft: parseFloat(dropLF_ft.toFixed(2)),
                    earthFrac: parseFloat(earthFrac.toFixed(4)),
                    halfDiag_ft: parseFloat(halfDiag_ft.toFixed(2)),
                    covered_ft2: parseFloat(covered_ft2.toFixed(1))
                },
                counts: {
                    nRooms,
                    nL,
                    nF,
                    nS,
                    nAC,
                    nAp
                },
                buckets: {
                    '3/29 (Switch→Unit, Lights+Fans)': formatBucket(buckets['3/29 (Switch→Unit, Lights+Fans)']),
                    '7/29 (DB→Switch, per Room)': formatBucket(buckets['7/29 (DB→Switch, per Room)']),
                    '7/29 (DB→Sockets)': formatBucket(buckets['7/29 (DB→Sockets)']),
                    '7/36 (DB→AC + Appliances)': formatBucket(buckets['7/36 (DB→AC + Appliances)'])
                },
                wireTotals: {
                    '3/29': formatWireTotal(wireTotals['3/29']),
                    '7/29': formatWireTotal(wireTotals['7/29']),
                    '7/36': formatWireTotal(wireTotals['7/36'])
                },
                coils,
                devices: {
                    perFloorMCB,
                    mcbTotals,
                    perFloorPlatesSockets,
                    platesSocketsTotals
                },
                breakers
            }
        });
    } catch (err) {
        console.error('Error in calculateResidentialElectricalWiring:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateResidentialElectricalWiring };


