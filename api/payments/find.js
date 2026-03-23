import supabase from '../_lib/supabase.js';
import { toResponseRow } from '../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email } = req.query;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!normalizedName || !normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Valid name and email are required' });
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .ilike('customer_name', normalizedName)
    .ilike('customer_email', normalizedEmail)
    .order('inserted_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Find payment request error:', error);
    return res.status(500).json({ message: 'Failed to find payment request' });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ message: 'No request found for this name and email' });
  }

  return res.json(toResponseRow(data[0]));
}
