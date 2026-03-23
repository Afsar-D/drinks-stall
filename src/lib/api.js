const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function parseResponse(response, fallbackMessage) {
  if (response.ok) {
    return response.json();
  }

  let message = fallbackMessage;
  try {
    const body = await response.json();
    if (body?.message) {
      message = body.message;
    }
  } catch {
    // Keep fallback message when response is not JSON.
  }

  throw new Error(message);
}

export async function requestPayment(payload) {
  const response = await fetch(`${API_BASE_URL}/api/payments/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response, 'Unable to create payment request');
}

export async function getPaymentById(requestId) {
  const response = await fetch(`${API_BASE_URL}/api/payments/${requestId}`);
  return parseResponse(response, 'Unable to fetch payment status');
}

export async function getLatestPaymentByCustomer(customerName, customerEmail) {
  const params = new URLSearchParams({
    name: customerName,
    email: customerEmail,
  });

  const response = await fetch(`${API_BASE_URL}/api/payments/find?${params.toString()}`);
  return parseResponse(response, 'Unable to find payment request');
}

export async function adminLogin(code) {
  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  return parseResponse(response, 'Invalid admin code');
}

export async function getAdminPayments(status, code, search = '') {
  const params = new URLSearchParams({ status });
  if (search.trim()) {
    params.set('search', search.trim());
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/payments?${params.toString()}`, {
    headers: { 'x-admin-code': code }
  });
  return parseResponse(response, `Unable to load ${status} payments`);
}

export async function approvePayment(requestId, code) {
  const response = await fetch(`${API_BASE_URL}/api/admin/payments/${requestId}/approve`, {
    method: 'POST',
    headers: { 'x-admin-code': code }
  });
  return parseResponse(response, 'Unable to approve payment');
}

export async function cancelPayment(requestId, code, reason) {
  const response = await fetch(`${API_BASE_URL}/api/admin/payments/${requestId}/cancel`, {
    method: 'POST',
    headers: {
      'x-admin-code': code,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });
  return parseResponse(response, 'Unable to cancel payment');
}

export async function getAdminSummary(code) {
  const response = await fetch(`${API_BASE_URL}/api/admin/summary`, {
    headers: { 'x-admin-code': code }
  });
  return parseResponse(response, 'Unable to load summary');
}

export async function getAdminAuditLogs(code, limit = 50) {
  const response = await fetch(`${API_BASE_URL}/api/admin/audit?limit=${limit}`, {
    headers: { 'x-admin-code': code }
  });
  return parseResponse(response, 'Unable to load audit logs');
}

export async function downloadAdminBackupCsv(code) {
  const response = await fetch(`${API_BASE_URL}/api/admin/export/payments.csv`, {
    headers: { 'x-admin-code': code }
  });

  if (!response.ok) {
    await parseResponse(response, 'Unable to export backup CSV');
  }

  return response.blob();
}
