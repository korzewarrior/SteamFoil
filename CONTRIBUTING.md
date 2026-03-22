# Contributing to SteamFoil

This guide walks you through adding SteamFoil enhancements to your Steam store page.

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
    ├── style.css       (optional)
    └── assets/         (optional)
```

Find your app ID in your Steam store URL: `store.steampowered.com/app/<APP_ID>/`

## Step 3: Write Your Manifest

Create `manifest.json` in your game folder:

```json
{
  "name": "Your Game Name",
  "appId": 1234567,
  "version": "1.0.0",
  "author": "Your Studio Name",
  "token": "steamfoil:1234567:XXXXXXXX",
  "style": true,
  "effects": {
    "bouncing-logo": {
      "enabled": true,
      "image": "logo.png",
      "speed": [220, 168],
      "size": ["100px", "12vw", "180px"],
      "hueShift": 43,
      "opacity": 0.84
    },
    "particles": {
      "enabled": true,
      "count": 20,
      "colors": [
        "rgba(255,100,100,0.5)",
        "rgba(100,200,255,0.4)"
      ]
    },
    "scanlines":             { "enabled": false },
    "vignette":              { "enabled": false },
    "flicker":               { "enabled": false },
    "title-glow":            { "enabled": false },
    "chromatic-aberration":  { "enabled": false }
  }
}
```

### Generating Your Token

Your token must follow this format: `steamfoil:<app-id>:<8-hex-chars>`

Generate the hex portion however you like. Example using a terminal:

```bash
echo "steamfoil:1234567:$(openssl rand -hex 4)"
```

This token is how SteamFoil verifies you own the page. Keep it unique.

## Step 4: Add the Token to Your Steam Page

In Steamworks, edit your store page and add the token to your **"About This Game"** description. You can place it at the very bottom in small text:

```
steamfoil:1234567:a1b2c3d4
```

The extension scans the visible page text for this exact string. If it's not found, your effects won't activate — this prevents unauthorized submissions.

## Step 5: Configure Effects

Enable the effects you want and customize their parameters. Only enable what fits your game's aesthetic.

### `bouncing-logo`

A logo that bounces around the viewport with physics-based motion.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image` | string | `"logo.png"` | Filename in your `assets/` folder |
| `speed` | [number, number] | `[220, 168]` | Horizontal and vertical speed in px/s |
| `size` | [string, string, string] | `["100px", "12vw", "180px"]` | CSS `clamp()` values: min, preferred, max |
| `hueShift` | number | `43` | Degrees of hue rotation per bounce |
| `opacity` | number | `0.84` | Logo opacity (0–1) |

### `particles`

Floating glowing dots that drift upward behind page content.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `count` | number | `28` | Number of particles |
| `colors` | string[] | (gold, orange, blue, purple, white) | CSS color values |

### `scanlines`

CRT-style horizontal scanlines over the entire page.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `opacity` | number | `0.06` | Line darkness (0–1) |
| `spacing` | number | `3` | Pixels between lines |

### `vignette`

Darkened edges like a CRT monitor tube.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `strength` | number | `0.35` | Edge darkness (0–1) |

### `flicker`

Rare, subtle brightness flicker like an old monitor.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `interval` | number | `8` | Seconds between flickers |

### `title-glow`

Pulsing neon glow on the `.apphub_AppName` element, with a glitch effect on hover.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `color` | string | `"rgba(242,196,91,0.4)"` | Glow color |
| `pulseSpeed` | number | `4` | Seconds per pulse cycle |

### `ash`

Falling ash/debris flakes that drift sideways and rotate as they fall. Great for dark, atmospheric games.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `count` | number | `18` | Number of ash flakes |
| `colors` | string[] | (warm grays and browns) | CSS color values |

### `shooting-stars`

Streaks of light that fly across the viewport at random intervals.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `count` | number | `4` | Number of shooting stars |
| `color` | string | `"rgba(255,255,255,0.9)"` | Star color |
| `speed` | number | `4` | Base animation duration in seconds (lower = faster) |

### `chromatic-aberration`

Red/cyan split flash on screenshot images when hovered.

No parameters — enable or disable only.

## Step 6: Custom CSS (Optional)

Add a `style.css` file for custom styling. You can reference your assets with relative paths — the extension rewrites them automatically:

```css
/* This works — the extension resolves the path */
.some-element {
    background-image: url(assets/my-bg.png);
}
```

Your CSS is injected after Steam's styles, so it can override defaults. Be careful not to break core page functionality (navigation, purchase buttons, etc.).

## Step 7: Add Assets (Optional)

Place images in your `assets/` folder. Limits:

- **5 MB total** per game folder
- **2 MB max** per individual file
- Allowed types: `.png`, `.jpg`, `.webp`, `.svg`, `.woff2`

## Step 8: Update the Index

Add your game to `index.json` in the repo root:

```json
{
  "4481810": { "name": "DVD Survivors", "version": "1.0.0" },
  "1234567": { "name": "Your Game", "version": "1.0.0" }
}
```

## Step 9: Submit a Pull Request

Push your changes to your fork and open a PR. Your PR should include:

- [ ] Game folder with `manifest.json`
- [ ] Verification token added to your live Steam page
- [ ] `index.json` updated
- [ ] Total folder size under 5 MB
- [ ] No JavaScript files (effects are built into the extension)

A maintainer will review your submission, verify the token on your Steam page, and merge.

## Updating Your Page

To update your effects or styles, submit a new PR with the changes and bump the `version` in both your `manifest.json` and `index.json`. Users will pick up the changes within 6 hours (the cache TTL).

## Troubleshooting

**Effects not showing:**
- Make sure your token is visible on the live Steam page (not in a collapsed section)
- Check that the token in `manifest.json` exactly matches what's on the page
- Clear the extension cache: go to `chrome://extensions`, click the extension details, then "Clear storage"

**Assets not loading:**
- Use relative paths in CSS: `url(assets/filename.png)`
- Make sure the file exists in your game's `assets/` folder
- Check that the filename case matches exactly (GitHub is case-sensitive)
