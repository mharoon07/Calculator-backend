const calculateSingleWardrobe = (wardrobeInput) => {
    const {
        tag, type, lenA, lenB, height, depthA, depthB, shutterWidth,
        shelvesPerModule, shelvesBlind, drawersPerModule, drawerFrontHeight,
        includeTop, topHeight, topShelvesPerModule, exposedSides,
        sheetLenCarcass, sheetWidCarcass,
        sheetLenShutter, sheetWidShutter,
        bottomClear, topClear, contingency,
        carcassSheetRate, shutterSheetRate, labourRate,
        hingeRate, handleRate, channelRate, edgeBandRate, screwRate, bracketRate, glueRate
    } = wardrobeInput;

    const lA = parseFloat(lenA) || 0;
    const lB = parseFloat(lenB) || 0;
    const h = parseFloat(height) || 0;
    const dA = parseFloat(depthA) || 0;
    const dB = parseFloat(depthB) || 0;
    const sW = parseFloat(shutterWidth) || 0;

    if (!lA || !h || !dA || !sW) {
        return { error: `Wardrobe ${tag || 'Untagged'}: Please fill in at least Wall A length, main height, depth A and shutter width.` };
    }
    if (type === 'l-shape' && (!lB || !dB)) {
        return { error: `Wardrobe ${tag || 'Untagged'}: In L-shape mode, please also fill in Wall B length and depth B.` };
    }
    if (includeTop && !parseFloat(topHeight)) {
        return { error: `Wardrobe ${tag || 'Untagged'}: Please enter a height for the top module (loft).` };
    }

    const FT_TO_MM = 304.8;
    const heightFt = h;
    const depthAFt = dA;
    const depthBFt = (type === "l-shape") ? dB : 0;
    const topHeightFt = includeTop ? parseFloat(topHeight) : 0;

    // Visible lengths
    let visA = 0, visB = 0;
    if (type === "straight") {
        visA = lA;
        visB = 0;
    } else {
        visA = Math.max(lA - depthBFt, 0);
        visB = Math.max(lB - depthAFt, 0);
    }

    const modulesA = Math.floor(visA / sW);
    const modulesB = Math.floor(visB / sW);
    const mainShuttersTotal = modulesA + modulesB;

    const clearFt = (parseFloat(bottomClear) + parseFloat(topClear)) / FT_TO_MM;
    const mainShutterHeightFt = Math.max(heightFt - clearFt, 0);
    const mainShutterAreaPerFt2 = sW * mainShutterHeightFt;
    const mainShutterAreaTotalFt2 = mainShutterAreaPerFt2 * mainShuttersTotal;

    // Top shutters
    let topShuttersTotal = 0;
    let topShutterHeightFt = 0;
    let topShutterAreaTotalFt2 = 0;

    if (includeTop) {
        topShuttersTotal = modulesA + (type === "l-shape" ? modulesB : 0);
        topShutterHeightFt = Math.max(topHeightFt - clearFt, 0);
        topShutterAreaTotalFt2 = sW * topShutterHeightFt * topShuttersTotal;
    }

    // Dummy panels
    let dummyPanels = 0;
    if (exposedSides === "left" || exposedSides === "right") dummyPanels = 1;
    if (exposedSides === "both") dummyPanels = 2;
    const dummyPanelAreaFt2 = dummyPanels * depthAFt * heightFt;

    // Drawers
    const totalDrawersA = modulesA * parseInt(drawersPerModule);
    const totalDrawersB = (type === "l-shape") ? modulesB * parseInt(drawersPerModule) : 0;
    const totalDrawers = totalDrawersA + totalDrawersB;

    const drawerFrontAreaPerFt2 = sW * parseFloat(drawerFrontHeight);
    const drawerFrontAreaTotalFt2 = drawerFrontAreaPerFt2 * totalDrawers;

    const shutterAreaTotalFt2 = mainShutterAreaTotalFt2 + topShutterAreaTotalFt2 + dummyPanelAreaFt2 + drawerFrontAreaTotalFt2;

    // Carcass Calculations
    const calculateCarcass = (name, qty, w, h) => ({ name, qty, w, h, area: w * h, totalArea: w * h * qty });

    // Wall A
    const carcassA = [];
    let carcassAreaA = 0;
    const vertCountA = modulesA > 0 ? modulesA + 1 : 0;
    if (vertCountA > 0) carcassA.push(calculateCarcass("Vertical Panels (Wall A)", vertCountA, depthAFt, heightFt));
    if (modulesA > 0) {
        carcassA.push(calculateCarcass("Top & Bottom Panels (Wall A)", modulesA * 2, sW, depthAFt));
        if (parseInt(shelvesPerModule) > 0) carcassA.push(calculateCarcass("Shelves (Wall A)", modulesA * parseInt(shelvesPerModule), sW, depthAFt));
        carcassA.push(calculateCarcass("Back Panels (Wall A)", modulesA, sW, heightFt));
    }
    carcassAreaA = carcassA.reduce((sum, item) => sum + item.totalArea, 0);

    // Wall B
    const carcassB = [];
    let carcassAreaB = 0;
    if (type === "l-shape" && modulesB > 0) {
        const vertCountB = modulesB + 1;
        carcassB.push(calculateCarcass("Vertical Panels (Wall B)", vertCountB, depthBFt, heightFt));
        carcassB.push(calculateCarcass("Top & Bottom Panels (Wall B)", modulesB * 2, sW, depthBFt));
        if (parseInt(shelvesPerModule) > 0) carcassB.push(calculateCarcass("Shelves (Wall B)", modulesB * parseInt(shelvesPerModule), sW, depthBFt));
        carcassB.push(calculateCarcass("Back Panels (Wall B)", modulesB, sW, heightFt));
    }
    carcassAreaB = carcassB.reduce((sum, item) => sum + item.totalArea, 0);

    // Blind Corner
    const carcassBlind = [];
    let carcassAreaBlind = 0;
    let cornerW = 0, cornerD = 0;
    if (type === "l-shape") {
        cornerW = Math.min(depthAFt, depthBFt);
        cornerD = Math.min(depthAFt, depthBFt);
        if (cornerW > 0) {
            carcassBlind.push(calculateCarcass("Vertical Panels (Blind)", 2, cornerD, heightFt));
            carcassBlind.push(calculateCarcass("Top & Bottom (Blind)", 2, cornerW, cornerD));
            carcassBlind.push(calculateCarcass("Back Panel (Blind)", 1, cornerW, heightFt));
            if (parseInt(shelvesBlind) > 0) carcassBlind.push(calculateCarcass("Shelves (Blind)", parseInt(shelvesBlind), cornerW, cornerD));
        }
    }
    carcassAreaBlind = carcassBlind.reduce((sum, item) => sum + item.totalArea, 0);

    // Top Module Wall A
    const topCarcassA = [];
    let topAreaA = 0;
    if (includeTop && modulesA > 0) {
        const vertCount = modulesA + 1;
        topCarcassA.push(calculateCarcass("Top Verticals (Wall A)", vertCount, depthAFt, topHeightFt));
        topCarcassA.push(calculateCarcass("Top T&B (Wall A)", modulesA * 2, sW, depthAFt));
        if (parseInt(topShelvesPerModule) > 0) topCarcassA.push(calculateCarcass("Top Shelves (Wall A)", modulesA * parseInt(topShelvesPerModule), sW, depthAFt));
        topCarcassA.push(calculateCarcass("Top Back (Wall A)", modulesA, sW, topHeightFt));
    }
    topAreaA = topCarcassA.reduce((sum, item) => sum + item.totalArea, 0);

    // Top Module Wall B
    const topCarcassB = [];
    let topAreaB = 0;
    if (includeTop && type === "l-shape" && modulesB > 0) {
        const vertCount = modulesB + 1;
        topCarcassB.push(calculateCarcass("Top Verticals (Wall B)", vertCount, depthBFt, topHeightFt));
        topCarcassB.push(calculateCarcass("Top T&B (Wall B)", modulesB * 2, sW, depthBFt));
        if (parseInt(topShelvesPerModule) > 0) topCarcassB.push(calculateCarcass("Top Shelves (Wall B)", modulesB * parseInt(topShelvesPerModule), sW, depthBFt));
        topCarcassB.push(calculateCarcass("Top Back (Wall B)", modulesB, sW, topHeightFt));
    }
    topAreaB = topCarcassB.reduce((sum, item) => sum + item.totalArea, 0);

    // Drawer Boxes
    const drawerCarcass = [];
    let drawerArea = 0;

    const addDrawerCarcass = (prefix, drawersCount, depthFt) => {
        if (drawersCount <= 0 || parseFloat(drawerFrontHeight) <= 0 || depthFt <= 0) return;

        drawerCarcass.push(calculateCarcass(`Drawer Sides (${prefix})`, drawersCount * 2, depthFt, parseFloat(drawerFrontHeight)));
        drawerCarcass.push(calculateCarcass(`Drawer Backs (${prefix})`, drawersCount, sW, parseFloat(drawerFrontHeight)));
        drawerCarcass.push(calculateCarcass(`Drawer Bottoms (${prefix})`, drawersCount, sW, depthFt));
    };

    addDrawerCarcass("Wall A", totalDrawersA, depthAFt);
    if (type === "l-shape") {
        addDrawerCarcass("Wall B", totalDrawersB, depthBFt);
    }

    drawerArea = drawerCarcass.reduce((sum, item) => sum + item.totalArea, 0);

    const totalCarcassArea = carcassAreaA + carcassAreaB + carcassAreaBlind + topAreaA + topAreaB + drawerArea;

    // Hardware
    const hinges = (mainShuttersTotal * 4) + (topShuttersTotal * 2);
    const handles = mainShuttersTotal + topShuttersTotal + totalDrawers;
    const channels = totalDrawers;

    // Edge Band
    const mainShutterHeightMm = mainShutterHeightFt * FT_TO_MM;
    const topShutterHeightMm = topShutterHeightFt * FT_TO_MM;
    const drawerFrontHeightMm = parseFloat(drawerFrontHeight) * FT_TO_MM;
    const shutterWMm = sW * FT_TO_MM;

    const mainPerimeterMm = 2 * (shutterWMm + mainShutterHeightMm);
    const topPerimeterMm = 2 * (shutterWMm + topShutterHeightMm);
    const drawerFrontPerimeterMm = 2 * (shutterWMm + drawerFrontHeightMm);

    let edgeBandShuttersMm = (mainPerimeterMm * mainShuttersTotal) +
        (topPerimeterMm * topShuttersTotal) +
        (drawerFrontPerimeterMm * totalDrawers);

    const dummyPanelPerimeterMm = 2 * (depthAFt * FT_TO_MM + heightFt * FT_TO_MM);
    edgeBandShuttersMm += dummyPanels * dummyPanelPerimeterMm;

    let edgeCarcassMm = 0;
    const heightMm = heightFt * FT_TO_MM;

    const vertAmm = (modulesA > 0 ? (modulesA + 1) : 0) * heightMm;
    const vertBmm = (type === "l-shape" && modulesB > 0 ? (modulesB + 1) : 0) * heightMm;
    const vertCmm = (type === "l-shape" && cornerW > 0 ? 2 * heightMm : 0);

    edgeCarcassMm += (vertAmm + vertBmm + vertCmm);

    const shelfFrontAmm = modulesA * parseInt(shelvesPerModule) * shutterWMm;
    const shelfFrontBmm = (type === "l-shape" ? modulesB * parseInt(shelvesPerModule) * shutterWMm : 0);
    const shelfFrontCmm = (type === "l-shape" && cornerW > 0 ? parseInt(shelvesBlind) * (cornerW * FT_TO_MM) : 0);

    const topShelfFrontAmm = includeTop ? modulesA * parseInt(topShelvesPerModule) * shutterWMm : 0;
    const topShelfFrontBmm = (includeTop && type === "l-shape") ? modulesB * parseInt(topShelvesPerModule) * shutterWMm : 0;

    edgeCarcassMm += (shelfFrontAmm + shelfFrontBmm + shelfFrontCmm + topShelfFrontAmm + topShelfFrontBmm);

    const edgeTotalM = (edgeBandShuttersMm + edgeCarcassMm) / 1000;

    // Sheets
    const carcassSheetArea = parseFloat(sheetLenCarcass) * parseFloat(sheetWidCarcass);
    const shutterSheetArea = parseFloat(sheetLenShutter) * parseFloat(sheetWidShutter);

    const carcassBaseSheets = carcassSheetArea > 0 ? (totalCarcassArea / carcassSheetArea) : 0;
    const shutterBaseSheets = shutterSheetArea > 0 ? (shutterAreaTotalFt2 / shutterSheetArea) : 0;

    const carcassRounded = Math.ceil(carcassBaseSheets);
    const shutterRounded = Math.ceil(shutterBaseSheets);

    const carcassSheets = Math.ceil(carcassRounded * (1 + parseFloat(contingency) / 100));
    const shutterSheets = Math.ceil(shutterRounded * (1 + parseFloat(contingency) / 100));

    // Costs
    const costCarcass = carcassSheets * parseFloat(carcassSheetRate);
    const costShutter = shutterSheets * parseFloat(shutterSheetRate);

    const costHinges = hinges * parseFloat(hingeRate);
    const costHandles = handles * parseFloat(handleRate);
    const costChannels = channels * parseFloat(channelRate);
    const costEdgeBand = edgeTotalM * parseFloat(edgeBandRate);

    const totalBoardArea = totalCarcassArea + shutterAreaTotalFt2;
    const screws = Math.ceil(totalBoardArea * 2);
    const costScrews = screws * parseFloat(screwRate);

    const brackets = 4;
    const costBrackets = brackets * parseFloat(bracketRate);

    const glue = Math.max(1, Math.ceil(totalBoardArea / 50));
    const costGlue = glue * parseFloat(glueRate);

    // Labour
    let labourFrontAreaFt2 = 0;
    if (type === "straight") {
        labourFrontAreaFt2 = mainShutterAreaTotalFt2;
    } else {
        const wallAFrontFt2 = lA * heightFt;
        const wallBMainShutterAreaFt2 = modulesB * mainShutterAreaPerFt2;
        labourFrontAreaFt2 = wallAFrontFt2 + wallBMainShutterAreaFt2;
    }
    const costLabour = labourFrontAreaFt2 * parseFloat(labourRate);

    const costHardware = costHinges + costHandles + costChannels + costEdgeBand + costScrews + costBrackets + costGlue;

    const totalCost = costCarcass + costShutter + costLabour + costHardware;

    return {
        tag: tag || 'Untagged',
        summary: {
            carcassArea: parseFloat(totalCarcassArea.toFixed(2)),
            shutterArea: parseFloat(shutterAreaTotalFt2.toFixed(2)),
            carcassSheets,
            shutterSheets,
            hinges,
            handles,
            channels,
            edgeBand: parseFloat(edgeTotalM.toFixed(2)),
            screws,
            brackets,
            glue,
            totalCost: parseFloat(totalCost.toFixed(2)),
            costPerSqFt: labourFrontAreaFt2 > 0 ? parseFloat((totalCost / labourFrontAreaFt2).toFixed(2)) : 0
        },
        details: {
            carcassA, carcassB, carcassBlind, topCarcassA, topCarcassB, drawerCarcass
        },
        costs: {
            carcass: parseFloat(costCarcass.toFixed(2)),
            shutter: parseFloat(costShutter.toFixed(2)),
            labour: parseFloat(costLabour.toFixed(2)),
            hardware: parseFloat(costHardware.toFixed(2)),
            hinges: parseFloat(costHinges.toFixed(2)),
            handles: parseFloat(costHandles.toFixed(2)),
            channels: parseFloat(costChannels.toFixed(2)),
            edgeBand: parseFloat(costEdgeBand.toFixed(2)),
            screws: parseFloat(costScrews.toFixed(2)),
            brackets: parseFloat(costBrackets.toFixed(2)),
            glue: parseFloat(costGlue.toFixed(2))
        }
    };
};

