const toFeet = (value, unit) => {
    if (!value) return 0;
    return unit === 'inches' ? parseFloat(value) / 12 : parseFloat(value);
};

const calculateStraightStairLanding = async (req, res) => {
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
            hasLanding = false,
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
        if (!treadWidth || !treadDepth || !riserHeight || !numSteps || !skirtingHeight) {
            return res.status(400).json({
                success: false,
                error: 'Required dimensions are missing'
            });
        }

        if (!costTread || !costRiser || !costSkirting) {
            return res.status(400).json({
                success: false,
                error: 'Required cost rates are missing'
            });
        }

        if (hasLanding && (!landingWidth || !landingLength || !costLanding)) {
            return res.status(400).json({
                success: false,
                error: 'Landing dimensions and cost rate are required when landing is enabled'
            });
        }

        const tw = toFeet(treadWidth, treadWidthUnit);
        const td = toFeet(treadDepth, treadDepthUnit);
        const rh = toFeet(riserHeight, riserHeightUnit);
        const ns = parseInt(numSteps);
        const sh = toFeet(skirtingHeight, skirtingHeightUnit);
        const lw = hasLanding ? toFeet(landingWidth, landingWidthUnit) : 0;
        const ll = hasLanding ? toFeet(landingLength, landingLengthUnit) : 0;
        const ct = parseFloat(costTread);
        const cr = parseFloat(costRiser);
        const cs = parseFloat(costSkirting);
        const cl = hasLanding ? parseFloat(costLanding) : 0;

        // Add 1-inch increment for Tread Width and Tread Depth
        const atw = tw + (1 / 12);
        const atd = td + (1 / 12);

        // Calculate Areas
        const treadArea = atw * atd * ns;
        const treadCost = treadArea * ct;

        const riserArea = tw * rh * ns;
        const riserCost = riserArea * cr;

        let skirtingLength = (td + rh) * ns;
        let landingArea = 0;
        let landingCost = 0;

        if (hasLanding) {
            skirtingLength += ll;
            landingArea = lw * ll;
            landingCost = landingArea * cl;
        }

        const skirtingArea = skirtingLength * sh;
        const skirtingCost = skirtingArea * cs;

        // Totals
        const totalArea = treadArea + riserArea + skirtingArea + landingArea;
        const totalCost = treadCost + riserCost + skirtingCost + landingCost;

        return res.status(200).json({
            success: true,
            results: {
                hasLanding,
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
        console.error('Error in calculateStraightStairLanding:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateStraightStairLanding };


