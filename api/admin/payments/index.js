import supabase from '../../_lib/supabase.js';
import { toResponseRow, requireAdmin } from '../../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }

  const { status, search } = req.query;
  if (status !== 'pending' && status !== 'approved' && status !== 'cancelled') {
    return res.status(400).json({ message: 'status must be pending, approved, or cancelled' });
  }

  try {
    let query = supabase
      .from('payments')
      .select('*')
      .eq('status', status)
      .order('inserted_at', { ascending: false });

    // Apply search filter if provided - filter after fetching for simplicity
    const { data, error } = await query;

    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to fetch payments' });
    }

    // Filter by search term if provided (client-side filtering)
    let payments = data;
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      payments = data.filter((row) => {
        const nameMatch = (row.customer_name || '').toLowerCase().includes(searchLower);
        const emailMatch = (row.customer_email || '').toLowerCase().includes(searchLower);
        const idMatch = (row.id || '').toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || idMatch;
      });
    }

    // Transform data with error handling for invalid JSON
    payments = payments.map((row) => {
      try {
        return toResponseRow(row);
      } catch (jsonError) {
        console.error(`Failed to parse items_json for payment ${row.id}:`, jsonError);
        // Return a safe response with empty items if JSON parsing fails
        return {
          id: row.id,
          customerName: row.customer_name,
          items: [],
          total: row.total,
          createdAt: row.created_at,
          status: row.status,
          orderId: row.order_id,
          orderDate: row.order_date,
          approvedAt: row.approved_at,
        };
      }
    });

    return res.json(payments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch payments' });
  }
}
