// Helper functions
const round = (x) => Math.round(x * 100) / 100;
const qtyFt = (n) => (n > 0) ? (Math.round(n * 100) / 100) + ' ft' : '—';
const r = (item, material, size, qty) => ({ item, material, size, qty });

// Constants
const SIZE_FACTOR = { small: 0.85, normal: 1.0, large: 1.2 };
const PER_BATH_BASE = {
    ppr25_ft: 55, elbows25: 16, couplers25: 2, endcap25: 1,
    tees25_header: 2, ball25_header: 2, female_25xhalf: 8, angle_half: 6
};
const PER_KITCH_BASE = {
    ppr25_ft: 60, elbows25: 10, couplers25: 2, endcap25: 1,
    tees25_header: 2, ball25_header: 2, female_25xhalf: 3, angle_half: 3
};

const calculatePlumbingSewage = async (req, res) => {
    try {
        const {
            formData,
            bathrooms = [],
            kitchens = [],
            sizeSelections = {},
            unitPrices = {},
            wastePPR = 10,
            wasteUPVC = 8,
            wasteFittings = 0
        } = req.body;

        // Validation
        if (!formData) {
            return res.status(400).json({
                success: false,
                error: 'formData is required'
            });
        }

        // Extract form data
        const floors = Number(formData.numFloors) || 1;
        const FH = Number(formData.floorHeight) || 10;
        const ring = Number(formData.roofRing) || 120;
        const downcomers = Math.max(1, Number(formData.downcomers) || Math.max(1, bathrooms.length + kitchens.length));
        const suction_ft = Number(formData.distSuction) || 20;
        const rising_ft = Number(formData.distRising) || 0;
        const plotLength = Number(formData.plotLength) || 60;
        const plotWidth = Number(formData.plotWidth) || 50;

        // Size selections with defaults
        const coldTrunk = sizeSelections.coldTrunk || '25';
        const hotTrunk = sizeSelections.hotTrunk || '32';
        const sharedFittings = sizeSelections.sharedFittings || '25';
        const perBathroom = sizeSelections.perBathroom || '25';
        const perKitchen = sizeSelections.perKitchen || '25';
        const bathroomSanitary = sizeSelections.bathroomSanitary || '25';
        const bathroomFaucets = sizeSelections.bathroomFaucets || '25';

        // Helper function to get bathroom size type
        const getBathSizeType = (area) => {
            if (area <= 40) return 'small';
            if (area >= 71) return 'large';
            return 'normal';
        };

        // Shared blocks calculation
        const getSharedBlocks = () => {
            return [
                {
                    block: 'A. Pump & Tank',
                    rows: [
                        r('Suction Line', 'PPR', `32 mm`, qtyFt(suction_ft)),
                        r('Ball Valve', 'Brass', '32 mm', 1),
                        r('Union', 'Brass', '32 mm', 4),
                        r('Elbow', 'Brass', '32 mm', 4),
                        r('Coupler', 'Brass', '32 mm', 2),
                        r('Level Switch', '—', '—', 1),
                        r('Discharge to OHWT Line', 'PPR', '32 mm', qtyFt(plotLength + plotWidth + FH)),
                        r('NRV', 'Brass', '—', 1),
                        r('Union', 'Brass', '32 mm', 2),
                        r('Elbow', 'Brass', '32 mm', 8),
                        r('Socket', 'Brass', '32 mm', 6)
                    ]
                },
                {
                    block: 'B. Cold Trunk & Risers',
                    rows: [
                        r('Roof distribution ring', 'PPR PN20', `63 mm`, qtyFt(ring)),
                        r('Downcomer risers (' + downcomers + 'x)', 'PPR PN20', `40 mm`, qtyFt(downcomers * 3 * FH)),
                        r('Equal tees on mains', 'PPR PN20', `${coldTrunk} mm`, 12),
                        r('Pipe clamps/hangers', '—', '—', Math.ceil((downcomers * 3 * FH) / 8)),
                        r('End cap', 'PPR PN20', `63 mm`, 2),
                        r('End cap', 'PPR PN20', `40 mm`, downcomers),
                        r('90° elbows', 'PPR PN20', `63 mm`, 8),
                        r('90° elbows', 'PPR PN20', `40 mm`, downcomers * 5),
                        r('45° elbows', 'PPR PN20', `63 mm`, 4),
                        r('45° elbows', 'PPR PN20', `40 mm`, downcomers),
                        r('Tee', 'PPR PN20', `63X40X63`, (bathrooms.length + kitchens.length)),
                        r('Bracket', 'PPR PN20', `63 mm`, 30),
                        r('Handle Valve', 'Brass', `2"`, 1),
                        r('Reducing Tee', 'Brass', `40x25x40`, downcomers),
                        r('SS Barrel Nipple', 'Stainless Steel', `2"`, 4),
                        r('SS Union', 'Stainless Steel', `2"`, 2),
                        r('Strainer', 'Brass', `2"`, 1),
                        r('Elbow SS', 'Stainless Steel', `2"`, 1),
                        r('Handle Valve Isolation', 'Brass', `40 mm`, downcomers),
                        r('Coupler', '-', `Nos.`, downcomers * 2),
                        r('Male Threaded Adapter', 'PPR/SS', `63 mm X 2"`, 1),
                        r('Female Threaded Adapter', 'PPR/SS', `63 mm X  2"`, 1)
                    ]
                },
                {
                    block: 'C. Hot Trunk & Risers',
                    rows: [
                        r('Heater outlet header(s)', 'PPR PN20', `${hotTrunk} mm`, qtyFt(ring)),
                        r('NRV at heater cold outlet', 'Brass', `${hotTrunk} mm`, 1),
                        r('Downcommers Pipe Length', 'PPR PN20', `${hotTrunk} mm`, qtyFt((bathrooms.length + kitchens.length) * 3 * FH)),
                        r('90° elbows', 'PPR PN20', `${hotTrunk} mm`, (bathrooms.length + kitchens.length) * 5),
                        r('45° elbows', 'PPR PN20', `${hotTrunk} mm`, bathrooms.length + kitchens.length),
                        r('End cap', 'PPR PN20', `${hotTrunk} mm`, bathrooms.length + kitchens.length),
                        r('Hand Valve Isolation', 'Brass', `${hotTrunk} mm`, (bathrooms.length + kitchens.length)),
                        r('Reducing Tee', 'PPR PN20', `${hotTrunk}X${sharedFittings}X${hotTrunk}`, bathrooms.length + kitchens.length),
                        r('Pipe Clamp/Hanger', '—', 'Nos.', Math.ceil(((bathrooms.length + kitchens.length) * 3 * FH) / 8)),
                        r('Coupler', 'PPR PN20', `${hotTrunk} mm`, (bathrooms.length + kitchens.length) * 2)
                    ]
                },
                {
                    block: 'D. Shared Fittings & Accessories',
                    rows: [
                        r('Straight couplers', 'PPR PN20', `${sharedFittings} mm`, 12),
                        r('Reducers (main transitions)', 'PPR PN20', `${hotTrunk}→${sharedFittings} / 40→${sharedFittings}`, 2)
                    ]
                }
            ];
        };

        // Per bathroom calculations
        const getPerBathroomRows = () => {
            return [
                r('PPR pipe', 'PPR PN20', `${perBathroom} mm`, '50 ft'),
                r('Female threaded elbow/socket', 'PPR/Brass', `${perBathroom} mm ×½"`, '6'),
                r('90° elbows', 'PPR PN20', `${perBathroom} mm`, '14'),
                r('End cap', 'PPR PN20', `${perBathroom} mm`, '1'),
                r('Equal tees @ headers', 'PPR PN20', `${perBathroom} mm`, 6),
                r('Equal tees on mains', 'PPR PN20', `${perBathroom} mm`, 12),
                r('Reducer', 'PPR/Brass', '25mm x ½"', 6),
                r('Straight couplers', 'PPR PN20', `${perBathroom} mm`, '5'),
                r('Angle valves', 'Brass', '½"', PER_BATH_BASE.angle_half),
                r('uPVC Schedule 40', 'uPVC', '1-1/2"', 1),
                r('uPVC Elbow 90', 'uPVC', '1-1/2"', 2),
                r('uPVC Elbow 45', 'uPVC', '1-1/2"', 2),
                r('Socket', 'uPVC', '1-1/2"', 2),
                r('End Cap', 'uPVC', '1-1/2"', 1),
                r('Reducing bush', 'uPVC', '2" - 1-1/2"', 1)
            ];
        };

        // Per kitchen calculations
        const getPerKitchenRows = () => {
            return [
                r('PPR pipe', 'PPR PN20', `${perKitchen} mm`, '20 ft'),
                r('90° elbows', 'PPR PN20', `${perKitchen} mm`, '6'),
                r('Straight couplers', 'PPR PN20', `${perKitchen} mm`, '4'),
                r('End cap', 'PPR PN20', `${perKitchen} mm`, '1'),
                r('Female threaded elbow/socket', 'PPR/Brass', `${perKitchen} mm ×½"`, '2'),
                r('Angle valves', 'Brass', '½"', '2'),
                r('uPVC Schedule 40', 'uPVC', '1-1/2"', 1),
                r('uPVC Elbow 90', 'uPVC', '1-1/2"', 2),
                r('uPVC Elbow 45', 'uPVC', '1-1/2"', 2),
                r('Socket', 'uPVC', '1-1/2"', 2),
                r('End Cap', 'uPVC', '1-1/2"', 1),
                r('Reducing bush', 'uPVC', '2" - 1-1/2"', 1)
            ];
        };

        // Sanitary calculations
        const getSanitaryRows = () => {
            const totalBaths = bathrooms.length;
            const perBathSanitary = [
                r('WC outlet set (bend + branch)', 'uPVC', `4"`, 1),
                r('WC branch pipe', 'uPVC', `4"`, '8 ft'),
                r('Shower trap (deep seal)', 'uPVC/PP', `3" outlet`, 1),
                r('Shower branch', 'uPVC', `3" `, '8 ft'),
                r('Floor drain w/ trap & SS grate', 'uPVC/SS', ` 3" outlet`, 1),
                r('FD branch', 'uPVC', ` 3"`, '8 ft'),
                r('Basin P-trap', 'uPVC/PP', `3"`, 1),
                r('Fittings 4" (sweeps/wye)', 'uPVC', `4"`, 1),
                r('Fittings 3" (sweeps/wye)', 'uPVC', `3"`, 2)
            ];

            return perBathSanitary.map(row => ({
                ...row,
                qty: typeof row.qty === 'number' ? row.qty * totalBaths :
                    (typeof row.qty === 'string' && row.qty.includes('ft')) ?
                        (parseFloat(row.qty) * totalBaths) + ' ft' : row.qty
            }));
        };

        // Shared sanitary blocks
        const getSharedSanitaryBlocks = () => {
            return [
                {
                    block: 'H. Sanitary Trunk & Risers',
                    rows: [
                        r('Soil stacks (WCs)', 'uPVC', `4"`, qtyFt(2 * FH * bathrooms.length)),
                        r('Waste stacks / verticals', 'uPVC', `3"`, qtyFt(2 * FH * (bathrooms.length + kitchens.length))),
                        r('Vent extensions / relief vents', 'uPVC', `3"`, qtyFt(3 * FH * 3)),
                        r('Stack base long-sweep 90', 'uPVC', `4"`, bathrooms.length),
                        r('4" branch fittings (wye/tee)', 'uPVC', `4"`, bathrooms.length),
                        r('3" branch fittings (wye/tee)', 'uPVC', `3"`, 2 * bathrooms.length),
                        r('3"→2" adaptors (if basin 2")', 'uPVC', '—', bathrooms.length),
                        r('Vent Cowls', '—', '3"', Math.ceil(bathrooms.length / 2)),
                        r('Pipe Clamp/Hanger', 'uPVC', `3"`, Math.ceil((2 * FH * (bathrooms.length + kitchens.length)) / 8)),
                        r('Pipe Clamp/Hanger', 'uPVC', `4"`, Math.ceil((2 * FH * bathrooms.length) / 8))
                    ]
                },
                {
                    block: 'I. Main Sewer & Manholes',
                    rows: [
                        r('Boundary / main sewer', 'uPVC heavy', `6"`, qtyFt(1.5 * (plotLength + plotWidth))),
                        r('Drain Water Line', 'uPVC', `4"`, qtyFt(1.5 * FH)),
                        r('Gully traps / yard gullies', 'uPVC', '4"', 4),
                        r('MH step irons & covers', '—', '24" x 24" ', Math.ceil((1.5 * (plotLength + plotWidth)) / 15))
                    ]
                }
            ];
        };

        // Bathroom faucets
        const getBathroomFaucetsRows = () => {
            const totalBaths = bathrooms.length;
            const perBathFaucets = [
                r('Basin mixer faucet (single-lever)', 'Brass/Chrome', '½" conn.', 1),
                r('Basin pop-up waste', 'Brass/Chrome', '1¼"–1½"', 1),
                r('Braided hoses for basin mixer (pair)', 'SS braided', '½" × ½"', 1),
                r('Shower mixer with diverter (concealed or exposed)', 'Brass/Chrome', '½" outlets', 1),
                r('Overhead shower arm + head', 'Brass/Chrome', '½" arm', 1),
                r('Hand shower set (handset + hose + bracket)', 'Brass/Chrome', '½" hose', 1),
                r('Health faucet / bidet spray with hose & holder', 'Brass/Chrome', '½" conn.', 1),
                r('Wall union / elbow outlet (for hand shower)', 'Brass/Chrome', '½"', 1),
                r('Angle U/V', 'Brass/Chrome', '½"', 4)
            ];

            return perBathFaucets.map(row => ({
                ...row,
                qty: typeof row.qty === 'number' ? row.qty * totalBaths : row.qty
            }));
        };

        // Get all sections
        const sharedBlocks = getSharedBlocks();
        const perBathroomRows = getPerBathroomRows();
        const perKitchenRows = getPerKitchenRows();
        const sanitaryRows = getSanitaryRows();
        const sharedSanitaryBlocks = getSharedSanitaryBlocks();
        const bathroomFaucetsRows = getBathroomFaucetsRows();

        // Combine all sections
        const allSections = [
            ...sharedBlocks,
            {
                block: `E. Per Bathroom`,
                rows: perBathroomRows
            },
            {
                block: `F. Per Kitchen`,
                rows: perKitchenRows
            },
            {
                block: `G. Bathroom Sanitary`,
                rows: sanitaryRows
            },
            {
                block: `J. Bathroom Faucets`,
                rows: bathroomFaucetsRows
            },
            ...sharedSanitaryBlocks
        ];

        // Flatten all rows for aggregation
        const flatRows = [];
        allSections.forEach(section => {
            section.rows.forEach(row => {
                flatRows.push({
                    ...row,
                    block: section.block
                });
            });
        });

        // Aggregate quantities by item+material+size
        const aggregated = new Map();
        flatRows.forEach(row => {
            const key = `${row.item}__${row.material}__${row.size}`;
            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    item: row.item,
                    material: row.material,
                    size: row.size,
                    qty: 0,
                    qtyStr: '',
                    block: row.block
                });
            }

            const existing = aggregated.get(key);
            // Parse quantity
            if (typeof row.qty === 'number') {
                existing.qty += row.qty;
            } else if (typeof row.qty === 'string') {
                if (row.qty.includes('ft')) {
                    const ftValue = parseFloat(row.qty) || 0;
                    existing.qty += ftValue;
                    existing.qtyStr = existing.qty.toFixed(2) + ' ft';
                } else if (row.qty === '—' || row.qty === '-') {
                    // Keep as is
                } else {
                    const numValue = parseFloat(row.qty) || 0;
                    existing.qty += numValue;
                }
            }
        });

        // Convert aggregated map to array
        const aggregatedArray = Array.from(aggregated.values()).map(item => ({
            ...item,
            qty: item.qtyStr || (item.qty > 0 ? item.qty : '—')
        }));

        // Group by material type (matching frontend logic)
        const groups = {};
        aggregatedArray.forEach(item => {
            const group = item.material.includes('PPR') ? 'Plumbing – PPR' :
                (item.material.includes('uPVC') || item.material.includes('Masonry')) ? 'Sanitary / Civil' :
                    'Valves & Specials';

            if (!groups[group]) groups[group] = [];
            groups[group].push(item);
        });

        // Calculate totals with unit prices
        let totalCost = 0;
        const pricingByGroup = {};
        const costByGroup = {};

        const pricingRows = aggregatedArray.map(row => {
            const key = `${row.item}__${row.material}__${row.size}`;
            const unitPrice = unitPrices[key] || 0;
            const qtyNum = typeof row.qty === 'string' && row.qty.includes('ft')
                ? parseFloat(row.qty) || 0
                : (typeof row.qty === 'number' ? row.qty : parseFloat(row.qty) || 0);

            // Apply wastage
            let wastageFactor = 1;
            if (row.material.toLowerCase().includes('ppr')) {
                wastageFactor = 1 + (wastePPR / 100);
            } else if (row.material.toLowerCase().includes('upvc') || row.material.toLowerCase().includes('pvc')) {
                wastageFactor = 1 + (wasteUPVC / 100);
            } else if (row.item.toLowerCase().includes('fitting') || row.item.toLowerCase().includes('valve') || row.item.toLowerCase().includes('elbow') || row.item.toLowerCase().includes('tee')) {
                wastageFactor = 1 + (wasteFittings / 100);
            }

            const adjustedQty = qtyNum * wastageFactor;
            const cost = adjustedQty * unitPrice;
            totalCost += cost;

            // Determine group for this row
            const group = row.material.includes('PPR') ? 'Plumbing – PPR' :
                (row.material.includes('uPVC') || row.material.includes('Masonry')) ? 'Sanitary / Civil' :
                    'Valves & Specials';

            // Initialize group if needed
            if (!pricingByGroup[group]) {
                pricingByGroup[group] = { items: [], subtotal: 0 };
                costByGroup[group] = 0;
            }

            const pricingRow = {
                ...row,
                unitPrice,
                adjustedQty: round(adjustedQty),
                cost: round(cost)
            };

            // Add to group
            pricingByGroup[group].items.push(pricingRow);
            pricingByGroup[group].subtotal = round(pricingByGroup[group].subtotal + cost);
            costByGroup[group] = round(costByGroup[group] + cost);

            return pricingRow;
        });

        return res.status(200).json({
            success: true,
            results: {
                sections: allSections,
                aggregated: aggregatedArray,
                groups: groups,
                pricing: pricingRows,
                pricingByGroup: pricingByGroup,
                summary: {
                    totalItems: aggregatedArray.length,
                    totalCost: round(totalCost),
                    totalBathrooms: bathrooms.length,
                    totalKitchens: kitchens.length,
                    costByGroup: costByGroup
                }
            }
        });
    } catch (err) {
        console.error('Error in calculatePlumbingSewage:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculatePlumbingSewage };


