#!/usr/bin/env python3
"""Składa src/ w gotową PWA (dist/) oraz wersję do podglądu online (artifact/)."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).parent
SRC, DIST, ART = ROOT / "src", ROOT / "docs", ROOT / "artifact"
VERSION = "v1"

css = (SRC / "app.css").read_text()
js = (SRC / "data.js").read_text() + "\n" + (SRC / "app.js").read_text()
body = (SRC / "body.html").read_text()
fonts = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700'
         '&family=Bricolage+Grotesque:opsz,wght@12..96,700&family=JetBrains+Mono:wght@400;700&display=swap">')

DIST.mkdir(exist_ok=True)
ART.mkdir(exist_ok=True)
(DIST / ".nojekyll").touch()  # GitHub Pages: serwuj pliki bez przetwarzania przez Jekyll

# Pełna strona PWA
(DIST / "index.html").write_text(f"""<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ściąga Linux</title>
<meta name="description" content="Samouczek i ściąga komend dla CachyOS i Linux Mint.">
<meta name="theme-color" content="#eef2f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#101615" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
""")

# Wersja Artifact (bez własnego szkieletu dokumentu)
(ART / "sciaga-linux.html").write_text(f"""<title>Ściąga Linux</title>
{fonts}
<style>
{css}
</style>
{body}
<script>window.__ARTIFACT = true;</script>
<script>
{js}
</script>
""")

(DIST / "manifest.webmanifest").write_text(json.dumps({
    "name": "Ściąga Linux: CachyOS i Mint",
    "short_name": "Ściąga Linux",
    "description": "Samouczek i ściąga komend dla CachyOS i Linux Mint.",
    "lang": "pl",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "background_color": "#101615",
    "theme_color": "#101615",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        {"src": "icon.svg", "sizes": "any", "type": "image/svg+xml"},
    ],
}, ensure_ascii=False, indent=2))

(DIST / "sw.js").write_text(f"""// Service worker: aplikacja działa offline po pierwszym otwarciu.
const CACHE = 'sciaga-{VERSION}';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
}});
self.addEventListener('fetch', (e) => {{
  if (e.request.method !== 'GET') return;
  // Najpierw sieć (świeża wersja), bez sieci pamięć podręczna.
  e.respondWith(
    fetch(e.request).then((res) => {{
      if (res.ok || res.type === 'opaque') {{ const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }}
      return res;
    }}).catch(() => caches.match(e.request, {{ ignoreSearch: true }}).then((r) => r || caches.match('./index.html')))
  );
}});
""")

(DIST / "icon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#15201e"/>'
    '<path d="M16 22l12 10-12 10" fill="none" stroke="#43cbc2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
    '<rect x="32" y="39" width="17" height="6" rx="3" fill="#94cf6f"/></svg>')


def icon(size, maskable=False):
    s = 4  # supersampling
    W = size * s
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bg = (21, 32, 30, 255)
    if maskable:
        d.rectangle([0, 0, W, W], fill=bg)
        scale, off = W / 64 * 0.72, W * 0.14
    else:
        d.rounded_rectangle([0, 0, W - 1, W - 1], radius=W * 14 / 64, fill=bg)
        scale, off = W / 64, 0
    P = lambda x, y: (off + x * scale, off + y * scale)
    lw = int(6 * scale)
    d.line([P(16, 22), P(28, 32), P(16, 42)], fill=(67, 203, 194, 255), width=lw, joint="curve")
    for x, y in (P(16, 22), P(16, 42), P(28, 32)):
        d.ellipse([x - lw / 2, y - lw / 2, x + lw / 2, y + lw / 2], fill=(67, 203, 194, 255))
    x0, y0 = P(32, 39); x1, y1 = P(49, 45)
    d.rounded_rectangle([x0, y0, x1, y1], radius=3 * scale, fill=(148, 207, 111, 255))
    return img.resize((size, size), Image.LANCZOS)


icon(192).save(DIST / "icon-192.png")
icon(512).save(DIST / "icon-512.png")
icon(512, maskable=True).save(DIST / "icon-maskable-512.png")
print("OK:", sorted(p.name for p in DIST.iterdir()), "+ artifact/sciaga-linux.html")
