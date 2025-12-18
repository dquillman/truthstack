
// services/gemini.ts
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { app } from "../firebase";
import { AnalysisResult, LayerType, StackLayerData } from "../types";
import { saveAnalysis } from "./db";

export const analyzeClaim = async (claim: string, imageBase64?: string): Promise<AnalysisResult> => {
  const vertexAI = getVertexAI(app);

  const prompt = `
    You are TruthStack, an analysis engine.
    Analyze the claim: "${claim}".
    
    **INSTRUCTIONS**:
    1. Analyze the claim (and image if provided) using your internal knowledge base.
    2. Identify logical fallacies or lack of evidence.
    3. Format your response using **STRICT XML TAGS**.
    
    **OUTPUT FORMAT**:
    
    <investigation>
    Use RICH MARKDOWN here.
    - Start with a header "### 🔍 The Deep Dive"
    - Use bullet points for key facts.
    - Use **bold** for emphasis.
    - If there is numerical data, YOU MUST CREATE A MARKDOWN TABLE.
    - Structure it into clear subsections.
    - Do NOT include the final verdict here.
    - Do NOT include the final verdict here.
    </investigation>
    
    <reasoning>
    Identify 3-5 KEY FACTORS that determined your verdict. Why is it True/False?
    Format:
    <point>Factor 1: Brief explanation</point>
    <point>Factor 2: Brief explanation</point>
    </reasoning>
    
    <verdict>
    [Level 3 Content: ONE word status (TRUE/FALSE/MISLEADING) followed by 2-3 short summary sentences.]
    </verdict>

    <questions>
    Generate 3 short, intriguing follow-up questions a user might ask next.
    Format:
    <q>Question 1?</q>
    <q>Question 2?</q>
    <q>Question 3?</q>

    <bias>
    Provide a JSON object (0-100 scale) for the claim's source/nature.
    {
      "politicalScore": 50,      // 0=Neutral, 100=Extreme
      "scientificDeviation": 0,  // 0=Aligned with Consensus, 100=Pseudoscience
      "emotionalCharge": 20,     // 0=Calm, 100=Hysterical
      "commercialInterest": 10   // 0=None, 100=Clear Sales Motive
    }
    </bias>

    <category>
    Classify into ONE: Politics, Health, Technology, Science, Culture, Economics, History, Other.
    </category>


    <sources>
    List 3-5 credible sources (or domains) that would support this analysis.
    Format:
    <s url="https://example.com">Source Title</s>
    <s url="">Organization/Domain Name</s>
    </sources>
  `;

  // Fallback list for Vertex AI models (handling deprecation/retirement)
  // Current Date: Dec 2025 (Gemini 1.5 Flash retired Sept 2025)
  const modelsToTry = [
    "gemini-2.0-flash",        // Likely standard
    "gemini-1.5-flash-002",    // Newer 1.5 version
    "gemini-1.5-pro-002",      // Newer 1.5 Pro
    "gemini-2.0-flash-exp",    // Fallback exp
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting Vertex AI model: ${modelName}`);
      console.log(`Attempting Vertex AI model: ${modelName}`);
      const model = getGenerativeModel(vertexAI, { model: modelName });

      let parts: any[] = [{ text: prompt }];

      if (imageBase64) {
        // Extract base64 data if it has the prefix
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        parts.push({
          inlineData: {
            mimeType: 'image/png', // Simplified assumption, logic handles png/jpeg typcially
            data: base64Data
          }
        });
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: parts }]
      });
      const response = result.response;
      let text = response.text();

      // Clean up code blocks if the model wrapped the XML
      text = text.replace(/```xml/g, '').replace(/```/g, '');

      // 1. Parse XML Sections using Regex
      const investigationMatch = text.match(/<investigation>([\s\S]*?)<\/investigation>/i);
      const reasoningMatch = text.match(/<reasoning>([\s\S]*?)<\/reasoning>/i);
      const verdictMatch = text.match(/<verdict>([\s\S]*?)<\/verdict>/i);

      // Parse Questions
      const questionsMatch = text.match(/<questions>([\s\S]*?)<\/questions>/i);
      const suggestedQuestions: string[] = [];
      if (questionsMatch) {
        const qContent = questionsMatch[1];
        const qRegex = /<q>(.*?)<\/q>/g;
        let match;
        while ((match = qRegex.exec(qContent)) !== null) {
          suggestedQuestions.push(match[1].trim());
        }
      }

      // Parse Sources
      const sourcesMatch = text.match(/<sources>([\s\S]*?)<\/sources>/i);
      const sources: any[] = [];
      if (sourcesMatch) {
        const sContent = sourcesMatch[1];
        const sRegex = /<s url="(.*?)">(.*?)<\/s>/g;
        let match;
        while ((match = sRegex.exec(sContent)) !== null) {
          sources.push({ uri: match[1], title: match[2], reliability: 'high' });
        }
      }

      // Parse Bias Data
      const biasMatch = text.match(/<bias>([\s\S]*?)<\/bias>/i);
      let biasData: any = undefined;
      if (biasMatch) {
        try {
          biasData = JSON.parse(biasMatch[1].trim());
        } catch (e) {
          console.warn("Failed to parse bias JSON", e);
        }
      }

      let investigationContent = investigationMatch ? investigationMatch[1].trim() : "Analysis pending...";
      let reasoningContent = reasoningMatch ? reasoningMatch[1].trim() : "Reasoning pending...";
      let verdictContent = verdictMatch ? verdictMatch[1].trim() : "Verdict pending...";

      console.log('[Gemini] Parsed Output Sections:', {
        hasInvestigation: !!investigationMatch,
        hasReasoning: !!reasoningMatch,
        hasVerdict: !!verdictMatch,
        reasoningSnippet: reasoningContent.substring(0, 50)
      });
      // LOG THE RAW TEXT IF MISSING
      if (!reasoningMatch) {
        console.warn('MISSING REASONING SECTION in raw text:', text.substring(0, 500) + '...');
      }

      const layers: StackLayerData[] = [
        {
          id: 'layer-claim',
          type: LayerType.CLAIM,
          title: 'The Claim',
          content: claim,
          isLoading: false
        },
        {
          id: 'layer-investigation',
          type: LayerType.INVESTIGATION,
          title: 'The Investigation',
          content: investigationContent,
          biasData: biasData,
          isLoading: false
        },
        {
          id: 'layer-verdict',
          type: LayerType.VERDICT,
          title: 'The Verdict',
          content: verdictContent,
          isLoading: false
        },
        {
          id: 'layer-reasoning',
          type: LayerType.REASONING,
          title: 'The Why',
          content: reasoningContent,
          isLoading: false
        }
      ];

      // Parse Category
      const categoryMatch = text.match(/<category>([\s\S]*?)<\/category>/i);
      const category = categoryMatch ? categoryMatch[1].trim() : "Other";

      // Save to History (Fire-and-forget)
      saveAnalysis({
        claim,
        verdict: verdictContent.split(' ')[0] || "Unknown", // First word usually TRUE/FALSE
        category,
        sourceCount: sources.length,
        hasImage: !!imageBase64,
        model: modelName
      });

      return { layers, sources: sources, suggestedQuestions };

    } catch (error: any) {
      console.warn(`Vertex AI Model ${modelName} failed:`, error);
      lastError = error;
      // Continue to next model
    }
  }

  // If we reach here, all models failed
  console.error("All Vertex AI models failed.");
  throw new Error(`Vertex AI analysis failed: ${lastError?.message || JSON.stringify(lastError)}`);
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