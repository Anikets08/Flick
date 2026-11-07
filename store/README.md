# Store assets

Chrome Web Store graphics, made from the real extension running in Chromium
with demo data (a fictional "Northwind" site, shortcuts, snippets, tabs and
bookmarks). Listing copy: [`docs/STORE_LISTING.md`](../docs/STORE_LISTING.md).

```bash
FLICK_E2E=1 npx wxt build           # build with host access, so scripts can open the palette
node store/scripts/capture.mjs      # raw captures → store/raw/
node store/scripts/compose.mjs      # screenshots + promo tiles → store/screenshots/, store/promo/
node store/scripts/video.mjs        # promo video → store/video/flick-promo.mp4 (needs ffmpeg)
```

| Script | What it does |
|---|---|
| `demo-pages.mjs` | The fictional pages every http(s) request is answered with |
| `demo-browser.mjs` | Launches Chromium with Flick and seeds the demo data |
| `capture.mjs` | Opens the palette with different queries and runs page tools; saves 2× captures |
| `compose.mjs` | Lays the captures out with headlines at store sizes |
| `video.mjs` | Records a live demo, adds captions and title cards |
