// Helper functions
const PI = Math.PI;
const FT2M = 0.3048;
const MM2M = 0.001;

const barSizes = {
    metric: [
        { label: '8 mm (0.395 kg/m)', dia_mm: 8.0, uw_kgpm: 0.395 },
        { label: '10 mm (0.617 kg/m)', dia_mm: 10.0, uw_kgpm: 0.617 },
        { label: '12 mm (0.888 kg/m)', dia_mm: 12.0, uw_kgpm: 0.888 },
        { label: '16 mm (1.58 kg/m)', dia_mm: 16.0, uw_kgpm: 1.58 },
        { label: '20 mm (2.47 kg/m)', dia_mm: 20.0, uw_kgpm: 2.47 },
        { label: '25 mm (3.85 kg/m)', dia_mm: 25.0, uw_kgpm: 3.85 },
        { label: '32 mm (6.31 kg/m)', dia_mm: 32.0, uw_kgpm: 6.31 }
    ],
    us: [
        { label: '#2 (Ø6.35 mm)', dia_mm: 6.35, uw_kgpm: 0.249 },
        { label: '#3 (Ø9.53 mm)', dia_mm: 9.53, uw_kgpm: 0.560 },
        { label: '#4 (Ø12.7 mm)', dia_mm: 12.7, uw_kgpm: 0.994 },
        { label: '#5 (Ø15.9 mm)', dia_mm: 15.9, uw_kgpm: 1.552 },
        { label: '#6 (Ø19.1 mm)', dia_mm: 19.1, uw_kgpm: 2.235 },
        { label: '#7 (Ø22.2 mm)', dia_mm: 22.2, uw_kgpm: 3.042 },
        { label: '#8 (Ø25.4 mm)', dia_mm: 25.4, uw_kgpm: 3.973 },
        { label: '#9 (Ø28.7 mm)', dia_mm: 28.7, uw_kgpm: 5.067 },
        { label: '#10 (Ø32.3 mm)', dia_mm: 32.3, uw_kgpm: 6.404 }
    ]
};

function unitWeight(dmm) {
    return (dmm * dmm) / 162.2;
}

function num(v) {
    if (v === '' || v === null || v === undefined) return 0;
    const x = parseFloat(v);
    return isNaN(x) ? 0 : x;
}

