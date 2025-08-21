/**
 * Draftly Email Assistant - Content Script
 * Handles webpage interaction and email detection
 */

class DraftlyContentScript {
    constructor() {
        this.isInitialized = false;
        this.emailSelectors = [
            // Gmail selectors
            '.ii.gt .a3s.aiL',
            '.adn.ads .a3s.aiL',
            '.ii.gt .a3s',
            
            // Outlook selectors
            '[role="textbox"][data-testid="rooster-editor"]',
            '.rps_1ea9 .rps_1eaa',
            
            // Yahoo Mail selectors
            '[data-test-id="compose-editor"]',
            '.rte-content',
            
            // Thunderbird/generic selectors
            '[contenteditable="true"]',
            'textarea[name*="email"]',
            'textarea[name*="message"]',
            'textarea[name*="body"]'
        ];
        
        this.initialize();
    }

    /**
     * Initialize the content script
     */
    initialize() {
        if (this.isInitialized) return;

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Set up content script functionality
     */
    setup() {
        this.isInitialized = true;
        
        // Set up message listeners
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open
        });

        // Detect email platform and set up platform-specific features
        this.detectEmailPlatform();
        
        // Set up mutation observer to watch for dynamic content
        this.setupMutationObserver();
        
        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Add Draftly button to compose areas (optional)
        this.addDraftlyButtons();

