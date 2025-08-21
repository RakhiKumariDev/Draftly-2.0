/**
 * Draftly Email Assistant - Background Service Worker
 * Handles extension lifecycle and background operations
 */

class DraftlyBackground {
    constructor() {
        this.initializeExtension();
    }

    /**
     * Initialize extension background operations
     */
    initializeExtension() {
        // Set up installation and update handlers
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Set up message handling for communication with content scripts and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Set up context menu items (optional)
        this.setupContextMenu();

        // Set up storage change listeners
        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.handleStorageChanges(changes, namespace);
        });

        console.log('Draftly Background Service Worker initialized');
    }

    /**
     * Handle extension installation and updates
     * @param {Object} details - Installation details
     */
    async handleInstallation(details) {
        const { reason, previousVersion } = details;

        switch (reason) {
            case 'install':
                await this.handleFirstInstall();
                break;
            case 'update':
                await this.handleUpdate(previousVersion);
                break;
            case 'chrome_update':
            case 'shared_module_update':
                // Handle browser updates if needed
                break;
        }
    }

    /**
     * Handle first-time installation
     */
    async handleFirstInstall() {
        try {
            // Set default preferences
            await chrome.storage.sync.set({
                preferredTone: 'professional',
                installDate: Date.now(),
                version: '1.0.0',
                usageCount: 0,
                welcomeShown: false
            });

            // Set up default badge
            await this.updateBadge();

            console.log('Draftly Email Assistant installed successfully');
        } catch (error) {
            console.error('Error during first install:', error);
        }
    }

    /**
     * Handle extension updates
     * @param {string} previousVersion - Previous version number
     */
    async handleUpdate(previousVersion) {
        try {
            const currentVersion = '1.0.0';
            
            // Update version in storage
            await chrome.storage.sync.set({
                version: currentVersion,
                lastUpdate: Date.now(),
                previousVersion: previousVersion
            });

            // Perform version-specific migration if needed
            await this.migrateData(previousVersion, currentVersion);

            console.log(`Draftly updated from ${previousVersion} to ${currentVersion}`);
        } catch (error) {
            console.error('Error during update:', error);
        }
    }

    /**
     * Handle messages from content scripts and popup
     * @param {Object} message - The message object
     * @param {Object} sender - Message sender information
     * @param {Function} sendResponse - Response callback
     */
    async handleMessage(message, sender, sendResponse) {
        const { type, data } = message;

        try {
            switch (type) {
                case 'GENERATE_EMAIL_REPLY':
                    await this.handleGenerateEmailReply(data, sendResponse);
                    break;

                case 'GET_USER_PREFERENCES':
                    await this.handleGetUserPreferences(sendResponse);
                    break;

                case 'UPDATE_USER_PREFERENCES':
                    await this.handleUpdateUserPreferences(data, sendResponse);
                    break;

                case 'TRACK_USAGE':
                    await this.handleTrackUsage(data, sendResponse);
                    break;

                case 'GET_EXTENSION_INFO':
                    await this.handleGetExtensionInfo(sendResponse);
                    break;

                default:
                    console.warn('Unknown message type:', type);
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle email reply generation request
     * @param {Object} data - Request data
     * @param {Function} sendResponse - Response callback
     */
    async handleGenerateEmailReply(data, sendResponse) {
        try {
            const { input, tone, options = {} } = data;

            // In a real implementation, this would make an API call to your AI service
            // For now, we'll use a placeholder implementation
            const reply = await this.generateEmailReplyPlaceholder(input, tone, options);

            // Track usage
            await this.incrementUsageCount();

            sendResponse({
                success: true,
                data: {
                    reply,
                    metadata: {
                        generatedAt: Date.now(),
                        tone,
                        inputLength: input.length
                    }
                }
            });
        } catch (error) {
            console.error('Error generating email reply:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Placeholder email generation function
     * @param {string} input - Input email or prompt
     * @param {string} tone - Desired tone
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - Generated reply
     */
    async generateEmailReplyPlaceholder(input, tone, options) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // This is where you would integrate with your AI service
        // For example: OpenAI API, Claude API, or your own custom AI service
        
        const templates = {
            professional: `Thank you for your email. I have carefully reviewed your message and would like to provide the following response:

Based on your inquiry, I understand you are looking for assistance with this matter. I am committed to providing you with accurate and helpful information.

I will ensure that all necessary steps are taken to address your concerns promptly and professionally. Please feel free to reach out if you need any additional information or clarification.

Best regards`,

            friendly: `Hi there! Thanks for reaching out - I really appreciate your message.

I've taken a look at what you've shared, and I'd love to help you out with this. It sounds like you're dealing with something important, and I want to make sure you get the support you need.

I'll do my best to get back to you with everything you need. Don't hesitate to ping me if you have any other questions!

Cheers`,

            formal: `Dear Colleague,

I am writing in response to your recent correspondence. I have given careful consideration to the matters you have raised and wish to provide a comprehensive reply.

Upon review of your communication, I understand the significance of your inquiry and the importance of providing an appropriate response. I am committed to addressing your concerns with the attention and thoroughness they deserve.

I shall ensure that all relevant aspects are thoroughly examined and that you receive a complete response in due course.

Sincerely`,

            casual: `Hey! Got your message and wanted to get back to you quickly.

So I've been thinking about what you mentioned, and I totally get where you're coming from. This seems like something we can definitely work through together.

Let me know if you want to chat more about this - I'm always here to help out however I can!

Talk soon`
        };

        return templates[tone] || templates.professional;
    }

    /**
     * Handle get user preferences request
     * @param {Function} sendResponse - Response callback
     */
    async handleGetUserPreferences(sendResponse) {
        try {
            const preferences = await chrome.storage.sync.get([
                'preferredTone',
                'autoSave',
                'showNotifications',
                'theme'
            ]);

            sendResponse({
                success: true,
                data: preferences
            });
        } catch (error) {
            console.error('Error getting user preferences:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle update user preferences request
     * @param {Object} data - New preferences
     * @param {Function} sendResponse - Response callback
     */
    async handleUpdateUserPreferences(data, sendResponse) {
        try {
            await chrome.storage.sync.set(data);
            
            sendResponse({
                success: true,
                message: 'Preferences updated successfully'
            });
        } catch (error) {
            console.error('Error updating user preferences:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle usage tracking request
     * @param {Object} data - Usage data
     * @param {Function} sendResponse - Response callback
     */
    async handleTrackUsage(data, sendResponse) {
        try {
            const { action, metadata = {} } = data;

            // Store usage data locally
            const usageData = {
                action,
                metadata,
                timestamp: Date.now(),
                tabId: metadata.tabId || null
            };

            // In a real implementation, you might want to:
            // 1. Store usage data locally for analytics
            // 2. Send data to your analytics service
            // 3. Update usage counters

            console.log('Usage tracked:', usageData);

            sendResponse({
                success: true,
                message: 'Usage tracked successfully'
            });
        } catch (error) {
            console.error('Error tracking usage:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle get extension info request
     * @param {Function} sendResponse - Response callback
     */
    async handleGetExtensionInfo(sendResponse) {
        try {
            const manifest = chrome.runtime.getManifest();
            const storage = await chrome.storage.sync.get([
                'installDate',
                'usageCount',
                'version'
            ]);

            sendResponse({
                success: true,
                data: {
                    name: manifest.name,
                    version: manifest.version,
                    description: manifest.description,
                    installDate: storage.installDate,
                    usageCount: storage.usageCount || 0
                }
            });
        } catch (error) {
            console.error('Error getting extension info:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Set up context menu items
     */
    async setupContextMenu() {
        try {
            // Remove existing context menu items
            await chrome.contextMenus.removeAll();

            // Add context menu for selected text
            chrome.contextMenus.create({
                id: 'generate-reply',
                title: 'Generate email reply with Draftly',
                contexts: ['selection'],
                documentUrlPatterns: ['*://*/*']
            });

            // Handle context menu clicks
            chrome.contextMenus.onClicked.addListener((info, tab) => {
                this.handleContextMenuClick(info, tab);
            });
        } catch (error) {
            console.error('Error setting up context menu:', error);
        }
    }

    /**
     * Handle context menu clicks
     * @param {Object} info - Context menu info
     * @param {Object} tab - Active tab
     */
    async handleContextMenuClick(info, tab) {
        if (info.menuItemId === 'generate-reply') {
            try {
                // Send message to content script to handle selected text
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'PROCESS_SELECTED_TEXT',
                    data: { selectedText: info.selectionText }
                });
            } catch (error) {
                console.error('Error handling context menu click:', error);
            }
        }
    }

    /**
     * Handle storage changes
     * @param {Object} changes - Storage changes
     * @param {string} namespace - Storage namespace
     */
    handleStorageChanges(changes, namespace) {
        if (namespace === 'sync') {
            // Handle preference changes
            if (changes.preferredTone) {
                console.log('Preferred tone changed:', changes.preferredTone.newValue);
            }

            if (changes.usageCount) {
                this.updateBadge();
            }
        }
    }

    /**
     * Update extension badge
     */
    async updateBadge() {
        try {
            const { usageCount = 0 } = await chrome.storage.sync.get(['usageCount']);
            
            if (usageCount > 0) {
                await chrome.action.setBadgeText({ text: usageCount.toString() });
                await chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
            } else {
                await chrome.action.setBadgeText({ text: '' });
            }
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    /**
     * Increment usage count
     */
    async incrementUsageCount() {
        try {
            const { usageCount = 0 } = await chrome.storage.sync.get(['usageCount']);
            await chrome.storage.sync.set({ usageCount: usageCount + 1 });
        } catch (error) {
            console.error('Error incrementing usage count:', error);
        }
    }

    /**
     * Migrate data between versions
     * @param {string} previousVersion - Previous version
     * @param {string} currentVersion - Current version
     */
    async migrateData(previousVersion, currentVersion) {
        // Implement version-specific data migration logic here
        console.log(`Migrating data from ${previousVersion} to ${currentVersion}`);
        
        // Example migration logic:
        // if (previousVersion < '1.1.0') {
        //     // Migrate old preference format to new format
        // }
    }
}

// Initialize the background service
const draftlyBackground = new DraftlyBackground();
