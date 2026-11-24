#!/usr/bin/env node
/*
 * RC-Craft build: អានបញ្ជី Mod ពី Firestore (REST, មិនត្រូវការ npm package)
 * រួចបង្កើតថត public/ ដែលមាន៖
 *   - index.html (ដាក់តំណទៅ Mod ទាំងអស់ ឲ្យ Google រកឃើញ)
 *   - mod/<id>/index.html  (ទំព័រ HTML ពិតប្រាកដសម្រាប់ Mod នីមួយៗ)
 *   - sitemap.xml, robots.txt
 * ប្រើ៖  node build.js   (ត្រូវការ Node 18+)
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const SRC = ROOT;
const SITE_FILES = ["index.html", "config.js", "firebase-shim.js", "logo.jpg"];
const OUT = path.join(ROOT, "public");

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(SRC, "config.js"), "utf8"), sandbox);
const cfg = sandbox.window.RC_CONFIG;
const SITE = String(cfg.siteUrl || "").replace(/\/+$/, "");
const PROJECT = cfg.firebase && cfg.firebase.projectId;
if (!PROJECT || PROJECT.startsWith("YOUR_")) {
  console.error("សូមបំពេញ firebase.projectId ក្នុង config.js មុន");
  process.exit(1);
}

const TYPES = { addon: "Addon", texture: "Texture Pack", modpack: "Java Modpack" };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "");

function decode(v) {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(f) {
  const o = {};
  for (const k of Object.keys(f)) o[k] = decode(f[k]);
  return o;
}

async function fetchPosts() {
  const posts = [];
  let token = "";
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/posts?pageSize=300${token ? "&pageToken=" + encodeURIComponent(token) : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    for (const d of j.documents || []) {
      const o = decodeFields(d.fields || {});
      o.id = d.name.split("/").pop();
      posts.push(o);
    }
    token = j.nextPageToken || "";
  } while (token);
  return posts.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

const imgUrl = (i) => (i && typeof i.u === "string" && /^https:\/\//i.test(i.u) ? i.u : "");
const shortText = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

function modPage(p) {
  const type = TYPES[p.type] || "Addon";
  const url = `${SITE}/mod/${p.id}/`;
  const title = `${p.title} – ${type}${p.ver ? " " + p.ver : ""} | RC-Craft`;
  const desc = shortText(p.caption, 155) || `ទាញយក ${p.title} (${type}) សម្រាប់ Minecraft ជាភាសាខ្មែរ`;
  const images = [p.cover].concat(Array.isArray(p.gallery) ? p.gallery : []).map(imgUrl).filter(Boolean);
  const og = images[0] || `${SITE}/logo.jpg`;
  const links = (Array.isArray(p.links) ? p.links : []).map((l) => ({ label: l && l.label, url: safeUrl(l && l.url) })).filter((l) => l.url);
  const date = p.ts ? new Date(p.ts).toISOString() : undefined;
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: p.title,
    description: desc,
    applicationCategory: "GameApplication",
    operatingSystem: p.ver || "Minecraft",
    inLanguage: "km",
    url,
    image: images.length ? images : [og],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  if (date) ld.datePublished = date;
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "RC-Craft", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: p.title, item: url },
    ],
  };
  const gallery = images.map((s) => `<img src="${esc(s)}" alt="${esc(p.title)}" loading="lazy">`).join("");
  return `<!doctype html>
<html lang="km"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/logo.jpg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="RC-Craft">
<meta property="og:locale" content="km_KH">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<script type="application/ld+json">${JSON.stringify(crumbs).replace(/</g, "\\u003c")}</script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Khmer:wght@400;600;700&display=swap">
<style>
:root{--bg:#F5F2EC;--surface:#fff;--ink:#1E1E1E;--muted:#6F6B63;--line:#E6E1D6;--red:#D93A30}
@media (prefers-color-scheme:dark){:root{--bg:#17161A;--surface:#222127;--ink:#F3F1EC;--muted:#A8A39A;--line:#34323A;--red:#FF6A5F}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Noto Sans","Noto Sans Khmer",system-ui,sans-serif;border-top:8px solid var(--red)}
.wrap{max-width:860px;margin:0 auto;padding:16px}
a{color:inherit}.back{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;margin-bottom:12px}
.back img{width:36px;height:36px;border-radius:10px}
article{background:var(--surface);border:2.5px solid var(--line);border-radius:24px;padding:20px}
h1{font-size:clamp(22px,5vw,30px);line-height:1.35;margin:8px 0;overflow-wrap:anywhere}
.chips{display:flex;gap:10px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:14px}
.pill{background:var(--red);color:#fff;font-weight:700;font-size:13.5px;padding:3px 12px;border-radius:10px}
.gal{display:grid;gap:10px;margin:14px 0}.gal img{width:100%;border-radius:16px;border:2px solid var(--line)}
.cap{white-space:pre-wrap;overflow-wrap:anywhere}
h2{font-size:15px;color:var(--muted);margin:18px 0 8px}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 20px;border-radius:999px;border:2px solid var(--line);text-decoration:none;font-weight:600}
.btn.primary{background:var(--red);border-color:var(--red);color:#fff}
.foot{color:var(--muted);font-size:12.5px;padding:22px 0}
</style></head><body>
<div class="wrap">
<a class="back" href="/"><img src="/logo.jpg" alt="RC-Craft"> RC-Craft</a>
<article>
<div class="chips"><span class="pill">${esc(type)}</span>${p.ver ? `<span>${esc(p.ver)}</span>` : ""}${p.size ? `<span>${esc(p.size)}</span>` : ""}${date ? `<time datetime="${date}">${date.slice(0, 10)}</time>` : ""}</div>
<h1>${esc(p.title)}</h1>
${gallery ? `<div class="gal">${gallery}</div>` : ""}
${p.caption ? `<p class="cap">${esc(p.caption)}</p>` : ""}
<h2>ទាញយក</h2>
<div class="btns">${links.length ? links.map((l) => `<a class="btn primary" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(l.label || "ទាញយក")}</a>`).join("") : '<span class="chips">មិនទាន់មានតំណទាញយកទេ។</span>'}
<a class="btn" href="/#mod-${esc(p.id)}">មតិយោបល់ និងរក្សាទុក</a></div>
</article>
<p class="foot">RC-Craft ជាគេហទំព័រសហគមន៍ មិនមែនជាផលិតផលផ្លូវការរបស់ Mojang ឬ Microsoft ទេ។ Minecraft ជាពាណិជ្ជសញ្ញារបស់ Mojang Studios។</p>
</div></body></html>
`;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

(async () => {
  const posts = await fetchPosts();
  console.log(`រកឃើញ Mod ${posts.length}`);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of SITE_FILES) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));

  const list = posts.length
    ? `<h2>Mod ទាំងអស់</h2><ul>${posts.map((p) => `<li><a href="/mod/${esc(p.id)}/">${esc(p.title)} <span>(${esc(TYPES[p.type] || "Addon")})</span></a></li>`).join("")}</ul>`
    : "";
  const idxPath = path.join(OUT, "index.html");
  let idx = fs.readFileSync(idxPath, "utf8").split("%%SITE_URL%%").join(SITE).replace("<!--MODS_LIST-->", list);
  fs.writeFileSync(idxPath, idx);

  for (const p of posts) {
    const dir = path.join(OUT, "mod", p.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), modPage(p));
  }

  const lastmod = (p) => new Date(p.upd || p.ts || Date.now()).toISOString().slice(0, 10);
  const urls = [`<url><loc>${SITE}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`]
    .concat(posts.map((p) => `<url><loc>${SITE}/mod/${esc(p.id)}/</loc><lastmod>${lastmod(p)}</lastmod></url>`));
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log("រួចរាល់ → public/  (បន្ទាប់៖ firebase deploy)");
})().catch((e) => { console.error(e.message || e); process.exit(1); });
