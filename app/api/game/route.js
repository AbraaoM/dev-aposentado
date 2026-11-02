import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS game_saves (
      player_id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  if (!playerId) return Response.json({ error: 'playerId required' }, { status: 400 });
  if (!sql) return Response.json({ error: 'DATABASE_URL not set' }, { status: 503 });

  try {
    await ensureTable();
    const rows = await sql`SELECT state FROM game_saves WHERE player_id = ${playerId}`;
    if (rows.length === 0) return Response.json({ state: null });
    return Response.json({ state: rows[0].state });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { playerId, state } = body;
  if (!playerId || !state) return Response.json({ error: 'playerId and state required' }, { status: 400 });
  if (!sql) return Response.json({ error: 'DATABASE_URL not set' }, { status: 503 });

  try {
    await ensureTable();
    await sql`
      INSERT INTO game_saves (player_id, state, updated_at)
      VALUES (${playerId}, ${JSON.stringify(state)}, NOW())
      ON CONFLICT (player_id) DO UPDATE SET
        state = EXCLUDED.state,
        updated_at = NOW()
    `;
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
