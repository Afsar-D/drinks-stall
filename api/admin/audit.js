import supabase from '../_lib/supabase.js';
import { requireAdmin, formatDisplayDateTime } from '../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, payment_id, action, note, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // If table doesn't exist yet, return empty array gracefully
    if (error) {
      if (error.message && error.message.includes('does not exist')) {
        return res.json([]);
      }
      console.error(error);
      return res.status(500).json({ message: 'Failed to fetch audit logs' });
    }

    // Transform the response to match frontend expectations
    const logs = data.map((log) => ({
      id: log.id,
      paymentId: log.payment_id,
      action: log.action,
      createdAt: log.created_at ? formatDisplayDateTime(log.created_at) : '',
      note: log.note
    }));

    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
}
