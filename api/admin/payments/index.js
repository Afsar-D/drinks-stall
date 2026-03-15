import supabase from '../../_lib/supabase.js';
import { toResponseRow, requireAdmin } from '../../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }

  const { status } = req.query;
  if (status !== 'pending' && status !== 'approved' && status !== 'cancelled') {
    return res.status(400).json({ message: 'status must be pending, approved, or cancelled' });
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', status)
    .order('inserted_at', { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch payments' });
  }

  return res.json(data.map(toResponseRow));
}
