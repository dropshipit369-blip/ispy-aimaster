
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function authenticateUser(req: Request): Promise<{ userId: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("refine-pricing proceeding without verified user context: no bearer token");
    return { userId: null };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("refine-pricing auth skipped because Supabase env is incomplete");
    return { userId: null };
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    console.warn("refine-pricing proceeding without verified user context:", error?.message ?? "no user");
    return { userId: null };
  }
  return { userId: data.user.id };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

const REFINE_PRICING_SCHEMA = {
  type: "OBJECT",
  properties: {
    recommendedPrice: { type: "NUMBER" },
    listingType: { type: "STRING", enum: ["Auction", "Fixed Price"] },
    lowEstimate: { type: "NUMBER" },
    highEstimate: { type: "NUMBER" },
    reasoning: { type: "STRING" },
    lotStrategy: {
      type: "OBJECT",
      nullable: true,
      properties: {
        isLot: { type: "BOOLEAN" },
        individualSum: { type: "NUMBER" },
        bundlePrice: { type: "NUMBER" },
        recommendation: { type: "STRING", enum: ["Sell as Lot", "Sell Individually"] },
      },
    },
    followUpSuggestions: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["recommendedPrice", "listingType", "lowEstimate", "highEstimate", "reasoning", "followUpSuggestions"],
};

async function generateStructuredContent(params: {
  apiKey: string;
  model: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget?: number;
}): Promise<unknown> {
  const generationConfig: Record<string, unknown> = {
    temperature: params.temperature,
    maxOutputTokens: params.maxOutputTokens,
    responseMimeType: "application/json",
    responseSchema: params.schema,
  };
  if (params.thinkingBudget) {
    generationConfig.thinkingConfig = { thinkingBudget: params.thinkingBudget };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: params.prompt }] }],
        generationConfig,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = extractJson(text);
  if (!parsed) throw new Error("Invalid model response");
  return parsed;
}

// Final safety net: an OpenRouter free model. Invoked only when every Gemini
// tier fails (e.g. all quotas exhausted) so the request still returns usable
// output instead of a hard error. Opt-in via OPENROUTER_API_KEY; model is
// configurable via OPENROUTER_TEXT_MODEL. OpenRouter is OpenAI-compatible.
async function generateViaOpenRouter(
  prompt: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<unknown> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  const model =
    Deno.env.get("OPENROUTER_TEXT_MODEL") ??
    "meta-llama/llama-3.3-70b-instruct:free";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Title": "iSpy Profit Tool",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a resale pricing expert. Respond with a single valid JSON object only — no markdown, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature,
      max_tokens: maxOutputTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(text);
  if (!parsed) throw new Error("Invalid OpenRouter response");
  return parsed;
}

