import re
import os

input_file = '/home/muhammad-haroon/Desktop/solinovation/Calculator-web/Construction/src/Calculators/BarBendingCalculator/All/barbendingschdular.jsx'
with open(input_file, 'r', encoding='utf-8') as f:
    text = f.read()

methods = [
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
]

extracted_funcs = "\n\n"

for m in methods:
    # Match const methodName = useCallback((...) => { ... }, [...]);
    pattern = r"const " + m + r" = useCallback\(\((.*?)\) => \{(.*?)\}, \[.*?\]\);"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        params = match.group(1)
        body = match.group(2)
        # replace parseMeasurement with parseM
        body = body.replace('parseMeasurement', 'parseM')
        func = f"const {m} = ({params}) => {{{body}}};\n\n"
        extracted_funcs += func
    else:
        print(f"Could not find {m}")

# Extract aggregation (rebarSummary logic)
agg_pattern = r"const stirrupResults = calculateStirrupLengths\(\);(.*?)return sortedRebarSummary\.length > 0"
agg_match = re.search(agg_pattern, text, re.DOTALL)
if agg_match:
    agg_code = agg_match.group(1)
    # the agg code ends before returning JSX
    agg_code = agg_code.replace('parseMeasurement', 'parseM')
else:
    print("Could not find aggregation logic")
    agg_code = ""

template = f"""
const getShape = (item) => {{
  const {{ type, side, pieceNumber, totalPieces }} = item;
  if (type === 'Top Extra Bar') {{
    if (side === 'Left') return 'TopExtraBarLeft';
    if (side === 'Right') return 'TopExtraBarRight';
  }}
  const isFirstPiece = pieceNumber === 1;
  const isLastPiece = pieceNumber === totalPieces;
  
  switch (type) {{
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
  }}
}};

export const calculateBarBendingSchedule = async (req, res) => {{
  try {{
    const data = req.body;
    const {{
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
    }} = data;

    // Redefine parseMeasurement to be unit aware based on closure
    const parseM = (value) => {{
      let result = 0;
      if (value === undefined || value === null || value === '') return 0;
      if (typeof value === 'number') {{
        result = value;
      }} else if (typeof value === 'string' && value.includes("'")) {{
        const match = value.match(/^(-?\\d+)'(\\d*\\.?\\d*)"?$/);
        if (match) {{
          const feet = parseFloat(match[1]) || 0;
          const inches = parseFloat(match[2]) || 0;
          result = (feet * 12) + inches;
        }} else {{
          result = parseFloat(value) || 0;
        }}
      }} else {{
        result = parseFloat(value) || 0;
      }}
      if (unitSystem === 'imperial') {{
        return Math.ceil(result * 25.4);
      }}
      return result;
    }};

    const customRound = (value) => Math.round(value);

    {extracted_funcs}

    const stirrupResults = calculateStirrupLengths();
    const bottomRebarResults = calculateBottomRebarCutLengths();
    const topRebarResults = calculateTopRebarCutLengths();
    const discontinuedResults = calculateTopExtraDiscontinuedLength();

    {agg_code}

    // append shapes and total lengths
    let totalWt = 0;
    let totalLen = 0;
    
    sortedRebarSummary.forEach(item => {{
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
    }});

    return res.json({{
      success: true,
      results: sortedRebarSummary,
      totals: {{
        TotLen: customRound(totalLen),
        TotWt: customRound(totalWt)
      }}
    }});
  }} catch (error) {{
    console.error('Error in calculateBarBendingSchedule:', error);
    res.status(500).json({{ error: 'Internal server error' }});
  }}
}};
"""

with open('calculateBarBendingSchedule.js', 'w', encoding='utf-8') as f:
    f.write(template)

console = "Done generating calculateBarBendingSchedule.js"
print(console)
