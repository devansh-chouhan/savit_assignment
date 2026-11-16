import { z } from "zod";
import type { LeadCategory } from "@prisma/client";
import { stageLabel } from "./constants";
import { HttpError } from "./http";

export const SCORE_SYSTEM_PROMPT = `You are a CRM analyst for an Indian B2B sales team.
Score the lead from 0 to 100 using only the JSON facts provided. Do not invent meetings, budget, or intent.
Return JSON only, with this shape:
{"score": number, "category": "Hot" | "Warm" | "Cold", "reasons": [string, string, string]}
Rules:
- Hot is 70-100, Warm is 40-69, Cold is 0-39. The category must match the score.
- Higher deal value, later pipeline stages, a close date within 30 days, and recent substantive activity raise the score.
- Won leads can score high. Lost leads should score low.
- Stale or missing activity lowers the score.
- Each reason is one short sentence under 140 characters and cites a fact from the input.
- Do not recommend changing CRM fields.`;

export const EMAIL_SYSTEM_PROMPT = `You write follow-up emails for sales reps at Savit Interactive, a B2B CRM consultancy.
Return JSON only: {"subject": string, "body": string}
Rules:
- Use only facts in the user payload. Do not invent pricing, meetings, or promises.
- The body is plain text with short paragraphs. No markdown.
- Sign off with the sales rep's name.
- Formal: professional and complete. Friendly: warm and still businesslike. Short: under 90 words.
- Do not claim the email was already sent.`;

const scoreSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  category: z.string(),
  reasons: z.array(z.string().trim().min(3).max(200)).min(3),
});

const emailSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  body: z.string().trim().min(20).max(5000),
});

export type ScoreFacts = {
  title: string;
  stage: string;
  dealValue: number;
  expectedCloseDate: string | null;
  source: string | null;
  lostReason: string | null;
  contactName: string;
  company: string | null;
  city: string | null;
  activities: { type: string; description: string; createdAt: string }[];
};

export type EmailFacts = ScoreFacts & {
  tone: "formal" | "friendly" | "short";
  repName: string;
};

function categoryFor(score: number): LeadCategory {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
}

export function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new HttpError(502, "The AI response could not be validated. Try again.");
  }
  try {
    return JSON.parse(raw.slice(start, end + 1)) as unknown;
  } catch {
    throw new HttpError(502, "The AI response could not be validated. Try again.");
  }
}

export function parseScore(payload: unknown) {
  const parsed = scoreSchema.safeParse(payload);
  if (!parsed.success) {
    throw new HttpError(502, "The AI response could not be validated. Try again.");
  }
  const score = Math.round(parsed.data.score);
  const expected = categoryFor(score);
  const modelCategory = parsed.data.category.trim().toUpperCase();
  if (modelCategory !== expected) {
    throw new HttpError(502, "The AI response could not be validated. Try again.");
  }
  return {
    score,
    category: expected,
    reasons: parsed.data.reasons.slice(0, 3).map((reason) => reason.trim()),
  };
}

export function parseEmail(payload: unknown) {
  const parsed = emailSchema.safeParse(payload);
  if (!parsed.success) {
    throw new HttpError(502, "The AI response could not be validated. Try again.");
  }
  return parsed.data;
}

async function callGroq(system: string, user: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Groq error", response.status, detail.slice(0, 400));
    throw new HttpError(502, "The AI provider rejected the request. Check the API key and model.");
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, "The AI provider returned an empty response.");
  return content;
}

async function callGemini(system: string, user: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    console.error("Gemini error", response.status, detail.slice(0, 400));
    throw new HttpError(502, "The AI provider rejected the request. Check the API key and model.");
  }
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n");
  if (!content) throw new HttpError(502, "The AI provider returned an empty response.");
  return content;
}

async function complete(system: string, user: string) {
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    throw new HttpError(
      503,
      "No AI API key is configured. Add GROQ_API_KEY or GEMINI_API_KEY to the server environment.",
    );
  }
  try {
    const groq = await callGroq(system, user);
    if (groq) return groq;
    const gemini = await callGemini(system, user);
    if (gemini) return gemini;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new HttpError(504, "The AI request timed out. Try again.");
    }
    console.error(error);
    throw new HttpError(502, "The AI request failed. Try again.");
  }
  throw new HttpError(503, "No AI API key is configured.");
}

function scorePayload(facts: ScoreFacts) {
  return {
    title: facts.title,
    stage: stageLabel(facts.stage),
    dealValueInr: facts.dealValue,
    expectedCloseDate: facts.expectedCloseDate,
    source: facts.source,
    lostReason: facts.lostReason,
    contactName: facts.contactName,
    company: facts.company,
    city: facts.city,
    recentActivities: facts.activities.map((activity) => ({
      type: activity.type,
      description: activity.description,
      at: activity.createdAt,
    })),
  };
}

export async function generateLeadScore(facts: ScoreFacts) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await complete(SCORE_SYSTEM_PROMPT, JSON.stringify(scorePayload(facts)));
      return parseScore(extractJson(text));
    } catch (error) {
      lastError = error;
      if (error instanceof HttpError && error.status !== 502) throw error;
    }
  }
  if (lastError instanceof HttpError) throw lastError;
  throw new HttpError(502, "The AI response could not be validated. Try again.");
}

export async function generateFollowUpEmail(facts: EmailFacts) {
  const payload = {
    tone: facts.tone,
    repName: facts.repName,
    ...scorePayload(facts),
    recentActivities: facts.activities.slice(0, 5).map((activity) => ({
      type: activity.type,
      description: activity.description,
      at: activity.createdAt,
    })),
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await complete(EMAIL_SYSTEM_PROMPT, JSON.stringify(payload));
      return parseEmail(extractJson(text));
    } catch (error) {
      lastError = error;
      if (error instanceof HttpError && error.status !== 502) throw error;
    }
  }
  if (lastError instanceof HttpError) throw lastError;
  throw new HttpError(502, "The AI response could not be validated. Try again.");
}
