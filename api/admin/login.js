export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code } = req.body;
  const adminPasscode = process.env.ADMIN_PASSCODE || '7860';

  if (code === adminPasscode) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, message: 'Invalid admin code' });
}