function feetInchesToDecimal(feetInches) {
    if (!feetInches || feetInches === '') return 0;
    const str = feetInches.toString().trim();
    const match = str.match(/^(\d+(?:\.\d+)?)[''](\d+(?:\.\d+)?)[""]?$/) || str.match(/^(\d+(?:\.\d+)?)\s*['']?\s*(\d+(?:\.\d+)?)?\s*[""]?$/);
    if (!match) {
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;
    if (inches >= 12) {
        const extraFeet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return feet + extraFeet + (remainingInches / 12);
    }
    return feet + (inches / 12);
}

function computeCircular(p, unitSystem) {
    const quantity = num(p.quantity);
    const Lm = unitSystem === 'metric' ? (parseFloat(p.pileLength) || 0) / 1000 : feetInchesToDecimal(p.pileLength) * FT2M;
    const Lmm = Lm * 1000;
    const eff = Lmm - (unitSystem === 'metric' ? (parseFloat(p.effectiveOffset) || 0) : feetInchesToDecimal(p.effectiveOffset) * FT2M * 1000);
    const effPos = Math.max(0, eff);
    
    const dL = num(p.longDia);
    const dT = num(p.tieDia);

    const embedMm = p.topEmbedMode === 'kd' 
        ? num(p.topEmbedK) * dL 
        : (unitSystem === 'metric' ? (parseFloat(p.topEmbedMm) || 0) : feetInchesToDecimal(p.topEmbedMm) * FT2M * 1000);
    
    const longLen_m = (Lmm + num(p.longBotHookD) * dL + embedMm) / 1000;
    const longUW = unitWeight(dL);
    const longPc = longUW * longLen_m;
    const longTot = longPc * num(p.longQty) * quantity;

    const spacing = Math.max(1, unitSystem === 'metric' ? (parseFloat(p.tieSpacing) || 0) : feetInchesToDecimal(p.tieSpacing) * FT2M * 1000);
    const cageDiaMm = unitSystem === 'metric' ? (parseFloat(p.cageDiameter) || 0) : feetInchesToDecimal(p.cageDiameter) * FT2M * 1000;
    const ringLen_m = Math.max(0, (PI * cageDiaMm) / 1000 + (num(p.tieBendD) * dT) / 1000 + (num(p.tieLapD) * dT) / 1000);
    
    const lateralStopMm = unitSystem === 'metric' ? (parseFloat(p.lateralTopStop) || 0) : feetInchesToDecimal(p.lateralTopStop) * FT2M * 1000;
    const effectiveForRings = Math.max(0, effPos - lateralStopMm);
    const rings = Math.max(1, Math.floor(effectiveForRings / spacing) + 1);
    
    const tieUW = unitWeight(dT);
    const ringPc = tieUW * ringLen_m;
    const ringTot = ringPc * rings * quantity;

    return {
        rows: [
            {
                mark: 'L1',
                desc: `Longitudinal bars (${p.longQty} nos) with bottom hook ${p.longBotHookD}d + embed ${embedMm.toFixed(0)} mm`,
                dia: dL,
                qty: p.longQty,
                totalQty: p.longQty * quantity,
                len_m: longLen_m,
                len_mm: Math.round(longLen_m * 1000),
                unit_w: longUW,
                piece_w: longPc,
                total_w: longTot,
            },
            {
                mark: 'R1',
                desc: `Rings @ ${spacing.toFixed(0)} mm c/c (D=${cageDiaMm.toFixed(0)} mm) stop ${lateralStopMm.toFixed(0)} mm below cut-off`,
                dia: dT,
                qty: rings,
                totalQty: rings * quantity,
                len_m: ringLen_m,
                len_mm: Math.round(ringLen_m * 1000),
                unit_w: tieUW,
                piece_w: ringPc,
                total_w: ringTot,
            }
        ],
        total: longTot + ringTot,
        badge: `Rings: ${rings}`
    };
}

function computeHelical(p, unitSystem) {
    const quantity = num(p.quantity);
    const Lm = unitSystem === 'metric' ? (parseFloat(p.pileLength) || 0) / 1000 : feetInchesToDecimal(p.pileLength) * FT2M;
    const Lmm = Lm * 1000;
    const eff = Lmm - (unitSystem === 'metric' ? (parseFloat(p.effectiveOffset) || 0) : feetInchesToDecimal(p.effectiveOffset) * FT2M * 1000);
    const effPos = Math.max(0, eff);
    
    const dL = num(p.longDia);
    const dS = num(p.sprDia);

    const embedMm = p.topEmbedMode === 'kd' 
        ? num(p.topEmbedK) * dL 
        : (unitSystem === 'metric' ? (parseFloat(p.topEmbedMm) || 0) : feetInchesToDecimal(p.topEmbedMm) * FT2M * 1000);
    
    const longLen_m = (Lmm + num(p.longBotHookD) * dL + embedMm) / 1000;
    const longUW = unitWeight(dL);
    const longPc = longUW * longLen_m;
    const longTot = longPc * num(p.longQty) * quantity;

    const pitch = Math.max(1, unitSystem === 'metric' ? (parseFloat(p.sprPitch) || 0) : feetInchesToDecimal(p.sprPitch) * FT2M * 1000);
    const cageDiaMm = unitSystem === 'metric' ? (parseFloat(p.cageDiameter) || 0) : feetInchesToDecimal(p.cageDiameter) * FT2M * 1000;
    const lateralStopMm = unitSystem === 'metric' ? (parseFloat(p.lateralTopStop) || 0) : feetInchesToDecimal(p.lateralTopStop) * FT2M * 1000;
    
    const effectiveForSpiral = Math.max(0, effPos - lateralStopMm);
    const turns = Math.max(1, Math.ceil(effectiveForSpiral / pitch));
    const perTurn_m = Math.sqrt(Math.pow((PI * cageDiaMm) / 1000, 2) + Math.pow(pitch / 1000, 2));
    const spiralLen_m = turns * perTurn_m + (num(p.sprEndHookD) * dS) / 1000;
    
    const sprUW = unitWeight(dS);
    const sprTot = sprUW * spiralLen_m * quantity;

    return {
        rows: [
            {
                mark: 'L1',
                desc: `Longitudinal bars (${p.longQty} nos) with bottom hook ${p.longBotHookD}d + embed ${embedMm.toFixed(0)} mm`,
                dia: dL,
                qty: p.longQty,
                totalQty: p.longQty * quantity,
                len_m: longLen_m,
                len_mm: Math.round(longLen_m * 1000),
                unit_w: longUW,
                piece_w: longPc,
                total_w: longTot,
            },
            {
                mark: 'S1',
                desc: `Helical spiral @ pitch ${pitch.toFixed(0)} mm (D=${cageDiaMm.toFixed(0)} mm) stops ${lateralStopMm.toFixed(0)} mm below cut-off, ${turns} turns; end hooks ${p.sprEndHookD}d`,
                dia: dS,
                qty: 1,
                totalQty: quantity,
                len_m: spiralLen_m,
                len_mm: Math.round(spiralLen_m * 1000),
                unit_w: sprUW,
                piece_w: sprTot / quantity,
                total_w: sprTot,
            }
        ],
        total: longTot + sprTot,
        badge: `Turns: ${turns}`
    };
}

const calculatePilingBBS = (req, res) => {
    try {
        const { piles, unitSystem } = req.body;

        if (!piles || !Array.isArray(piles) || piles.length === 0) {
            return res.status(400).json({ error: 'Piles array is required' });
        }

        const pileResults = piles.map(pile => {
            const comp = pile.cageType === 'circular' ? computeCircular(pile, unitSystem || 'metric') : computeHelical(pile, unitSystem || 'metric');
            return {
                pile,
                computation: comp
            };
        });

        const grandTotal = pileResults.reduce((sum, result) => sum + result.computation.total, 0);

        res.json({
            pileResults,
            grandTotal
        });
    } catch (error) {
        console.error('Error calculating piling BBS:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { calculatePilingBBS };
