// Fictional pages the demo browser shows behind the palette. Every http(s)
// request is answered from here, so captures are reproducible and show no
// real sites or personal data.

const base = (title, body, extraCss = '') => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<style>
  *{box-sizing:border-box;margin:0}
  body{font:16px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc}
  nav{display:flex;align-items:center;gap:32px;padding:20px 64px;background:#fff;border-bottom:1px solid #e2e8f0}
  nav b{font-size:20px;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
  nav b i{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#f97316,#ec4899);display:inline-block}
  nav span{color:#64748b;font-size:15px}
  nav .cta{margin-left:auto;background:#0f172a;color:#fff;padding:9px 18px;border-radius:999px;font-size:14px}
  ${extraCss}
</style></head><body>${body}</body></html>`;

const nav = `<nav><b><i></i>Northwind</b><span>Product</span><span>Pricing</span><span>Docs</span><span>Blog</span><span class="cta">Start free</span></nav>`;

function landing() {
  return base(
    'Northwind — Plan launches your team will love',
    `${nav}
    <section class="hero">
      <div>
        <p class="tag">New · Launch boards 2.0</p>
        <h1>Plan launches your<br>team will love.</h1>
        <p class="sub">Roadmaps, docs and release notes in one calm workspace. Ship on time without the status meetings.</p>
        <div class="btns"><span class="p">Get started — it's free</span><span class="s">Book a demo</span></div>
      </div>
      <div class="art">
        <div class="card c1"><em></em><strong>Q4 Launch</strong><small>12 tasks · 3 due today</small><div class="bar"><span style="width:72%"></span></div></div>
        <div class="card c2"><em style="background:#22c55e"></em><strong>Design review</strong><small>Thu 14:00 · 5 people</small></div>
        <div class="card c3"><em style="background:#6366f1"></em><strong>Release notes</strong><small>Draft · edited 2m ago</small></div>
      </div>
    </section>
    <section class="logos"><span>Trusted by teams at</span><b>Lumen</b><b>Parcel</b><b>Kite&amp;Co</b><b>Orbit</b><b>Fieldnote</b></section>
    <section class="grid">
      <div><i style="background:#fde68a"></i><h3>Roadmaps</h3><p>Drag-and-drop timelines that stay in sync with your tasks.</p></div>
      <div><i style="background:#bbf7d0"></i><h3>Docs</h3><p>Write specs next to the work, with live task embeds.</p></div>
      <div><i style="background:#c7d2fe"></i><h3>Release notes</h3><p>Turn shipped tasks into a changelog in one click.</p></div>
    </section>`,
    `
    .hero{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:center;padding:72px 64px 56px;background:radial-gradient(1200px 500px at 85% 10%,#fde7f3 0,transparent 60%),radial-gradient(900px 500px at 10% 90%,#ffedd5 0,transparent 60%),#fff}
    .tag{display:inline-block;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:600}
    h1{font-size:60px;line-height:1.04;letter-spacing:-.035em;margin:18px 0 18px}
    .sub{font-size:19px;color:#475569;max-width:30em}
    .btns{display:flex;gap:12px;margin-top:28px}.btns span{padding:13px 22px;border-radius:12px;font-weight:600}
    .p{background:linear-gradient(135deg,#f97316,#ec4899);color:#fff}.s{background:#fff;border:1px solid #e2e8f0}
    .art{position:relative;height:340px}
    .card{position:absolute;background:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 20px 50px -20px rgba(15,23,42,.35);border:1px solid #f1f5f9;width:270px;display:grid;gap:4px}
    .card em{width:34px;height:34px;border-radius:10px;background:#f97316;margin-bottom:6px}
    .card small{color:#64748b}.c1{top:0;left:30px}.c2{top:130px;right:0}.c3{top:235px;left:0}
    .bar{height:8px;background:#f1f5f9;border-radius:9px;margin-top:8px}.bar span{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#f97316,#ec4899)}
    .logos{display:flex;gap:44px;align-items:center;padding:26px 64px;color:#94a3b8;border-block:1px solid #e2e8f0;background:#fff}.logos b{font-size:20px;color:#94a3b8}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:40px 64px}
    .grid div{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px}.grid i{display:block;width:40px;height:40px;border-radius:12px;margin-bottom:14px}
    .grid h3{font-size:18px;margin-bottom:6px}.grid p{color:#64748b}`,
  );
}

function docs(title) {
  return base(
    title,
    `${nav}
    <div class="wrap">
      <aside><b>Getting started</b><span>Introduction</span><span class="on">Launch boards</span><span>Roadmaps</span><span>Release notes</span><b>API</b><span>Authentication</span><span>Webhooks</span></aside>
      <main>
        <p class="crumb">Docs / Guides</p>
        <h1>${title.split(' — ')[0]}</h1>
        <p>Launch boards group every task, doc and review for a release in one place. Create one from any roadmap item, or start from a template.</p>
        <h2>Create a board</h2>
        <p>Open a roadmap item and choose <code>New launch board</code>. Tasks tagged with the release move over automatically.</p>
        <pre>curl -X POST https://api.northwind.app/v1/boards \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"name": "Q4 Launch", "template": "product"}'</pre>
        <h2>Invite reviewers</h2>
        <p>Reviewers get a digest of what changed since their last visit, so feedback lands on the latest draft.</p>
      </main>
    </div>`,
    `.wrap{display:grid;grid-template-columns:240px 1fr;max-width:1100px;margin:0 auto;padding:40px 32px;gap:48px}
     aside{display:grid;gap:8px;align-content:start;font-size:15px;color:#475569}aside b{color:#0f172a;margin-top:12px}aside .on{color:#ea580c;font-weight:600}
     main{max-width:680px}.crumb{color:#94a3b8;font-size:14px}main h1{font-size:40px;letter-spacing:-.03em;margin:6px 0 16px}
     main h2{font-size:22px;margin:32px 0 8px}main p{color:#334155;font-size:17px}
     code{background:#fff7ed;color:#c2410c;padding:2px 6px;border-radius:6px;font-size:15px}
     pre{background:#0f172a;color:#e2e8f0;border-radius:14px;padding:20px;margin-top:16px;font:14px/1.6 ui-monospace,monospace}`,
  );
}

/** Page titles by URL, so open tabs read naturally in search results. */
export const TITLES = {
  'https://northwind.app/docs/roadmap': 'Q4 Roadmap — Northwind Docs',
  'https://sketchpad.app/file/dashboard-redesign': 'Dashboard redesign — Sketchpad',
  'https://northwind.app/docs/design-system': 'Design system · Buttons',
  'https://code.northwind.app/web/pull/482': 'Fix onboarding redirect · Pull Request #482',
  'https://mail.northwind.app/inbox': 'Inbox (3) — Northwind Mail',
  'https://music.example/focus': 'Lo-fi beats to focus to',
};

export function demoPage(url) {
  const { origin, pathname } = new URL(url);
  const title = TITLES[origin + pathname];
  if (title) return docs(title);
  if (pathname.startsWith('/docs')) return docs('Launch boards — Northwind Docs');
  return landing();
}
