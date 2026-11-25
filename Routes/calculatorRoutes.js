import express from 'express';
import { calculate } from '../Controllers/FinishingCostController.js';
import { convertLength } from '../Controllers/LengthnDistanceController.js';
import { convertVolume } from '../Controllers/VolumeController.js';
import { convertArea } from '../Controllers/AreaController.js';
import { convertTemperature } from "../Controllers/TemperatureController.js"
import { convertForce } from "../Controllers/ForceController.js"
import { convertAngle } from "../Controllers/angleController.js"
import { convertDensity } from "../Controllers/DensityController.js"
import { calculateRebar } from "../Controllers/RebarWeightController.js"
import { calculateConcreteMix } from "../Controllers/MixController.js"
import { convertPowerEnergy } from "../Controllers/PowernEnergyController.js"
import { calculateGreyStructureCost } from "../Controllers/calculateGreyStructureCost.js"
import { calculateWoodVolume } from "../Controllers/woodVolumeCalculator.js"
import { calculateDoorVolume } from "../Controllers/doorVolumeController.js"
import { calculateDoorBeading } from "../Controllers/doorBeadingController.js"
import { generateDoorBOQ } from "../Controllers/generateDoorBOQ.js"
import { calculateMoistureContent } from "../Controllers/moistureContentController.js"
import { calculateLeanConcrete } from "../Controllers/calculateLeanConcrete.js"
import { calculateFoundationConcrete } from "../Controllers/foundationConcreteController.js"
import { calculateRCCColumn } from "../Controllers/calculateRCCColumn.js"
import { calculateOverheadTank } from "../Controllers/calculateUndergroundTank.js"
import { calculateRetainingWall } from "../Controllers/calculateRetainingWall.js"
import { calculatePlinthLeanBeam } from "../Controllers/calculatePlinthLeanBeam.js"
import { calculatePlinthBeam } from "../Controllers/calculatePlinthBeam.js"
import { calculateRCCWaterTank } from "../Controllers/calculateRCCWaterTank.js"
import { calculateSlabConcrete } from "../Controllers/calculateSlabConcrete.js"
import { calculateLShapedStair } from "../Controllers/calculateLShapedStair.js"
import { calculateUShapedStair } from "../Controllers/calculateUShapedStair.js"
import { calculateCuringWater } from "../Controllers/calculateCuringWater.js"
import { calculateWallBlockMortar } from "../Controllers/calculateWallBlockMortar.js"
import { calculatePlaster } from "../Controllers/calculatePlaster.js"
import { calculatePump } from "../Controllers/calculatePump.js"
import { calculatePumpv2 } from "../Controllers/calculatePumpv2.js"
import { calculateLiftPump } from "../Controllers/calculateLiftPump.js"
import { calculateLiftPumpv2 } from "../Controllers/calculateLiftPumpv2.js"
import { calculateExcavation } from "../Controllers/calculateExcavation.js"
import { calculateBackfill } from "../Controllers/calculateBackfill.js"
import { calculateCompaction } from "../Controllers/calculateCompaction.js"
import { calculateStoneSoiling } from "../Controllers/calculateStoneSoiling.js"
import { calculateTermiteTreatment } from "../Controllers/calculatetermite.js"
import { calculateBitumen } from "../Controllers/calculateBitumen.js"
import { calculateTile } from "../Controllers/calculateTile.js"
import { calculatePaint } from "../Controllers/calculatePaint.js"
import { concreteCalculatorController } from "../Controllers/concreteCalculatorController.js"
import { calculateKitchenLayout } from "../Controllers/kitchenController.js"
import { calculateRampTile } from "../Controllers/calculateRampTile.js"
import { calculatePaver } from "../Controllers/calculatePaver.js"
import { calculateAsphalt } from "../Controllers/calculateAsphalt.js"
import { calculateBathroomTile } from "../Controllers/calculateBathroomTile.js"
import { calculateMSSpiralStair } from "../Controllers/calculateMSSpiralStair.js"
import { calculateWoodPolish } from "../Controllers/calculateWoodPolish.js"
import { calculateWaterproofing } from "../Controllers/calculateWaterproofing.js"
import { calculateTemporarySitePreparation } from "../Controllers/calculateTemporarySitePreparation.js"
import { calculatePlumbingSewage } from "../Controllers/calculatePlumbingSewage.js"
import { calculatePowerLoad } from "../Controllers/calculatePowerLoad.js"
import { calculateResidentialElectricalWiring } from "../Controllers/calculateResidentialElectricalWiring.js"
import { calculateWindowBOQ } from "../Controllers/calculateWindowBOQ.js"
import { calculateServiceDuctDoor } from "../Controllers/calculateServiceDuctDoor.js"
import { calculateKitchenCounterGranite } from "../Controllers/calculateKitchenCounterGranite.js"
import { calculateLShapedStairGranite } from "../Controllers/calculateLShapedStairGranite.js"
import { calculateUShapedStairGranite } from "../Controllers/calculateUShapedStairGranite.js"
import { calculateStraightStairLanding } from "../Controllers/calculateStraightStairLanding.js"
import { calculateLShapedWinderStair } from "../Controllers/calculateLShapedWinderStair.js"
import { calculateUShapedWinderStair } from "../Controllers/calculateUShapedWinderStair.js"
import { calculateCombinedStairGranite } from "../Controllers/calculateCombinedStairGranite.js"
import { calculateVanity } from "../Controllers/calculateVanity.js"
import { calculateWardrobe } from "../Controllers/calculateWardrobe.js"
import { calculateStairConcrete } from "../Controllers/calculateStairConcrete.js"
import { calculateStairBBS } from "../Controllers/calculateStairBBS.js"
import { calculateSteelWeight } from "../Controllers/calculateSteelWeight.js"
import { calculateSlabBBSWithDropPanel } from "../Controllers/calculateSlabBBSWithDropPanel.js"
import { calculateUndergroundTankBBS } from "../Controllers/calculateUndergroundTankBBS.js"
import { calculateRetainingWallBBS } from "../Controllers/calculateRetainingWallBBS.js"
import { calculateRaftFoundation } from "../Controllers/calculateRaftFoundation.js"
import { calculateColumnBBS } from "../Controllers/calculateColumnBBS.js"
import { calculateFootingRebar } from "../Controllers/calculateFootingRebar.js"
import { calculatePilingBBS } from "../Controllers/calculatePilingBBS.js"
import { calculateFalseCeiling } from "../Controllers/calculateFalseCeiling.js";
import { calculateBarBendingSchedule } from "../Controllers/calculateBarBendingSchedule.js";

