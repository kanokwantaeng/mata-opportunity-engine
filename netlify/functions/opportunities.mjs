import { json, body, requireAccess } from './lib/http.mjs';
import { getSupabase } from './lib/supabase.mjs';

export default async (req) => {
  const access = requireAccess(req); if (!access.ok) return access.response;
  const db = getSupabase();
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url); const id = url.searchParams.get('id');
      let q = db.from('opportunities').select('*').order('updated_at', { ascending: false });
      if (id) q = q.eq('id', id).single();
      const { data, error } = await q; if (error) throw error;
      return json({ data });
    }
    if (req.method === 'POST') {
      const payload = await body(req);
      const { data, error } = await db.from('opportunities').insert(payload).select().single();
      if (error) throw error; return json({ data }, 201);
    }
    if (req.method === 'PATCH') {
      const payload = await body(req); const { id, ...changes } = payload;
      if (!id) return json({ error: 'id is required' }, 400);
      const { data, error } = await db.from('opportunities').update(changes).eq('id', id).select().single();
      if (error) throw error; return json({ data });
    }
    if (req.method === 'DELETE') {
      const url = new URL(req.url); const id = url.searchParams.get('id');
      if (!id) return json({ error: 'id is required' }, 400);
      const { error } = await db.from('opportunities').delete().eq('id', id); if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (e) { return json({ error: e.message }, 500); }
};
