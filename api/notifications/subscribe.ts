import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { tenant_id, user_id, subscription } = req.body;
    const id = 'sub_' + Math.floor(Math.random() * 1000000);
    
    await turso.execute({
      sql: 'INSERT OR REPLACE INTO push_subscriptions (id, tenant_id, user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [
        id,
        tenant_id,
        user_id,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        new Date().toISOString()
      ]
    });
    
    return res.status(201).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
