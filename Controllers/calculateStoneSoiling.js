const calculateStoneSoiling = (req, res) => {
  try {
    const { areas } = req.body;

    if (!Array.isArray(areas) || areas.length === 0) {
      throw new Error('At least one area must be provided.');
    }

    const areaVolumes = areas.map((area, index) => {
      const { name, length, width, thicknessInches } = area;

      if (!name || name.trim() === '') {
        throw new Error(`Area ${index + 1}: Name cannot be empty.`);
      }
      const l = parseFloat(length);
      const w = parseFloat(width);
      const t = parseFloat(thicknessInches);

      if (isNaN(l) || isNaN(w) || isNaN(t)) {
        throw new Error(`Area ${index + 1}: Length, width, and thickness must be valid numbers.`);
      }
      if (l < 0 || w < 0 || t < 0) {
        throw new Error(`Area ${index + 1}: Length, width, and thickness must be non-negative.`);
      }

      const thicknessFeet = t / 12;
      const volumeFt3 = l * w * thicknessFeet;
      return { name, length: l, width: w, thicknessInches: t, volumeFt3 };
    });

    const totalFt3 = areaVolumes.reduce((sum, area) => sum + area.volumeFt3, 0);
    const totalM3 = totalFt3 / 35.315;
    const minTons = totalM3 * 1.6;
    const maxTons = totalM3 * 1.8;

    const results = {
      areaVolumes,
      totalFt3,
      totalM3,
      minTons,
      maxTons,
    };

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { calculateStoneSoiling };