const calculateWardrobe = async (req, res) => {
    try {
        const { wardrobes } = req.body;

        if (!wardrobes || !Array.isArray(wardrobes) || wardrobes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one wardrobe is required'
            });
        }

        const wardrobeResults = [];
        const errors = [];

        wardrobes.forEach((wardrobe) => {
            const result = calculateSingleWardrobe(wardrobe);
            if (result.error) {
                errors.push(result.error);
            } else {
                wardrobeResults.push(result);
            }
        });

        if (errors.length > 0 && wardrobeResults.length === 0) {
            return res.status(400).json({
                success: false,
                errors
            });
        }

        // Calculate totals
        const totals = wardrobeResults.reduce((acc, result) => {
            acc.carcassArea += result.summary.carcassArea;
            acc.shutterArea += result.summary.shutterArea;
            acc.carcassSheets += result.summary.carcassSheets;
            acc.shutterSheets += result.summary.shutterSheets;
            acc.hinges += result.summary.hinges;
            acc.handles += result.summary.handles;
            acc.channels += result.summary.channels;
            acc.edgeBand += result.summary.edgeBand;
            acc.screws += result.summary.screws;
            acc.brackets += result.summary.brackets;
            acc.glue += result.summary.glue;
            acc.totalCost += result.summary.totalCost;
            acc.carcassCost += result.costs.carcass;
            acc.shutterCost += result.costs.shutter;
            acc.labourCost += result.costs.labour;
            acc.hardwareCost += result.costs.hardware;
            acc.hingesCost += result.costs.hinges;
            acc.handlesCost += result.costs.handles;
            acc.channelsCost += result.costs.channels;
            acc.edgeBandCost += result.costs.edgeBand;
            acc.screwsCost += result.costs.screws;
            acc.bracketsCost += result.costs.brackets;
            acc.glueCost += result.costs.glue;
            return acc;
        }, {
            carcassArea: 0,
            shutterArea: 0,
            carcassSheets: 0,
            shutterSheets: 0,
            hinges: 0,
            handles: 0,
            channels: 0,
            edgeBand: 0,
            screws: 0,
            brackets: 0,
            glue: 0,
            totalCost: 0,
            carcassCost: 0,
            shutterCost: 0,
            labourCost: 0,
            hardwareCost: 0,
            hingesCost: 0,
            handlesCost: 0,
            channelsCost: 0,
            edgeBandCost: 0,
            screwsCost: 0,
            bracketsCost: 0,
            glueCost: 0
        });

        return res.status(200).json({
            success: true,
            results: {
                wardrobes: wardrobeResults,
                totals: {
                    carcassArea: parseFloat(totals.carcassArea.toFixed(2)),
                    shutterArea: parseFloat(totals.shutterArea.toFixed(2)),
                    carcassSheets: totals.carcassSheets,
                    shutterSheets: totals.shutterSheets,
                    hinges: totals.hinges,
                    handles: totals.handles,
                    channels: totals.channels,
                    edgeBand: parseFloat(totals.edgeBand.toFixed(2)),
                    screws: totals.screws,
                    brackets: totals.brackets,
                    glue: totals.glue,
                    totalCost: parseFloat(totals.totalCost.toFixed(2)),
                    carcassCost: parseFloat(totals.carcassCost.toFixed(2)),
                    shutterCost: parseFloat(totals.shutterCost.toFixed(2)),
                    labourCost: parseFloat(totals.labourCost.toFixed(2)),
                    hardwareCost: parseFloat(totals.hardwareCost.toFixed(2)),
                    hingesCost: parseFloat(totals.hingesCost.toFixed(2)),
                    handlesCost: parseFloat(totals.handlesCost.toFixed(2)),
                    channelsCost: parseFloat(totals.channelsCost.toFixed(2)),
                    edgeBandCost: parseFloat(totals.edgeBandCost.toFixed(2)),
                    screwsCost: parseFloat(totals.screwsCost.toFixed(2)),
                    bracketsCost: parseFloat(totals.bracketsCost.toFixed(2)),
                    glueCost: parseFloat(totals.glueCost.toFixed(2))
                }
            },
            ...(errors.length > 0 && { warnings: errors })
        });
    } catch (err) {
        console.error('Error in calculateWardrobe:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Server error'
        });
    }
};

export { calculateWardrobe };

