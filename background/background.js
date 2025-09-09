/**
 * Draftly Email Assistant - Background Service Worker
 */

class DraftlyBackground {
    constructor() {
        this.initializeExtension();
    }

    initializeExtension() {
        // Installation / update handlers
        chrome.runtime.onInstalled.addListener((details) => this.handleInstallation(details));

        // Message handling
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'generateReply') {
                this.generateReply(message).then(sendResponse).catch(err => sendResponse({ success: false, error: err.message }));
                return true;
            } else if (message.action === 'replyToThread') {
                this.replyToThread().then(sendResponse).catch(err => sendResponse({ success: false, error: err.message }));
                return true;
            } else {
                sendResponse({ success: false, error: 'Unknown message action' });
                return true;
            }
        });

        // Context menu
        this.setupContextMenu();

        // Storage listener
        chrome.storage.onChanged.addListener((changes, namespace) => this.handleStorageChanges(changes, namespace));

        console.log('Draftly Background Service Worker initialized');
    }

    async handleInstallation(details) {
        const { reason, previousVersion } = details;
        if (reason === 'install') {
            await this.firstInstall();
        } else if (reason === 'update') {
            await this.update(previousVersion);
        }
    }

    async firstInstall() {
        await chrome.storage.sync.set({
            preferredTone: 'professional',
            installDate: Date.now(),
            version: '1.0.0',
            usageCount: 0,
            welcomeShown: false
        });
        this.updateBadge();
        console.log('First install complete');
    }

    async update(previousVersion) {
        const currentVersion = '1.0.0';
        await chrome.storage.sync.set({
            version: currentVersion,
            lastUpdate: Date.now(),
            previousVersion
        });
        console.log(`Updated from ${previousVersion} to ${currentVersion}`);
    }

    async generateReply(message) {
        const { OPENAI_API_KEY } = await chrome.storage.local.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) throw new Error("OpenAI API key is missing");

        const response = await fetch("https://api.openai.com/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: message.prompt,
                model: "text-davinci-003",
                max_tokens: 150,
            }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error?.message || 'API error');

        await this.incrementUsageCount();

        return { success: true, reply: data.choices[0].text };
    }

    async replyToThread() {
        return this.generateReply({ prompt: "Reply to this email thread." });
    }

    setupContextMenu() {
        try {
            chrome.contextMenus.removeAll(() => {
                chrome.contextMenus.create({
                    id: 'generate-reply',
                    title: 'Generate email reply with Draftly',
                    contexts: ['selection'],
                    documentUrlPatterns: ['*://*/*']
                });

                chrome.contextMenus.onClicked.addListener((info, tab) => {
                    if (info.menuItemId === 'generate-reply') {
                        chrome.tabs.sendMessage(tab.id, { type: 'PROCESS_SELECTED_TEXT', data: { selectedText: info.selectionText } });
                    }
                });
            });
        } catch (error) {
            console.error('Error setting up context menu:', error);
        }
    }

    handleStorageChanges(changes, namespace) {
        if (namespace === 'sync' && changes.usageCount) this.updateBadge();
    }

    async updateBadge() {
        const { usageCount = 0 } = await chrome.storage.sync.get('usageCount');
        if (usageCount > 0) {
            chrome.action.setBadgeText({ text: usageCount.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    }

    async incrementUsageCount() {
        const { usageCount = 0 } = await chrome.storage.sync.get('usageCount');
        await chrome.storage.sync.set({ usageCount: usageCount + 1 });
        this.updateBadge();
    }
}

// Initialize background
new DraftlyBackground();
