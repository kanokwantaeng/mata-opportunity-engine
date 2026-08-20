import { json, body, requireAccess } from './lib/http.mjs';
import { getSupabase } from './lib/supabase.mjs';

export default async (req) => {
  const access = requireAccess(req); if (!access.ok) return access.response;
  const db = getSupabase();
  try {
    if (req.method === 'GET') {
      const opportunityId = new URL(req.url).searchParams.get('opportunity_id');
      const { data, error } = await db.from('validation_experiments').select('*, validation_results(*)').eq('opportunity_id', opportunityId).order('created_at');
      if (error) throw error; return json({ data });
    }
    if (req.method === 'POST') {
      const payload = await body(req);
      const table = payload.kind === 'result' ? 'validation_results' : 'validation_experiments';
      delete payload.kind;
      const { data, error } = await db.from(table).insert(payload).select().single();
      if (error) throw error; return json({ data }, 201);
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (e) { return json({ error: e.message }, 500); }
};
