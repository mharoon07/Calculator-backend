const fs = require('fs');

const code = fs.readFileSync('/home/muhammad-haroon/Desktop/solinovation/Calculator-web/Construction/src/Calculators/BarBendingCalculator/All/barbendingschdular.jsx', 'utf8');

// Find all the calculate methods:
const methodsToExtract = [
  'calculateBeamDevelopmentLengths',
  'calculateBeamLapLengths',
  'calculateSpanInner',
  'calculateTopExtraContinueLength',
  'calculateBottomExtraSpanMiddle',
  'calculateTopExtraDiscontinuedLength',
  'calculateTotalRebarLengthWithoutLap',
  'calculateTotalTopRebarLengthWithoutLap',
  'calculateBottomRebarCutLengths',
  'calculateTopRebarCutLengths',
  'calculateStirrupLengths'
];

let extractedCode = `
const parseMeasurement = (value) => {
  let result = 0;
  if (value === undefined || value === null || value === '') return 0;
  
  if (typeof value === 'number') {
    result = value;
  } else if (typeof value === 'string' && value.includes("'")) {
    const match = value.match(/^(-?\\d+)'(\\d*\\.?\\d*)"?$/);
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
  
  return result; // Default metric parsing, since we handle unit conversion below
};

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

const calculateBarBendingSchedule = async (req, res) => {
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
      imperialRebarDiameters
    } = data;

    // Redefine parseMeasurement to be unit aware based on closure
    const parseM = (value) => {
      let r = parseMeasurement(value);
      if (unitSystem === 'imperial') {
        return Math.ceil(r * 25.4);
      }
      return r;
    };

    const customRound = (value) => Math.round(value);

`;

for (const method of methodsToExtract) {
  let regex = new RegExp(`const ${method} = useCallback\\(\\(.*?\\) => {([\\s\\S]*?)\\n  }, \\[.*?\\]\\);`, 'g');
  let match = regex.exec(code);
  if (match) {
    let params = match[0].match(/const .*? = useCallback\(\((.*?)\) =>/)[1];
    let body = match[1];
    
    // Replace parseMeasurement with parseM inside functions
    body = body.replace(/parseMeasurement/g, 'parseM');

    extractedCode += `
    const ${method} = (${params}) => {
      ${body}
    };
`;
  } else {
    regex = new RegExp(`const ${method} = useCallback\\(\\(.*?\\) => {([\\s\\S]*?)\\n  }\\);`, 'g');
    match = regex.exec(code);
    if(match){
      let params = match[0].match(/const .*? = useCallback\(\((.*?)\) =>/)[1];
      let body = match[1];
      body = body.replace(/parseMeasurement/g, 'parseM');
      extractedCode += `
      const ${method} = (${params}) => {
        ${body}
      };
  `;
    } else {
      console.log('Method not found:', method);
    }
  }
}

extractedCode += `
    const stirrupResults = calculateStirrupLengths();
    const bottomRebarResults = calculateBottomRebarCutLengths();
    const topRebarResults = calculateTopRebarCutLengths();
    const discontinuedResults = calculateTopExtraDiscontinuedLength();
\n`;

// Now extract the aggregation part!
let aggRegex = /const totalStirrups = stirrupResults\.reduce\(([\s\S]*?)return sortedRebarSummary/g;
let aggMatch = aggRegex.exec(code);
if (aggMatch) {
  let aggCode = "const totalStirrups = stirrupResults.reduce(" + aggMatch[1] + "return sortedRebarSummary;";
  aggCode = aggCode.replace(/parseMeasurement/g, 'parseM');
  
  aggCode = aggCode.replace(/return sortedRebarSummary;/g, "sortedRebarSummary.forEach(item => { item.shape = getShape(item); item.weight = 0; /* Add weight logic if needed */ }); return res.json({ success: true, results: sortedRebarSummary });");

  extractedCode += aggCode;
} else {
  console.log("Aggregation not found!");
}

extractedCode += `
  } catch (error) {
    console.error('Error in calculateBarBendingSchedule:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = { calculateBarBendingSchedule };
`;

fs.writeFileSync('generated_controller.js', extractedCode);
console.log('Generated controller in generated_controller.js');
