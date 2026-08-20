import { json, body, requireAccess } from './lib/http.mjs';
import { getSupabase } from './lib/supabase.mjs';
import { calculateScore } from '../../public/shared/scoring.js';

export default async (req) => {
  const access = requireAccess(req); if (!access.ok) return access.response;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const payload = await body(req);
    const result = calculateScore(payload);
    if (payload.opportunity_id) {
      const db = getSupabase();
      const snapshot = {
        opportunity_id: payload.opportunity_id,
        scoring_version: result.scoring_version,
        ...Object.fromEntries(Object.entries(result.dimensions).map(([k,v]) => [`${k}_score`, v])),
        overall_score: result.overall_score,
        confidence: result.confidence,
        decision: result.decision,
        decision_reason: result.decision_reason,
        evidence_snapshot_json: payload.evidence || [],
        assumptions_snapshot_json: payload.assumptions || [],
        gates_json: result.gates,
        red_flags_json: payload.redFlags || []
      };
      const { data, error } = await db.from('score_snapshots').insert(snapshot).select().single();
      if (error) throw error;
      await db.from('opportunities').update({
        current_score: result.overall_score,
        current_confidence: result.confidence,
        current_decision: result.decision,
        scoring_version: result.scoring_version
      }).eq('id', payload.opportunity_id);
      return json({ result, snapshot: data });
    }
    return json({ result });
  } catch (e) { return json({ error: e.message }, 500); }
};