// Tries each model tier in order (e.g. when a model is rate-limited or
// temporarily unavailable, quotas are typically per-model, so the next
// tier down often still succeeds). If every Gemini tier fails, falls back to
// an OpenRouter free model as a last resort.
async function generateWithFallback(
  apiKey: string,
  prompt: string,
  schema: Record<string, unknown>,
  temperature: number,
  maxOutputTokens: number,
  tiers: { model: string; thinkingBudget?: number }[],
): Promise<unknown> {
  let lastError: unknown;
  for (const tier of tiers) {
    try {
      return await generateStructuredContent({
        apiKey,
        model: tier.model,
        prompt,
        schema,
        temperature,
        maxOutputTokens,
        thinkingBudget: tier.thinkingBudget,
      });
    } catch (error) {
      console.warn(`refine-pricing: ${tier.model} failed, trying next tier:`, error);
      lastError = error;
    }
  }

  if (Deno.env.get("OPENROUTER_API_KEY")) {
    try {
      console.warn("refine-pricing: all Gemini tiers failed, falling back to OpenRouter free model");
      return await generateViaOpenRouter(prompt, temperature, maxOutputTokens);
    } catch (error) {
      console.error("refine-pricing: OpenRouter fallback failed:", error);
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All model tiers failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { ...corsHeaders, "Content-Length": "0" } });
  }

  try {
    await authenticateUser(req);

    const body = await req.json();
    const { analysis, currentStrategy, userFeedback, chatHistory = [], marketReport } = body ?? {};

    if (!analysis || !currentStrategy || !userFeedback) {
      return new Response(JSON.stringify({ error: "analysis, currentStrategy, and userFeedback are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey =
      Deno.env.get("GOOGLE_GEMINI_API_KEY") ??
      Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const historyText = Array.isArray(chatHistory)
      ? chatHistory
        .map((message: unknown) => {
          if (!message || typeof message !== "object") return null;
          const messageRecord = message as { role?: unknown; text?: unknown };
          const role = messageRecord.role === "user" ? "Seller" : "Expert";
          const text = typeof messageRecord.text === "string" ? messageRecord.text : "";
          return `${role}:\n${text}`;
        })
        .filter((entry): entry is string => Boolean(entry))
        .join("\n\n")
      : "";

    // Build a conversational multi-turn prompt
    const prompt = `You are a veteran resale expert with 20+ years of experience. You've been having a conversation with a seller about their item. You speak naturally, directly, and like a trusted friend who knows the game inside-out.

ITEM CONTEXT:
- ${analysis.title} (${analysis.condition})
- Brand: ${analysis.brand || "Unknown"}, Category: ${analysis.category || "General"}
${marketReport ? `- Market range: A$${marketReport.low_price} - A$${marketReport.high_price}, Median: A$${marketReport.median_price}` : ""}

CURRENT STRATEGY:
${JSON.stringify(currentStrategy, null, 2)}

CONVERSATION SO FAR:
${historyText}

SELLER'S LATEST MESSAGE:
"${String(userFeedback).slice(0, 800)}"

INSTRUCTIONS:
1. Read the seller's message carefully and respond DIRECTLY to what they're asking/saying.
2. If they share new information (condition details, defects, accessories, urgency), factor it into an UPDATED strategy.
3. If they ask a question, answer it thoroughly with specific, actionable advice.
4. If they push back on pricing, explain your reasoning but be willing to adjust if they have valid points.
5. Be conversational — use "you", "I'd recommend", "here's the thing", "in my experience".
6. Don't repeat information they already know. Build on the conversation.

Return ONLY a JSON object:
{
  "recommendedPrice": number,
  "listingType": "Auction" | "Fixed Price",
  "lowEstimate": number,
  "highEstimate": number,
  "reasoning": "Your conversational response to the seller. 3-6 sentences. Address their specific input. Be warm but direct. If you're adjusting the price, explain why. If you're not, explain why the current price is still right. End with a specific actionable next step or question to keep the conversation going.",
  "lotStrategy": {"isLot": boolean, "individualSum": number, "bundlePrice": number, "recommendation": "Sell as Lot" | "Sell Individually"} | null,
  "followUpSuggestions": ["A specific follow-up question they might want to ask you", "Another suggestion", "A third suggestion"]
}

RULES:
- The "reasoning" IS your message to the seller. Write it like you're texting a friend, not writing a report.
- followUpSuggestions should be natural questions (e.g., "What if I include the original box?", "Should I wait until the holidays to list?", "What's the best way to photograph the scratches?").
- If the seller mentions urgency, weigh speed vs profit explicitly.
- If they mention defects, adjust the price AND explain the impact.
- Prices in AUD.`;

    const parsed = await generateWithFallback(apiKey, prompt, REFINE_PRICING_SCHEMA, 0.6, 3000, [
      { model: "gemini-3-pro-preview", thinkingBudget: 4096 },
      { model: "gemini-2.5-flash" },
      { model: "gemini-1.5-flash" },
    ]);

    return new Response(JSON.stringify({ strategy: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
