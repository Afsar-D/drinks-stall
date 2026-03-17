export async function sendInvoiceEmail(customerEmail, customerName, orderId, items, total, orderDate) {
  console.log('sendInvoiceEmail called with:', { customerEmail, customerName, orderId });
  
  if (!customerEmail) {
    console.warn('Email skipped: no customer email provided');
    return { success: false, message: 'No email provided' };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('Email skipped: RESEND_API_KEY not configured');
    return { success: false, message: 'Email service not configured - RESEND_API_KEY missing' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drinksnsweets.com';
  
  console.log('Sending email with API key length:', apiKey?.length, 'from:', fromEmail);

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
            <p>Drinks N Sweets | Farewell Stall</p>
            <p>© 2026 All rights reserved</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@drinksnsweets.com',
        to: customerEmail,
        subject: `Invoice ${orderId} - Approved`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return { success: false, message: `Failed to send email: ${error.message || response.statusText}` };
    }

    const result = await response.json();
    console.log('Email sent successfully:', result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Email service error:', error.message, error.stack);
    return { success: false, message: `Email error: ${error.message}` };
  }
}
