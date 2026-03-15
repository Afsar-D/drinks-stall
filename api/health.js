export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  res.json({
    ok: true,
    environment: process.env.NODE_ENV || 'production',
    hasAdminPasscode: Boolean(process.env.ADMIN_PASSCODE),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    timestamp: new Date().toISOString(),
  });
}
