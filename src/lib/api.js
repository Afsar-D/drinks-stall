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

export async function adminLogin(code) {
  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  return parseResponse(response, 'Invalid admin code');
}

export async function getAdminPayments(status, code) {
  const response = await fetch(`${API_BASE_URL}/api/admin/payments?status=${status}`, {
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

export async function cancelPayment(requestId, code) {
  const response = await fetch(`${API_BASE_URL}/api/admin/payments/${requestId}/cancel`, {
    method: 'POST',
    headers: { 'x-admin-code': code }
  });
  return parseResponse(response, 'Unable to cancel payment');
}
