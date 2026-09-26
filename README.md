# SACRO Links

Mobile-first link-in-bio page for the SACRO brand, replacing Linktree. Static site, no framework, no build step, no dependencies: plain HTML, CSS and one vanilla JavaScript file that renders everything from `links.json`.

The client (non-technical) edits only `links.json` on GitHub; Vercel redeploys on every commit, usually in under a minute. The Portuguese editing guide for the client is [GUIA.md](GUIA.md).

## Structure

| Path | What it is |
|---|---|
| `index.html` | Shell: meta + Open Graph tags, GA4 ID slot, mute button, consent notice, no-JS fallback links |
| `style.css` | Tokens, layout, glass buttons, neon variants A/B, card, mute button, consent notice |
| `app.js` | Loads + validates `links.json`, renders, analytics events, audio controller |
| `links.json` | **Client-editable content** |
| `robots.txt`, `404.html` | Crawler rules / branded not-found page (Vercel serves `404.html` automatically) |
| `vercel.json` | Vercel config: static site with no framework, security headers, font caching |
| `.vercelignore` | Keeps `README.md` and `GUIA.md` in the repo but off the published site |
| `assets/logo.png` | Web logo, 298×400, transparent |
| `assets/og-image.jpg` | 1200×630 share preview (29 KB) |
| `assets/favicon.png`, `assets/apple-touch-icon.png` | Icons generated from the logo |
| `assets/icons/*.svg` | Social icons (Simple Icons, CC0; Spotify outline drawn to match the mockup) |
| `assets/fonts/` | Exo 2 300 Italic, latin subset (self-hosted, OFL) |
| `assets/trilha.mp3` | Background music loop (Allegri, CC BY 3.0) |
| `GUIA.md` | Client editing guide (pt-BR) |

## Run locally

`app.js` fetches `links.json`, so open the site through any static server, not `file://`:

```sh
npx serve .            # or: python -m http.server 8000
```

Useful URLs:

- `/?neon=estatico` and `/?neon=animado`: preview each neon variant (overrides `links.json`).
- `/?verificar`: shows a banner saying whether `links.json` is valid, lists ignored entries, or shows the JSON error.

## `links.json` reference

| Field | Notes |
|---|---|
| `welcome` | Line under the logo. Empty string hides it. |
| `social[]` | `{ name, url, show }`. Shown only when `show` is `true` **and** `url` is a valid link. `name` maps to `assets/icons/<name>.svg`, so a new network needs only an SVG file with that name. |
| `buttons[]` | `{ label, url }`, rendered in order, no limit. Entries without a label or a valid URL are skipped (listed by `?verificar`). |
| `novidades` | `{ title, image, url }`. Empty `url` = not clickable, no hover. Empty or broken `image` = branded placeholder (logo on dark gradient). Recommended image 1200×560, JPG/WebP, < 200 KB. |
| `music` | `{ enabled, file, credit }`, plus optional `creditUrl` (turns the footer credit into a link, e.g. to the license). `credit` shows as a small footer line. |
| `neon` | `"estatico"` (variant A, the client's choice) or `"animado"` (variant B). Optional; defaults to `"estatico"`. |

Robustness: URLs are checked (`http`, `https`, `mailto`, `tel` only) and tracking parameters (`utm_*`, `si`, `igsh`, `igshid`, `stkn`, `_r`, `_t`, `fbclid`) are stripped automatically. If `links.json` is missing or invalid JSON, `app.js` logs the error and renders the built-in `DEFAULTS` at the top of `app.js`. **Keep `DEFAULTS` in sync with `links.json` when the content changes significantly**, since it is the safety net.

## Design

Follows the approved mockup (rascunho 2) and the design spec: near-black diagonal gradient with soft light behind the logo and in two corners, logo up to 94 px tall (86 px on a typical phone), thin italic Exo 2, outline social icons with 48 px tap targets, full-width glass pills with a 1 px light border and soft white glow, Novidades card with title bar + 1200:560 image area. The column is `clamp(240px, 72vw, 400px)`, matching the mockup's proportions on phones.

**Neon variants** (both CSS-only):

- **A, estático (live):** static soft glow, chosen by the client. It's also what `prefers-reduced-motion` users always get, which is likely why the client's phone already showed it.
- **B, animado:** a light spot circles the border of each button (6 s) and the card (8.5 s), with a soft halo outside the border. Instead of a rotating `conic-gradient` (which on a wide pill crawls along the long edges and whips around the ends), the spot moves along the real rounded outline using `transform`-only keyframes, so it runs at an even speed on the GPU with no repaints. Measured in Chrome: max 0.74 px off the outline, 1.69–1.77 px per frame (p10–p90).

## Background music

- Never autoplays. Starts on the first `pointerdown`/`touchstart`/`keydown` anywhere on the page (also `pointerup`/`touchend`/`click`, because touch browsers only accept those as the gesture that allows sound). Taps on the mute button don't count.
- The file is not requested before that interaction.
- Fades in over ~2 s (except on iOS, see below) and loops.
- Plays on iPhones with the silent switch on.
- **Leaving the page**, as agreed with the client (this replaces FR-14):
  - **Computer:** the music keeps playing while the visitor browses other tabs.
  - **Phone** (`hover: none` and `pointer: coarse`): it pauses when the page is hidden (WhatsApp, Instagram, another tab, the lock screen) and continues from the same point on return. On phones the system pauses browser audio when another app takes over anyway, and nobody wants the choir playing over the VIP WhatsApp group.
  - The position is also kept in `sessionStorage` (`sacro:musicTime`). If an in-app browser reloaded the page, or the page came back from the back/forward cache, the music continues from there, on the next tap if the browser requires a new gesture after a reload.
- Mute choice is stored in `localStorage` (`sacro:muted`, guarded by try/catch). If the system pauses the music (a call, headphones unplugged), the next tap on the page resumes it.
- Phones show "Trilha sonora · SACRO" in their media controls (Media Session API); pausing there counts as muting.
- Analytics: `music_play` counts the first start and each unmute, not automatic resumes.

Implementation: a plain `<audio loop>` element. The first version decoded the file into Web Audio for a sample-accurate loop, but iPhones mute Web Audio when the silent switch is on, so the client heard nothing on mobile. Browsers also suspend Web Audio in background tabs, which ruled out playing on while the visitor browses other tabs on a computer. Media elements are exempt from both. Trade-offs:
- **Volume on iOS:** iOS ignores `audio.volume`, so the level is baked into the file: -26 LUFS, close to the approved desktop level (the old -16 LUFS file at gain 0.25 ≈ -28 LUFS). On iOS the music starts at that level without the fade.
- **Loop point:** some browsers leave a few milliseconds of silence when the loop restarts. It falls on a natural breath between verses, where the track is already quiet.

Track requirements (FR-15/16): public domain or free license allowing commercial use, 30–60 s loop, MP3 ~96 kbps, < 600 KB; any required credit goes in `music.credit`.

**Current track (`assets/trilha.mp3`):** Allegri, *Miserere mei, Deus*, performed by Ensamble Escénico Vocal (Sistema Nacional de Fomento Musical, México), from Wikimedia Commons, **CC BY 3.0**. 41.8 s, 96 kbps CBR stereo, 491 KB, -26 LUFS. The license requires attribution, which is in `music.credit` + `music.creditUrl` and shown in the footer. Two alternatives (Palestrina / The Tudor Consort, Byrd / Ensemble Morales, both CC BY 3.0) with sources, license checks and ready-made credit lines are in `../music-options/FONTES.md`, for the client to listen to and choose.

How the loops were made (ffmpeg): a ~45 s window with steady loudness, picked by EBU R128 analysis and a chroma match at the join. The last 3 s are crossfaded (equal power) into the first 3 s so the end flows into the start. The result is loudness-normalized to about -26 LUFS (linear gain from the lossless loop, no compression) and encoded with `libmp3lame -b:a 96k` (the LAME/Info header lets decoders trim encoder padding). The step across the loop seam is smaller than an average sample step, so there's no click.

## Analytics (GA4)

1. Create a GA4 property in the **client's** Google account; add the developer as Editor.
2. Create a Web data stream for the final address and copy the Measurement ID (`G-…`).
3. Paste it into `index.html`: `<meta name="ga4-id" content="G-XXXXXXXXXX">`. Empty = analytics fully off (no script, no consent notice).
4. Admin → Custom definitions → create **event-scoped** custom dimensions `link_name` and `link_type` (optionally `link_url`).
5. Explore → Free form, name it **"Cliques por link"**: rows `link_name`, columns `link_type`, values Event count, filter Event name = `link_click`.

Events (all sent with `transport_type: 'beacon'`):

| Event | Params | When |
|---|---|---|
| `link_click` | `link_name`, `link_type` (`button` / `social` / `novidades`), `link_url` | Any button, icon or Novidades click |
| `music_play` | | Music starts (first time or unmute) |
| `music_mute` | | Visitor mutes |

**LGPD / consent mode:** `analytics_storage` (and all ad signals) default to `denied`. A minimal notice (Aceitar / Recusar) updates consent, and the choice is remembered (`sacro:consent`). This is Consent Mode "advanced": gtag.js loads for everyone (after the `load` event, so it never delays rendering) but sets no cookies until the visitor accepts. The realtime report only shows full events from visitors who accepted. If the client prefers not to load Google at all before consent (basic mode), change `setupAnalytics()` to inject the script only after "Aceitar". Consider linking the notice to the store's privacy policy once its URL is confirmed.

## Deploy (Vercel)

Vercel serves the repository as a static site: nothing is built. It applies `vercel.json` and redeploys on every push to `main`.

> **Plan:** Vercel's Hobby (free) plan is limited to non-commercial personal use. A brand site that promotes a store, built by a paid developer, counts as commercial under [Vercel's fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage), so this project needs a **Pro** plan, which is billed per member. That departs from the plan's "no paid services" requirement (NFR-09), so agree on it with the client. If cost matters, Cloudflare Pages (the original plan) is free for commercial sites.

All accounts are in the **client's** name, with the developer invited as a member.

### 1. GitHub

Create the `sacro-links` repository in the client's account (default branch `main`) and push the contents of this folder to its root. Public and private both work.

### 2. Vercel project

1. vercel.com → **Add New → Project** → import the `sacro-links` repository. When asked, install the Vercel GitHub app on the client's account.
2. Framework Preset: **Other** (`"framework": null` in `vercel.json` forces it). Leave the Build Command empty and the Output Directory at its default, the repository root (there is no `public/` folder).
3. **Deploy.** The site goes live at `https://<project>.vercel.app`.
4. Settings → General → **Vercel Toolbar**: set it to **Off** for Preview (and Production). The site's CSP blocks the toolbar script, which would otherwise log CSP errors on preview deployments.

From then on, every push to `main` deploys to production, usually in under a minute. Other branches get preview URLs, which Vercel marks `noindex`.

### 3. Preview for the client

Send `https://<project>.vercel.app/?neon=animado` and `/?neon=estatico` so the client can pick the neon variant. Also send the three MP3s from `../music-options/` so they can pick the track. Do this before the link goes into the Instagram bio.

### 4. Domain (Registro.br)

1. Vercel → project → Settings → **Domains** → add `links.usesacro.com.br`.
2. Vercel then shows the DNS record to create: a **CNAME** for `links` pointing at the target it displays. Add exactly that record in Registro.br's zone editor. **Change nothing else**: the store runs on the root domain.
3. Once DNS resolves, Vercel issues the HTTPS certificate automatically and redirects HTTP to HTTPS.
4. If the final address is not `links.usesacro.com.br`, update `canonical`, `og:url` and `og:image` in `index.html` and the URLs in `GUIA.md`.

### Day-to-day

- To undo a bad edit, revert it on GitHub (GUIA.md, step 11), or use Vercel → Deployments → previous deployment → **Instant Rollback**.
- Deployment status shows as a check mark on each GitHub commit and in the Vercel dashboard.

## Security and caching (`vercel.json`)

- **Headers:** `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP, and a strict CSP on every path. There are no inline scripts or styles anywhere, and the CSP allows `self` plus only the Google Tag Manager / Analytics hosts GA4 needs. Vercel adds HSTS itself (2 years).
- **Links:** all external links use `target="_blank" rel="noopener noreferrer"`.
- **Caching:** everything uses Vercel's default `public, max-age=0, must-revalidate`. Browsers revalidate on each visit, so changes to `links.json`, the Novidades image or the music show up immediately, and each deployment refreshes Vercel's CDN. Fonts are cached for a year (`immutable`). The two header rules never set the same header, so their order doesn't matter.
- **Not published:** `.vercelignore` keeps `README.md` and `GUIA.md` in the repository but off the site. Unknown URLs get the branded `404.html`.
- A tested VPS/nginx setup is kept outside this repository in `../hosting-vps/`, in case the hosting changes.

## Verification status

Verified locally (headless Chrome over the DevTools protocol, Lighthouse 13.5):

- `vercel.json` validates against Vercel's published schema; a deliberately broken config fails. Vercel's own `@vercel/routing-utils` turns it into the two expected header routes.
- A local server applying those routes plus Vercel's defaults and `.vercelignore` gave Lighthouse mobile **100 / 100 / 100 / 100** (LCP 1.5 s, 81 KiB). Headers are correct per path, `README.md`/`GUIA.md` are not published, there are no console or CSP errors, and music starts on tap.
- With GA4 + consent notice + a Novidades image (plain test server, no gzip): 99 / 100 / 100 / 100, LCP 1.8 s, 284 KiB.
- No horizontal scroll at 320 px and 390 px, desktop layout OK, no console errors, no CSP violations (gtag.js loads and GA hits are sent under the CSP).
- Music: nothing is fetched before the first tap. After the tap it plays and the volume fades 0 → 1 in 2 s, and it loops past the 41.8 s end (also when starting from a saved position).
  - **Phone:** it pauses with the page hidden and continues from the same point on return. After a reload, a tap continues from the saved position (5.0 s).
  - **Computer:** it keeps playing with the tab hidden.
  - Mute pauses it and is remembered across reloads, and a tap while muted fetches nothing. Unmute restarts it, and a system pause is resumed by the next tap.
  - `music_play` fires once per start, not per resume. The Media Session metadata is set.
- Config: edited `links.json` renders (4th button, YouTube enabled, tracking params stripped, clickable Novidades with image); invalid entries skipped with warnings; broken JSON falls back to defaults; `?verificar` reports each case; broken image path shows the placeholder; `music.enabled: false` hides the mute button.
- GA events: `link_click` (button / social / novidades) with correct params, `music_play`, `music_mute`, consent default/update.
- `prefers-reduced-motion` falls back to variant A.

Still to verify on launch (needs real devices or client accounts):

- Real iPhone (Safari) and Android (Chrome, Samsung Internet), plus the Instagram and TikTok in-app browsers: first-tap music start, playback with the silent switch on, the music pausing when the visitor leaves for WhatsApp, Instagram or another tab and continuing from the same point on return, and WhatsApp links opening the app.
- GA4 realtime showing `link_click` with link names on the real property.
- The real Vercel deployment. The config was validated and emulated locally, not deployed. After the first deploy, check the headers with `curl -I`, confirm the domain and HTTPS work, and confirm the store on the root domain is unaffected.
- The client listening to the music options and picking one.
- GUIA.md screenshots, to be taken once the client's GitHub repo exists.

## Credits and licenses

- Font: Exo 2, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
- Icons: Simple Icons, CC0 1.0 (`assets/icons/CREDITOS.txt`). Brand marks belong to their owners.
- Music: Allegri, *Miserere mei, Deus*, performed by Ensamble Escénico Vocal, CC BY 3.0 (credit in `links.json`; details in `../music-options/FONTES.md`).
