import supabase from '../_lib/supabase.js';
import { toResponseRow } from '../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: 'Payment request not found' });
  }

  return res.json(toResponseRow(data));
}
