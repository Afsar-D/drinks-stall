import supabase from '../_lib/supabase.js';
import { sendAdminPaymentRequestNotification } from '../_lib/email.js';
import { formatDisplayDateTime } from '../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { customerName, customerEmail, items, total } = req.body;
  const normalizedEmail = typeof customerEmail === 'string' ? customerEmail.trim() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !customerName ||
    !normalizedEmail ||
    !emailRegex.test(normalizedEmail) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    typeof total !== 'number'
  ) {
    return res.status(400).json({ message: 'Invalid payment request payload' });
  }

  const id = `PAY-${Date.now().toString().slice(-6)}`;
  const createdAt = formatDisplayDateTime();

  const { error } = await supabase.from('payments').insert({
    id,
    customer_name: customerName.trim(),
    customer_email: normalizedEmail,
    items_json: JSON.stringify(items),
    total,
    created_at: createdAt,
    status: 'pending',
  });

  if (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to create payment request' });
  }

  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const notifyResult = await sendAdminPaymentRequestNotification({
    requestId: id,
    customerName: customerName.trim(),
    customerEmail: normalizedEmail,
    total,
    itemCount,
    createdAt,
  });

  if (!notifyResult.success) {
    // Non-blocking: payment request should still be created even if email fails.
    console.warn('Admin notification skipped:', notifyResult.message);
  }

  return res.status(201).json({ requestId: id, status: 'pending' });
}
