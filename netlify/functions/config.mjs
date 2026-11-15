// GET /api/config -> public tracking IDs (safe to expose; set them in Netlify env vars)
export default async () => {
  const clean = (v) => (v || '').trim().replace(/[^A-Za-z0-9-]/g, '');
  return Response.json(
    {
      ga: clean(Netlify.env.get('GA4_ID')),
      meta: clean(Netlify.env.get('META_PIXEL_ID')),
      tt: clean(Netlify.env.get('TIKTOK_PIXEL_ID')),
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
};

export const config = { path: '/api/config', method: 'GET' };
