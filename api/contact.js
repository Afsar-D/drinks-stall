export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, phone, message } = req.body;

  // Validate input
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9+\-\s()]{7,}$/;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  if (message.trim().length < 10) {
    return res.status(400).json({ message: 'Message must be at least 10 characters' });
  }

  try {
    // Log the contact submission (you can view in Vercel logs)
    console.log('Contact form submission:', {
      name,
      email,
      phone,
      message,
      timestamp: new Date().toISOString()
    });

    // Return success
    return res.status(200).json({ message: 'Message received successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ message: 'Failed to process message' });
  }
}
