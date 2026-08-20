import { json, body, requireAccess } from './lib/http.mjs';
import { getSupabase } from './lib/supabase.mjs';

export default async (req) => {
  const access = requireAccess(req); if (!access.ok) return access.response;
  const db = getSupabase();
  try {
    if (req.method === 'GET') {
      const opportunityId = new URL(req.url).searchParams.get('opportunity_id');
      if (!opportunityId) return json({ error: 'opportunity_id is required' }, 400);
      const [{ data: evidence, error: e1 }, { data: assumptions, error: e2 }] = await Promise.all([
        db.from('evidence').select('*').eq('opportunity_id', opportunityId).order('created_at'),
        db.from('assumptions').select('*').eq('opportunity_id', opportunityId).order('created_at')
      ]);
      if (e1) throw e1; if (e2) throw e2; return json({ evidence, assumptions });
    }
    if (req.method === 'POST') {
      const payload = await body(req);
      const table = payload.kind === 'assumption' ? 'assumptions' : 'evidence';
      delete payload.kind;
      const { data, error } = await db.from(table).insert(payload).select().single();
      if (error) throw error; return json({ data }, 201);
    }
    if (req.method === 'PATCH') {
      const payload = await body(req); const { id, kind, ...changes } = payload;
      const table = kind === 'assumption' ? 'assumptions' : 'evidence';
      const { data, error } = await db.from(table).update(changes).eq('id', id).select().single();
      if (error) throw error; return json({ data });
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (e) { return json({ error: e.message }, 500); }
};
