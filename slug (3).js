// SikiaIQit share card. Link format: https://app.sikiaiq.com/s/<slug>
// WhatsApp, Facebook, X, Telegram and LinkedIn read the title and picture from this page.
// A person who taps the link is sent straight on to the public page.
const SUPA = 'https://xjfbytiyzpeijbpnfhuc.supabase.co';
const KEY = 'sb_publishable_aOnmFvGYeevP6fVd4qxFZw_K6tcC7MC'; // public (publishable) key, safe to include
const BOT = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|skypeuripreview|pinterest|embedly|bot\b/i;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestGet({ request, params }) {
  const slug = String(params.slug || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const origin = new URL(request.url).origin;
  const srcq = (new URL(request.url).searchParams.get('src') || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
  const target = origin + '/engage.html?s=' + encodeURIComponent(slug) + (srcq ? '&src=' + srcq : '');
  if (!slug) return Response.redirect(origin + '/', 302);
  const peek = new URL(request.url).searchParams.get('card') === '1'; // add ?card=1 to see the card a bot sees
  if (!peek && !BOT.test(request.headers.get('user-agent') || '')) return Response.redirect(target, 302);
  let title = 'Have your say', desc = 'Tap to take part. It only takes a minute.', img = '', wide = false;
  try {
    const r = await fetch(SUPA + '/rest/v1/rpc/pe_public_get', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug, p_preview: false }),
    });
    const e = r.ok ? await r.json() : null;
    if (e && e.title) {
      try {
        const si = e.settings && e.settings.share_image;
        const qi = (Array.isArray(e.questions) ? e.questions : []).find((q) => q && typeof q.img === 'string' && q.img.indexOf(SUPA + '/storage/') === 0);
        const mf = e.settings && e.settings.material && e.settings.material.file;
        if (si && String(si).indexOf(SUPA + '/storage/') === 0) { img = si; wide = true; } else if (qi) img = qi.img; else if (mf && mf.url && String(mf.url).indexOf(SUPA + '/storage/') === 0 && /\.(jpe?g|png|webp)(\?|$)/i.test(mf.url)) img = mf.url;
      } catch (x) {}
      title = String(e.title).slice(0, 90);
      const who = e.org_label ? String(e.org_label).slice(0, 60) : '';
      desc = (e.description ? String(e.description).replace(/\s+/g, ' ').slice(0, 160) : (who ? who + ' wants to hear from you.' : desc));
    }
  } catch (err) { /* fall back to the generic card */ }
  const pic = img || (origin + '/og-image-sikiaiq.png');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
    '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta property="og:type" content="website"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + esc(origin + '/s/' + slug) + '">' +
    '<meta property="og:image" content="' + esc(pic) + '">' +
    (wide ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : '') + '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '"><meta name="twitter:image" content="' + esc(pic) + '">' +
    '</head><body style="font-family:Arial,sans-serif;max-width:620px;margin:24px auto;padding:0 12px"><img src="' + esc(pic) + '" alt="" style="width:100%;border-radius:10px"><h2>' + esc(title) + '</h2><p>' + esc(desc) + '</p><p><a href="' + esc(target) + '">Open the poll</a></p>' + (peek ? '<p style="color:#888;font-size:13px">Share picture: ' + (wide ? 'custom (made from your option pictures)' : img ? 'option picture' : 'default') + '</p>' : '') + '</body></html>';
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
