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
     * Load Google API library dynamically
     */
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                console.log('Google API library loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load Google API library');
                reject(new Error('Google API library failed to load'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize Google Sign-In
     */
    async initializeGoogleSignIn() {
        try {
            await this.loadGoogleAPI();
            gapi.load('auth2', () => {
                gapi.auth2.init({
                    client_id: '104128844470-afiofbri82hlv7ejmtv74vv7nf0h5149.apps.googleusercontent.com', // Replace with your Google Client ID
                    scope: 'https://www.googleapis.com/auth/gmail.readonly'
                }).then(() => {
                    console.log('Google OAuth client initialized');

                    const authInstance = gapi.auth2.getAuthInstance();
                    if (!authInstance.isSignedIn.get()) {
                        console.log('User not signed in. Triggering sign-in flow.');
                        authInstance.signIn().then(googleUser => {
                            console.log('User signed in:', googleUser.getBasicProfile().getName());
                            this.injectGmailButton(); // Inject button after successful sign-in
                        }).catch(error => {
                            console.error('Google Sign-In failed:', error);
                        });
                    } else {
                        console.log('User already signed in:', authInstance.currentUser.get().getBasicProfile().getName());
                        this.injectGmailButton(); // Inject button if already signed in
                    }
                }).catch(error => {
                    console.error('Failed to initialize Google OAuth client:', error);
                });
            });
        } catch (error) {
            console.error('Error during Google Sign-In initialization:', error);
        }
    }

    /**
     * Initialize the content script
     */
    initialize() {
        if (this.isInitialized) return;

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.injectGmailButton();
            });
        } else {
            this.injectGmailButton();
        }

        this.isInitialized = true;
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
            background: 'rgb(102, 126, 234)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 8px'
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
     * Inject Gmail button into the right-hand side of the email compose area
     */
    injectGmailButton() {
        const checkPlacement = setInterval(() => {
            // Try to find the email compose area
            const emailComposeArea = document.querySelector('.aDh'); // Updated Gmail email compose area selector

            if (emailComposeArea) {
                clearInterval(checkPlacement);

                // Create the button
                const draftlyButton = document.createElement('button');
                draftlyButton.innerText = '✉️ Draftly';
                draftlyButton.className = 'draftly-button';
                draftlyButton.title = 'Generate email reply with Draftly';
                draftlyButton.style.margin = '0 8px';
                draftlyButton.style.padding = '8px 12px';
                draftlyButton.style.background = 'rgb(102, 126, 234)';
                draftlyButton.style.color = 'white';
                draftlyButton.style.border = 'none';
                draftlyButton.style.borderRadius = '6px';
                draftlyButton.style.fontSize = '12px';
                draftlyButton.style.cursor = 'pointer';
                draftlyButton.style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 2px 8px';
                draftlyButton.style.position = 'absolute';
                draftlyButton.style.right = '10px';
                draftlyButton.style.top = '10px';

                // Add click event listener
                draftlyButton.addEventListener('click', () => {
                    const userChoice = confirm('Choose an option:\nOK: Reply to mail thread\nCancel: Generate email response by prompting');

                    if (userChoice) {
                        chrome.runtime.sendMessage({ action: 'replyToThread' }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('Runtime error:', chrome.runtime.lastError);
                                alert('An error occurred while communicating with the background script.');
                                return;
                            }

                            if (response && response.success) {
                                alert(`AI Reply:\n${response.reply}`);
                            } else {
                                alert(`Error: ${response?.error || 'Unknown error occurred.'}`);
                            }
                        });
                    } else {
                        const prompt = prompt('Enter your prompt for the email reply:');
                        if (prompt) {
                            chrome.runtime.sendMessage({ action: 'generateReply', prompt }, (response) => {
                                if (chrome.runtime.lastError) {
                                    console.error('Runtime error:', chrome.runtime.lastError);
                                    alert('An error occurred while communicating with the background script.');
                                    return;
                                }

                                if (response && response.success) {
                                    alert(`Generated Reply:\n${response.reply}`);
                                } else {
                                    alert(`Error: ${response?.error || 'Unknown error occurred.'}`);
                                }
                            });
                        }
                    }
                });

                // Append the button to the email compose area
                emailComposeArea.appendChild(draftlyButton);

                console.log('✅ Draftly AI button injected into the right-hand side of the email compose area.');
            }
        }, 500); // Check every 500ms
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
