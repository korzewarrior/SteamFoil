# Contributing to SteamFoil

Add custom visual styles to your Steam store page.

## Prerequisites

- A game on Steam with an active store page
- A GitHub account
- Access to edit your game's Steam description (Steamworks)

## Step 1: Fork and Clone

Fork this repository, then clone your fork locally.

## Step 2: Create Your Game Folder

Create a folder inside `games/` named with your Steam app ID:

```
games/
└── 1234567/
    ├── manifest.json
    ├── style.css
    └── assets/         (optional)
```

Find your app ID in your Steam store URL: `store.steampowered.com/app/<APP_ID>/`

## Step 3: Write Your Manifest

Create `manifest.json`:

```json
{
  "name": "Your Game Name",
  "appId": 1234567,
  "version": "1.0.0",
  "author": "Your Studio Name",
  "token": "steamfoil:1234567:XXXXXXXX"
}
```

### Generating Your Token

Format: `steamfoil:<app-id>:<8-hex-chars>`

```bash
echo "steamfoil:1234567:$(openssl rand -hex 4)"
```

### Optional: Bouncing Logo

If you want a logo that bounces around the page with physics-based motion, add this to your manifest:

```json
{
  "name": "Your Game Name",
  "appId": 1234567,
  "version": "1.0.0",
  "author": "Your Studio Name",
  "token": "steamfoil:1234567:XXXXXXXX",
  "effects": {
    "bouncing-logo": {
      "enabled": true,
      "image": "logo.png",
      "speed": [220, 168],
      "size": ["100px", "12vw", "180px"],
      "hueShift": 43,
      "opacity": 0.84
    }
  }
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image` | string | `"logo.png"` | Filename in your `assets/` folder |
| `speed` | [number, number] | `[220, 168]` | Horizontal and vertical speed in px/s |
| `size` | [string, string, string] | `["100px", "12vw", "180px"]` | CSS `clamp()` values: min, preferred, max |
| `hueShift` | number | `43` | Degrees of hue rotation per bounce |
| `opacity` | number | `0.84` | Logo opacity (0–1) |

This is the only built-in effect. Everything else is done with your `style.css`.

## Step 4: Add the Token to Your Steam Page

In Steamworks, add the token somewhere on your store page (game description, legal lines, etc.):

```
steamfoil:1234567:a1b2c3d4
```

The extension scans the page text for this exact string. If it's not found, your styles won't activate.

## Step 5: Write Your CSS

Your `style.css` is injected into the Steam store page. You can style anything — the full page is your canvas.

Reference assets with relative paths — the extension rewrites them automatically:

```css
.some-element {
    background-image: url(assets/my-bg.png);
}
```

Your CSS is injected after Steam's styles, so it can override defaults. Don't break core page functionality (navigation, purchase buttons, etc.).

### Tips

- Use `body::before` and `body::after` for full-page overlays (scanlines, vignettes)
- Use `position: fixed` with `pointer-events: none` for effects that don't block interaction
- Target `.apphub_AppName` for the game title
- Target `.highlight_screenshot_link img` for screenshot hover effects
- Use `@keyframes` for animations
- Always include a `@media (prefers-reduced-motion: reduce)` block

## Step 6: Add Assets (Optional)

Place images in your `assets/` folder. Limits:

- **5 MB total** per game folder
- **2 MB max** per individual file
- Allowed types: `.png`, `.jpg`, `.webp`, `.svg`, `.woff2`

## Step 7: Update the Index

Add your game to `index.json` in the repo root:

```json
{
  "1234567": { "name": "Your Game", "version": "1.0.0" }
}
```

## Step 8: Submit a Pull Request

Your PR should include:

- [ ] Game folder with `manifest.json` and `style.css`
- [ ] Verification token visible on your live Steam page
- [ ] `index.json` updated
- [ ] Total folder size under 5 MB
- [ ] `@media (prefers-reduced-motion: reduce)` block included

A maintainer will verify the token on your Steam page and merge.

## Updating

Submit a new PR with changes and bump `version` in both your `manifest.json` and `index.json`. Users pick up changes within 6 hours.
