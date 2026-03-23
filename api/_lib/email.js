function getEmailProvider() {
  return (process.env.EMAIL_PROVIDER || 'auto').trim().toLowerCase();
}

function getProviderPriority() {
  const raw = (process.env.EMAIL_PROVIDER_PRIORITY || 'resend,brevo').trim().toLowerCase();
  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value === 'resend' || value === 'brevo');
  return values.length > 0 ? values : ['resend', 'brevo'];
}

function getFromEmail() {
  return process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.BREVO_FROM_EMAIL || '';
}

async function parseEmailApiError(response) {
  try {
    const body = await response.json();
    if (body?.message) return body.message;
    if (body?.error?.message) return body.error.message;
    return JSON.stringify(body);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function sendWithResend({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, message: 'RESEND_API_KEY missing' };
  }

  const from = getFromEmail();
  if (!from) {
    return { success: false, message: 'EMAIL_FROM or RESEND_FROM_EMAIL missing' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const message = await parseEmailApiError(response);
    return { success: false, message: `Resend send failed: ${message}` };
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}

async function sendWithBrevo({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    return { success: false, message: 'BREVO_API_KEY missing' };
  }

  const from = getFromEmail();
  if (!from) {
    return { success: false, message: 'EMAIL_FROM or BREVO_FROM_EMAIL missing' };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const message = await parseEmailApiError(response);
    return { success: false, message: `Brevo send failed: ${message}` };
  }

  const result = await response.json();
  return { success: true, messageId: result.messageId };
}

async function sendEmail({ to, subject, html }) {
  const provider = getEmailProvider();

  if (provider === 'auto') {
    const priority = getProviderPriority();
    let lastError = 'No email providers configured';

    for (const currentProvider of priority) {
      const result = currentProvider === 'resend'
        ? await sendWithResend({ to, subject, html })
        : await sendWithBrevo({ to, subject, html });

      if (result.success) {
        return { ...result, provider: currentProvider };
      }

      lastError = result.message;
    }

    return { success: false, message: `Auto provider failed: ${lastError}` };
  }

  if (provider === 'brevo') {
    const result = await sendWithBrevo({ to, subject, html });
    if (result.success) return result;

    if (process.env.EMAIL_ALLOW_FAILOVER === 'true') {
      const fallback = await sendWithResend({ to, subject, html });
      if (fallback.success) {
        return { ...fallback, provider: 'resend' };
      }
      return { success: false, message: `Primary brevo failed (${result.message}); fallback resend failed (${fallback.message})` };
    }

    return result;
  }

  if (provider === 'resend') {
    const result = await sendWithResend({ to, subject, html });
    if (result.success) return result;

    if (process.env.EMAIL_ALLOW_FAILOVER === 'true') {
      const fallback = await sendWithBrevo({ to, subject, html });
      if (fallback.success) {
        return { ...fallback, provider: 'brevo' };
      }
      return { success: false, message: `Primary resend failed (${result.message}); fallback brevo failed (${fallback.message})` };
    }

    return result;
  }

  return { success: false, message: `Unsupported EMAIL_PROVIDER: ${provider}` };
}

export async function sendInvoiceEmail(customerEmail, customerName, orderId, items, total, orderDate) {
  if (!customerEmail) {
    return { success: false, message: 'No email provided' };
  }

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">x${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { border: 1px solid #e5e7eb; border-top: none; padding: 20px; }
          .invoice-number { font-size: 14px; color: #666; margin: 10px 0; }
          table { width: 100%; margin: 20px 0; border-collapse: collapse; }
          th { background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
          .total-row { font-weight: bold; font-size: 18px; background: #f9fafb; }
          .footer { text-align: center; padding-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; margin-top: 20px; }
          .thank-you { color: #667eea; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice Approved ✓</h1>
            <p>Your order has been confirmed</p>
          </div>
          <div class="content">
            <p>Hi ${customerName},</p>
            <p>Thank you for your order! Your payment has been approved. Below is your invoice:</p>
            
            <div class="invoice-number">
              <strong>Invoice Number:</strong> ${orderId}<br>
              <strong>Date:</strong> ${orderDate}<br>
              <strong>Customer:</strong> ${customerName}
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td colspan="2" style="padding: 12px; text-align: right;">Total:</td>
                  <td style="padding: 12px; text-align: right;">₹${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <p class="thank-you">Thank you for your purchase!</p>
            <p>If you have any questions, please reply to this email.</p>
          </div>
          <div class="footer">
            <p>Liquid Library | Farewell Stall</p>
            <p>© 2026 All rights reserved</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // Always use Brevo for customer invoices
    return await sendWithBrevo({
      to: customerEmail,
      subject: `Invoice ${orderId} - Approved`,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, message: `Email error: ${error?.message || 'unknown error'}` };
  }
}

export async function sendAdminPaymentRequestNotification({
  requestId,
  customerName,
  customerEmail,
  total,
  itemCount,
  createdAt,
}) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    return { success: false, message: 'ADMIN_NOTIFY_EMAIL missing' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">New Payment Request</h2>
        <p style="margin-top: 0; color: #4b5563;">A new customer request is waiting for approval.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
          <tbody>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Request ID</td>
              <td style="padding: 8px 0; font-weight: 700;">${requestId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Customer</td>
              <td style="padding: 8px 0;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Email</td>
              <td style="padding: 8px 0;">${customerEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Items</td>
              <td style="padding: 8px 0;">${itemCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Total</td>
              <td style="padding: 8px 0; font-weight: 700;">Rs ${Number(total).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Created</td>
              <td style="padding: 8px 0;">${createdAt}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  try {
    // Always use Brevo for admin notifications
    return await sendWithBrevo({
      to: adminEmail,
      subject: `New payment request ${requestId}`,
      html: htmlContent,
    });
  } catch (error) {
    return { success: false, message: `Admin email error: ${error?.message || 'unknown error'}` };
  }
}