const router = express.Router();

router.post('/finishing-cost-predictive/calculate', calculate);
router.post('/length-distance/convert', convertLength);
router.post('/volume/convert', convertVolume);
router.post('/area/convert', convertArea);
router.post('/temperature/convert', convertTemperature);
router.post('/force/convert', convertForce);
router.post('/angle/convert', convertAngle);
router.post('/density/convert', convertDensity);
router.post('/rebar/calculate', calculateRebar);
router.post('/concrete-mix/calculate', calculateConcreteMix);
router.post('/power-energy/convert', convertPowerEnergy);
router.post('/grey-structure/calculate', calculateGreyStructureCost);
router.post('/wood-volume/calculate', calculateWoodVolume);
router.post('/door-volume/calculate', calculateDoorVolume);
router.post('/door-beading/calculate', calculateDoorBeading);
router.post('/door-boq/calculate', generateDoorBOQ);
router.post('/moisture-content/calculate', calculateMoistureContent);
router.post('/lean-concrete/calculate', calculateLeanConcrete);
router.post('/foundation-concrete/calculate', calculateFoundationConcrete);
router.post('/rcc-column/calculate', calculateRCCColumn);
router.post('/Underground-tank/calculate', calculateOverheadTank);
router.post('/retaining-wall/calculate', calculateRetainingWall);
router.post('/plinth-lean-beam/calculate', calculatePlinthLeanBeam);
router.post('/plinth-beam/calculate', calculatePlinthBeam);
router.post('/rcc-water-tank/calculate', calculateRCCWaterTank);
router.post('/slab-concrete/calculate', calculateSlabConcrete);
router.post('/l-shaped-stair/calculate', calculateLShapedStair);
router.post('/u-shaped-stair/calculate', calculateUShapedStair);
router.post('/curing-water/calculate', calculateCuringWater);
router.post('/wall-block-mortar/calculate', calculateWallBlockMortar);
router.post('/plaster/calculate', calculatePlaster);
router.post('/pump/calculate', calculatePump);
router.post('/pumpv2/calculate', calculatePumpv2);
router.post('/liftpump/calculate', calculateLiftPump);
router.post('/liftpumpv2/calculate', calculateLiftPumpv2);
router.post('/excavation/calculate', calculateExcavation);
router.post('/backfill/calculate', calculateBackfill);
router.post('/compaction/calculate', calculateCompaction);
router.post('/stone-soiling/calculate', calculateStoneSoiling);
router.post('/termite-treatment/calculate', calculateTermiteTreatment);
router.post('/bitumen/calculate', calculateBitumen);
router.post('/tile/calculate', calculateTile);
router.post('/paint/calculate', calculatePaint);
router.post('/concrete/calculate', concreteCalculatorController.calculate);
router.post('/kitchen/calculate', calculateKitchenLayout);

