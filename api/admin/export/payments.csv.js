import supabase from '../../_lib/supabase.js';
import { requireAdmin, toResponseRow } from '../../_lib/helpers.js';

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function flattenItems(items) {
  return items.map((item) => `${item.quantity}x ${item.name}`).join('; ');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'approved')
      .order('inserted_at', { ascending: false });

    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to export payments' });
    }

    // CSV headers
    const headers = [
      'request_id',
      'invoice_id',
      'customer_name',
      'total',
      'status',
      'created_at',
      'approved_at',
      'items'
    ];

    // Transform data
    const rows = data.map((payment) => {
      const transformed = toResponseRow(payment);
      return [
        transformed.id,
        transformed.orderId || '',
        transformed.customerName,
        Number(transformed.total).toFixed(2),
        transformed.status,
        transformed.createdAt,
        transformed.approvedAt || transformed.orderDate || '',
        flattenItems(transformed.items)
      ];
    });

    // Build CSV string
    const csvString = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    // Send as CSV file
    res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csvString);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to export payments' });
  }
}
