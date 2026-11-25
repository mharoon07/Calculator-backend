
const getShape = (item) => {
  const { type, side, pieceNumber, totalPieces } = item;
  if (type === 'Top Extra Bar') {
    if (side === 'Left') return 'TopExtraBarLeft';
    if (side === 'Right') return 'TopExtraBarRight';
  }
  const isFirstPiece = pieceNumber === 1;
  const isLastPiece = pieceNumber === totalPieces;

  switch (type) {
    case 'Top Main Bar':
      if (isFirstPiece) return 'TopMainBarFirstPiece';
      if (isLastPiece) return 'TopMainBarLastPiece';
      return 'TopMainBarMiddlePiece';
    case 'Bottom Main Bar':
      if (isFirstPiece) return 'BottomMainBarFirstPiece';
      if (isLastPiece) return 'BottomMainBarLastPiece';
      return 'BottomMainBarMiddlePiece';
    case 'Top Extra Continue': return 'TopExtraContinue';
    case 'Bottom Extra Span Middle': return 'BottomExtraSpanMiddle';
    case 'Stirrups': return 'Stirrups';
    default: return 'StraightBar';
  }
};

export const calculateBarBendingSchedule = async (req, res) => {
  try {
    const data = req.body;
    const {
      unitSystem,
      numberOfSupports,
      supportWidths,
      centerToCenterDistances,
      beamRebarTypes,
      beamRebarDetails,
      beamDevelopmentLengthMultipliers,
      beamLapLengthMultipliers,
      beamRebarStackLengths,
      perimeterFactors,
      dimensioningStyle,
      spanCalculationFactors,
      spanFactorValues,
      beams,
      imperialRebarDiameters,
      concreteCovers
    } = data;

    // Redefine parseMeasurement to be unit aware based on closure
    const parseM = (value) => {
      let result = 0;
      if (value === undefined || value === null || value === '') return 0;
      if (typeof value === 'number') {
        result = value;
      } else if (typeof value === 'string' && value.includes("'")) {
        const match = value.match(/^(-?\d+)'(\d*\.?\d*)"?$/);
        if (match) {
          const feet = parseFloat(match[1]) || 0;
          const inches = parseFloat(match[2]) || 0;
          result = (feet * 12) + inches;
        } else {
          result = parseFloat(value) || 0;
        }
      } else {
        result = parseFloat(value) || 0;
      }
      if (unitSystem === 'imperial') {
        return Math.ceil(result * 25.4);
      }
      return result;
    };

    const customRound = (value) => Math.round(value);

    const getBestAvailableFactor = (requiredFactor) => {
      if (spanCalculationFactors && spanCalculationFactors.includes(requiredFactor)) {
        return requiredFactor;
      }
      return (spanCalculationFactors && spanCalculationFactors[0]) || requiredFactor || 4;
    };
    const calculateBeamDevelopmentLengths = (beamId) => {
      const developmentLengthResults = [];
      const applicableTypes = [
        'Main Bottom Rebar',
        'Top Rebar',
        'Extra Top Rebar Start Support',
        'Extra Top Rebar End Support'
      ];

      const beamSelectedTypes = beamRebarTypes[beamId] || [];
      const beamRebarDetailsData = beamRebarDetails[beamId] || {};
      const beamMultipliers = beamDevelopmentLengthMultipliers[beamId] || {};

      applicableTypes.forEach(rebarType => {
        if (beamSelectedTypes.includes(rebarType) && beamRebarDetailsData[rebarType]?.diameter) {
          let diameter = 0;
          let originalDiameter = 0;

          if (unitSystem === 'imperial') {
            // Find diameter from imperial rebar data
            const rebarData = imperialRebarDiameters.find(r => r.value === beamRebarDetailsData[rebarType].diameter);
            diameter = rebarData ? Math.ceil(rebarData.diameter * 25.4) : 0;
            originalDiameter = diameter; // Converted to mm internally
          } else {
            // Metric diameter in mm
            originalDiameter = parseM(beamRebarDetailsData[rebarType].diameter);
            diameter = originalDiameter; // parseM returns mm
          }

          if (diameter > 0) {
            const multiplier = beamMultipliers[rebarType] || 50;
            const developmentLengthInches = multiplier * diameter;
            const developmentLength = unitSystem === 'metric' ? developmentLengthInches * 25.4 : developmentLengthInches;

            developmentLengthResults.push({
              rebarType: rebarType,
              diameter: originalDiameter,
              multiplier: multiplier,
              developmentLength: developmentLength,
              unit: unitSystem === 'metric' ? 'mm' : 'in'
            });
          }
        }
      });

      return developmentLengthResults;
    };

    const calculateBeamLapLengths = (beamId) => {
      const lapLengthResults = [];
      const applicableTypes = [
        'Main Bottom Rebar',
        'Top Rebar',
        'Extra Top Rebar Start Support',
        'Extra Top Rebar End Support'
      ];

      const beamSelectedTypes = beamRebarTypes[beamId] || [];
      const beamRebarDetailsData = beamRebarDetails[beamId] || {};
      const beamMultipliers = beamLapLengthMultipliers[beamId] || {};

      applicableTypes.forEach(rebarType => {
        if (beamSelectedTypes.includes(rebarType) && beamRebarDetailsData[rebarType]?.diameter) {
          let diameter = 0;
          let originalDiameter = 0;

          if (unitSystem === 'imperial') {
            // Find diameter from imperial rebar data
            const rebarData = imperialRebarDiameters.find(r => r.value === beamRebarDetailsData[rebarType].diameter);
            diameter = rebarData ? Math.ceil(rebarData.diameter * 25.4) : 0;
            originalDiameter = diameter; // Converted to mm internally
          } else {
            // Metric diameter in mm
            originalDiameter = parseM(beamRebarDetailsData[rebarType].diameter);
            diameter = originalDiameter; // parseM returns mm
          }

          if (diameter > 0) {
            const multiplier = beamMultipliers[rebarType] || 40;
            const lapLengthInches = multiplier * diameter;
            const lapLength = unitSystem === 'metric' ? lapLengthInches * 25.4 : lapLengthInches;

            lapLengthResults.push({
              rebarType: rebarType,
              diameter: originalDiameter,
              multiplier: multiplier,
              lapLength: lapLength,
              unit: unitSystem === 'metric' ? 'mm' : 'in'
            });
          }
        }
      });

      return lapLengthResults;
    };

    const calculateSpanInner = () => {
      const spanInnerResults = [];

      for (let i = 0; i < centerToCenterDistances.length; i++) {
        const spanLength = parseM(centerToCenterDistances[i]?.distance) || 0;
        const support1Width = parseM(supportWidths[i]?.width) || 0;
        const support2Width = parseM(supportWidths[i + 1]?.width) || 0;

        // Formula: span inner = span length - (support1 width / 2) - (support2 width / 2)
        const spanInner = spanLength - (support1Width / 2) - (support2Width / 2);

        // Calculate values for selected factors (use stored values or calculate defaults)
        const factorCalculations = {};
        spanCalculationFactors.forEach(factor => {
          const storedValue = spanFactorValues[`span${i + 1}`]?.[factor];
          factorCalculations[`l${factor}`] = storedValue !== undefined ? parseM(storedValue) || 0 : spanInner / factor;
        });

        spanInnerResults.push({
          spanNumber: i + 1,
          spanLength: spanLength,
          support1Width: support1Width,
          support2Width: support2Width,
          spanInner: spanInner,
          ...factorCalculations
        });
      }

      return spanInnerResults;
    };

    const calculateTopExtraContinueLength = () => {
      const topExtraResults = [];

      // Only calculate for middle supports (exclude first and last support)
      for (let i = 1; i < numberOfSupports - 1; i++) {
        const supportWidth = parseM(supportWidths[i]?.width) || 0;
        const leftSpanLength = parseM(centerToCenterDistances[i - 1]?.distance) || 0;
        const rightSpanLength = parseM(centerToCenterDistances[i]?.distance) || 0;

        // Calculate inner spans (face-to-face distances)
        const leftSupportWidth = parseM(supportWidths[i - 1]?.width) || 0;
        const rightSupportWidth = parseM(supportWidths[i + 1]?.width) || 0;
        const leftSpanInner = leftSpanLength - (leftSupportWidth / 2) - (supportWidth / 2);
        const rightSpanInner = rightSpanLength - (supportWidth / 2) - (rightSupportWidth / 2);

        let topExtraContinueLength, leftSpanFactor, rightSpanFactor;

        if (dimensioningStyle === 'factor') {
          // Formula: (Left Inner Span/factor) + Support Width + (Right Inner Span/factor)
          const factor = perimeterFactors.extraTopContinue; // Use dedicated factor for continue length
          leftSpanFactor = leftSpanInner / factor;
          rightSpanFactor = rightSpanInner / factor;
          topExtraContinueLength = leftSpanFactor + supportWidth + rightSpanFactor;
        } else {
          // Direct distance method: use the direct distance value
          const directDistance = parseM(perimeterFactors.extraTopContinueDistance) || 0;
          leftSpanFactor = directDistance;
          rightSpanFactor = directDistance;
          topExtraContinueLength = directDistance;
        }

        topExtraResults.push({
          supportNumber: i + 1,
          supportWidth: supportWidth,
          leftSpan: leftSpanInner, // Now contains inner span width
          rightSpan: rightSpanInner, // Now contains inner span width
          leftSpanL4: leftSpanFactor,
          rightSpanL4: rightSpanFactor,
          topExtraContinueLength: topExtraContinueLength
        });
      }

      return topExtraResults;
    };

    const calculateBottomExtraSpanMiddle = () => {
      const bottomExtraResults = [];

      for (let i = 0; i < centerToCenterDistances.length; i++) {
        const spanLength = parseM(centerToCenterDistances[i]?.distance) || 0;
        const support1Width = parseM(supportWidths[i]?.width) || 0;
        const support2Width = parseM(supportWidths[i + 1]?.width) || 0;

        // Calculate inner span (face-to-face distance)
        const spanInner = spanLength - (support1Width / 2) - (support2Width / 2);

        let bottomExtraSpanMiddle, spanWidthLFactor, perimeterFactor;

        if (dimensioningStyle === 'factor') {
          // Formula: inner span - 2 × (inner span/factor) = inner span × (1 - 2/factor)
          perimeterFactor = perimeterFactors.extraBottomMiddle; // Use dedicated factor for middle calculation
          spanWidthLFactor = spanInner / perimeterFactor;
          bottomExtraSpanMiddle = spanInner - (2 * spanWidthLFactor);
        } else {
          // Direct distance method: use the direct distance value
          const directDistance = parseM(perimeterFactors.extraBottomMiddleDistance) || 0;
          spanWidthLFactor = directDistance;
          bottomExtraSpanMiddle = directDistance;
          perimeterFactor = null; // No factor used in direct distance method
        }

        bottomExtraResults.push({
          spanNumber: i + 1,
          spanWidth: spanInner, // Now contains inner span width
          spanWidthLFactor: spanWidthLFactor,
          perimeterFactor: perimeterFactor,
          bottomExtraSpanMiddle: bottomExtraSpanMiddle
        });
      }

      return bottomExtraResults;
    };

    const calculateTopExtraDiscontinuedLength = () => {
      const discontinuedResults = [];

      beams.forEach((beam, beamIndex) => {
        const beamId = beam.id;
        const beamRebarDetailsData = beamRebarDetails[beamId] || {};
        const extraTopRebarStartSupport = beamRebarDetailsData['Extra Top Rebar Start Support'];
        const extraTopRebarEndSupport = beamRebarDetailsData['Extra Top Rebar End Support'];


        // Calculate for first span (Span 1) using Extra Top Rebar Start Support
        if (extraTopRebarStartSupport?.diameter && centerToCenterDistances.length > 0) {
          let diameter = 0;

          if (unitSystem === 'imperial') {
            // Find diameter from imperial rebar data
            const rebarData = imperialRebarDiameters.find(r => r.value === extraTopRebarStartSupport.diameter);
            diameter = rebarData ? Math.ceil(rebarData.diameter * 25.4) : 0;
          } else {
            // Metric diameter in mm, convert to inches for calculation
            diameter = parseM(extraTopRebarStartSupport.diameter);
          }

          if (diameter > 0) {
            const firstSpanLength = parseM(centerToCenterDistances[0]?.distance) || 0;
            const support1Width = parseM(supportWidths[0]?.width) || 0;
            const support2Width = parseM(supportWidths[1]?.width) || 0;

            // Calculate inner span (face-to-face distance)
            const firstSpanInner = firstSpanLength - (support1Width / 2) - (support2Width / 2);

            let lFactor, topExtraDiscontinuedLength;

            if (dimensioningStyle === 'factor') {
              // Formula: 50 × D + L/factor (where D is diameter in mm, L is inner span width in mm, factor is user-defined)
              const perimeterFactor = perimeterFactors.extraTopStart;
              const bestFactor = getBestAvailableFactor(perimeterFactor);
              lFactor = spanFactorValues[`span1`]?.[bestFactor] || (firstSpanInner / bestFactor);
              topExtraDiscontinuedLength = (50 * diameter) + lFactor; // Simple calculation in mm
            } else {
              // Direct distance method: 50 × D + direct distance
              const directDistance = parseM(perimeterFactors.extraTopStartDistance) || 0;
              lFactor = directDistance;
              topExtraDiscontinuedLength = (50 * diameter) + directDistance;
            }

            discontinuedResults.push({
              beamNumber: beamIndex + 1,
              spanNumber: 1,
              rebarType: 'Extra Top Rebar Start Support',
              diameter: diameter,
              spanLength: firstSpanInner, // Now contains inner span width
              lFactor: lFactor,
              perimeterFactor: dimensioningStyle === 'factor' ? perimeterFactors.extraTopStart : null,
              topExtraDiscontinuedLength: topExtraDiscontinuedLength
            });
          }
        }

        // Calculate for last span using Extra Top Rebar End Support
        if (extraTopRebarEndSupport?.diameter && centerToCenterDistances.length > 0) {
          let diameter = 0;

          if (unitSystem === 'imperial') {
            // Find diameter from imperial rebar data
            const rebarData = imperialRebarDiameters.find(r => r.value === extraTopRebarEndSupport.diameter);
            diameter = rebarData ? Math.ceil(rebarData.diameter * 25.4) : 0;
          } else {
            // Metric diameter in mm, use directly
            diameter = parseM(extraTopRebarEndSupport.diameter);
          }

          if (diameter > 0) {
            const lastSpanIndex = centerToCenterDistances.length - 1;
            const lastSpanLength = parseM(centerToCenterDistances[lastSpanIndex]?.distance) || 0;
            const support1Width = parseM(supportWidths[lastSpanIndex]?.width) || 0;
            const support2Width = parseM(supportWidths[lastSpanIndex + 1]?.width) || 0;

            // Calculate inner span (face-to-face distance)
            const lastSpanInner = lastSpanLength - (support1Width / 2) - (support2Width / 2);

            let lFactor, topExtraDiscontinuedLength;

            if (dimensioningStyle === 'factor') {
              // Formula: 50 × D + L/factor (where D is diameter in mm, L is inner span width in mm, factor is user-defined)
              const perimeterFactor = perimeterFactors.extraTopEnd;
              const bestFactor = getBestAvailableFactor(perimeterFactor);
              lFactor = spanFactorValues[`span${centerToCenterDistances.length}`]?.[bestFactor] || (lastSpanInner / bestFactor);
              topExtraDiscontinuedLength = (50 * diameter) + lFactor; // Simple calculation in mm
            } else {
              // Direct distance method: 50 × D + direct distance
              const directDistance = parseM(perimeterFactors.extraTopEndDistance) || 0;
              lFactor = directDistance;
              topExtraDiscontinuedLength = (50 * diameter) + directDistance;
            }

            discontinuedResults.push({
              beamNumber: beamIndex + 1,
              spanNumber: centerToCenterDistances.length,
              rebarType: 'Extra Top Rebar End Support',
              diameter: diameter,
              spanLength: lastSpanInner, // Now contains inner span width
              lFactor: lFactor,
              perimeterFactor: dimensioningStyle === 'factor' ? perimeterFactors.extraTopEnd : null,
              topExtraDiscontinuedLength: topExtraDiscontinuedLength
            });
          }
        }
      });

      return discontinuedResults;
    };

    const calculateTotalRebarLengthWithoutLap = () => {
      const totalLengthResults = [];

      beams.forEach((beam, beamIndex) => {
        const beamId = beam.id;
        const beamRebarDetailsData = beamRebarDetails[beamId] || {};
        const mainBottomRebar = beamRebarDetailsData['Main Bottom Rebar'];

        if (mainBottomRebar?.diameter) {
          let diameter = 0;

          if (unitSystem === 'imperial') {
            // Find diameter from imperial rebar data
            const rebarData = imperialRebarDiameters.find(r => r.value === mainBottomRebar.diameter);
            diameter = rebarData ? Math.ceil(rebarData.diameter * 25.4) : 0;
          } else {
            // Metric diameter in mm, use directly
            diameter = parseM(mainBottomRebar.diameter);
          }

          if (diameter > 0) {
            // Calculate all inner span widths (face-to-face distances)
            const spans = centerToCenterDistances.map(s => parseM(s.distance) || 0);
            const supports = supportWidths.map(s => parseM(s.width) || 0);

            const totalInnerSpanWidth = spans.reduce((sum, spanLength, index) => {
              const support1Width = supports[index] || 0;
              const support2Width = supports[index + 1] || 0;
              // Formula: span inner = span length - (support1 width / 2) - (support2 width / 2)
              const spanInner = spanLength - (support1Width / 2) - (support2Width / 2);
              return sum + spanInner;
            }, 0);

            // Calculate all support widths (exclude first and last support)
            const totalSupportWidth = supportWidths.slice(1, -1).reduce((sum, support) => {
              return sum + (parseM(support.width) || 0);
            }, 0);

            // Get development length multiplier for Main Bottom Rebar
            const beamDevelopmentMultipliers = beamDevelopmentLengthMultipliers[beamId] || {};
            const developmentMultiplier = beamDevelopmentMultipliers['Main Bottom Rebar'] || 50;

            // Calculate development length: multiplier * diameter
            const developmentLength = developmentMultiplier * diameter;

            // Get side concrete cover
            const sideCover = parseM(concreteCovers.sideCover) || 0;

            // Formula: all inner span width + all support width (exclude start and end) + development length bottom * 2 - 2 * side cover
            const totalRebarLength = totalInnerSpanWidth + totalSupportWidth + (developmentLength * 2) - (2 * sideCover);

            totalLengthResults.push({
              beamNumber: beamIndex + 1,
              diameter: diameter,
              totalSpanWidth: totalInnerSpanWidth, // Now contains inner span width
              totalSupportWidth: totalSupportWidth,
              developmentLength: developmentLength,
              sideCover: sideCover,
              totalRebarLength: totalRebarLength
            });
          }
        }
      });

      return totalLengthResults;
    };

    const calculateTotalTopRebarLengthWithoutLap = () => {
      const totalLengthResults = [];

      beams.forEach((beam, beamIndex) => {
        const beamId = beam.id;
        const beamRebarDetailsData = beamRebarDetails[beamId] || {};
        const topRebar = beamRebarDetailsData['Top Rebar'];

        if (topRebar?.diameter) {
          let diameter = 0;

          if (unitSystem === 'imperial') {
            // Find diameter from imperial rebar data
            const rebarData = imperialRebarDiameters.find(r => r.value === topRebar.diameter);
            diameter = rebarData ? Math.ceil(rebarData.diameter * 25.4) : 0;
          } else {
            // Metric diameter in mm, use directly
            diameter = parseM(topRebar.diameter);
          }

          if (diameter > 0) {
            // Calculate all inner span widths (face-to-face distances)
            const spans = centerToCenterDistances.map(s => parseM(s.distance) || 0);
            const supports = supportWidths.map(s => parseM(s.width) || 0);

            const totalInnerSpanWidth = spans.reduce((sum, spanLength, index) => {
              const support1Width = supports[index] || 0;
              const support2Width = supports[index + 1] || 0;
              // Formula: span inner = span length - (support1 width / 2) - (support2 width / 2)
              const spanInner = spanLength - (support1Width / 2) - (support2Width / 2);
              return sum + spanInner;
            }, 0);

            // Calculate all support widths (exclude first and last support)
            const totalSupportWidth = supportWidths.slice(1, -1).reduce((sum, support) => {
              return sum + (parseM(support.width) || 0);
            }, 0);

            // Get development length multiplier for Top Rebar
            const beamDevelopmentMultipliers = beamDevelopmentLengthMultipliers[beamId] || {};
            const developmentMultiplier = beamDevelopmentMultipliers['Top Rebar'] || 50;

            // Calculate development length: multiplier * diameter
            const developmentLength = developmentMultiplier * diameter;

            // Get side concrete cover
            const sideCover = parseM(concreteCovers.sideCover) || 0;

            // Formula: all inner span width + all support width (exclude start and end) + development length top * 2 - 2 * side cover
            const totalRebarLength = totalInnerSpanWidth + totalSupportWidth + (developmentLength * 2) - (2 * sideCover);

            totalLengthResults.push({
              beamNumber: beamIndex + 1,
              diameter: diameter,
              totalSpanWidth: totalInnerSpanWidth, // Now contains inner span width
              totalSupportWidth: totalSupportWidth,
              developmentLength: developmentLength,
              sideCover: sideCover,
              totalRebarLength: totalRebarLength
            });
          }
        }
      });

      return totalLengthResults;
    };

    const calculateBottomRebarCutLengths = () => {
      const cutLengthResults = [];

      beams.forEach((beam, beamIndex) => {
        const beamId = beam.id;
        const beamRebarDetailsData = beamRebarDetails[beamId] || {};
        const mainBottomRebar = beamRebarDetailsData['Main Bottom Rebar'];
        const rebarStackLength = parseM(beamRebarStackLengths[beamId]) || 0;

        if (!mainBottomRebar?.diameter || rebarStackLength <= 0 || centerToCenterDistances.length === 0)
          return;

        // === Determine diameter ===
        let diameter = 0;
        if (unitSystem === 'imperial') {
          const rebarData = imperialRebarDiameters.find(r => r.value === mainBottomRebar.diameter);
          diameter = rebarData ? Math.ceil(rebarData.diameter * 25.4) : 0;
        } else {
          diameter = parseM(mainBottomRebar.diameter) || 0;
        }
        if (diameter <= 0) return;

        // === Constants ===
        const devMult = beamDevelopmentLengthMultipliers[beamId]?.['Main Bottom Rebar'] || 50;
        const lapMult = beamLapLengthMultipliers[beamId]?.['Main Bottom Rebar'] || 40;
        const developmentLengthBottom = devMult * diameter;
        const lapLength = lapMult * diameter;
        const sideCover = parseM(concreteCovers.sideCover) || 0;

        // === Calculate Total Rebar Length WITHOUT LAP ===
        const totalSpanWidth = centerToCenterDistances.reduce((sum, span) => sum + (parseM(span.distance) || 0), 0);
        const totalSupportWidth = supportWidths.slice(1, -1).reduce((sum, support) => sum + (parseM(support.width) || 0), 0);
        const totalRebarLengthWithoutLap = totalSpanWidth + totalSupportWidth + (developmentLengthBottom * 2) - (2 * sideCover);

        console.log(`\n====================\nBeam ${beamIndex + 1} - Bottom Rebar Calculation`);
        console.log(`Diameter: ${diameter}mm | Stack Length: ${rebarStackLength}mm`);
        console.log(`Total Rebar Length (WITHOUT Lap): ${totalRebarLengthWithoutLap.toFixed(1)}mm`);
        console.log(`DL Bottom: ${developmentLengthBottom} | Lap: ${lapLength} | SideCover: ${sideCover}`);
        console.log("====================");

        // === Prepare segments (inner spans and supports alternating) ===
        const spans = centerToCenterDistances.map(s => parseM(s.distance) || 0);
        const supports = supportWidths.map(s => parseM(s.width) || 0);

        // Calculate inner spans for first cut calculation
        const innerSpans = [];
        for (let i = 0; i < spans.length; i++) {
          const spanLength = spans[i];
          const support1Width = supports[i] || 0;
          const support2Width = supports[i + 1] || 0;
          // Formula: span inner = span length - (support1 width / 2) - (support2 width / 2)
          const spanInner = spanLength - (support1Width / 2) - (support2Width / 2);
          innerSpans.push(spanInner);
        }

        const orderedSegments = [];
        for (let i = 0; i < innerSpans.length; i++) {
          orderedSegments.push(innerSpans[i]);
          if (i < innerSpans.length - 1) {
            orderedSegments.push(supports[i + 1] || 0);
          }
        }

        console.log(`Ordered Segments (Inner Spans + Supports): ${orderedSegments.join(' + ')} = ${orderedSegments.reduce((a, b) => a + b, 0)}`);

        const cutLengths = [];
        let segmentIdx = 0;
        let pieceNumber = 1;
        let isFirstPiece = true;

        // === FIRST PIECE: DL - SideCover + spans/supports (NO LAP) ===
        let currentLength = developmentLengthBottom - sideCover;
        let collectedValues = [`DL-SC(${developmentLengthBottom - sideCover})`];

        console.log(`\n🔹 Starting Piece ${pieceNumber}: ${currentLength.toFixed(1)}mm`);

        // Add spans and supports until we exceed stack length
        while (segmentIdx < orderedSegments.length) {
          const nextSeg = orderedSegments[segmentIdx];
          const isLastSegment = segmentIdx === orderedSegments.length - 1;

          // IMPORTANT: We must ALWAYS reserve space for the final DL - sideCover at the end
          const finalReserve = developmentLengthBottom - sideCover;
          const wouldExceedWithFinal = (currentLength + nextSeg + finalReserve) > rebarStackLength;

          if (!wouldExceedWithFinal) {
            // We can add this segment AND still have room for final DL-SC
            currentLength += nextSeg;
            collectedValues.push(nextSeg);
            segmentIdx++;
            console.log(`  ✅ Added segment ${segmentIdx}: ${nextSeg}mm → Total: ${currentLength.toFixed(1)}mm (Reserve: ${finalReserve}mm)`);

            // If this was the last segment, we're done with all pieces
            if (isLastSegment) {
              console.log(`  🎯 Last segment added. Finalizing...`);
              break;
            }
          } else {
            // Can't fit this segment (would exceed when we add final DL-SC)
            console.log(`  ❌ Cannot fit segment ${nextSeg}mm + final DL-SC(${finalReserve}mm). Would be ${(currentLength + nextSeg + finalReserve).toFixed(1)}mm > ${rebarStackLength}mm. Cutting piece.`);

            // Check if this is a span segment (even index) and if we can cut at span/4
            let cutLength = currentLength;
            let cutDescription = isFirstPiece
              ? `First Piece: DL-SC(${developmentLengthBottom - sideCover}) + inner spans/supports`
              : `Middle Piece ${pieceNumber}: Lap(${lapLength}) + inner spans/supports`;

            // If this is a span segment (even index in orderedSegments) and remaining length < span width
            if (segmentIdx % 2 === 0) { // Even index means it's a span (inner span)
              const remainingLength = rebarStackLength - currentLength - finalReserve;
              if (remainingLength < nextSeg) {
                // Cut at span/4 for bottom rebar
                const cutPosition = nextSeg / 4;
                cutLength = currentLength + cutPosition;
                cutDescription = isFirstPiece
                  ? `First Piece: DL-SC(${developmentLengthBottom - sideCover}) + inner spans/supports + Inner Span${Math.floor(segmentIdx / 2) + 1}/4(${cutPosition})`
                  : `Middle Piece ${pieceNumber}: Lap(${lapLength}) + inner spans/supports + Inner Span${Math.floor(segmentIdx / 2) + 1}/4(${cutPosition})`;
                collectedValues.push(`Inner Span${Math.floor(segmentIdx / 2) + 1}/4(${cutPosition})`);
              }
            }

            cutLengths.push({
              rebarPiece: pieceNumber,
              cutLength: cutLength,
              description: cutDescription,
              cutAtSegmentIndex: segmentIdx,
              breakdown: [...collectedValues],
              warning: cutLength > rebarStackLength ? '⚠️ Exceeds stack length' : null,
            });

            console.log(`  🔸 Piece ${pieceNumber} Cut: ${cutLength.toFixed(1)}mm`);

            // Prepare next piece (middle piece starts with remaining span + Lap)
            pieceNumber++;
            isFirstPiece = false;

            // If we cut at inner span/4, the next piece should start with remaining inner span length
            let nextPieceStartLength = lapLength;
            let nextPieceValues = [`Lap(${lapLength})`];

            // Check if we cut at an inner span segment and need to add remaining inner span length
            if (segmentIdx % 2 === 0 && cutLength > currentLength) {
              // We cut at an inner span segment, add the remaining inner span length
              const cutPosition = cutLength - currentLength;
              const remainingInnerSpanLength = orderedSegments[segmentIdx] - cutPosition;
              nextPieceStartLength += remainingInnerSpanLength;
              nextPieceValues.push(`Remaining Inner Span${Math.floor(segmentIdx / 2) + 1}(${remainingInnerSpanLength})`);
              console.log(`  📍 Adding remaining inner span length: ${remainingInnerSpanLength}mm to next piece`);

              // Continue from the next segment after the cut span
              segmentIdx++;
            }

            currentLength = nextPieceStartLength;
            collectedValues = nextPieceValues;
            console.log(`\n🔹 Starting Piece ${pieceNumber}: ${currentLength.toFixed(1)}mm`);

            // Continue adding remaining segments
            while (segmentIdx < orderedSegments.length) {
              const nextSeg = orderedSegments[segmentIdx];
              const isLastSegment = segmentIdx === orderedSegments.length - 1;

              // Check if we can fit this segment
              const finalReserve = developmentLengthBottom - sideCover;
              const wouldExceedWithFinal = (currentLength + nextSeg + finalReserve) > rebarStackLength;

              if (!wouldExceedWithFinal) {
                currentLength += nextSeg;
                collectedValues.push(nextSeg);
                segmentIdx++;
                console.log(`  ✅ Added segment ${segmentIdx}: ${nextSeg}mm → Total: ${currentLength.toFixed(1)}mm`);

                if (isLastSegment) {
                  console.log(`  🎯 Last segment added. Finalizing...`);
                  break;
                }
              } else {
                // Can't fit this segment, need another cut
                console.log(`  ❌ Cannot fit segment ${nextSeg}mm. Need another cut.`);
                break;
              }
            }
          }
        }

        // === FINAL PIECE: Add remaining segments + DL - sideCover ===
        // Keep lap length in the final piece as per requirement
        if (!isFirstPiece) {
          console.log(`  📍 Keeping lap length in final piece: ${lapLength}mm`);
        }

        const finalAddition = developmentLengthBottom - sideCover;
        currentLength += finalAddition;
        collectedValues.push(`DL-SC(${finalAddition})`);

        cutLengths.push({
          rebarPiece: pieceNumber,
          cutLength: currentLength,
          description: isFirstPiece
            ? `Single Piece: DL-SC(${developmentLengthBottom - sideCover}) + all spans/supports + DL-SC(${developmentLengthBottom - sideCover})`
            : `End Piece ${pieceNumber}: Lap(${lapLength}) + (remaining segments) + DL-SC(${developmentLengthBottom - sideCover})`,
          cutAtSegmentIndex: 'End',
          breakdown: [...collectedValues],
          warning: currentLength > rebarStackLength ? '⚠️ Exceeds stack length' : null,
        });

        console.log(`  🔸 Final Piece ${pieceNumber}: ${currentLength.toFixed(1)}mm`);

        // === Console Summary ===
        console.log(`\n📊 SUMMARY:`);
        cutLengths.forEach(c => {
          console.log(`  Piece ${c.rebarPiece}: ${c.cutLength.toFixed(1)}mm | ${c.breakdown.join(' + ')} ${c.warning ? '| ' + c.warning : ''}`);
        });
        console.log(`  Total Pieces: ${cutLengths.length}`);
        console.log(`  Total Length with Laps: ${cutLengths.reduce((sum, c) => sum + c.cutLength, 0).toFixed(1)}mm`);
        console.log(`====================\n`);

        cutLengthResults.push({
          beamNumber: beamIndex + 1,
          diameter,
          rebarStackLength,
          totalRebarLengthWithoutLap,
          developmentLengthBottom,
          lapLength,
          sideCover,
          cutLengths,
          totalPieces: cutLengths.length,
        });
      });

      return cutLengthResults;
    };

    const calculateTopRebarCutLengths = () => {
      const cutLengthResults = [];

      beams.forEach((beam, beamIndex) => {
        const beamId = beam.id;
        const rebarData = beamRebarDetails[beamId] || {};
        const topRebar = rebarData["Top Rebar"];
        const stackLength = parseM(beamRebarStackLengths[beamId]) || 0;

        if (!topRebar || stackLength <= 0 || centerToCenterDistances.length === 0) return;

        // Get diameter for development length from "Top Rebar"
        let devDiameter = 0;
        if (unitSystem === "imperial") {
          const rebarInfo = imperialRebarDiameters.find(
            (r) => r.value === topRebar.diameter
          );
          devDiameter = rebarInfo ? Math.ceil(rebarInfo.diameter * 25.4) : 0;
        } else {
          devDiameter = parseM(topRebar.diameter);
        }

        // Get diameter for lap length from "Top Extra Rebar" (Start Support or End Support)
        let lapDiameter = 0;
        const extraTopRebarStart = rebarData["Extra Top Rebar Start Support"];
        const extraTopRebarEnd = rebarData["Extra Top Rebar End Support"];

        // Use Start Support diameter if available, otherwise use End Support
        const extraTopRebar = extraTopRebarStart || extraTopRebarEnd;

        if (extraTopRebar) {
          if (unitSystem === "imperial") {
            const rebarInfo = imperialRebarDiameters.find(
              (r) => r.value === extraTopRebar.diameter
            );
            lapDiameter = rebarInfo ? Math.ceil(rebarInfo.diameter * 25.4) : 0;
          } else {
            lapDiameter = parseM(extraTopRebar.diameter);
          }
        }

        if (devDiameter <= 0) return;

        const devMult = beamDevelopmentLengthMultipliers[beamId]?.["Top Rebar"] || 50;
        const lapMult = beamLapLengthMultipliers[beamId]?.["Top Rebar"] || 40;

        const DL_Top = devMult * devDiameter;
        const Lap = lapMult * lapDiameter;
        const sideCover = parseM(concreteCovers.sideCover) || 0;

        console.log("====================================================");
        console.log(`🟩 BEAM ${beamIndex + 1} — TOP REBAR CALCULATION`);
        console.log(`Beam ID: ${beamId}`);
        console.log(`Dev Diameter (Top Rebar): ${devDiameter}mm | Lap Diameter (Extra Top Rebar): ${lapDiameter}mm | Stack Length: ${stackLength}mm`);
        console.log(`Development Length (DL): ${DL_Top}mm`);
        console.log(`Lap Length (Lap): ${Lap}mm`);
        console.log(`Side Cover: ${sideCover}mm`);
        console.log(
          `Spans: [${centerToCenterDistances.map((s) => s.distance).join(", ")}]`
        );
        console.log(
          `Supports: [${supportWidths.map((s) => s.width).join(", ")}]`
        );
        console.log("----------------------------------------------------");

        let cutLengths = [];
        let rebarPiece = 1;
        let currentLength = DL_Top - sideCover;
        let cutSpanIndex = -1;

        console.log(`🧮 Piece #${rebarPiece} | Start = DL(${DL_Top}) - Cover(${sideCover}) = ${currentLength}`);

        // Calculate inner spans for first cut calculation
        const innerSpans = [];
        for (let i = 0; i < centerToCenterDistances.length; i++) {
          const spanLength = parseM(centerToCenterDistances[i]?.distance) || 0;
          const support1Width = parseM(supportWidths[i]?.width) || 0;
          const support2Width = parseM(supportWidths[i + 1]?.width) || 0;
          // Formula: span inner = span length - (support1 width / 2) - (support2 width / 2)
          const spanInner = spanLength - (support1Width / 2) - (support2Width / 2);
          innerSpans.push(spanInner);
        }

        for (let i = 0; i < centerToCenterDistances.length; i++) {
          const span = innerSpans[i]; // Use inner span instead of regular span
          const support = parseM(supportWidths[i + 1]?.width) || 0;

          let addLength = span;
          if (i < centerToCenterDistances.length - 1) addLength += support;

          // Check if first piece cut happens
          if (currentLength + addLength > stackLength) {
            // Calculate remaining length after adding current span
            const remainingLength = stackLength - currentLength;

            // Check if remaining length is less than the current span width
            // If so, cut at span/2 (same as normal case)
            let cutPosition, cutDescription;
            if (remainingLength < span) {
              // Cut at span/2 when remaining length is less than span width
              cutPosition = span / 2;
              cutDescription = `Inner Span${i + 1}/2(${cutPosition})`;
            } else {
              // Cut at span/2 (original logic)
              cutPosition = span / 2;
              cutDescription = `Inner Span${i + 1}/2(${cutPosition})`;
            }

            const cutLength = currentLength + cutPosition;

            cutLengths.push({
              rebarPiece,
              cutLength,
              description: `Piece ${rebarPiece}: Start Top Rebar (DL(${DL_Top}) - Cover(${sideCover}) + Inner Spans + Supports + ${cutDescription})`,
            });

            // Calculate second piece
            rebarPiece++;
            cutSpanIndex = i;

            // Second piece starts from cut position + lap length
            const remainingSpan = span - cutPosition;
            let secondPieceLength = remainingSpan + Lap;

            console.log(`\n🔍 DETAILED SECOND PIECE CALCULATION:`);
            console.log(`📍 CUT HAPPENED AT SPAN ${i + 1} (index ${i})`);
            console.log(`📍 ALL SPANS: [${centerToCenterDistances.map((s, idx) => `Span${idx + 1}(${s.distance})`).join(', ')}]`);
            console.log(`📍 ALL INNER SPANS: [${innerSpans.map((s, idx) => `Inner Span${idx + 1}(${s})`).join(', ')}]`);
            console.log(`📍 ALL SUPPORTS: [${supportWidths.map((s, idx) => `Support${idx + 1}(${s.width})`).join(', ')}]`);
            console.log(`📍 REMAINING INNER SPANS TO ADD: [${innerSpans.slice(i + 1).map((s, idx) => `Inner Span${i + 2 + idx}(${s})`).join(', ')}]`);
            console.log(`📍 REMAINING SUPPORTS TO ADD: [${supportWidths.slice(i + 2).map((s, idx) => `Support${i + 3 + idx}(${s.width})`).join(', ')}]`);
            console.log(`Step 1: Remaining Span = ${span} - ${cutPosition} = ${remainingSpan}mm`);
            console.log(`Step 2: + Lap Length = ${remainingSpan} + ${Lap} = ${secondPieceLength}mm`);

            // Add remaining inner spans and supports
            for (let j = i + 1; j < centerToCenterDistances.length; j++) {
              const remainingSpanLength = innerSpans[j]; // Use inner span instead of regular span
              const remainingSupport = parseM(supportWidths[j + 1]?.width) || 0;

              console.log(`Step ${j - i + 2}: + Inner Span${j + 1} = ${secondPieceLength} + ${remainingSpanLength} = ${secondPieceLength + remainingSpanLength}mm`);
              secondPieceLength += remainingSpanLength;

              // Add support after each span (we need to add Support5 after Span5)
              // The condition should be: if there's a support after this span
              if (j + 1 < supportWidths.length) {
                console.log(`Step ${j - i + 3}: + Support${j + 1} = ${secondPieceLength} + ${remainingSupport} = ${secondPieceLength + remainingSupport}mm`);
                secondPieceLength += remainingSupport;
              }
            }

            // Add DL and subtract side cover at the end
            console.log(`Step ${centerToCenterDistances.length - i + 1}: + DL = ${secondPieceLength} + ${DL_Top} = ${secondPieceLength + DL_Top}mm`);
            secondPieceLength += DL_Top;

            console.log(`Step ${centerToCenterDistances.length - i + 2}: - Side Cover = ${secondPieceLength} - ${sideCover} = ${secondPieceLength - sideCover}mm`);
            secondPieceLength -= sideCover;

            console.log(`\n✅ FINAL SECOND PIECE LENGTH: ${secondPieceLength}mm\n`);

            cutLengths.push({
              rebarPiece,
              cutLength: secondPieceLength,
              description: `Piece ${rebarPiece}: End Top Rebar (Inner Span${i + 1} Remaining(${remainingSpan}) + Lap(${Lap}) + Remaining Inner Spans + DL(${DL_Top}) - Cover(${sideCover}))`,
            });

            break; // Exit the loop since we've calculated both pieces
          }

          currentLength += addLength;
        }

        cutLengths.forEach(c => console.log(`• Piece ${c.rebarPiece}: ${c.cutLength}mm (${c.description})`));
        cutLengthResults.push({
          beamNumber: beamIndex + 1,
          devDiameter,
          lapDiameter,
          rebarStackLength: stackLength,
          developmentLengthTop: DL_Top,
          lapLength: Lap,
          sideCover,
          cutLengths,
          totalPieces: cutLengths.length,
        });
      });

      return cutLengthResults;
    };

    const calculateStirrupLengths = () => {
      const stirrupResults = [];

      beams.forEach((beam, beamIndex) => {
        const beamId = beam.id;
        const beamWidth = parseM(beam.width) || 0;
        const beamHeight = parseM(beam.height) || 0;
        const rebarData = beamRebarDetails[beamId] || {};

        // Get stirrup types (Stirrups and Internal Stirrups)
        const stirrups = rebarData["Stirrups"];
        const internalStirrups = rebarData["Internal Stirrups"];

        if (beamWidth <= 0 || beamHeight <= 0) return;

        const sideCover = parseM(concreteCovers.sideCover) || 0;
        const topCover = parseM(concreteCovers.topCover) || 0;
        const bottomCover = parseM(concreteCovers.bottomCover) || 0;

        console.log(`\n🔧 BEAM ${beamIndex + 1} - STIRRUP CALCULATION`);
        console.log(`Beam Width: ${beamWidth}mm | Beam Height: ${beamHeight}mm`);
        console.log(`Side Cover: ${sideCover}mm | Top Cover: ${topCover}mm | Bottom Cover: ${bottomCover}mm`);

        // Calculate stirrup lengths for each stirrup type
        [stirrups, internalStirrups].forEach((stirrupData, stirrupTypeIndex) => {
          if (!stirrupData || !stirrupData.diameter) return;

          const stirrupType = stirrupTypeIndex === 0 ? "Stirrups" : "Internal Stirrups";

          // Get diameter
          let diameter = 0;
          if (unitSystem === "imperial") {
            const rebarInfo = imperialRebarDiameters.find(
              (r) => r.value === stirrupData.diameter
            );
            diameter = rebarInfo ? Math.ceil(rebarInfo.diameter * 25.4) : 0;
          } else {
            diameter = parseM(stirrupData.diameter);
          }

          if (diameter <= 0) return;

          // Calculate bend allowances
          const bend90Allowance = bendAllowances.bend90 * diameter; // 3 * 90° bends
          const bend135Allowance = bendAllowances.bend135 * diameter; // 2 * 135° bends
          const hookLength = hookLengthMultiplier * diameter; // 2 * hook length

          // Calculate stirrup length using the formula
          const effectiveWidth = beamWidth - (2 * sideCover);
          const effectiveHeight = beamHeight - (2 * topCover) - (2 * bottomCover);

          const stirrupLength = (2 * effectiveWidth) + (2 * effectiveHeight) - (3 * bend90Allowance) - (2 * bend135Allowance) + (2 * hookLength);

          console.log(`\n📐 ${stirrupType} (Diameter: ${diameter}mm):`);
          console.log(`  Effective Width: ${beamWidth} - 2*${sideCover} = ${effectiveWidth}mm`);
          console.log(`  Effective Height: ${beamHeight} - 2*${topCover} - 2*${bottomCover} = ${effectiveHeight}mm`);
          console.log(`  90° Bend Allowance: 3 * ${bend90Allowance} = ${3 * bend90Allowance}mm`);
          console.log(`  135° Bend Allowance: 2 * ${bend135Allowance} = ${2 * bend135Allowance}mm`);
          console.log(`  Hook Length: 2 * ${hookLength} = ${2 * hookLength}mm`);
          console.log(`  Formula: 2*${effectiveWidth} + 2*${effectiveHeight} - ${3 * bend90Allowance} - ${2 * bend135Allowance} + ${2 * hookLength} = ${stirrupLength}mm`);

          stirrupResults.push({
            beamNumber: beamIndex + 1,
            stirrupType,
            diameter,
            beamWidth,
            beamHeight,
            sideCover,
            topCover,
            bottomCover,
            effectiveWidth,
            effectiveHeight,
            bend90Allowance,
            bend135Allowance,
            hookLength,
            stirrupLength,
            l4CenterToCenter: stirrupData.l4CenterToCenter || '',
            l2CenterToCenter: stirrupData.l2CenterToCenter || ''
          });
        });
      });

      return stirrupResults;
    };



    const stirrupResults = calculateStirrupLengths();
    const bottomRebarResults = calculateBottomRebarCutLengths();
    const topRebarResults = calculateTopRebarCutLengths();
    const discontinuedResults = calculateTopExtraDiscontinuedLength();

    // Calculate total stirrups across all beams using the new flexible dimensioning system
    const totalStirrups = stirrupResults.reduce((total, result) => {
      const beamStirrups = centerToCenterDistances.reduce((beamTotal, span, spanIndex) => {
        // Use span inner (face-to-face distance) instead of center-to-center distance
        const spanLength = parseM(span.distance) || 0;
        const support1Width = parseM(supportWidths[spanIndex]?.width) || 0;
        const support2Width = parseM(supportWidths[spanIndex + 1]?.width) || 0;
        const spanWidth = spanLength - (support1Width / 2) - (support2Width / 2);

        // Get stirrup data for this specific beam and stirrup type
        const beamId = beams[result.beamNumber - 1]?.id;
        const stirrupData = beamRebarDetails[beamId]?.[result.stirrupType] || {};

        let leftL4Stirrups, middleL2Stirrups, rightL4Stirrups;
        let leftL4Length, middleL2Length, rightL4Length;

        if (stirrupData.dimensioningStyle === 'distance') {
          // Direct distance method
          const endDistance = parseM(stirrupData.endDistance) || 0;
          const endSpacing = parseM(stirrupData.endSpacingDirect) || 0;
          const centerSpacing = parseM(stirrupData.centerSpacingDirect) || 0;

          if (spanWidth <= 0 || (endSpacing <= 0 && centerSpacing <= 0)) return beamTotal;

          // Calculate sections based on direct distance
          leftL4Length = Math.min(endDistance, spanWidth / 2);
          rightL4Length = Math.min(endDistance, spanWidth / 2);
          middleL2Length = spanWidth - leftL4Length - rightL4Length;

          // Calculate number of stirrups
          leftL4Stirrups = endSpacing > 0 ? Math.ceil(leftL4Length / endSpacing) - 1 : 0;
          rightL4Stirrups = endSpacing > 0 ? Math.ceil(rightL4Length / endSpacing) - 1 : 0;
          middleL2Stirrups = centerSpacing > 0 ? Math.ceil(middleL2Length / centerSpacing) + 1 : 0;
        } else {
          // L/X Factor method (default)
          const endFactor = parseM(stirrupData.endFactor) || 4;
          const endSpacing = parseM(stirrupData.endSpacing) || 0;
          const centerSpacing = parseM(stirrupData.centerSpacing) || 0;

          if (spanWidth <= 0 || (endSpacing <= 0 && centerSpacing <= 0)) return beamTotal;

          // Calculate L/X sections
          leftL4Length = spanWidth / endFactor;
          rightL4Length = spanWidth / endFactor;
          middleL2Length = spanWidth - leftL4Length - rightL4Length;

          // Calculate number of stirrups
          leftL4Stirrups = endSpacing > 0 ? Math.ceil(leftL4Length / endSpacing) - 1 : 0;
          rightL4Stirrups = endSpacing > 0 ? Math.ceil(rightL4Length / endSpacing) - 1 : 0;
          middleL2Stirrups = centerSpacing > 0 ? Math.ceil(middleL2Length / centerSpacing) + 1 : 0;
        }

        const totalStirrups = leftL4Stirrups + middleL2Stirrups + rightL4Stirrups;
        return beamTotal + totalStirrups;
      }, 0);
      return total + beamStirrups;
    }, 0);

    // Show each component separately in separate rows
    const rebarSummary = [];

    // Top Main Bar - show each piece separately
    if (topRebarResults && topRebarResults.length > 0) {
      topRebarResults.forEach((result, beamIndex) => {
        const beamId = beams[beamIndex]?.id;
        const userQuantity = parseM(beamRebarDetails[beamId]?.['Top Rebar']?.quantity) || 1;

        result.cutLengths.forEach((cut, cutIndex) => {
          rebarSummary.push({
            type: 'Top Main Bar',
            beamNumber: result.beamNumber,
            pieceNumber: cut.rebarPiece,
            totalPieces: result.totalPieces,
            diameter: result.devDiameter,
            quantity: userQuantity,
            lengthPerPiece: cut.cutLength,
            totalLength: cut.cutLength * userQuantity,
            developmentLength: result.developmentLengthTop,
            lapLength: result.lapLength
          });
        });
      });
    }

    // Top Extra Bar - show left and right separately
    if (discontinuedResults && discontinuedResults.length > 0) {
      console.log("🔍 Top Extra Bar Data:", discontinuedResults);

      discontinuedResults.forEach((result, index) => {
        // Determine if it's left (start) or right (end) based on span number
        const isLeft = result.spanNumber === 1; // First span is left side
        const sideLabel = isLeft ? 'Left' : 'Right';
        const pieceNumber = isLeft ? 1 : 2; // Left is #1, Right is #2

        // Get user-entered quantity for the appropriate rebar type
        const beamId = beams[result.beamNumber - 1]?.id;
        const rebarType = isLeft ? 'Extra Top Rebar Start Support' : 'Extra Top Rebar End Support';
        const userQuantity = parseM(beamRebarDetails[beamId]?.[rebarType]?.quantity) || 1;

        rebarSummary.push({
          type: 'Top Extra Bar',
          beamNumber: result.beamNumber,
          pieceNumber: pieceNumber,
          diameter: result.diameter,
          quantity: userQuantity,
          lengthPerPiece: result.topExtraDiscontinuedLength,
          totalLength: result.topExtraDiscontinuedLength * userQuantity,
          spanLength: result.spanLength,
          lFactor: result.lFactor, // This contains the actual L/4 value
          perimeterFactor: result.perimeterFactor, // This contains the factor used
          side: sideLabel
        });
      });
    } else {
      console.log("⚠️ No Top Extra Bar data found");
    }

    // Bottom Main Bar - show each piece separately
    if (bottomRebarResults && bottomRebarResults.length > 0) {
      bottomRebarResults.forEach((result, beamIndex) => {
        const beamId = beams[beamIndex]?.id;
        const userQuantity = parseM(beamRebarDetails[beamId]?.['Main Bottom Rebar']?.quantity) || 1;

        result.cutLengths.forEach((cut, cutIndex) => {
          rebarSummary.push({
            type: 'Bottom Main Bar',
            beamNumber: result.beamNumber,
            pieceNumber: cut.rebarPiece,
            totalPieces: result.totalPieces,
            diameter: result.diameter,
            quantity: userQuantity,
            lengthPerPiece: cut.cutLength,
            totalLength: cut.cutLength * userQuantity,
            developmentLength: result.developmentLengthBottom,
            lapLength: result.lapLength
          });
        });
      });
    }

    // Top Extra Continue Length Results
    const topExtraContinueResults = calculateTopExtraContinueLength();
    if (topExtraContinueResults && topExtraContinueResults.length > 0) {
      topExtraContinueResults.forEach(result => {
        // All rebar belongs to the first beam (beam #1)
        const beamIndex = 0; // Always use first beam
        const beamId = beams[beamIndex]?.id;
        const userQuantity = parseM(beamRebarDetails[beamId]?.['Extra Top Rebar Continue']?.quantity) || 1;

        rebarSummary.push({
          type: 'Top Extra Continue',
          beamNumber: 1, // Always beam #1
          pieceNumber: 1,
          diameter: parseM(beamRebarDetails[beamId]?.['Extra Top Rebar Continue']?.diameter) || 12,
          quantity: userQuantity,
          lengthPerPiece: result.topExtraContinueLength,
          totalLength: result.topExtraContinueLength * userQuantity,
          leftSpan: result.leftSpan,
          rightSpan: result.rightSpan,
          leftSpanL4: result.leftSpanL4,
          rightSpanL4: result.rightSpanL4,
          supportWidth: result.supportWidth,
          leftSpanNumber: result.supportNumber - 1, // Left span is support number - 1
          rightSpanNumber: result.supportNumber // Right span is same as support number
        });
      });
    }

    // Bottom Extra Span Middle Results
    const bottomExtraSpanResults = calculateBottomExtraSpanMiddle();
    if (bottomExtraSpanResults && bottomExtraSpanResults.length > 0) {
      bottomExtraSpanResults.forEach(result => {
        // All rebar belongs to the first beam (beam #1)
        const beamIndex = 0; // Always use first beam
        const beamId = beams[beamIndex]?.id;
        const userQuantity = parseM(beamRebarDetails[beamId]?.['Extra Bottom Rebar Span Middle']?.quantity) || 1;

        rebarSummary.push({
          type: 'Bottom Extra Span Middle',
          beamNumber: 1, // Always beam #1
          pieceNumber: 1,
          diameter: parseM(beamRebarDetails[beamId]?.['Extra Bottom Rebar Span Middle']?.diameter) || 12,
          quantity: userQuantity,
          lengthPerPiece: result.bottomExtraSpanMiddle,
          totalLength: result.bottomExtraSpanMiddle * userQuantity,
          spanWidth: result.spanWidth,
          spanWidthLFactor: result.spanWidthLFactor,
          perimeterFactor: result.perimeterFactor,
          spanNumber: result.spanNumber
        });
      });
    }

    // Stirrups
    if (stirrupResults && stirrupResults.length > 0) {
      stirrupResults.forEach(result => {
        rebarSummary.push({
          type: 'Stirrups',
          beamNumber: 1, // Always beam #1
          diameter: result.diameter,
          quantity: totalStirrups,
          lengthPerPiece: result.stirrupLength,
          totalLength: result.stirrupLength * totalStirrups
        });
      });
    }

    // Sort and group results by beam number
    const sortedRebarSummary = rebarSummary.sort((a, b) => {
      // First sort by beam number
      if (a.beamNumber !== b.beamNumber) {
        return a.beamNumber - b.beamNumber;
      }
      // Then sort by type within each beam
      const typeOrder = {
        'Top Main Bar': 1,
        'Top Extra Bar': 2,
        'Top Extra Continue': 3,
        'Bottom Main Bar': 4,
        'Bottom Extra Span Middle': 5,
        'Stirrups': 6
      };
      const aOrder = typeOrder[a.type] || 999;
      const bOrder = typeOrder[b.type] || 999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      // Finally sort by piece number within each type
      return (a.pieceNumber || 0) - (b.pieceNumber || 0);
    });



    // append shapes and total lengths
    let totalWt = 0;
    let totalLen = 0;

    sortedRebarSummary.forEach(item => {
      item.shape = getShape(item);
      let weightPerMeter = 0;
      // We can map diameter to weight if needed, similar to calculateColumnBBS.js
      // for now, we just mock the weight logic if it wasn't there
      let d = parseFloat(item.diameter) || 0;
      weightPerMeter = (d * d) / 162;
      item.weight = (item.totalLength / 1000) * weightPerMeter;
      totalWt += item.weight;
      totalLen += item.totalLength;

      // format for frontend: it expects properties like `type, beamNumber, diameter, lengthPerPiece, totalLength, quantity, shape`
    });

    return res.json({
      success: true,
      results: sortedRebarSummary,
      totals: {
        TotLen: customRound(totalLen),
        TotWt: customRound(totalWt)
      }
    });
  } catch (error) {
    console.error('Error in calculateBarBendingSchedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
