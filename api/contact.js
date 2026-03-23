export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, phone } = req.body;

  // Validate input
  const phoneRegex = /^[0-9+\-\s()]{7,}$/;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and phone are required' });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  try {
    // Send email notification to admin
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: 'afsar@liquiddevelopers.com', // Change this to your email
        subject: `New Contact Submission - Liquid Library`,
        html: `
          <h2>New Contact Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send failed:', error);
      return res.status(500).json({ message: 'Failed to process submission' });
    }

    // Also log to console for Vercel logs
    console.log('Contact form submission:', {
      name,
      phone,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ message: 'Thank you! We\'ve received your information' });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ message: 'Failed to process submission' });
  }
}
