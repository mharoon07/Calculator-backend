const calculateVanity = async (req, res) => {
    try {
        const {
            bathrooms,
            globalDefaults = {
                ratePly: 35,
                rateVeneer: 40,
                rateMS: 2,
                rateSlide: 5,
                rateHandle: 3,
                rateMisc: 15,
                laborPct: 15,
                profitPct: 10
            }
        } = req.body;

        if (!bathrooms || !Array.isArray(bathrooms) || bathrooms.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one bathroom is required'
            });
        }

        const D = 22; // Depth in inches
        const BOX_H = 9; // Box height in inches
        const DRAWER_H = 6; // Drawer height in inches
        const SHEET_SQFT = 32; // Sheet area in sqft

        const def = {
            ratePly: parseFloat(globalDefaults.ratePly) || 0,
            rateVeneer: parseFloat(globalDefaults.rateVeneer) || 0,
            rateMS: parseFloat(globalDefaults.rateMS) || 0,
            rateSlide: parseFloat(globalDefaults.rateSlide) || 0,
            rateHandle: parseFloat(globalDefaults.rateHandle) || 0,
            rateMisc: parseFloat(globalDefaults.rateMisc) || 0,
            laborPct: (parseFloat(globalDefaults.laborPct) || 0) / 100,
            profitPct: (parseFloat(globalDefaults.profitPct) || 0) / 100
        };

        const calculatedResults = [];
        const agg = {
            top: 0, ms: 0, ply: 0, veneer: 0, slides: 0, handles: 0, misc: 0,
            subtotal: 0, labor: 0, profit: 0, grand: 0
        };

        bathrooms.forEach(b => {
            const tag = b.tag || "Untitled";
            const W = parseFloat(b.width);
            if (!W || W <= 0) return;

            const drawers = parseInt(b.drawers) || 0;
            const topName = b.topName || "Quartz";
            const topRate = parseFloat(b.topRate) || 0;

            // Calculate pieces
            let pieces = [
                { part: "Box Side", qty: 2, w: D, d: BOX_H },
                { part: "Box Top", qty: 1, w: W, d: D },
                { part: "Box Bottom", qty: 1, w: W, d: D }
            ];

            const drwW = (W - 2) / Math.max(drawers || 1, 1);
            for (let i = 1; i <= drawers; i++) {
                pieces.push({ part: `Drawer ${i} - Sides`, qty: 2, w: D, d: DRAWER_H });
                pieces.push({ part: `Drawer ${i} - Back`, qty: 1, w: drwW - 1.5, d: DRAWER_H });
                pieces.push({ part: `Drawer ${i} - Base`, qty: 1, w: drwW, d: D });
                pieces.push({ part: `Drawer ${i} - Front`, qty: 1, w: drwW, d: BOX_H });
            }

            // Map pieces to include individual areas
            pieces = pieces.map(p => ({
                ...p,
                area: parseFloat(((p.w * p.d * p.qty) / 144).toFixed(2))
            }));

            // Calculate areas and quantities
            const totalPlySqFt = pieces.reduce((s, p) => s + p.area, 0);
            const plySheets = Math.ceil(totalPlySqFt / SHEET_SQFT);
            const veneerSqFt = parseFloat((totalPlySqFt * 0.6).toFixed(2));
            const veneerSheets = Math.ceil(veneerSqFt / SHEET_SQFT);
            const topSqFt = ((W * D) + (W * 4) + (2 * D * 4)) / 144;
            const msFt = (2 * W + 2 * D + Math.floor(W / 12) * D) / 12;
            const slides = drawers;
            const handles = drawers;
            const misc = 1;

            // Calculate costs
            const costTop = topSqFt * topRate;
            const costMS = msFt * def.rateMS;
            const costPly = plySheets * def.ratePly;
            const costVeneer = veneerSheets * def.rateVeneer;
            const costSlides = slides * def.rateSlide;
            const costHandles = handles * def.rateHandle;
            const costMisc = misc * def.rateMisc;

            const subtotal = costTop + costMS + costPly + costVeneer + costSlides + costHandles + costMisc;
            const labor = subtotal * def.laborPct;
            const profit = (subtotal + labor) * def.profitPct;
            const grand = subtotal + labor + profit;

            // Aggregate totals
            agg.top += topSqFt;
            agg.ms += msFt;
            agg.ply += plySheets;
            agg.veneer += veneerSheets;
            agg.slides += slides;
            agg.handles += handles;
            agg.misc += misc;
            agg.subtotal += subtotal;
            agg.labor += labor;
            agg.profit += profit;
            agg.grand += grand;

            calculatedResults.push({
                tag,
                topName,
                topRate,
                W,
                drawers,
                topSqFt: parseFloat(topSqFt.toFixed(2)),
                msFt: parseFloat(msFt.toFixed(2)),
                plySheets,
                veneerSheets,
                slides,
                handles,
                subtotal: parseFloat(subtotal.toFixed(2)),
                labor: parseFloat(labor.toFixed(2)),
                profit: parseFloat(profit.toFixed(2)),
                grand: parseFloat(grand.toFixed(2)),
                pieces
            });
        });

        return res.status(200).json({
            success: true,
            results: {
                details: calculatedResults,
                summary: {
                    top: parseFloat(agg.top.toFixed(2)),
                    ms: parseFloat(agg.ms.toFixed(2)),
                    ply: agg.ply,
                    veneer: agg.veneer,
                    slides: agg.slides,
                    handles: agg.handles,
                    misc: agg.misc,
                    subtotal: parseFloat(agg.subtotal.toFixed(2)),
                    labor: parseFloat(agg.labor.toFixed(2)),
                    profit: parseFloat(agg.profit.toFixed(2)),
                    grand: parseFloat(agg.grand.toFixed(2))
                }
            }
        });
    } catch (err) {
        console.error('Error in calculateVanity:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateVanity };

