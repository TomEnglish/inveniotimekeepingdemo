# Invenio Timekeeping — marketing site

Static demo / landing page for the [Timekeeping app](https://invenio-timekeeping.netlify.app).
Sister site to [inveniocontrolsdemo](https://github.com/TomEnglish/inveniocontrolsdemo);
same shape, same stack, same Playwright-driven screenshot pipeline.

## Local preview

```sh
npm run dev
# → http://localhost:5500
```

(Plain `python3 -m http.server`. No build step.)

## Refreshing screenshots

```sh
npm install -D playwright
npx playwright install chromium

APP_URL=https://invenio-timekeeping.netlify.app \
APP_EMAIL=t.elliott.english@gmail.com \
APP_PASSWORD='your-password' \
npm run screenshots
```

Outputs PNGs to `screenshots/` at 1440×900 viewport, 2× device scale (retina).
Re-run any time the UI changes — overwrites in place.

The `flow-editor` capture drills into the first row of `/admin/flows` to land on
the editor. If your tenant has no flows seeded yet, that capture will fall back
to the list view; create a flow first.

## Hosting

Netlify, static publish from the repo root. `netlify.toml` declares the empty
build command. Contact form is wired to Netlify Forms via `data-netlify="true"`.

## Files

```
index.html         single-page site with 5 sections
styles.css         Invenio design tokens, mirrored from the app
screenshots.js     Playwright capture script
brand/             Invenio Technologies SVG lockups + marks
favicon.svg
netlify.toml
package.json       only dev dep is playwright
```
