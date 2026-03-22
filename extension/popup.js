(async function () {
    const statusEl = document.getElementById('sf-status');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
        statusEl.innerHTML = '<p class="sf-not-steam">Navigate to a Steam store page to use SteamFoil.</p>';
        return;
    }

    const match = tab.url.match(/store\.steampowered\.com\/app\/(\d+)/);
    if (!match) {
        statusEl.innerHTML = '<p class="sf-not-steam">Navigate to a Steam store page to use SteamFoil.</p>';
        return;
    }

    const data = await chrome.storage.session.get(`tab_${tab.id}`);
    const info = data[`tab_${tab.id}`];

    if (info && info.status === 'active') {
        statusEl.innerHTML = `
            <div class="sf-active">
                <span class="sf-badge">✦ Active</span>
                <span class="sf-game-name">${escapeHtml(info.gameName)}</span>
            </div>
        `;
    } else {
        statusEl.innerHTML = `
            <p class="sf-inactive">
                No SteamFoil content for this game yet.<br>
                <a href="https://github.com/korzewarrior/SteamFoil/blob/main/CONTRIBUTING.md"
                   target="_blank" style="color:#f2c45b;">Add it →</a>
            </p>
        `;
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
})();
