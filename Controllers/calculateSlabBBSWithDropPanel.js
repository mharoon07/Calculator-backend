// This controller performs core BBS calculations for Slab with Drop Panel
// It handles bar weight, cut length, and quantity calculations
// Complex shape generation is handled on the frontend

const MM2M = 0.001;

function unitWeight(dia_mm) {
    // Standard formula: weight per meter = (dia_mm^2) / 162
    return (dia_mm * dia_mm) / 162.0;
}

function calculateBarWeight(cutLength_mm, dia_mm, quantity) {
    const cutLength_m = cutLength_mm * MM2M;
    const unitWt = unitWeight(dia_mm);
    const totalLength_m = cutLength_m * quantity;
    const totalWeight_kg = totalLength_m * unitWt;
    return {
        cutLength_mm,
        cutLength_m,
        unitWt,
        quantity,
        totalLength_m,
        totalWeight_kg
    };
}

const calculateSlabBBSWithDropPanel = (req, res) => {
    try {
        const { bars, blocks, settings } = req.body;

        if (!bars || !Array.isArray(bars)) {
            return res.status(400).json({ error: 'Bars array is required' });
        }

        const results = [];
        let grandTotalLength_m = 0;
        let grandTotalWeight_kg = 0;

        bars.forEach(bar => {
            const dia_mm = parseFloat(bar.dia) || 12;
            const cutLength_mm = parseFloat(bar.cutLength) || 0;
            const quantity = parseInt(bar.quantity) || 1;

            if (cutLength_mm > 0 && dia_mm > 0) {
                const calc = calculateBarWeight(cutLength_mm, dia_mm, quantity);
                
                results.push({
                    mark: bar.mark || 'BAR',
                    dia: dia_mm,
                    cutLength_mm: calc.cutLength_mm,
                    cutLength_m: calc.cutLength_m,
                    unitWt: calc.unitWt,
                    quantity: calc.quantity,
                    totalLength_m: calc.totalLength_m,
                    totalWeight_kg: calc.totalWeight_kg,
                    shape: bar.shape || 'straight',
                    notes: bar.notes || '',
                    group: bar.group || 'main'
                });

                grandTotalLength_m += calc.totalLength_m;
                grandTotalWeight_kg += calc.totalWeight_kg;
            }
        });

        // Group by bar type for summary
        const summary = {
            main: { length_m: 0, weight_kg: 0 },
            extra: { length_m: 0, weight_kg: 0 },
            dist: { length_m: 0, weight_kg: 0 }
        };

        results.forEach(bar => {
            const group = bar.group || 'main';
            if (summary[group]) {
                summary[group].length_m += bar.totalLength_m;
                summary[group].weight_kg += bar.totalWeight_kg;
            }
        });

        res.json({
            bars: results,
            totals: {
                grand: {
                    length_m: grandTotalLength_m,
                    weight_kg: grandTotalWeight_kg
                },
                byGroup: summary
            }
        });
    } catch (error) {
        console.error('Error calculating slab BBS with drop panel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculateSlabBBSWithDropPanel };
