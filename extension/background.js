chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'activated' && sender.tab) {
        chrome.action.setBadgeBackgroundColor({ color: '#f2c45b', tabId: sender.tab.id });
        chrome.action.setBadgeText({ text: '✦', tabId: sender.tab.id });

        chrome.storage.session.set({
            [`tab_${sender.tab.id}`]: {
                gameName: msg.gameName,
                appId: msg.appId,
                status: 'active'
            }
        });
    }

    if (msg.type === 'no-foil' && sender.tab) {
        chrome.storage.session.set({
            [`tab_${sender.tab.id}`]: {
                appId: msg.appId,
                status: 'none'
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(`tab_${tabId}`);
});
