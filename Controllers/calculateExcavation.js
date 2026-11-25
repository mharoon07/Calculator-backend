const calculateExcavation = (req, res) => {
  try {
    const {
      length,
      width,
      depth,
      lengthExtension,
      widthExtension,
      useExtensions,
      showCubicYards,
    } = req.body;

    let results = {};
    const requiredFields = ['length', 'width', 'depth'];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const L = parseFloat(length);
    const W = parseFloat(width);
    const D = parseFloat(depth);
    const l = parseFloat(lengthExtension) || 0;
    const w = parseFloat(widthExtension) || 0;

    if (isNaN(L) || isNaN(W) || isNaN(D)) {
      throw new Error('Length, width, and depth must be valid numbers.');
    }
    if (L < 0 || W < 0 || D < 0) {
      throw new Error('Length, width, and depth must be non-negative.');
    }
    if (useExtensions && (isNaN(l) || isNaN(w))) {
      throw new Error('Length and width extensions must be valid numbers.');
    }
    if (useExtensions && (l < 0 || w < 0)) {
      throw new Error('Length and width extensions must be non-negative.');
    }

    // Original volume in cubic feet
    const Vorig = L * W * D;
    // Convert to cubic yards
    const VorigYd = Vorig / 27;

    let Vext = null,
      effLx = null,
      effWx = null,
      VextYd = null;

    if (useExtensions) {
      effLx = L + 2 * l;
      effWx = W + 2 * w;
      Vext = effLx * effWx * D;
      VextYd = Vext / 27;
    }
    if (!useExtensions) {

     results = {
        Vorig,
        VorigYd,
        L,
        W,
        D,
        showYards: showCubicYards,
      };

    }
    else {  
      results = {
      Vorig,
      VorigYd,
      L,
      W,
      D,
      Vext,
      VextYd,
      effLx,
      effWx,
      vdiff: Vext - Vorig,
      vdiffYd: VextYd - VorigYd,
      
      showYards: showCubicYards,
    };}
  

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { calculateExcavation };
