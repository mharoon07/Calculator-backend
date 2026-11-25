import fetch from 'node-fetch';

 
export const analyzeDrawing = async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ success: false, error: 'Image data is required' });
        }

        const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
        const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

        if (!ACCOUNT_ID || !API_TOKEN) {
            console.error('Missing Cloudflare Credentials');
            return res.status(500).json({ success: false, error: 'Server configuration error' });
        }

        const prompt = 'You are an expert construction estimator. Analyze this floor plan image. Estimate the Total Built-up Area in square feet (sq ft). Look for dimensions or calculate based on standard room sizes like bedrooms (12x14), bathrooms (6x8), etc. Return the data in a structured JSON format: { "builtup_area": 0 }. Return ONLY the JSON object, no markdown formatting.';

        // Prepare payload for @cf/llava-1.5-7b-it
        // This model input format via REST API is typically { prompt: string, image: number[] | string }
        // We will assume the API accepts the base64 string directly or needs numeric array. 
        // Based on typical usage, we'll try sending the base64 string directly if supported, 
        // OR convert base64 to numeric array if needed.
        // Let's implement the numeric array conversion to be safe as per previous knowledge.

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        console.log("Base64 Length:", base64Data.length);
        
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const numericArray = Array.from(bytes);
        console.log("Numeric Array Length:", numericArray.length);

        const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`;
        console.log("Requesting Cloudflare URL:", url);
        // console.log("Account ID length:", ACCOUNT_ID.length);

        const response = await fetch(
            url,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    image: numericArray
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cloudflare API Error:', response.status, errorText);
            throw new Error(`Cloudflare API Error: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.errors?.[0]?.message || 'Unknown error from Cloudflare AI');
        }

        // Parse the AI text response
        const textResponse = result.result.description || result.result.response || "";
        
        // Extract JSON
        const firstBrace = textResponse.indexOf("{");
        const lastBrace = textResponse.lastIndexOf("}");
        
        let parsedData = { builtup_area: 0 };
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            let jsonStr = textResponse.substring(firstBrace, lastBrace + 1);
            // Sanitize JSON: remove markdown escaping like \_
            jsonStr = jsonStr.replace(/\\_/g, '_'); 
            
            try {
                parsedData = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse JSON from AI:", jsonStr);
            }
        }

        res.json({ success: true, ...parsedData });

    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to analyze drawing' });
    }
};
