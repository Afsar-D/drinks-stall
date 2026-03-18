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
  const { reason = '' } = req.body || {};

  const { data: row, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return res.status(404).json({ message: 'Payment request not found' });
  }

  if (row.status === 'cancelled') {
    return res.status(200).json(toResponseRow(row));
  }

  if (row.status === 'approved') {
    return res.status(409).json({ message: 'Approved payment cannot be cancelled' });
  }

  const { data: updated, error: updateError } = await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ message: 'Failed to cancel payment' });
  }

  // Create audit log entry (non-critical; continue if it fails)
  if (process.env.AUDIT_LOGS_ENABLED !== 'false') {
    try {
      const auditId = `AUDIT-${Date.now().toString().slice(-8)}`;
      await supabase.from('audit_logs').insert({
        id: auditId,
        payment_id: id,
        action: 'cancelled',
        note: reason ? `Reason: ${reason}` : 'No reason provided'
      });
    } catch (auditError) {
      // Silently fail if audit_logs table doesn't exist yet or on other errors
      console.error('Audit log creation failed (non-critical):', auditError.message);
    }
  }

  return res.json(toResponseRow(updated));
}
