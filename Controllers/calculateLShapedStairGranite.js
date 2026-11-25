const toFeet = (value, unit) => {
    if (!value) return 0;
    return unit === 'inches' ? parseFloat(value) / 12 : parseFloat(value);
};

const calculateLShapedStairGranite = async (req, res) => {
    try {
        const {
            treadWidth,
            treadWidthUnit = 'feet',
            treadDepth,
            treadDepthUnit = 'feet',
            riserHeight,
            riserHeightUnit = 'feet',
            numSteps,
            skirtingHeight,
            skirtingHeightUnit = 'feet',
            landingWidth,
            landingWidthUnit = 'feet',
            landingLength,
            landingLengthUnit = 'feet',
            costTread,
            costRiser,
            costSkirting,
            costLanding
        } = req.body;

        // Validation
        if (!treadWidth || !treadDepth || !riserHeight || !numSteps || !skirtingHeight || !landingWidth || !landingLength) {
            return res.status(400).json({
                success: false,
                error: 'All dimensions are required'
            });
        }

        if (!costTread || !costRiser || !costSkirting || !costLanding) {
            return res.status(400).json({
                success: false,
                error: 'All cost rates are required'
            });
        }

        const tw = toFeet(treadWidth, treadWidthUnit);
        const td = toFeet(treadDepth, treadDepthUnit);
        const rh = toFeet(riserHeight, riserHeightUnit);
        const ns = parseInt(numSteps);
        const sh = toFeet(skirtingHeight, skirtingHeightUnit);
        const lw = toFeet(landingWidth, landingWidthUnit);
        const ll = toFeet(landingLength, landingLengthUnit);
        const ct = parseFloat(costTread);
        const cr = parseFloat(costRiser);
        const cs = parseFloat(costSkirting);
        const cl = parseFloat(costLanding);

        // Add 1-inch increment for Tread Width, Tread Depth, Landing Length, and Landing Width
        const tw_adj = tw + (1 / 12);
        const td_adj = td + (1 / 12);
        const ll_adj = ll + (1 / 12);
        const lw_adj = lw + (1 / 12);

        // Calculate Areas
        const treadArea = tw_adj * td_adj * ns;
        const riserArea = (rh * ns) + (rh * ll_adj); // Riser area including landing riser
        const skirtingLength = ((td_adj + rh) * ns) + ll_adj + lw_adj;
        const skirtingArea = skirtingLength * sh;
        const landingArea = lw_adj * ll_adj;

        // Calculate Costs
        const treadCost = treadArea * ct;
        const riserCost = riserArea * cr;
        const skirtingCost = skirtingArea * cs;
        const landingCost = landingArea * cl;

        // Totals
        const totalArea = treadArea + riserArea + skirtingArea + landingArea;
        const totalCost = treadCost + riserCost + skirtingCost + landingCost;

        return res.status(200).json({
            success: true,
            results: {
                areas: {
                    tread: parseFloat(treadArea.toFixed(2)),
                    riser: parseFloat(riserArea.toFixed(2)),
                    skirting: parseFloat(skirtingArea.toFixed(2)),
                    landing: parseFloat(landingArea.toFixed(2)),
                    total: parseFloat(totalArea.toFixed(2))
                },
                costs: {
                    tread: parseFloat(treadCost.toFixed(2)),
                    riser: parseFloat(riserCost.toFixed(2)),
                    skirting: parseFloat(skirtingCost.toFixed(2)),
                    landing: parseFloat(landingCost.toFixed(2)),
                    total: parseFloat(totalCost.toFixed(2))
                },
                rates: {
                    tread: ct,
                    riser: cr,
                    skirting: cs,
                    landing: cl
                },
                dimensions: {
                    skirtingLength: parseFloat(skirtingLength.toFixed(2))
                }
            }
        });
    } catch (err) {
        console.error('Error in calculateLShapedStairGranite:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateLShapedStairGranite };


