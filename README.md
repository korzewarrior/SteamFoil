# SteamFoil

Community-driven visual enhancements for Steam store pages, verified by game developers.

SteamFoil is a browser extension that brings custom visual effects to Steam store pages. Game developers submit their configurations to this repo, verify ownership with a token on their page, and players who install the extension see the enhanced version automatically.

## For Players

**Install the extension**, then visit any Steam store page that has SteamFoil content. Effects appear automatically — no configuration needed.

The extension icon shows a ✦ badge when a page has active SteamFoil enhancements.

### Install

1. Download or clone this repo
2. Open `chrome://extensions` (or `vivaldi://extensions`, `edge://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `extension/` folder

> Chrome Web Store listing coming soon.

## For Game Developers

Add visual flair to your Steam store page. Players with SteamFoil installed will see your custom effects — everyone else sees the normal page.

**[Read the full guide →](CONTRIBUTING.md)**

### Quick Start

1. Fork this repo
2. Create `games/<your-app-id>/manifest.json` with your configuration
3. Add a verification token to your Steam page description
4. Submit a pull request

### Available Effects

| Effect | Description |
|--------|-------------|
| `bouncing-logo` | A logo image that bounces around the page with physics, impact squash, and hue-shifting |
| `particles` | Floating glowing dots that drift upward behind content |
| `scanlines` | Subtle CRT-style horizontal scanlines |
| `vignette` | Darkened edges like a CRT tube |
| `flicker` | Rare, subtle screen brightness flicker |
| `title-glow` | Pulsing neon glow on the game title with glitch-on-hover |
| `ash` | Falling ash/debris flakes that drift and rotate downward |
| `shooting-stars` | Streaks of light that fly across the viewport at random intervals |
| `chromatic-aberration` | RGB split flash on screenshot hover |

Custom CSS can also be applied for colors, borders, and other visual tweaks.

All effects respect `prefers-reduced-motion` and use `pointer-events: none` to never interfere with page interaction.

## How Verification Works

SteamFoil uses a simple ownership proof: your game's `manifest.json` contains a unique token, and that same token must appear somewhere on your Steam page (e.g., at the bottom of your "About This Game" description). The extension checks for the token before applying any effects.

No accounts, no OAuth, no API keys. If you control the page, you can verify it.

## Repo Structure

```
steamfoil/
├── index.json              ← Master list of games with SteamFoil content
├── games/
│   └── <app-id>/
│       ├── manifest.json   ← Game config, token, and effect settings
│       ├── style.css       ← Optional custom CSS
│       └── assets/         ← Images referenced by effects (max 5MB total)
└── extension/              ← Browser extension source
```

## Technical Notes

- **Manifest V3** — no remote code execution; all effects are built into the extension
- Game devs configure effects via JSON; the extension handles rendering
- Custom CSS is fetched and injected as a `<style>` tag
- Asset URLs in CSS are rewritten to point to this repo's raw files on GitHub
- Index and manifests are cached locally for 6 hours

## License

MIT
