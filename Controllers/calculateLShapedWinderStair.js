const convertToFeet = (value, unit, padOneInch = false) => {
    if (!value) return 0;
    let val = parseFloat(value);
    if (unit === 'inches') val = val / 12;
    return val + (padOneInch ? (1 / 12) : 0);
};

const calculateLShapedWinderStair = async (req, res) => {
    try {
        const {
            stepWidth,
            stepWidthUnit = 'feet',
            stepDepth,
            stepDepthUnit = 'feet',
            riserHeight,
            riserHeightUnit = 'feet',
            slabLength,
            slabLengthUnit = 'feet',
            skirtingHeight,
            skirtingHeightUnit = 'feet',
            numStraightSteps,
            numWinderSteps,
            rateTop,
            rateRiser,
            rateSkirting
        } = req.body;

        // Validation
        if (!stepWidth || !stepDepth || !riserHeight || !slabLength || !skirtingHeight || !numStraightSteps || !numWinderSteps) {
            return res.status(400).json({
                success: false,
                error: 'All dimensions and step counts are required'
            });
        }

        if (!rateTop || !rateRiser || !rateSkirting) {
            return res.status(400).json({
                success: false,
                error: 'All cost rates are required'
            });
        }

        const sw = convertToFeet(stepWidth, stepWidthUnit, true);
        const sd = convertToFeet(stepDepth, stepDepthUnit, true);
        const rh = convertToFeet(riserHeight, riserHeightUnit);
        const sl = convertToFeet(slabLength, slabLengthUnit, true);
        const sh = convertToFeet(skirtingHeight, skirtingHeightUnit);
        const ns = parseInt(numStraightSteps);
        const nw = parseInt(numWinderSteps);
        const rt = parseFloat(rateTop);
        const rr = parseFloat(rateRiser);
        const rs = parseFloat(rateSkirting);

        // 1. Top Surface Area
        const treadArea = ns * sw * sd;
        const slabArea = sw * sl;
        const topArea = treadArea + slabArea;

        // 2. Riser Area
        const riserStraightArea = ns * rh * sw;
        const riserWinderArea = nw * rh * sw * Math.SQRT2;
        const riserArea = riserStraightArea + riserWinderArea;

        // 3. Skirting Area
        let skirtingLength = sw * ns + sl;
        if (nw > 2) skirtingLength += sw;
        const skirtingArea = skirtingLength * sh * 2;

        // Calculate Costs
        const topCost = topArea * rt;
        const riserCost = riserArea * rr;
        const skirtingCost = skirtingArea * rs;

        // Totals
        const totalArea = topArea + riserArea + skirtingArea;
        const totalCost = topCost + riserCost + skirtingCost;

        return res.status(200).json({
            success: true,
            results: {
                areas: {
                    top: parseFloat(topArea.toFixed(2)),
                    tread: parseFloat(treadArea.toFixed(2)),
                    slab: parseFloat(slabArea.toFixed(2)),
                    riser: parseFloat(riserArea.toFixed(2)),
                    riserStraight: parseFloat(riserStraightArea.toFixed(2)),
                    riserWinder: parseFloat(riserWinderArea.toFixed(2)),
                    skirting: parseFloat(skirtingArea.toFixed(2)),
                    total: parseFloat(totalArea.toFixed(2))
                },
                costs: {
                    top: parseFloat(topCost.toFixed(2)),
                    riser: parseFloat(riserCost.toFixed(2)),
                    skirting: parseFloat(skirtingCost.toFixed(2)),
                    total: parseFloat(totalCost.toFixed(2))
                },
                rates: {
                    top: rt,
                    riser: rr,
                    skirting: rs
                },
                dimensions: {
                    skirtingLength: parseFloat(skirtingLength.toFixed(2))
                }
            }
        });
    } catch (err) {
        console.error('Error in calculateLShapedWinderStair:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateLShapedWinderStair };


