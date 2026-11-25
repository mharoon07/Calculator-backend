// Parse feet and inches to meters
const parseFeetInches = (value) => {
    if (!value) return 0;
    const str = String(value).trim().toLowerCase();

    // Pure number: treat as feet (e.g., 9.5 = 9.5 ft)
    if (/^[0-9.]+$/.test(str)) {
        const feet = parseFloat(str);
        return feet * 0.3048;
    }

    let feet = 0;
    let inches = 0;

    // Match feet: 9', 9 ft, 9ft
    const feetMatch = str.match(/(\d+(\.\d+)?)\s*(ft|')/i);
    if (feetMatch) {
        feet = parseFloat(feetMatch[1]);
    }

    // Match inches: 6", 6 in
    const inchMatch = str.match(/(\d+(\.\d+)?)\s*(in|")/i);
    if (inchMatch) {
        inches = parseFloat(inchMatch[1]);
    }

    // Fallback like 9-6 or 9 6
    if (!feetMatch && !inchMatch) {
        const fallback = str.match(/(\d+)\D+(\d+)/);
        if (fallback) {
            feet = parseFloat(fallback[1]);
            inches = parseFloat(fallback[2]);
        }
    }

    const meters = feet * 0.3048 + inches * 0.0254;
    return isNaN(meters) ? 0 : meters;
};

// Convert to meters based on unit system
const toMeters = (rawValue, unitSystem) => {
    if (!rawValue) return 0;
    if (unitSystem === 'metric') {
        const num = parseFloat(rawValue);
        return isNaN(num) ? 0 : num;
    }
    return parseFeetInches(rawValue);
};

const calculateWaterproofing = async (req, res) => {
    try {
        const {
            unitSystem = 'metric',
            globalSettings,
            sectionOverrides,
            bathrooms,
            roofs,
            tanks
        } = req.body;

        // Validation
        if (!globalSettings) {
            return res.status(400).json({
                success: false,
                error: 'Global settings are required'
            });
        }

        // Default values
        const defaultGlobalSettings = {
            ratePerCoat: 1.0,
            coats: 2,
            wastagePercent: 10,
            kitSize: 18,
            materialCostPerKg: 0,
            labourCostPerM2: 0
        };

        const defaultSectionOverrides = {
            bath: { ratePerCoat: 0, coats: 0 },
            roof: { ratePerCoat: 0, coats: 0 },
            tank: { ratePerCoat: 0, coats: 0 }
        };

        const finalGlobalSettings = { ...defaultGlobalSettings, ...globalSettings };
        const finalSectionOverrides = { ...defaultSectionOverrides, ...(sectionOverrides || {}) };

        // Get effective rate for a section
        const getEffectiveRate = (section) => {
            const sectionOverride = finalSectionOverrides[section];
            const globalRatePerCoat = typeof finalGlobalSettings.ratePerCoat === 'string' ? 0 : (finalGlobalSettings.ratePerCoat || 0);
            const globalCoats = typeof finalGlobalSettings.coats === 'string' ? 0 : (finalGlobalSettings.coats || 0);
            const ratePerCoat = sectionOverride.ratePerCoat > 0
                ? sectionOverride.ratePerCoat
                : globalRatePerCoat;
            const coats = sectionOverride.coats > 0
                ? sectionOverride.coats
                : globalCoats;
            return ratePerCoat * coats;
        };

        const bathEffectiveRate = getEffectiveRate('bath');
        const roofEffectiveRate = getEffectiveRate('roof');
        const tankEffectiveRate = getEffectiveRate('tank');

        let totalBathArea = 0;
        let totalRoofArea = 0;
        let totalTankArea = 0;

        const bathDetails = [];
        const roofDetails = [];
        const tankDetails = [];

        // Calculate bathrooms
        if (bathrooms && Array.isArray(bathrooms)) {
            bathrooms.forEach((bath) => {
                const L = toMeters(bath.length, unitSystem);
                const W = toMeters(bath.width, unitSystem);
                const H = toMeters(bath.upstand, unitSystem);
                const qty = parseFloat(bath.quantity) || 0;

                const floorArea = L * W;
                const perimeter = 2 * (L + W);
                const wallArea = perimeter * H;
                const areaPer = floorArea + wallArea;
                const areaTotal = areaPer * qty;

                totalBathArea += areaTotal;
                bathDetails.push({ L, W, H, qty, areaPer, areaTotal });
            });
        }

        // Calculate roofs
        if (roofs && Array.isArray(roofs)) {
            roofs.forEach((roof) => {
                const L = toMeters(roof.length, unitSystem);
                const W = toMeters(roof.width, unitSystem);
                const Hparapet = toMeters(roof.parapet || 0, unitSystem);
                const qty = parseFloat(roof.quantity) || 0;

                const roofArea = L * W;
                const perimeter = 2 * (L + W);
                const parapetArea = perimeter * Hparapet;
                const areaPer = roofArea + parapetArea;
                const areaTotal = areaPer * qty;

                totalRoofArea += areaTotal;
                roofDetails.push({ L, W, Hparapet, qty, areaPer, areaTotal });
            });
        }

        // Calculate tanks
        if (tanks && Array.isArray(tanks)) {
            tanks.forEach((tank) => {
                const dim1 = toMeters(tank.dim1, unitSystem);
                const dim2 = toMeters(tank.dim2, unitSystem);
                const H = toMeters(tank.height, unitSystem);
                const qty = parseFloat(tank.quantity) || 0;

                let areaPer = 0;
                if (tank.shape === 'rect') {
                    const L = dim1;
                    const W = dim2;
                    areaPer = 2 * (L * W + L * H + W * H);
                } else {
                    // Cylindrical
                    const D = dim1;
                    const r = D / 2;
                    const sideArea = 2 * Math.PI * r * H;
                    const topBottom = 2 * Math.PI * r * r;
                    areaPer = sideArea + topBottom;
                }

                const areaTotal = areaPer * qty;
                totalTankArea += areaTotal;
                tankDetails.push({ shape: tank.shape, dim1, dim2, H, qty, areaPer, areaTotal });
            });
        }

        const grandArea = totalBathArea + totalRoofArea + totalTankArea;

        // Material (before wastage)
        const bathKg = totalBathArea * bathEffectiveRate;
        const roofKg = totalRoofArea * roofEffectiveRate;
        const tankKg = totalTankArea * tankEffectiveRate;
        const totalKgBeforeWaste = bathKg + roofKg + tankKg;

        const wastagePercent = typeof finalGlobalSettings.wastagePercent === 'string' ? 0 : (finalGlobalSettings.wastagePercent || 0);
        const kitSize = typeof finalGlobalSettings.kitSize === 'string' ? 0 : (finalGlobalSettings.kitSize || 0);
        const materialCostPerKg = typeof finalGlobalSettings.materialCostPerKg === 'string' ? 0 : (finalGlobalSettings.materialCostPerKg || 0);
        const labourCostPerM2 = typeof finalGlobalSettings.labourCostPerM2 === 'string' ? 0 : (finalGlobalSettings.labourCostPerM2 || 0);

        const factor = 1 + wastagePercent / 100;
        const totalKg = totalKgBeforeWaste * factor;
        const kits = kitSize > 0 ? totalKg / kitSize : 0;

        // Cost
        const materialCost = totalKg * materialCostPerKg;
        const labourCost = grandArea * labourCostPerM2;
        const totalCost = materialCost + labourCost;

        return res.status(200).json({
            success: true,
            results: {
                totalBathArea,
                totalRoofArea,
                totalTankArea,
                grandArea,
                bathEffectiveRate,
                roofEffectiveRate,
                tankEffectiveRate,
                bathKg,
                roofKg,
                tankKg,
                totalKgBeforeWaste,
                totalKg,
                kits,
                factor,
                materialCost,
                labourCost,
                totalCost,
                bathDetails,
                roofDetails,
                tankDetails
            }
        });
    } catch (err) {
        console.error('Error in calculateWaterproofing:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateWaterproofing };

