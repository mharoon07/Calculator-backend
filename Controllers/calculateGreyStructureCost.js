import fetch from "node-fetch";

// ⚖️ Engineering constants (per sq ft material usage)
const PR_FT_SQR = {
    excavation: 4,
    cement: 0.45,
    sand: 1.8054,
    aggregate: 1.3452,
    water: 35.75,
    steel: 4.25,
    backFillMaterial: 4,
    block: 1.25,
    doorFrame: 0.016,
    electricalConduiting: 1.2,
    sewage: 0.1,
    miscellaneous: 0.5,
    labor: 1,
    projectManagement: 1,
};

const calculateGreyStructureCost = async (req, res) => {
    const { area, cement, sand, aggregate, water, steel, block } = req.body;
    console.log(area, cement, sand, aggregate, water, steel, block, " values from frontend")

    if (!area || isNaN(area) || Number(area) <= 0) {
        return res.status(400).json({ error: 'Invalid or missing built-up area' });
    }

    const builtup_area = Number(area);

    try {
        // 1. Fetch API material costs
        let materialCost = {};
        try {
            const apiResponse = await fetch(
                "https://construction-api-nine.vercel.app/calculators/659d4c1b8f1b2c0012345678/subtypes/659d4c1b8f1b2c0012345679/materials"
            );
            const apiData = await apiResponse.json();
            if (apiData.success && apiData.materialCost) {
                materialCost = apiData.materialCost;
            }
            console.log(apiData, "materialCost");
        } catch (err) {
            console.warn("⚠️ Material API fetch failed, using defaults");
        }

         const rates = {
            excavation: Number(req.body.excavation) || Number(materialCost.excavation) || 20,
            cement: Number(cement) || Number(materialCost.cement) || 5000,
            sand: Number(sand) || Number(materialCost.sand) || 3000,
            aggregate: Number(aggregate) || Number(materialCost.aggregate) || 4000,
            water: Number(water) || Number(materialCost.water) || 200,
            steel: Number(steel) || Number(materialCost.steel) || 8000,
            block: Number(block) || Number(materialCost.block) || 2500,
            backFillMaterial: Number(req.body.backFillMaterial) || Number(materialCost.backFillMaterial) || 1500,
            doorFrame: Number(req.body.doorFrame) || Number(materialCost.doorFrame) || 1200,
            electricalConduiting: Number(req.body.electricalConduiting) || Number(materialCost.electricalConduiting) || 1000,
            sewage: Number(req.body.sewage) || Number(materialCost.sewage) || 700,
            miscellaneous: Number(req.body.miscellaneous) || Number(materialCost.miscellaneous) || 500,
            labor: Number(req.body.labor) || Number(materialCost.laborProjectManagement) || 2000,
            projectManagement: Number(req.body.projectManagement) || Number(materialCost.laborProjectManagement) || 2000,
        };

        // 3. Validate rates
        for (const [key, value] of Object.entries(rates)) {
            if (isNaN(value) || value < 0) {
                return res.status(400).json({ error: `Invalid rate for ${key}` });
            }
        }

        // 4. Do calculations with PR_FT_SQR (constants)
        const excavationCost = rates.excavation * PR_FT_SQR.excavation * builtup_area;
        const cementCost = rates.cement * PR_FT_SQR.cement * builtup_area;
        const sandCost = rates.sand * PR_FT_SQR.sand * builtup_area;
        const aggregateCost = rates.aggregate * PR_FT_SQR.aggregate * builtup_area;
        const waterCost = rates.water * PR_FT_SQR.water * builtup_area;
        const steelCost = rates.steel * PR_FT_SQR.steel * builtup_area;
        const blockCost = rates.block * PR_FT_SQR.block * builtup_area;
        const backFillMaterialCost = rates.backFillMaterial * PR_FT_SQR.backFillMaterial * builtup_area;
        const doorFrameCost = rates.doorFrame * PR_FT_SQR.doorFrame * builtup_area;
        const electricalConduitingCost = rates.electricalConduiting * PR_FT_SQR.electricalConduiting * builtup_area;
        const sewageCost = rates.sewage * PR_FT_SQR.sewage * builtup_area;
        const miscellaneousCost = rates.miscellaneous * PR_FT_SQR.miscellaneous * builtup_area;
        const laborCost = rates.labor * PR_FT_SQR.labor * builtup_area;
        const projectManagementCost = rates.projectManagement * PR_FT_SQR.projectManagement * builtup_area;

        const total_cost =
            excavationCost +
            cementCost +
            sandCost +
            aggregateCost +
            waterCost +
            steelCost +
            blockCost +
            backFillMaterialCost +
            doorFrameCost +
            electricalConduitingCost +
            sewageCost +
            miscellaneousCost +
            laborCost +
            projectManagementCost;

        // 5. Monthly expense distribution
        const monthlyDistribution = [
            { period: 'Project Start', percentage: 6.5, amount: (6.5 / 100) * total_cost },
            { period: '1st Month', percentage: 16, amount: (16 / 100) * total_cost },
            { period: '2nd Month', percentage: 15, amount: (15 / 100) * total_cost },
            { period: '3rd Month', percentage: 13, amount: (13 / 100) * total_cost },
            { period: '4th Month', percentage: 16, amount: (16 / 100) * total_cost },
            { period: '5th Month', percentage: 10, amount: (10 / 100) * total_cost },
            { period: '6th Month', percentage: 9, amount: (9 / 100) * total_cost },
            { period: '7th Month', percentage: 8, amount: (8 / 100) * total_cost },
            { period: '8th Month', percentage: 6, amount: (6 / 100) * total_cost },
        ];
        const Quantity = [
            { key: "Cement:", value: `${Math.round(PR_FT_SQR.cement * builtup_area)} Bags` },
            { key: "Sand:", value: `${(PR_FT_SQR.sand * builtup_area).toFixed(0)} ft³` },
            { key: "Aggregate:", value: `${(PR_FT_SQR.aggregate * builtup_area).toFixed(0)} ft³` },
            { key: "Water:", value: `${((PR_FT_SQR.water * builtup_area) / 1000).toFixed(0)} KL` },
            { key: "Steel:", value: `${Math.round(PR_FT_SQR.steel * builtup_area)} kg` },
            { key: "Block:", value: `${Math.round(PR_FT_SQR.block * builtup_area)} Units` },
            { key: "Back Fill Material:", value: `${Math.round(PR_FT_SQR.backFillMaterial * builtup_area)} ft³` },
            { key: "Door Frame:", value: `${Math.round(PR_FT_SQR.doorFrame * builtup_area)} Units` },
        ];

        console.log("Calculation done " + JSON.stringify({ Quantity }))

        res.json({
            input: { builtup_area, rates },
            results: {
                builtup_area,
                excavationCost,
                cementCost,
                sandCost,
                aggregateCost,
                waterCost,
                steelCost,
                blockCost,
                backFillMaterialCost,
                doorFrameCost,
                electricalConduitingCost,
                sewageCost,
                miscellaneousCost,
                laborCost,
                projectManagementCost,
                total_cost,
                cementPrFtSqr: PR_FT_SQR.cement,
                sandPrFtSqr: PR_FT_SQR.sand,
                aggregatePrFtSqr: PR_FT_SQR.aggregate,
                waterPrFtSqr: PR_FT_SQR.water,
                steelPrFtSqr: PR_FT_SQR.steel,
                blockPrFtSqr: PR_FT_SQR.block,
                backFillMaterialPrFtSqr: PR_FT_SQR.backFillMaterial,
                doorFramePrFtSqr: PR_FT_SQR.doorFrame,
                electricalConduitingPrFtSqr: PR_FT_SQR.electricalConduiting,
                sewagePrFtSqr: PR_FT_SQR.sewage,
                miscellaneousPrFtSqr: PR_FT_SQR.miscellaneous,
                laborPrFtSqr: PR_FT_SQR.labor,
                projectManagementPrFtSqr: PR_FT_SQR.projectManagement,
                monthlyDistribution, Quantity
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};


export { calculateGreyStructureCost };
