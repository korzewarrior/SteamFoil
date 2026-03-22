(async function () {
    'use strict';

    /* ================================================================
       SteamFoil — content script
       Fetches game configs from GitHub, verifies ownership via token,
       injects custom CSS, and activates built-in visual effects.
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
        const pageText = document.body.innerText;
        return pageText.includes(token);
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

    // ── Inject z-index layering ──────────────────────────────────────

    function injectLayering() {
        const style = document.createElement('style');
        style.textContent = `
            #global_header,
            #store_header,
            #global_action_menu {
                position: relative;
                z-index: 10 !important;
            }
            .responsive_page_frame > *,
            .page_content_ctn > *,
            .responsive_page_template_content > * {
                position: relative;
                z-index: 3;
            }
            #footer,
            #footer_spacer {
                position: relative;
                z-index: 3;
            }
        `;
        document.head.appendChild(style);
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

    // ── Effects ──────────────────────────────────────────────────────

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

    function initParticles(cfg) {
        const count = cfg.count || 28;
        const colors = cfg.colors || [
            'rgba(242,196,91,0.6)', 'rgba(255,138,92,0.5)',
            'rgba(120,200,255,0.4)', 'rgba(180,130,255,0.4)',
            'rgba(255,255,255,0.3)'
        ];

        const style = document.createElement('style');
        style.textContent = `
            .sf-particle {
                position: fixed;
                border-radius: 50%;
                pointer-events: none;
                z-index: 2;
                opacity: 0;
                will-change: transform, opacity;
                animation: sfParticle linear infinite;
            }
            @keyframes sfParticle {
                0%   { opacity: 0; transform: translate(0, 0) scale(0.5); }
                10%  { opacity: 1; }
                90%  { opacity: 1; }
                100% { opacity: 0; transform: translate(var(--drift, 0px), -100vh) scale(1); }
            }
        `;
        document.head.appendChild(style);

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'sf-particle';
            p.setAttribute('aria-hidden', 'true');
            const size = 2 + Math.random() * 3;
            const dur = 12 + Math.random() * 18;
            const color = colors[Math.floor(Math.random() * colors.length)];
            p.style.cssText = `
                width:${size}px; height:${size}px;
                left:${Math.random() * 100}%; bottom:-10px;
                background:${color}; box-shadow:0 0 ${size * 2}px ${color};
                animation-duration:${dur}s;
                animation-delay:${Math.random() * -dur}s;
                --drift:${(Math.random() - 0.5) * 80}px;
            `;
            document.body.appendChild(p);
        }
    }

    function initScanlines(cfg) {
        const opacity = cfg.opacity ?? 0.06;
        const spacing = cfg.spacing ?? 3;
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = `
            position:fixed; inset:0; pointer-events:none; z-index:99998;
            background:repeating-linear-gradient(180deg,
                rgba(0,0,0,${opacity}) 0, rgba(0,0,0,${opacity}) 1px,
                transparent 1px, transparent ${spacing}px);
            mix-blend-mode:multiply;
        `;
        document.body.appendChild(el);
    }

    function initVignette(cfg) {
        const strength = cfg.strength ?? 0.35;
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = `
            position:fixed; inset:0; pointer-events:none; z-index:99996;
            background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${strength}) 100%);
        `;
        document.body.appendChild(el);
    }

    function initFlicker(cfg) {
        const interval = cfg.interval ?? 8;
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');

        const style = document.createElement('style');
        style.textContent = `
            .sf-flicker {
                position:fixed; inset:0; pointer-events:none; z-index:99997;
                animation: sfFlicker ${interval}s infinite;
            }
            @keyframes sfFlicker {
                0%, 97%, 100% { opacity:0; }
                97.5% { opacity:0.03; background:rgba(255,255,255,0.04); }
                98%   { opacity:0; }
                98.3% { opacity:0.02; background:rgba(255,255,255,0.03); }
                98.6% { opacity:0; }
            }
        `;
        document.head.appendChild(style);
        el.className = 'sf-flicker';
        document.body.appendChild(el);
    }

    function initTitleGlow(cfg) {
        const color = cfg.color || 'rgba(242,196,91,0.4)';
        const speed = cfg.pulseSpeed ?? 4;

        const parts = color.match(/rgba?\(([^)]+)\)/);
        if (!parts) return;
        const channels = parts[1];

        const style = document.createElement('style');
        style.textContent = `
            .apphub_AppName {
                text-shadow:
                    0 0 10px rgba(${channels}),
                    0 0 30px rgba(${channels.replace(/[^,]+$/, '0.15')}),
                    0 0 60px rgba(${channels.replace(/[^,]+$/, '0.08')}) !important;
                animation: sfTitlePulse ${speed}s ease-in-out infinite;
            }
            @keyframes sfTitlePulse {
                0%, 100% {
                    text-shadow:
                        0 0 10px ${color},
                        0 0 30px ${color.replace(/[\d.]+\)$/, '0.15)')},
                        0 0 60px ${color.replace(/[\d.]+\)$/, '0.08)')};
                }
                50% {
                    text-shadow:
                        0 0 14px ${color.replace(/[\d.]+\)$/, '0.6)')},
                        0 0 40px ${color.replace(/[\d.]+\)$/, '0.25)')},
                        0 0 80px ${color.replace(/[\d.]+\)$/, '0.12)')};
                }
            }
            .apphub_AppName:hover {
                animation: sfGlitch 0.3s steps(2) 1 !important;
            }
            @keyframes sfGlitch {
                0%   { transform: translate(0); }
                20%  { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
                40%  { transform: translate(2px, -1px); }
                60%  { transform: translate(-1px, -1px); filter: hue-rotate(-90deg); }
                80%  { transform: translate(1px, 2px); }
                100% { transform: translate(0); filter: none; }
            }
        `;
        document.head.appendChild(style);
    }

    function initShootingStars(cfg) {
        const count = cfg.count ?? 4;
        const color = cfg.color || 'rgba(255,255,255,0.9)';
        const baseSpeed = cfg.speed ?? 4;

        const style = document.createElement('style');
        let keyframes = '';
        let rules = '';

        for (let i = 0; i < count; i++) {
            const angle = 120 + Math.random() * 40;
            const top = Math.random() * 35;
            const left = 20 + Math.random() * 60;
            const width = 80 + Math.random() * 140;
            const thickness = 1 + Math.random() * 1.5;
            const dur = baseSpeed + Math.random() * 3;
            const delay = 5 + Math.random() * 55;
            const dist = `calc(${60 + Math.random() * 40}vw + 200px)`;
            const opacity = 0.5 + Math.random() * 0.5;

            rules += `
                .sf-shooting-star-${i} {
                    position:fixed; pointer-events:none; z-index:2; opacity:0;
                    top:${top}%; left:${left}%;
                    width:${width}px; height:${thickness}px;
                    background:linear-gradient(270deg, ${color}, ${color.replace(/[\d.]+\)$/, '0.2)')}, transparent);
                    transform:rotate(${angle}deg);
                    animation:sfStar${i} ${dur}s linear infinite;
                    animation-delay:${delay}s;
                }
            `;
            keyframes += `
                @keyframes sfStar${i} {
                    0%  { opacity:0; transform:rotate(${angle}deg) translate(0,0); }
                    1%  { opacity:${opacity}; }
                    99% { opacity:${opacity * 0.2}; transform:rotate(${angle}deg) translate(${dist},0); }
                    100%{ opacity:0; transform:rotate(${angle}deg) translate(${dist},0); }
                }
            `;
        }

        style.textContent = rules + keyframes;
        document.head.appendChild(style);

        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = `sf-shooting-star-${i}`;
            star.setAttribute('aria-hidden', 'true');
            document.body.appendChild(star);
        }
    }

    function initChromaticAberration() {
        const style = document.createElement('style');
        style.textContent = `
            .highlight_screenshot_link img,
            .screenshot_holder img {
                transition: filter 0.3s ease;
            }
            .highlight_screenshot_link:hover img,
            .screenshot_holder:hover img {
                animation: sfChroma 0.15s ease-out;
            }
            @keyframes sfChroma {
                0% {
                    filter: drop-shadow(-3px 0 0 rgba(255,0,0,0.35))
                            drop-shadow(3px 0 0 rgba(0,255,255,0.35));
                }
                100% { filter: none; }
            }
        `;
        document.head.appendChild(style);
    }

    // ── Orchestrator ─────────────────────────────────────────────────

    injectLayering();

    if (manifest.style !== false) {
        await injectCustomCSS();
    }

    if (!reducedMotion && manifest.effects) {
        const fx = manifest.effects;

        if (fx['bouncing-logo']?.enabled) initBouncingLogo(fx['bouncing-logo']);
        if (fx.particles?.enabled)        initParticles(fx.particles);
        if (fx.scanlines?.enabled)         initScanlines(fx.scanlines);
        if (fx.vignette?.enabled)          initVignette(fx.vignette);
        if (fx.flicker?.enabled)           initFlicker(fx.flicker);
        if (fx['title-glow']?.enabled)     initTitleGlow(fx['title-glow']);
        if (fx['shooting-stars']?.enabled)        initShootingStars(fx['shooting-stars']);
        if (fx['chromatic-aberration']?.enabled) initChromaticAberration();
    }
})();