router.post('/ramp-tile/calculate', calculateRampTile);
router.post('/paver/calculate', calculatePaver);
router.post('/asphalt/calculate', calculateAsphalt);

router.post('/bathroom-tile/calculate', calculateBathroomTile);
router.post('/ms-spiral-stair/calculate', calculateMSSpiralStair);
router.post('/wood-polish/calculate', calculateWoodPolish);
router.post('/waterproofing/calculate', calculateWaterproofing);

router.post('/temporary-site-preparation/calculate', calculateTemporarySitePreparation);
router.post('/plumbing-sewage/calculate', calculatePlumbingSewage);

router.post('/power-load/calculate', calculatePowerLoad);
router.post('/residential-electrical-wiring/calculate', calculateResidentialElectricalWiring);
router.post('/false-ceiling/calculate', calculateFalseCeiling);

router.post('/window-boq/calculate', calculateWindowBOQ);
router.post('/service-duct-door/calculate', calculateServiceDuctDoor);

router.post('/kitchen-counter-granite/calculate', calculateKitchenCounterGranite);
router.post('/l-shaped-stair-granite/calculate', calculateLShapedStairGranite);
router.post('/u-shaped-stair-granite/calculate', calculateUShapedStairGranite);
router.post('/straight-stair-landing/calculate', calculateStraightStairLanding);
router.post('/l-shaped-winder-stair/calculate', calculateLShapedWinderStair);
router.post('/u-shaped-winder-stair/calculate', calculateUShapedWinderStair);
router.post('/combined-stair-granite/calculate', calculateCombinedStairGranite);

router.post('/vanity/calculate', calculateVanity);
router.post('/wardrobe/calculate', calculateWardrobe);

router.post('/stair-concrete/calculate', calculateStairConcrete);
router.post('/stair-bbs/calculate', calculateStairBBS);
router.post('/steel-weight/calculate', calculateSteelWeight);
router.post('/slab-bbs-drop-panel/calculate', calculateSlabBBSWithDropPanel);
router.post('/underground-tank-bbs/calculate', calculateUndergroundTankBBS);
router.post('/retaining-wall-bbs/calculate', calculateRetainingWallBBS);
router.post('/raft-foundation/calculate', calculateRaftFoundation);
router.post('/column-bbs/calculate', calculateColumnBBS);
router.post('/footing-rebar/calculate', calculateFootingRebar);
router.post('/piling-bbs/calculate', calculatePilingBBS);
router.post('/bar-bending/calculate', calculateBarBendingSchedule);

export default router;
