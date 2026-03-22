(async function () {
    'use strict';

    /* ================================================================
       SteamFoil — content script
       Fetches game configs from GitHub, verifies ownership via token,
       injects custom CSS, and optionally activates the bouncing logo.
       ================================================================ */

    const REPO_OWNER = 'korzewarrior';
    const REPO_NAME  = 'SteamFoil';
    const REPO_BASE  = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
    const CACHE_TTL  = 6 * 60 * 60 * 1000; // 6 hours

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── URL parsing ──────────────────────────────────────────────────

    const appMatch = location.pathname.match(/^\/app\/(\d+)/);
    if (!appMatch) return;
    const appId = appMatch[1];

    // ── Caching helpers ──────────────────────────────────────────────

    async function cachedFetch(key, url) {
        try {
            const stored = await chrome.storage.local.get(key);
            if (stored[key] && Date.now() - stored[key]._ts < CACHE_TTL) {
                return stored[key].data;
            }
        } catch (e) { /* proceed to fetch */ }

        try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) return null;

            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('json') ? await res.json() : await res.text();
            try {
                await chrome.storage.local.set({ [key]: { data, _ts: Date.now() } });
            } catch (e) { /* storage full, still usable */ }
            return data;
        } catch (e) {
            return null;
        }
    }

    // ── Fetch index ──────────────────────────────────────────────────

    const index = await cachedFetch('steamfoil_index', `${REPO_BASE}/index.json`);
    if (!index || !index[appId]) {
        chrome.runtime.sendMessage({ type: 'no-foil', appId });
        return;
    }

    // ── Fetch game manifest ──────────────────────────────────────────

    const manifest = await cachedFetch(
        `steamfoil_manifest_${appId}`,
        `${REPO_BASE}/games/${appId}/manifest.json`
    );
    if (!manifest) return;

    // ── Verify token ─────────────────────────────────────────────────

    function verifyToken(token) {
        if (!token) return false;
        return document.body.innerText.includes(token);
    }

    if (!verifyToken(manifest.token)) return;

    // ── Notify background ────────────────────────────────────────────

    chrome.runtime.sendMessage({
        type: 'activated',
        gameName: manifest.name,
        appId
    });

    // ── Asset URL helper ─────────────────────────────────────────────

    function assetUrl(path) {
        return `${REPO_BASE}/games/${appId}/assets/${path}`;
    }

    function rewriteAssetUrls(css) {
        return css.replace(/url\(\s*['"]?assets\//g, `url(${REPO_BASE}/games/${appId}/assets/`);
    }

    // ── Inject custom CSS ────────────────────────────────────────────

    async function injectCustomCSS() {
        const css = await cachedFetch(
            `steamfoil_css_${appId}`,
            `${REPO_BASE}/games/${appId}/style.css`
        );
        if (!css) return;

        const style = document.createElement('style');
        style.setAttribute('data-steamfoil', appId);
        style.textContent = rewriteAssetUrls(css);
        document.head.appendChild(style);
    }

    // ── Bouncing logo (opt-in) ───────────────────────────────────────

    function initBouncingLogo(cfg) {
        const imgSrc = assetUrl(cfg.image || 'logo.png');
        const [speedX, speedY] = cfg.speed || [220, 168];
        const [sizeMin, sizePref, sizeMax] = cfg.size || ['100px', '12vw', '180px'];
        const hueShift = cfg.hueShift ?? 43;
        const opacity = cfg.opacity ?? 0.84;

        const style = document.createElement('style');
        style.textContent = `
            .sf-bounce-layer {
                --impact-x: 50%;
                --impact-y: 50%;
                position: fixed;
                inset: 0;
                overflow: hidden;
                pointer-events: none;
                z-index: 2;
            }
            .sf-bounce-layer::after {
                content: '';
                position: absolute;
                inset: 0;
                opacity: 0;
                background: radial-gradient(circle at var(--impact-x) var(--impact-y),
                    rgba(242,196,91,0.18), rgba(242,196,91,0.06) 10%, transparent 24%);
            }
            .sf-bounce-layer.is-impact::after {
                animation: sfFlash 0.42s ease-out;
            }
            @keyframes sfFlash {
                0% { opacity: 0.95; } 100% { opacity: 0; }
            }
            .sf-bounce-mover {
                position: absolute;
                top: 0; left: 0;
                width: clamp(${sizeMin}, ${sizePref}, ${sizeMax});
                aspect-ratio: 409 / 226;
                will-change: transform;
            }
            .sf-bounce-sprite {
                --sf-hue: 0deg;
                position: relative;
                width: 100%; height: 100%;
            }
            .sf-bounce-sprite::before {
                content: '';
                position: absolute;
                inset: -10%;
                border-radius: 50%;
                background: radial-gradient(circle,
                    rgba(242,196,91,0.34) 0, rgba(255,138,92,0.16) 28%, transparent 72%);
                opacity: 0.75;
                filter: blur(20px) hue-rotate(var(--sf-hue));
                transform: scale(1.02);
            }
            .sf-bounce-sprite img {
                position: relative; z-index: 1;
                width: 100%; height: 100%;
                display: block;
                opacity: ${opacity};
                filter: drop-shadow(0 0 12px rgba(255,255,255,0.2))
                        drop-shadow(0 12px 30px rgba(0,0,0,0.34));
            }
            .sf-bounce-sprite.is-impact-x {
                animation: sfImpactX 0.22s cubic-bezier(0.2,0.8,0.2,1);
            }
            .sf-bounce-sprite.is-impact-y {
                animation: sfImpactY 0.22s cubic-bezier(0.2,0.8,0.2,1);
            }
            .sf-bounce-sprite.is-corner-hit {
                animation: sfCorner 0.3s cubic-bezier(0.18,0.85,0.18,1);
            }
            @keyframes sfImpactX {
                0% { transform: scaleX(0.9) scaleY(1.08); } 100% { transform: scale(1); }
            }
            @keyframes sfImpactY {
                0% { transform: scaleX(1.08) scaleY(0.9); } 100% { transform: scale(1); }
            }
            @keyframes sfCorner {
                0% { transform: scale(0.9); } 45% { transform: scale(1.1); } 100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        const layer = document.createElement('div');
        layer.className = 'sf-bounce-layer';
        layer.setAttribute('aria-hidden', 'true');

        const mover = document.createElement('div');
        mover.className = 'sf-bounce-mover';

        const sprite = document.createElement('div');
        sprite.className = 'sf-bounce-sprite';

        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = '';

        sprite.appendChild(img);
        mover.appendChild(sprite);
        layer.appendChild(mover);
        document.body.appendChild(layer);

        let x = 24, y = 24, vx = speedX, vy = speedY;
        let maxX = 0, maxY = 0, lastTime = 0, hue = 0;

        function syncBounds() {
            maxX = Math.max(0, window.innerWidth - mover.offsetWidth);
            maxY = Math.max(0, window.innerHeight - mover.offsetHeight);
            x = Math.min(Math.max(0, x), maxX);
            y = Math.min(Math.max(0, y), maxY);
            mover.style.transform = `translate3d(${x}px,${y}px,0)`;
        }

        function restartAnim(cls) {
            sprite.classList.remove('is-impact-x', 'is-impact-y', 'is-corner-hit');
            void sprite.offsetWidth;
            sprite.classList.add(cls);
        }

        function triggerImpact(hitX, hitY) {
            hue = (hue + hueShift) % 360;
            sprite.style.setProperty('--sf-hue', `${hue}deg`);

            const ix = hitX === 'left' ? '0%' : hitX === 'right' ? '100%' : `${(x / Math.max(maxX || 1, 1)) * 100}%`;
            const iy = hitY === 'top' ? '0%' : hitY === 'bottom' ? '100%' : `${(y / Math.max(maxY || 1, 1)) * 100}%`;
            layer.style.setProperty('--impact-x', ix);
            layer.style.setProperty('--impact-y', iy);
            layer.classList.remove('is-impact');
            void layer.offsetWidth;
            layer.classList.add('is-impact');

            if (hitX && hitY) restartAnim('is-corner-hit');
            else if (hitX) restartAnim('is-impact-x');
            else if (hitY) restartAnim('is-impact-y');
        }

        function step(ts) {
            if (!lastTime) lastTime = ts;
            const dt = Math.min(0.034, (ts - lastTime) / 1000);
            lastTime = ts;
            x += vx * dt;
            y += vy * dt;

            let hitX = '', hitY = '';
            if (x <= 0) { x = 0; vx = Math.abs(vx); hitX = 'left'; }
            else if (x >= maxX) { x = maxX; vx = -Math.abs(vx); hitX = 'right'; }
            if (y <= 0) { y = 0; vy = Math.abs(vy); hitY = 'top'; }
            else if (y >= maxY) { y = maxY; vy = -Math.abs(vy); hitY = 'bottom'; }

            if (hitX || hitY) triggerImpact(hitX, hitY);
            mover.style.transform = `translate3d(${x}px,${y}px,0)`;
            requestAnimationFrame(step);
        }

        syncBounds();
        requestAnimationFrame(step);
        window.addEventListener('resize', syncBounds);
    }

    // ── Orchestrator ─────────────────────────────────────────────────

    await injectCustomCSS();

    if (!reducedMotion && manifest.effects?.['bouncing-logo']?.enabled) {
        initBouncingLogo(manifest.effects['bouncing-logo']);
    }
})();