        console.log('Draftly Content Script initialized on:', window.location.hostname);
    }

    /**
     * Handle messages from background script and popup
     * @param {Object} message - Message object
     * @param {Object} sender - Sender information
     * @param {Function} sendResponse - Response callback
     */
    async handleMessage(message, sender, sendResponse) {
        const { type, data } = message;

        try {
            switch (type) {
                case 'PROCESS_SELECTED_TEXT':
                    await this.handleProcessSelectedText(data, sendResponse);
                    break;

                case 'GET_EMAIL_CONTEXT':
                    await this.handleGetEmailContext(sendResponse);
                    break;

                case 'INSERT_REPLY':
                    await this.handleInsertReply(data, sendResponse);
                    break;

                case 'DETECT_COMPOSE_AREA':
                    await this.handleDetectComposeArea(sendResponse);
                    break;

                default:
                    console.warn('Unknown message type in content script:', type);
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Error handling message in content script:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle selected text processing from context menu
     * @param {Object} data - Selected text data
     * @param {Function} sendResponse - Response callback
     */
    async handleProcessSelectedText(data, sendResponse) {
        try {
            const { selectedText } = data;
            
            // Show notification to user
            this.showNotification('Generating reply for selected text...', 'info');
            
            // Send to background for processing
            const response = await chrome.runtime.sendMessage({
                type: 'GENERATE_EMAIL_REPLY',
                data: {
                    input: selectedText,
                    tone: 'professional',
                    options: { source: 'context_menu' }
                }
            });

            if (response.success) {
                // Try to insert the reply into a compose area
                const inserted = await this.insertIntoComposeArea(response.data.reply);
                
                if (inserted) {
                    this.showNotification('Reply generated and inserted!', 'success');
                } else {
                    // If insertion failed, copy to clipboard
                    await navigator.clipboard.writeText(response.data.reply);
                    this.showNotification('Reply generated and copied to clipboard!', 'success');
                }
            } else {
                this.showNotification('Failed to generate reply.', 'error');
            }

            sendResponse({ success: true });
        } catch (error) {
            console.error('Error processing selected text:', error);
            this.showNotification('Error processing selected text.', 'error');
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle get email context request
     * @param {Function} sendResponse - Response callback
     */
    async handleGetEmailContext(sendResponse) {
        try {
            const context = {
                platform: this.detectEmailPlatform(),
                url: window.location.href,
                hasComposeArea: this.findComposeArea() !== null,
                emailContent: this.extractEmailContent(),
                isComposing: this.isInComposeMode()
            };

            sendResponse({ success: true, data: context });
        } catch (error) {
            console.error('Error getting email context:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle insert reply request
     * @param {Object} data - Reply data
     * @param {Function} sendResponse - Response callback
     */
    async handleInsertReply(data, sendResponse) {
        try {
            const { reply } = data;
            const success = await this.insertIntoComposeArea(reply);

            sendResponse({
                success,
                message: success ? 'Reply inserted successfully' : 'Failed to find compose area'
            });
        } catch (error) {
            console.error('Error inserting reply:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle detect compose area request
     * @param {Function} sendResponse - Response callback
     */
    async handleDetectComposeArea(sendResponse) {
        try {
            const composeArea = this.findComposeArea();
            
            sendResponse({
                success: true,
                data: {
                    found: composeArea !== null,
                    selector: composeArea ? this.getElementSelector(composeArea) : null
                }
            });
        } catch (error) {
            console.error('Error detecting compose area:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Detect email platform
     * @returns {string} - Platform name
     */
    detectEmailPlatform() {
        const hostname = window.location.hostname.toLowerCase();
        
        if (hostname.includes('gmail.com')) return 'gmail';
        if (hostname.includes('outlook.')) return 'outlook';
        if (hostname.includes('yahoo.com')) return 'yahoo';
        if (hostname.includes('thunderbird')) return 'thunderbird';
        if (hostname.includes('mail.')) return 'generic_mail';
        
        return 'unknown';
    }

    /**
     * Find compose area in the current page
     * @returns {Element|null} - Compose area element
     */
    findComposeArea() {
        for (const selector of this.emailSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isElementVisible(element)) {
                return element;
            }
        }
        return null;
    }

    /**
     * Check if element is visible
     * @param {Element} element - Element to check
     * @returns {boolean} - Whether element is visible
     */
    isElementVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetParent !== null;
    }

    /**
     * Insert reply into compose area
     * @param {string} reply - Reply text to insert
     * @returns {boolean} - Whether insertion was successful
     */
    async insertIntoComposeArea(reply) {
        const composeArea = this.findComposeArea();
        
        if (!composeArea) {
            return false;
        }

        try {
            // Focus the compose area
            composeArea.focus();
            
            // Clear existing content or append
            if (composeArea.tagName.toLowerCase() === 'textarea') {
                composeArea.value = reply;
                composeArea.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (composeArea.contentEditable === 'true') {
                composeArea.innerHTML = reply.replace(/\n/g, '<br>');
                composeArea.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Trigger change events for React/Angular apps
            composeArea.dispatchEvent(new Event('change', { bubbles: true }));
            composeArea.dispatchEvent(new Event('blur', { bubbles: true }));

            return true;
        } catch (error) {
            console.error('Error inserting into compose area:', error);
            return false;
        }
    }

    /**
     * Extract email content from page
     * @returns {string} - Extracted email content
     */
    extractEmailContent() {
        // Try to find email content using common selectors
        const contentSelectors = [
            '.ii.gt .a3s.aiL', // Gmail
            '.rps_1ea9', // Outlook
            '[data-test-id="message-body"]', // Yahoo
            '.message-content'
        ];

        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        return '';
    }

    /**
     * Check if user is in compose mode
     * @returns {boolean} - Whether in compose mode
     */
    isInComposeMode() {
        const composeIndicators = [
            '[aria-label*="compose"]',
            '[data-testid*="compose"]',
            '.T-I.T-I-KE.L3', // Gmail compose button
            '[title*="New message"]'
        ];

        return composeIndicators.some(selector => document.querySelector(selector));
    }

    /**
     * Set up mutation observer for dynamic content
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check for new compose areas
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkForNewComposeAreas(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Check for new compose areas in added nodes
     * @param {Element} node - Added node to check
     */
    checkForNewComposeAreas(node) {
        this.emailSelectors.forEach(selector => {
            if (node.matches && node.matches(selector)) {
                this.addDraftlyButtonToElement(node);
            } else if (node.querySelector) {
                const elements = node.querySelectorAll(selector);
                elements.forEach(element => this.addDraftlyButtonToElement(element));
            }
        });
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+D to open Draftly
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                this.openDraftlyPopup();
            }
            
            // Ctrl+Shift+G to generate reply for selected text
            if (event.ctrlKey && event.shiftKey && event.key === 'G') {
                event.preventDefault();
                this.processSelectedText();
            }
        });
    }

    /**
     * Add Draftly buttons to compose areas
     */
    addDraftlyButtons() {
        const composeAreas = document.querySelectorAll(this.emailSelectors.join(','));
        composeAreas.forEach(area => this.addDraftlyButtonToElement(area));
    }

    /**
     * Add Draftly button to specific element
     * @param {Element} element - Element to add button to
     */
    addDraftlyButtonToElement(element) {
        // Check if button already exists
        if (element.parentNode && element.parentNode.querySelector('.draftly-button')) {
            return;
        }

        const button = document.createElement('button');
        button.className = 'draftly-button';
        button.innerHTML = '✉️ Draftly';
        button.title = 'Generate email reply with Draftly';
        
        // Style the button
        Object.assign(button.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: '10000',
            padding: '8px 12px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        });

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openDraftlyPopup();
        });

        // Position relative to compose area
        if (element.parentNode) {
            element.parentNode.style.position = 'relative';
            element.parentNode.appendChild(button);
        }
    }

    /**
     * Open Draftly popup
     */
    openDraftlyPopup() {
        // Since we can't directly open the popup from content script,
        // we can send a message to background to handle this
        chrome.runtime.sendMessage({
            type: 'OPEN_POPUP',
            data: { source: 'content_script' }
        });
    }

    /**
     * Process currently selected text
     */
    async processSelectedText() {
        const selectedText = window.getSelection().toString().trim();
        
        if (selectedText) {
            await this.handleProcessSelectedText({ selectedText });
        } else {
            this.showNotification('Please select some text first.', 'info');
        }
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `draftly-notification draftly-notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '10001',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            opacity: '0',
            transform: 'translateY(-10px)',
            transition: 'all 0.3s ease'
        });

        // Type-specific styling
        const styles = {
            success: { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
            error: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
            info: { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }
        };

        Object.assign(notification.style, styles[type] || styles.info);

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get CSS selector for element
     * @param {Element} element - Element to get selector for
     * @returns {string} - CSS selector
     */
    getElementSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            return `.${element.className.split(' ').join('.')}`;
        }
        
        return element.tagName.toLowerCase();
    }
}

// Initialize content script
const draftlyContent = new DraftlyContentScript();
