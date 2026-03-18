import supabase from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ message: 'Unauthorized admin request' });
  }

  try {
    // Default empty summary
    const defaultSummary = {
      totalRequests: 0,
      pendingCount: 0,
      approvedCount: 0,
      cancelledCount: 0,
      approvedTotal: '0.00'
    };

    // Get all payments to calculate summary
    const { data, error } = await supabase
      .from('payments')
      .select('id, status, total');

    // If table doesn't exist or is empty, return default
    if (error) {
      console.error('Summary query error:', error.message);
      if (error.message && error.message.includes('does not exist')) {
        return res.json(defaultSummary);
      }
      // For other errors, still return default instead of failing
      return res.json(defaultSummary);
    }

    if (!data || data.length === 0) {
      return res.json(defaultSummary);
    }

    // Calculate statistics
    const summary = { ...defaultSummary };
    summary.totalRequests = data.length;

    let approvedSum = 0;

    for (const payment of data) {
      const total = Number(payment.total) || 0;
      
      if (payment.status === 'pending') {
        summary.pendingCount++;
      } else if (payment.status === 'approved') {
        summary.approvedCount++;
        approvedSum += total;
      } else if (payment.status === 'cancelled') {
        summary.cancelledCount++;
      }
    }

    summary.approvedTotal = approvedSum.toFixed(2);

    return res.json(summary);
  } catch (err) {
    console.error('Summary calculation error:', err);
    // Return default on any error to not break the refresh chain
    return res.json({
      totalRequests: 0,
      pendingCount: 0,
      approvedCount: 0,
      cancelledCount: 0,
      approvedTotal: '0.00'
    });
  }
}
