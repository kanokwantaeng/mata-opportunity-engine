import OpenAI from 'openai';
import { json, body, requireAccess } from './lib/http.mjs';

const SYSTEM = `You are the analysis layer for MATA Digital Product Opportunity Engine.
Return JSON only. Never invent evidence, reviews, search volume, competitor sales, willingness to pay, or market facts.
Any inference not explicitly provided by the user must be an ASSUMPTION.
Use simple Thai in user-facing text.
Generate exactly 3 product_hypotheses.
Schema:
{
  "buyer_hypothesis":{"payer_description":"","user_description":"","age_range":"","desired_outcome":"","job_to_be_done":""},
  "opportunity_types":[],
  "motivation_draft":{"intensity":0,"frequency":0,"urgency":0,"emotional_relevance":0,"workaround":0,"notes":""},
  "assumptions":[{"statement":"","impact":"LOW|MEDIUM|HIGH|CRITICAL","category":""}],
  "product_hypotheses":[{"rank":1,"name":"","type":"PRINTABLE|EBOOK|TEMPLATE|PROMPT|MINI_COURSE|AI_TOOL|OTHER_DIGITAL","core_outcome":"","description":"","price_hypothesis":0,"rationale":""}],
  "recommended_next_action":"",
  "missing_evidence":[],
  "warnings":[]
}`;

export default async (req) => {
  const access = requireAccess(req); if (!access.ok) return access.response;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!process.env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY is not configured' }, 503);
  try {
    const payload = await body(req);
    if (!payload.raw_input) return json({ error: 'raw_input is required' }, 400);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
      input: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Analyze this product idea:\n${payload.raw_input}` }
      ]
    });
    let text = response.output_text?.trim() || '';
    text = text.replace(/^```json\s*/i,'').replace(/```$/,'').trim();
    const data = JSON.parse(text);
    if (!Array.isArray(data.product_hypotheses) || data.product_hypotheses.length !== 3) {
      throw new Error('AI response must contain exactly 3 product_hypotheses');
    }
    return json({ data });
  } catch (e) { return json({ error: e.message }, 500); }
};
