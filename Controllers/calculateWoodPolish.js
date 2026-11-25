
// Helper function to parse feet-inches format to decimal feet
const feetInchesToDecimal = (feetInches) => {
    if (!feetInches || feetInches === '') return 0;
    const str = String(feetInches).trim();
    // Support both straight and curly quotes
    const match = str.match(/^(\d+(?:\.\d+)?)[''‘’](\d+(?:\.\d+)?)["”]?$/) ||
        str.match(/^(\d+(?:\.\d+)?)\s*[''‘’]?\s*(\d+(?:\.\d+)?)?\s*["”]?$/);

    if (!match) {
        const num = parseFloat(str);
        return Number.isFinite(num) ? num : 0;
    }
    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;

    if (inches >= 12) {
        const extraFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return feet + extraFeet + (remainingInches / 12);
    }
    return feet + (inches / 12);
};

const m2FromFt2 = (ft2) => ft2 * 0.092903;

/**
 * Calculates Wood Polish Material Estimation 
 * Logic mirrored from WoodPolishMaterial.jsx
 */
const calculateWoodPolish = async (req, res) => {
    try {
        const {
            doors,
            assumptions: inputAssumptions,
            consumption: inputConsumption,
            rates: inputRates
        } = req.body;

        if (!doors || !Array.isArray(doors)) {
            return res.status(400).json({ error: 'Doors array is required' });
        }

        // 1. Defaults (Synced with frontend WoodPolishMaterial.jsx)
        const assumptions = {
            edgeFactor: 0.10,
            frameMult: 1.35,
            waste: 1.08,
            colorMethod: 'none',
            ...inputAssumptions
        };

        const consumption = {
            sealer: 0.22,
            lacquer: 0.11,
            thinner: 1.10,
            shellac: 0.020,
            spirit: 0.28,
            chalk: 0.040,
            glue: 0.009,
            r120: 0.22,
            f320: 0.94,
            pigment: 0.004,
            dye_ml: 2.0,
            ...inputConsumption
        };

        const rates = {
            gallonL: 3.64,
            sealer_gal: 5450,
            lacquer_m_gal: 5800,
            lacquer_g_gal: 5500,
            thinner_L: 400,
            spirit_L: 250,
            shellac_kg: 4900,
            chalk_kg: 160,
            glue_kg: 460,
            r120: 80,
            f320: 50,
            pigment_kg: 1200,
            dye_bottle_ml: 50,
            dye_bottle_price: 850,
            sheen: 'mix',
            ...inputRates
        };

        // 2. Area Calculation
        let totalAreaM2 = 0;
        doors.forEach(d => {
            const w = feetInchesToDecimal(d.width);
            const h = feetInchesToDecimal(d.height);
            const q = parseInt(d.qty || 0, 10);

            const facesFt2 = 2 * (w * h);
            let a = m2FromFt2(facesFt2) * (1 + assumptions.edgeFactor);
            if (d.includeFrame) a *= assumptions.frameMult;
            totalAreaM2 += a * q;
        });

        // 3. Material Needs
        const need = {
            sealer_L: totalAreaM2 * consumption.sealer * assumptions.waste,
            lacquer_L: totalAreaM2 * consumption.lacquer * assumptions.waste,
            thinner_L: totalAreaM2 * consumption.thinner * assumptions.waste,
            shellac_kg: totalAreaM2 * consumption.shellac * assumptions.waste,
            spirit_L: totalAreaM2 * consumption.spirit * assumptions.waste,
            chalk_kg: totalAreaM2 * consumption.chalk * assumptions.waste,
            glue_kg: totalAreaM2 * consumption.glue * assumptions.waste,
            r120_pc: Math.ceil(totalAreaM2 * consumption.r120 * assumptions.waste),
            f320_pc: Math.ceil(totalAreaM2 * consumption.f320 * assumptions.waste),
            pigment_kg: assumptions.colorMethod === 'pigment' ? totalAreaM2 * consumption.pigment * assumptions.waste : 0,
            dye_ml: assumptions.colorMethod === 'dye' ? totalAreaM2 * consumption.dye_ml * assumptions.waste : 0,
        };

        const perL = {
            sealer_L: rates.sealer_gal / rates.gallonL,
            lacquer_m_L: rates.lacquer_m_gal / rates.gallonL,
            lacquer_g_L: rates.lacquer_g_gal / rates.gallonL,
        };

        const lacquerPrice = rates.sheen === 'matt' ? perL.lacquer_m_L :
            (rates.sheen === 'gloss' ? perL.lacquer_g_L :
                (perL.lacquer_m_L + perL.lacquer_g_L) / 2);

        // 4. Item List
        const rawItems = [
            { name: 'NC Sanding Sealer', unit: 'L', qty: need.sealer_L, rate: perL.sealer_L, pkg: rates.gallonL, pkgLabel: 'gal' },
            { name: `NC Lacquer (${rates.sheen === 'mix' ? '50/50' : rates.sheen})`, unit: 'L', qty: need.lacquer_L, rate: lacquerPrice, pkg: rates.gallonL, pkgLabel: 'gal' },
            { name: 'T99 Thinner (incl. mixing & cleanup)', unit: 'L', qty: need.thinner_L, rate: rates.thinner_L },
            { name: 'Laak-dana (dewaxed shellac flakes)', unit: 'kg', qty: need.shellac_kg, rate: rates.shellac_kg },
            { name: 'Spirit (denatured alcohol)', unit: 'L', qty: need.spirit_L, rate: rates.spirit_L },
            ...(assumptions.colorMethod === 'pigment' ? [{ name: 'Color pigment (oxides mix)', unit: 'kg', qty: need.pigment_kg, rate: rates.pigment_kg, pkg: 0.4, pkgLabel: '0.4 kg pkt' }] : []),
            ...(assumptions.colorMethod === 'dye' ? [{ name: 'Spirit dye concentrate', unit: 'mL', qty: need.dye_ml, rate: rates.dye_bottle_price / Math.max(1, rates.dye_bottle_ml), pkg: rates.dye_bottle_ml, pkgLabel: 'bottle' }] : []),
            { name: 'Chalk Belgium (for lapi/filler)', unit: 'kg', qty: need.chalk_kg, rate: rates.chalk_kg },
            { name: 'Glue (for lapi/filler)', unit: 'kg', qty: need.glue_kg, rate: rates.glue_kg },
            { name: 'Regmaal 120', unit: 'sheet', qty: need.r120_pc, rate: rates.r120, integer: true },
            { name: 'Foam Regmaal 320', unit: 'pad', qty: need.f320_pc, rate: rates.f320, integer: true },
        ];

        let grandTotal = 0;
        const items = rawItems.map(it => {
            const q = it.integer ? Math.ceil(it.qty) : it.qty;
            const subtotal = (q > 0 ? it.rate * q : 0);
            grandTotal += subtotal;

            let packaging = '';
            if (it.pkg) {
                const packs = Math.ceil((q || 0) / it.pkg);
                if (packs > 0) {
                    packaging = `Buy ${packs} × ${it.pkgLabel} (${(packs * it.pkg).toFixed(2)} ${it.unit})`;
                }
            }

            return {
                name: it.name,
                unit: it.unit,
                required: `${it.integer ? q : q.toFixed(2)} ${it.unit}`,
                rate: it.rate,
                subtotal,
                packaging
            };
        });

        return res.status(200).json({
            success: true,
            totalAreaM2,
            items,
            grandTotal
        });

    } catch (err) {
        console.error('Error in calculateWoodPolish:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export { calculateWoodPolish };
