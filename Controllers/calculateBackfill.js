const calculateBackfill = (req, res) => {
  try {
    const {
      length,
      width,
      depth,
      concreteVolume,
      compactionFactor,
      truckCapacity,
    } = req.body;

    const requiredFields = ['length', 'width', 'depth', 'concreteVolume', 'compactionFactor', 'truckCapacity'];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const L = parseFloat(length);
    const W = parseFloat(width);
    const D = parseFloat(depth);
    const C = parseFloat(concreteVolume);
    const CF = parseFloat(compactionFactor);
    const TC = parseFloat(truckCapacity);

    if (isNaN(L) || isNaN(W) || isNaN(D) || isNaN(C) || isNaN(CF) || isNaN(TC)) {
      throw new Error('All inputs must be valid numbers.');
    }
    if (L < 0 || W < 0 || D < 0 || C < 0 || CF <= 0 || TC <= 0) {
      throw new Error('Length, width, depth, concrete volume, compaction factor, and truck capacity must be non-negative.');
    }

    const adjustedLength = L ;
    const adjustedWidth = W ;
    const excavationVolume = adjustedLength * adjustedWidth * D;
    const stoneSoilingVolume = adjustedLength * adjustedWidth * 0.5;
    if (C > excavationVolume - stoneSoilingVolume) {
      throw new Error('Concrete volume exceeds available backfill space.');
    }

    const compactedBackfillVolume = excavationVolume - C - stoneSoilingVolume;
    const looseFillVolume = compactedBackfillVolume * CF;
    const numberOfTrucks = Math.ceil(looseFillVolume / TC);

    const results = {
      adjustedLength,
      adjustedWidth,
      excavationVolume,
      stoneSoilingVolume,
      compactedBackfillVolume,
      looseFillVolume,
      numberOfTrucks,
      truckCapacity: TC,
    };

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { calculateBackfill };