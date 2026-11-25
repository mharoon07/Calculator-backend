const calculateCompaction = (req, res) => {
  try {
    const { material, compactionFactor, unit, length, width, depth } = req.body;

    const requiredFields = ['material', 'compactionFactor', 'unit', 'length', 'width', 'depth'];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const factorOptions = {
      sand: [1.10, 1.11, 1.12, 1.13, 1.14, 1.15],
      gravel: [1.10, 1.15, 1.20, 1.25],
      clay: [1.20, 1.25, 1.30, 1.35, 1.40],
      crushed_stone: [1.15, 1.20, 1.25, 1.30],
      common_fill: [1.20, 1.25, 1.30, 1.35],
    };

    if (!factorOptions[material]) {
      throw new Error('Invalid material type.');
    }
    if (!factorOptions[material].includes(parseFloat(compactionFactor))) {
      throw new Error('Invalid compaction factor for selected material.');
    }
    if (!['m', 'ft'].includes(unit)) {
      throw new Error('Invalid unit of measurement.');
    }

    const L = parseFloat(length);
    const W = parseFloat(width);
    const D = parseFloat(depth);
    const CF = parseFloat(compactionFactor);

    if (isNaN(L) || isNaN(W) || isNaN(D) || isNaN(CF)) {
      throw new Error('All inputs must be valid numbers.');
    }
    if (L < 0 || W < 0 || D < 0 || CF <= 0) {
      throw new Error('Length, width, depth, and compaction factor must be non-negative.');
    }

    // Convert to meters for calculation
    let l = L, w = W, d = D;
    if (unit === 'ft') {
      l *= 0.3048;
      w *= 0.3048;
      d *= 0.3048;
    }

    // Calculate in cubic meters
    const compactedVolumeM3 = l * w * d;
    const looseVolumeM3 = compactedVolumeM3 * CF;

    // Convert back to ft³ if input was ft
    let compactedVolume, looseVolume, outputUnit;
    if (unit === 'ft') {
      const conversionFactor = 35.3147; // 1 m³ = 35.3147 ft³
      compactedVolume = compactedVolumeM3 * conversionFactor;
      looseVolume = looseVolumeM3 * conversionFactor;
      outputUnit = 'ft³';
    } else {
      compactedVolume = compactedVolumeM3;
      looseVolume = looseVolumeM3;
      outputUnit = 'm³';
    }

    const results = {
      compactedVolume,
      looseVolume,
      unit: outputUnit,
    };

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { calculateCompaction };
