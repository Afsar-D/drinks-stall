export function toResponseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    items: JSON.parse(row.items_json),
    total: row.total,
    createdAt: row.created_at,
    status: row.status,
    orderId: row.order_id,
    orderDate: row.order_date,
    approvedAt: row.approved_at,
  };
}

export function formatDisplayDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export function requireAdmin(req) {
  const code = req.headers['x-admin-code'];
  const adminPasscode = process.env.ADMIN_PASSCODE;
  if (!adminPasscode) {
    return false;
  }
  return code === adminPasscode;
}
