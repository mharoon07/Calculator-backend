// controllers/bitumenController.js

// --- Utility: Convert to meters ---
const convertToMeters = (value, unit) => {
  const v = parseFloat(value) || 0;
  if (unit === "feet" || unit === "ft") return v * 0.3048;
  if (unit === "yard" || unit === "yd") return v * 0.9144;
  return v; // Assume already in meters
};

// --- Input Validation ---
const validateInput = (data) => {
  const errors = [];

  if (
    !data.globalParams ||
    !data.globalParams.consumption ||
    parseFloat(data.globalParams.consumption) <= 0
  ) {
    errors.push("Consumption must be a positive number");
  }
  if (!data.globalParams.coatingLayers || parseInt(data.globalParams.coatingLayers) < 1) {
    errors.push("Coating layers must be at least 1");
  }
  if (parseFloat(data.globalParams.wasteOverage) < 0) {
    errors.push("Waste/Overage percentage cannot be negative");
  }
  if (parseFloat(data.globalParams.containerSize) <= 0) {
    errors.push("Container size must be a positive number");
  }

  return errors;
};

// --- Main Calculation ---
const calculateBitumen = (req, res) => {
  try {
    const { foundations, columns, beams, ringWalls, globalParams } = req.body;

    // Validate input
    const errors = validateInput({ foundations, columns, beams, ringWalls, globalParams });
    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    let totalFoundationArea = 0;
    let totalColumnArea = 0;
    let totalBeamArea = 0;
    let totalRingWallArea = 0;
    const details = [];

    // --- Foundations ---
    foundations.forEach((f, i) => {
      if (f.width && f.length && f.height) {
        // Use specific unit if available, otherwise fallback to generic generic 'unit' or default to "feet"
        const width = convertToMeters(f.width, f.unitWidth || f.unit || "feet");
        const length = convertToMeters(f.length, f.unitLength || f.unit || "feet");
        const height = convertToMeters(f.height, f.unitHeight || f.unit || "feet");
        const qty = parseInt(f.quantity) || 1;

        let area = 0;
        if (f.coatSides) area += 2 * (width * height) + 2 * (length * height);
        if (f.coatBottom) area += width * length;
        if (f.coatTop) area += width * length;

        area *= qty;
        totalFoundationArea += area;

        details.push({ type: "Foundation", index: i + 1, area: area.toFixed(2), qty });
      }
    });

    // --- Columns ---
    columns.forEach((c, i) => {
      if (c.width && c.thickness && c.height) {
        const width = convertToMeters(c.width, c.unitWidth || c.unit || "feet");
        const thickness = convertToMeters(c.thickness, c.unitThickness || c.unit || "feet");
        const height = convertToMeters(c.height, c.unitHeight || c.unit || "feet");
        const qty = parseInt(c.quantity) || 1;

        const area = (2 * width * height + 2 * thickness * height) * qty;
        totalColumnArea += area;

        details.push({ type: "Column", index: i + 1, area: area.toFixed(2), qty });
      }
    });

    // --- Beams ---
    beams.forEach((b, i) => {
      if (b.length && b.height) {
        const length = convertToMeters(b.length, b.unitLength || b.unit || "feet");
        const height = convertToMeters(b.height, b.unitHeight || b.unit || "feet");
        // Width is optional for backward compatibility, but needed for accurate 3/4 side coating
        // If width is not provided, we might assume square beam (width = height) or just ignore bottom/top
        const width = b.width ? convertToMeters(b.width, b.unitWidth || b.unit || "feet") : height;

        const sides = parseInt(b.sidesToCoat) || 2; // Can be string "2 sides" or number 2
        const sidesCount = typeof b.sidesToCoat === 'string' ? parseInt(b.sidesToCoat) : (b.sidesToCoat || 2);
        const qty = parseInt(b.quantity) || 1;

        let area = 0;

        if (sidesCount === 2) {
          // Assume 2 Vertical Sides
          area = (2 * length * height);
        } else if (sidesCount === 3) {
          // Assume 2 Vertical Sides + 1 Bottom
          area = (2 * length * height) + (length * width);
        } else if (sidesCount === 4) {
          // All 4 faces (Sides + Top + Bottom)
          area = (2 * length * height) + (2 * length * width);
        } else {
          // Fallback
          area = length * height * sidesCount;
        }

        area *= qty;
        totalBeamArea += area;

        details.push({ type: "Beam", index: i + 1, area: area.toFixed(2), qty });
      }
    });

    // --- Ring Walls ---
    ringWalls.forEach((r, i) => {
      if (r.outerLength && r.outerWidth && r.wallThickness && r.height) {
        const outerLength = convertToMeters(r.outerLength, r.unitOutLength || r.unit || "feet");
        const outerWidth = convertToMeters(r.outerWidth, r.unitOutWidth || r.unit || "feet");
        const wallThickness = convertToMeters(r.wallThickness, r.unitThickness || r.unit || "feet");
        const height = convertToMeters(r.height, r.unitHeight || r.unit || "feet");
        const qty = parseInt(r.quantity) || 1;

        const innerLength = Math.max(0, outerLength - 2 * wallThickness);
        const innerWidth = Math.max(0, outerWidth - 2 * wallThickness);

        // Perimeter of inside + outside walls
        const perimeter = 2 * (outerLength + outerWidth + innerLength + innerWidth);
        const area = perimeter * height * qty;

        totalRingWallArea += area;
        details.push({ type: "Ring Wall", index: i + 1, area: area.toFixed(2), qty });
      }
    });

    const totalArea = totalFoundationArea + totalColumnArea + totalBeamArea + totalRingWallArea;

    // --- Bitumen consumption ---
    const consumption = parseFloat(globalParams.consumption) || 2; // m²/kg/layer
    const layers = parseInt(globalParams.coatingLayers) || 1;
    const waste = parseFloat(globalParams.wasteOverage) || 5;
    const pricePerKg = parseFloat(globalParams.pricePerKg) || 0;
    const containerSize = parseFloat(globalParams.containerSize) || 30;

    const totalBitumenKg = (totalArea / consumption) * layers * (1 + waste / 100);
    const totalCost = totalBitumenKg * pricePerKg;
    const containersNeeded = Math.ceil(totalBitumenKg / containerSize);

    return res.status(200).json({
      totalArea: totalArea.toFixed(2),
      totalFoundationArea: totalFoundationArea.toFixed(2),
      totalColumnArea: totalColumnArea.toFixed(2),
      totalBeamArea: totalBeamArea.toFixed(2),
      totalRingWallArea: totalRingWallArea.toFixed(2),
      totalBitumenKg: totalBitumenKg.toFixed(2),
      totalCost: totalCost.toFixed(2),
      containersNeeded,
      details,
      globalParams,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "An error occurred during calculation", details: err.message });
  }
};

export { calculateBitumen };
