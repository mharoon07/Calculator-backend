const calculatePaver = async (req, res) => {
    try {
        const {
            shape,
            unitTile,
            unitArea,
            L_area,
            W_area,
            rect_l,
            rect_w,
            square_s,
            tri_b,
            tri_h,
            pent_s,
            pent_a,
            oct_s,
            trap_b1,
            trap_b2,
            trap_h,
            i_l,
            i_w,
            i_h
        } = req.body;


        // Validation
        if (!shape) {
            return res.status(400).json({
                success: false,
                error: 'Please select a tile shape.'
            });
        }

        const parseNonNeg = (value) => {
            const num = parseFloat(value);
            return isFinite(num) && num >= 0 ? num : NaN;
        };

        // Unit conversion mappings
        const tileUnitMap = {
            'cm': 1,
            'mm': 0.1,
            'inch': 2.54,
            'inches': 2.54
        };

        const areaUnitMap = {
            'meter': 100,
            'meters': 100,
            'm': 100,
            'yard': 91.44,
            'yards': 91.44,
            'feet': 30.48,
            'foot': 30.48,
            'ft': 30.48
        };

        // Convert unit names to numeric values, or use numeric value directly
        let unitTileValue;
        if (typeof unitTile === 'string' && tileUnitMap[unitTile.toLowerCase()]) {
            unitTileValue = tileUnitMap[unitTile.toLowerCase()];
        } else {
            unitTileValue = parseFloat(unitTile) || 1;
        }

        let unitAreaValue;
        if (typeof unitArea === 'string' && areaUnitMap[unitArea.toLowerCase()]) {
            unitAreaValue = areaUnitMap[unitArea.toLowerCase()];
        } else {
            unitAreaValue = parseFloat(unitArea) || 100;
        }

        const L_areaValue = parseNonNeg(L_area);
        const W_areaValue = parseNonNeg(W_area);

        console.log('=== PAVER CALCULATOR DEBUG ===');
        console.log('Input values:', { shape, unitTile, unitArea, L_area, W_area });
        console.log('Parsed values:', { unitTileValue, unitAreaValue, L_areaValue, W_areaValue });

        if ([L_areaValue, W_areaValue].some(Number.isNaN)) {
            return res.status(400).json({
                success: false,
                error: 'Enter non-negative numbers for paving area length and width.'
            });
        }

        // Calculate paving area in cm² and m²
        const L_area_cm = L_areaValue * unitAreaValue;
        const W_area_cm = W_areaValue * unitAreaValue;
        const areaPavingCm2 = L_area_cm * W_area_cm;
        const areaPavingM2 = areaPavingCm2 / 10000;

        console.log('Paving area calc:', { L_area_cm, W_area_cm, areaPavingCm2, areaPavingM2 });

        let areaTileCm2 = 0;
        const errors = [];

        // Calculate tile area based on shape
        switch (shape) {
            case 'rectangle': {
                const rl = parseNonNeg(rect_l) * unitTileValue;
                const rw = parseNonNeg(rect_w) * unitTileValue;
                if ([rl, rw].some(Number.isNaN)) {
                    errors.push('Enter valid rectangle length and width.');
                    break;
                }
                areaTileCm2 = rl * rw;
                break;
            }
            case 'square': {
                const ss = parseNonNeg(square_s) * unitTileValue;
                if (Number.isNaN(ss)) {
                    errors.push('Enter valid square side length.');
                    break;
                }
                areaTileCm2 = ss * ss;
                break;
            }
            case 'triangle': {
                const tb = parseNonNeg(tri_b) * unitTileValue;
                const th = parseNonNeg(tri_h) * unitTileValue;
                if ([tb, th].some(Number.isNaN)) {
                    errors.push('Enter valid triangle base and height.');
                    break;
                }
                areaTileCm2 = 0.5 * tb * th;
                break;
            }
            case 'pentagon': {
                const ps = parseNonNeg(pent_s) * unitTileValue;
                const pa = parseNonNeg(pent_a) * unitTileValue;
                if ([ps, pa].some(Number.isNaN)) {
                    errors.push('Enter valid pentagon side and apothem.');
                    break;
                }
                areaTileCm2 = (5 * ps * pa) / 2;
                break;
            }
            case 'octagon': {
                const os = parseNonNeg(oct_s) * unitTileValue;
                if (Number.isNaN(os)) {
                    errors.push('Enter valid octagon side length.');
                    break;
                }
                areaTileCm2 = 2 * (1 + Math.sqrt(2)) * os * os;
                break;
            }
            case 'trapezoid': {
                const b1 = parseNonNeg(trap_b1) * unitTileValue;
                const b2 = parseNonNeg(trap_b2) * unitTileValue;
                const tht = parseNonNeg(trap_h) * unitTileValue;
                if ([b1, b2, tht].some(Number.isNaN)) {
                    errors.push('Enter valid trapezoid base 1, base 2, and height.');
                    break;
                }
                areaTileCm2 = 0.5 * (b1 + b2) * tht;
                break;
            }
            case 'interlock': {
                const il = parseNonNeg(i_l) * unitTileValue;
                const iw = parseNonNeg(i_w) * unitTileValue;
                const ih = parseNonNeg(i_h) * unitTileValue;
                if ([il, iw, ih].some(Number.isNaN)) {
                    errors.push('Enter valid interlock horizontal width, vertical height, and angular length.');
                    break;
                }
                const B = Math.sqrt(ih * ih / 2);
                areaTileCm2 = (il * iw) - (iw * 2 * B) - (4 * 0.5 * B * B);
                break;
            }
            default:
                errors.push('Invalid tile shape selected.');
                break;
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: errors.join(' ')
            });
        }

        // if (areaTileCm2 <= 0) {
        //     return res.status(400).json({
        //         success: false,
        //         error: 'Tile area must be greater than zero.'
        //     });
        // }

        console.log('Tile area:', { areaTileCm2 });

        // Calculate results
        const areaTileM2 = areaTileCm2 / 10000;
        const tilesRequired = Math.ceil(areaPavingM2 / areaTileM2);

        console.log('Final results:', { areaTileM2, areaPavingM2, tilesRequired });
        console.log('=== END DEBUG ===\n');

        return res.status(200).json({
            success: true,
            results: {
                areaTileM2,
                areaPavingM2,
                tilesRequired,
                shape
            }
        });
    } catch (err) {
        console.error('Error in calculatePaver:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculatePaver };



