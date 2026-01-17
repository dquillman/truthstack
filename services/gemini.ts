
// services/gemini.ts
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { app } from "../firebase";
import { AnalysisResult, LayerType, StackLayerData } from "../types";
import { saveAnalysis } from "./db";

export const analyzeClaim = async (claim: string, imageBase64?: string): Promise<AnalysisResult> => {
  const vertexAI = getVertexAI(app);

  const prompt = `
    You are TruthStack, an expert fact-checker and analysis engine.
    Analyze the claim: "${claim}".
    
    **INSTRUCTIONS**:
    1. Analyze the claim (and image if provided) using your internal knowledge base and provided sources.
    2. Identify logical fallacies, assumptions, and lack of evidence.
    3. Determine a verdict: TRUE, FALSE, MISLEADING, or UNVERIFIED.
    4. If there is NO specific evidence or NO sources provided, the verdict MUST be "UNVERIFIED" with a confidence score <= 0.35.
    5. Factual statements must include [Source #] or be explicitly labeled as "(inference)".
    6. Format your response using **STRICT XML TAGS**.
    
    **OUTPUT FORMAT**:
    
    <normalized_claim>
    A concisely restated version of the user's claim for clarity.
    </normalized_claim>

    <assumptions>
    List 2-3 underlying assumptions required for this claim to be true.
    </assumptions>

    <investigation>
    Use RICH MARKDOWN here.
    - Start with a header "### 🔍 The Deep Dive"
    - Break down the evidence.
    - Use bullet points for key facts.
    - Ensure citations like [Source 1] are used for every factual claim.
    - If no sources are found/provided, explain why it's unverified.
    </investigation>
    
    <key_reasons>
    - Bullet 1
    - Bullet 2
    - Bullet 3
    </key_reasons>

    <verdict>
    STATUS: [TRUE/FALSE/MISLEADING/UNVERIFIED]
    CONFIDENCE: [0.0 to 1.0]
    SUMMARY: [2-3 short summary sentences.]
    </verdict>

    <change_verdict>
    What specific new evidence or discovery would change this verdict?
    </change_verdict>

    <questions>
    Generate 3 short, intriguing follow-up questions.
    <q>Question 1?</q>
    <q>Question 2?</q>
    <q>Question 3?</q>
    </questions>

    <bias>
    JSON object (0-100 scale) + framing notes.
    {
      "politicalScore": 50,
      "scientificDeviation": 0,
      "emotionalCharge": 20,
      "commercialInterest": 10,
      "framingNotes": "Brief notes on how the claim is framed..."
    }
    </bias>

    <sources>
    List 3-5 credible sources.
    <s url="URL">Source Title</s>
    </sources>
  `;

  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro-002",
    "gemini-2.0-flash-exp",
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting Vertex AI model: ${modelName}`);
      const model = getGenerativeModel(vertexAI, { model: modelName });

      let parts: any[] = [{ text: prompt }];

      if (imageBase64) {
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64Data
          }
        });
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: parts }]
      });
      const response = result.response;
      let text = response.text();

      // Clean up code blocks
      text = text.replace(/```xml/g, '').replace(/```/g, '');

      // Parse Sections
      const normalizedClaim = text.match(/<normalized_claim>([\s\S]*?)<\/normalized_claim>/i)?.[1].trim() || claim;
      const assumptions = text.match(/<assumptions>([\s\S]*?)<\/assumptions>/i)?.[1].trim() || "";
      const investigationContent = text.match(/<investigation>([\s\S]*?)<\/investigation>/i)?.[1].trim() || "Analysis pending...";
      const keyReasonsText = text.match(/<key_reasons>([\s\S]*?)<\/key_reasons>/i)?.[1].trim() || "";
      const keyReasons = keyReasonsText.split('\n').map(s => s.replace(/^- /, '').trim()).filter(Boolean);
      const verdictNode = text.match(/<verdict>([\s\S]*?)<\/verdict>/i)?.[1].trim() || "";
      const whatWouldChange = text.match(/<change_verdict>([\s\S]*?)<\/change_verdict>/i)?.[1].trim() || "";

      // Parse Verdict Details
      const status = verdictNode.match(/STATUS:\s*(TRUE|FALSE|MISLEADING|UNVERIFIED)/i)?.[1] || "UNVERIFIED";
      const confidence = parseFloat(verdictNode.match(/CONFIDENCE:\s*([\d.]+)/i)?.[1] || "0");
      const summary = verdictNode.match(/SUMMARY:\s*([\s\S]+)/i)?.[1].trim() || "";

      // Parse Questions
      const suggestedQuestions: string[] = [];
      const questionsMatch = text.match(/<questions>([\s\S]*?)<\/questions>/i);
      if (questionsMatch) {
        const qRegex = /<q>(.*?)<\/q>/g;
        let match;
        while ((match = qRegex.exec(questionsMatch[1])) !== null) {
          suggestedQuestions.push(match[1].trim());
        }
      }

      // Parse Sources
      const sources: any[] = [];
      const sourcesMatch = text.match(/<sources>([\s\S]*?)<\/sources>/i);
      if (sourcesMatch) {
        const sRegex = /<s url="(.*?)">(.*?)<\/s>/g;
        let match;
        while ((match = sRegex.exec(sourcesMatch[1])) !== null) {
          sources.push({ uri: match[1], title: match[2] });
        }
      }

      // Parse Bias Data
      const biasMatch = text.match(/<bias>([\s\S]*?)<\/bias>/i);
      let biasData: any = undefined;
      if (biasMatch) {
        try {
          biasData = JSON.parse(biasMatch[1].trim());
        } catch (e) { console.warn("Bias parse error", e); }
      }

      // Guardrail: Force UNVERIFIED if no sources
      let finalStatus = status;
      let finalConfidence = confidence;
      if (sources.length === 0) {
        finalStatus = "UNVERIFIED";
        finalConfidence = Math.min(confidence, 0.35);
      }

      const layers: StackLayerData[] = [
        {
          id: 'layer-claim',
          type: LayerType.CLAIM,
          title: 'Layer 1: The Claim',
          content: `**Normalized Claim:** ${normalizedClaim}\n\n**Assumptions:**\n${assumptions}`,
          isLoading: false
        },
        {
          id: 'layer-investigation',
          type: LayerType.INVESTIGATION,
          title: 'Layer 2: Investigation',
          content: investigationContent,
          biasData: biasData,
          isLoading: false
        },
        {
          id: 'layer-verdict',
          type: LayerType.VERDICT,
          title: 'Layer 3: Verdict',
          content: `**${finalStatus}**\n\n${summary}`,
          isLoading: false
        }
      ];

      return {
        layers,
        sources,
        suggestedQuestions,
        confidenceScore: finalConfidence,
        keyReasons,
        whatWouldChange
      };

    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error);
      lastError = error;
    }
  }

  throw new Error(`Analysis failed: ${lastError?.message || "Unknown error"}`);
};

export const startDebate = async (claim: string): Promise<any[]> => {
  const vertexAI = getVertexAI(app);
  const model = getGenerativeModel(vertexAI, { model: "gemini-2.0-flash" });

  const prompt = `
    Generate a lively, short debate script about: "${claim}".
    Characters: 
    1. "Pro" (Advocate/Believer)
    2. "Con" (Skeptic/Scientist)
    
    Format: JSON Array of objects.
    [
      { "speaker": "Pro", "text": "..." },
      { "speaker": "Con", "text": "..." }
    ]
    Length: 6 turns total. Keep it punchy and realistic.
    Output ONLY valid JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.warn("Debate generation failed", e);
    return [];
  }
};