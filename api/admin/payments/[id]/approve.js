import supabase from '../../../_lib/supabase.js';
import { toResponseRow, requireAdmin } from '../../../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }

  const { id } = req.query;
  const { data: row, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return res.status(404).json({ message: 'Payment request not found' });
  }

  if (row.status === 'approved') {
    return res.status(200).json(toResponseRow(row));
  }

  if (row.status === 'cancelled') {
    return res.status(409).json({ message: 'Cancelled payment cannot be approved' });
  }

  const orderId = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
  const orderDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const { data: updated, error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'approved',
      order_id: orderId,
      order_date: orderDate,
      approved_at: orderDate,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ message: 'Failed to approve payment' });
  }

  return res.json(toResponseRow(updated));
}
