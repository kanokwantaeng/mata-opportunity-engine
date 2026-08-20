export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

export function requireAccess(req) {
  const expected = process.env.APP_ACCESS_KEY;
  if (!expected) return { ok: false, response: json({ error: 'APP_ACCESS_KEY is not configured' }, 503) };
  const actual = req.headers.get('x-mata-access-key');
  if (!actual || actual !== expected) return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  return { ok: true };
}
