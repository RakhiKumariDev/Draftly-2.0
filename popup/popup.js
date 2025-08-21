/**
 * Draftly Email Assistant - Popup Script with AI Integration
 * Handles user interactions and AI-powered email generation
 */

class DraftlyPopup {
    constructor() {
        // DOM elements
        this.emailInput = document.getElementById('emailInput');
        this.toneSelect = document.getElementById('toneSelect');
        this.generateBtn = document.getElementById('generateBtn');
        this.outputSection = document.getElementById('outputSection');
        this.generatedReply = document.getElementById('generatedReply');
        this.copyBtn = document.getElementById('copyBtn');
        this.regenerateBtn = document.getElementById('regenerateBtn');
        this.statusMessage = document.getElementById('statusMessage');
        this.charCount = document.getElementById('charCount');

        // New AI-related elements
        this.setupSection = document.getElementById('setupSection');
        this.consentSection = document.getElementById('consentSection');
        this.inputSection = document.getElementById('inputSection');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        this.grantConsentBtn = document.getElementById('grantConsentBtn');
        this.declineConsentBtn = document.getElementById('declineConsentBtn');
        this.rateLimitWarning = document.getElementById('rateLimitWarning');
        this.apiStatus = document.getElementById('apiStatus');
        this.consentStatus = document.getElementById('consentStatus');

        // State
        this.currentInput = '';
        this.currentTone = 'professional';
        this.aiService = null;
        this.rateLimitCountdown = null;
        
        // Make AI service available globally for debugging
        window.draftlyPopup = this;
        
        this.initializeAI();
    }

    /**
     * Initialize AI service and UI
     */
    async initializeAI() {
        try {
            console.log('🚀 Initializing Draftly AI service...');
            
            // Initialize AI service
            this.aiService = new DraftlyAIService();
            
            // Make AI service available globally for debugging
            window.draftlyAI = this.aiService;
            
            // Check initial state and show appropriate UI
            await this.checkInitialState();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('✅ Draftly AI popup initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize AI popup:', error);
            this.showStatusMessage('Failed to initialize AI service.', 'error');
        }
    }

    /**
     * Check initial state and show appropriate UI section
     */
    async checkInitialState() {
        try {
            // Load API key
            await this.aiService.loadAPIKey();
            
            if (!this.aiService.hasAPIKey()) {
                // Show API key setup
                this.showSection('setup');
                return;
            }

            // Check consent
            const hasConsent = await this.aiService.consentManager.hasConsent();
            
            if (!hasConsent) {
                // Show consent dialog
                this.showSection('consent');
                return;
            }

            // Show main input section
            this.showSection('input');
            this.updateConsentStatus();
            this.updateAPIStatus();
            
        } catch (error) {
            console.error('Error checking initial state:', error);
            this.showSection('setup');
        }
    }

    /**
     * Show specific section and hide others
     * @param {string} section - Section to show: 'setup', 'consent', 'input'
     */
    showSection(section) {
        const sections = {
            setup: this.setupSection,
            consent: this.consentSection,
            input: this.inputSection
        };

        // Hide all sections
        Object.values(sections).forEach(el => {
            if (el) el.style.display = 'none';
        });

        // Show requested section
        if (sections[section]) {
            sections[section].style.display = 'block';
            sections[section].classList.add('section-fade-in');
        }
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // API Key setup
        if (this.saveApiKeyBtn) {
            this.saveApiKeyBtn.addEventListener('click', () => this.handleSaveApiKey());
        }

        if (this.apiKeyInput) {
            this.apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSaveApiKey();
                }
            });
        }

        // Consent management
        if (this.grantConsentBtn) {
            this.grantConsentBtn.addEventListener('click', () => this.handleGrantConsent());
        }

        if (this.declineConsentBtn) {
            this.declineConsentBtn.addEventListener('click', () => this.handleDeclineConsent());
        }

        // Main functionality
        if (this.emailInput) {
            this.emailInput.addEventListener('input', () => {
                this.updateCharacterCount();
                this.validateInput();
            });
        }

        if (this.toneSelect) {
            this.toneSelect.addEventListener('change', () => {
                this.currentTone = this.toneSelect.value;
                this.saveUserPreferences();
            });
        }

        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.handleGenerateReply());
        }

        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        }

        if (this.regenerateBtn) {
            this.regenerateBtn.addEventListener('click', () => this.handleRegenerateReply());
        }

        // Footer links
        const settingsLink = document.getElementById('settingsLink');
        const consentLink = document.getElementById('consentLink');
        const helpLink = document.getElementById('helpLink');
        const aboutLink = document.getElementById('aboutLink');

        if (settingsLink) {
            settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettings();
            });
        }

        if (consentLink) {
            consentLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showConsentManager();
            });
        }

        if (helpLink) {
            helpLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHelp();
            });
        }

        if (aboutLink) {
            aboutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAbout();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleGenerateReply();
            }
            if (e.ctrlKey && e.key === 'c' && this.outputSection && this.outputSection.style.display !== 'none') {
                this.copyToClipboard();
            }
        });
    }

    /**
     * Handle save API key
     */
    async handleSaveApiKey() {
        const apiKey = this.apiKeyInput?.value?.trim();
        
        if (!apiKey) {
            this.showStatusMessage('Please enter your OpenAI API key.', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            this.showStatusMessage('Invalid API key format. Must start with "sk-"', 'error');
            return;
        }

        this.setLoadingState(this.saveApiKeyBtn, true);

        try {
            await this.aiService.saveAPIKey(apiKey);
            this.showStatusMessage('API key saved successfully!', 'success');
            
            // Clear input for security
            if (this.apiKeyInput) {
                this.apiKeyInput.value = '';
            }
            
            // Check consent next
            const hasConsent = await this.aiService.consentManager.hasConsent();
            if (!hasConsent) {
                setTimeout(() => this.showSection('consent'), 1000);
            } else {
                setTimeout(() => this.showSection('input'), 1000);
                this.updateConsentStatus();
                this.updateAPIStatus();
            }
            
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showStatusMessage(`Failed to save API key: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(this.saveApiKeyBtn, false);
        }
    }

    /**
     * Handle grant consent
     */
    async handleGrantConsent() {
        try {
            await this.aiService.consentManager.grantConsent();
            this.showStatusMessage('Consent granted successfully!', 'success');
            
            setTimeout(() => {
                this.showSection('input');
                this.updateConsentStatus();
                this.updateAPIStatus();
                this.loadUserPreferences();
            }, 1000);
            
        } catch (error) {
            console.error('Error granting consent:', error);
            this.showStatusMessage('Failed to save consent.', 'error');
        }
    }

    /**
     * Handle decline consent
     */
    handleDeclineConsent() {
        this.showStatusMessage('Consent declined. AI features will not be available.', 'info');
        // Could redirect to a non-AI mode or close popup
        setTimeout(() => window.close(), 2000);
    }

    /**
     * Handle generate reply button click (AI-powered)
     */
    async handleGenerateReply() {
        const input = this.emailInput?.value?.trim();
        
        if (!input) {
            this.showStatusMessage('Please enter an email message or prompt.', 'error');
            return;
        }

        if (input.length < 10) {
            this.showStatusMessage('Please enter a more detailed message (at least 10 characters).', 'error');
            return;
        }

        // Check rate limits
        if (!this.aiService.rateLimiter.canMakeRequest()) {
            this.showRateLimitWarning();
            return;
        }

        this.currentInput = input;
        this.setLoadingState(this.generateBtn, true);
        this.hideStatusMessage();
        this.updateAPIStatus();

        try {
            console.log('🤖 Generating AI reply...');
            
            const reply = await this.aiService.generateEmailReply(input, this.currentTone);
            
            if (!reply || reply.trim().length === 0) {
                throw new Error('Generated reply is empty');
            }
            
            this.displayGeneratedReply(reply);
            this.showStatusMessage('AI reply generated successfully! 🎉', 'success');
            
            // Update usage stats
            this.updateAPIStatus();
            
        } catch (error) {
            console.error('❌ Error generating AI reply:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Provide specific error messages with debugging info
            let errorMessage = 'Failed to generate reply. ';
            let showDebugInfo = false;
            
            if (error.message.includes('consent')) {
                errorMessage = '🚫 User consent required for AI processing.';
                setTimeout(() => this.showSection('consent'), 2000);
            } else if (error.message.includes('API key not configured')) {
                errorMessage = '🔑 OpenAI API key not configured.';
                setTimeout(() => this.showSection('setup'), 2000);
            } else if (error.message.includes('Invalid API key format')) {
                errorMessage = '🔑 Invalid API key format. Must start with "sk-"';
                setTimeout(() => this.showSection('setup'), 2000);
            } else if (error.message.includes('Invalid OpenAI API key')) {
                errorMessage = '🔑 Invalid OpenAI API key. Please check your key.';
                setTimeout(() => this.showSection('setup'), 2000);
            } else if (error.message.includes('quota exceeded')) {
                errorMessage = '💳 OpenAI quota exceeded. Please add billing info at platform.openai.com';
            } else if (error.message.includes('Draftly rate limit')) {
                errorMessage = error.message;
                this.showRateLimitWarning();
            } else if (error.message.includes('OpenAI API rate limit')) {
                errorMessage = '⏰ OpenAI API rate limit exceeded. Please wait and try again.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                errorMessage = '🌐 Network error. Check your internet connection.';
                showDebugInfo = true;
            } else if (error.message.includes('403')) {
                errorMessage = '🚫 API access forbidden. Check your OpenAI API key permissions.';
            } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
                errorMessage = '🔧 OpenAI service temporarily unavailable. Please try again in a moment.';
            } else {
                errorMessage = `❌ Unexpected error: ${error.message}`;
                showDebugInfo = true;
            }
            
            // Add debug info for complex errors
            if (showDebugInfo) {
                errorMessage += '\n\n🔧 Debug: Open console (F12) and run: draftly.debugOpenAI()';
                console.log('🔧 Run this in console to debug: draftly.debugOpenAI()');
            }
            
            this.showStatusMessage(errorMessage, 'error');
            
        } finally {
            this.setLoadingState(this.generateBtn, false);
        }
    }

    /**
     * Handle regenerate reply button click
     */
    async handleRegenerateReply() {
        if (!this.currentInput) {
            this.showStatusMessage('No previous input found.', 'error');
            return;
        }

        await this.handleGenerateReply();
    }

    /**
     * Show rate limit warning with countdown
     */
    showRateLimitWarning() {
        if (!this.rateLimitWarning) return;

        const resetTime = this.aiService.rateLimiter.getResetTime();
        let remainingSeconds = Math.ceil(resetTime / 1000);

        this.rateLimitWarning.style.display = 'block';
        
        const countdownElement = document.getElementById('rateLimitCountdown');
        if (countdownElement) {
            countdownElement.textContent = remainingSeconds;
        }

        // Start countdown
        if (this.rateLimitCountdown) {
            clearInterval(this.rateLimitCountdown);
        }

        this.rateLimitCountdown = setInterval(() => {
            remainingSeconds--;
            if (countdownElement) {
                countdownElement.textContent = remainingSeconds;
            }

            if (remainingSeconds <= 0) {
                clearInterval(this.rateLimitCountdown);
                this.rateLimitWarning.style.display = 'none';
                this.updateAPIStatus();
            }
        }, 1000);
    }

    /**
     * Update API status display
     */
    updateAPIStatus() {
        if (!this.apiStatus || !this.aiService) return;

        const canMakeRequest = this.aiService.rateLimiter.canMakeRequest();
        const usageStats = this.aiService.rateLimiter.getUsageStats();
        
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const requestCount = document.getElementById('requestCount');

        if (statusDot && statusText) {
            if (canMakeRequest) {
                statusDot.className = 'status-dot';
                statusText.textContent = 'AI Ready';
            } else {
                statusDot.className = 'status-dot warning';
                statusText.textContent = 'Rate Limited';
            }
        }

        if (requestCount) {
            requestCount.textContent = usageStats.requestsThisMinute;
        }

        this.apiStatus.style.display = 'block';
    }

    /**
     * Update consent status display
     */
    updateConsentStatus() {
        if (!this.consentStatus || !this.aiService) return;

        const consentInfo = this.aiService.consentManager.getConsentInfo();
        
        if (consentInfo.granted) {
            this.consentStatus.textContent = 'Consent: Granted';
            this.consentStatus.style.color = '#10b981';
        } else {
            this.consentStatus.textContent = 'Consent: Not granted';
            this.consentStatus.style.color = '#ef4444';
        }
    }

    /**
     * Start periodic updates for UI elements
     */
    startPeriodicUpdates() {
        // Update API status every 5 seconds
        setInterval(() => {
            if (this.inputSection && this.inputSection.style.display !== 'none') {
                this.updateAPIStatus();
            }
        }, 5000);
    }

    /**
     * Update character count display
     */
    updateCharacterCount() {
        if (!this.emailInput || !this.charCount) return;
        
        const count = this.emailInput.value.length;
        this.charCount.textContent = count;
        
        if (count > 1800) {
            this.charCount.style.color = '#ef4444';
        } else if (count > 1500) {
            this.charCount.style.color = '#f59e0b';
        } else {
            this.charCount.style.color = '#6b7280';
        }
    }

    /**
     * Validate input and update UI accordingly
     */
    validateInput() {
        if (!this.emailInput || !this.generateBtn) return;
        
        const isValid = this.emailInput.value.trim().length > 0;
        const canMakeRequest = this.aiService?.rateLimiter?.canMakeRequest() ?? true;
        
        this.generateBtn.disabled = !isValid || !canMakeRequest;
    }

    /**
     * Display the generated reply in the UI
     * @param {string} reply - The generated email reply
     */
    displayGeneratedReply(reply) {
        if (!this.generatedReply || !this.outputSection) return;
        
        this.generatedReply.textContent = reply;
        this.outputSection.style.display = 'block';
        this.outputSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Copy generated reply to clipboard
     */
    async copyToClipboard() {
        if (!this.generatedReply || !this.copyBtn) return;
        
        try {
            const reply = this.generatedReply.textContent;
            await navigator.clipboard.writeText(reply);
            
            // Update button text temporarily
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<span class="btn-icon">✓</span>Copied!';
            this.copyBtn.style.background = '#10b981';
            this.copyBtn.style.color = 'white';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.style.background = '';
                this.copyBtn.style.color = '';
            }, 2000);
            
            this.showStatusMessage('Reply copied to clipboard!', 'success');
            
            // Track usage
            if (this.aiService) {
                this.aiService.trackUsage('copy_reply', { method: 'button' });
            }
            
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showStatusMessage('Failed to copy to clipboard.', 'error');
        }
    }

    /**
     * Set loading state for buttons
     * @param {HTMLElement} button - Button element or true for main generate button
     * @param {boolean} isLoading - Whether to show loading state
     */
    setLoadingState(button, isLoading) {
        // Handle legacy boolean parameter for main generate button
        if (typeof button === 'boolean') {
            isLoading = button;
            button = this.generateBtn;
        }

        if (!button) return;

        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            if (this.regenerateBtn) this.regenerateBtn.disabled = true;
        } else {
            button.classList.remove('loading');
            this.validateInput(); // This will properly set disabled state
            if (this.regenerateBtn) this.regenerateBtn.disabled = false;
        }
    }

    /**
     * Show status message
     * @param {string} message - The message to show
     * @param {string} type - The message type (success, error, info)
     */
    showStatusMessage(message, type = 'info') {
        if (!this.statusMessage) return;
        
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                this.hideStatusMessage();
            }, 3000);
        }
    }

    /**
     * Hide status message
     */
    hideStatusMessage() {
        if (this.statusMessage) {
            this.statusMessage.style.display = 'none';
        }
    }

    /**
     * Load user preferences from storage
     */
    async loadUserPreferences() {
        try {
            const result = await chrome.storage.sync.get(['preferredTone', 'lastUsed']);
            
            if (result.preferredTone && this.toneSelect) {
                this.toneSelect.value = result.preferredTone;
                this.currentTone = result.preferredTone;
            }
            
            // Update last used timestamp
            await chrome.storage.sync.set({ lastUsed: Date.now() });
            
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }

    /**
     * Save user preferences to storage
     */
    async saveUserPreferences() {
        try {
            await chrome.storage.sync.set({
                preferredTone: this.currentTone,
                lastSaved: Date.now()
            });
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }

    /**
     * Show settings modal
     */
    async showSettings() {
        const hasConsent = this.aiService ? await this.aiService.consentManager.hasConsent() : false;
        const hasApiKey = this.aiService ? this.aiService.hasAPIKey() : false;
        const consentInfo = this.aiService ? this.aiService.consentManager.getConsentInfo() : {};
        
        const settingsInfo = `
Draftly Settings:

🔑 API Key: ${hasApiKey ? 'Configured' : 'Not configured'}
📋 Consent: ${hasConsent ? 'Granted' : 'Not granted'}
${hasConsent ? `📅 Consent Date: ${new Date(consentInfo.timestamp).toLocaleDateString()}` : ''}
${hasConsent ? `⏰ Expires: ${consentInfo.expiresAt?.toLocaleDateString()}` : ''}

Actions:
• Click "⚙️ Settings" → "🔑 API Key" to change API key
• Click "📋 Consent" to manage data processing consent
• All data is stored locally and synced across your devices

Rate Limits:
• 10 requests per minute
• 50 requests per hour
• Limits reset automatically
        `.trim();
        
        alert(settingsInfo);
    }

    /**
     * Show consent manager
     */
    async showConsentManager() {
        if (!this.aiService) return;
        
        const consentInfo = this.aiService.consentManager.getConsentInfo();
        
        const action = confirm(`
Consent Management:

Current Status: ${consentInfo.granted ? 'GRANTED' : 'NOT GRANTED'}
${consentInfo.granted ? `Granted: ${new Date(consentInfo.timestamp).toLocaleDateString()}` : ''}
${consentInfo.granted ? `Expires: ${consentInfo.expiresAt?.toLocaleDateString()}` : ''}

Click OK to ${consentInfo.granted ? 'REVOKE' : 'GRANT'} consent
Click Cancel to keep current settings
        `);
        
        if (action) {
            if (consentInfo.granted) {
                await this.aiService.consentManager.revokeConsent();
                this.showStatusMessage('Consent revoked. AI features disabled.', 'info');
                this.showSection('consent');
            } else {
                this.showSection('consent');
            }
            this.updateConsentStatus();
        }
    }

    /**
     * Show help modal
     */
    showHelp() {
        const helpText = `
Draftly AI Email Assistant Help:

🚀 Getting Started:
1. Configure your OpenAI API key
2. Grant consent for data processing
3. Enter your email or prompt
4. Select your preferred tone
5. Click "🤖 Generate AI Reply"

⌨️ Keyboard Shortcuts:
• Ctrl+Enter: Generate reply
• Ctrl+C: Copy reply (when visible)

🎯 Tips:
• Be specific in your prompts for better results
• Try different tones to match your style
• The AI learns from context in your input
• Rate limits prevent API abuse

🔒 Privacy:
• Your data is sent to OpenAI for processing
• No permanent storage by Draftly
• Consent can be revoked anytime
• API key stored securely locally

💡 Tones:
• Professional: Business-appropriate, formal
• Friendly: Warm but professional
• Formal: Very structured, official
• Casual: Relaxed but helpful

🛠️ Troubleshooting:
• Check API key format (starts with "sk-")
• Ensure consent is granted
• Watch for rate limit warnings
• Verify internet connection
        `.trim();
        
        alert(helpText);
    }

    /**
     * Show about modal
     */
    showAbout() {
        const aboutText = `
Draftly AI Email Assistant v2.0.0

🤖 Powered by OpenAI GPT for intelligent email replies

✨ Features:
• AI-powered email generation
• Multiple tone options
• Smart rate limiting
• Privacy-focused design
• One-click copying
• Keyboard shortcuts
• User consent management

🔒 Privacy & Security:
• Local API key storage
• No permanent data retention
• Transparent data processing
• User consent required
• GDPR compliant

🎯 Built for productivity enthusiasts who value:
• Quality AI-generated content
• Data privacy and control
• Professional email communication
• Seamless workflow integration

Developed with ❤️ for the modern workplace.
        `.trim();
        
        alert(aboutText);
    }

    /**
     * Debug method to help troubleshoot OpenAI issues
     */
    async debugOpenAI() {
        console.log('🔍 Debugging Draftly OpenAI Integration...\n');
        
        // Check AI service
        if (!this.aiService) {
            console.error('❌ AI service not initialized');
            return;
        }
        
        console.log('✅ AI service initialized');
        
        // Check API key
        const hasKey = this.aiService.hasAPIKey();
        console.log(`🔑 API Key configured: ${hasKey}`);
        
        if (hasKey && this.aiService.apiKey) {
            const keyFormat = this.aiService.apiKey.startsWith('sk-') ? '✅ Valid format' : '❌ Invalid format';
            console.log(`🔑 API Key format: ${keyFormat}`);
            console.log(`🔑 API Key length: ${this.aiService.apiKey.length} characters`);
        }
        
        // Check consent
        const hasConsent = await this.aiService.consentManager.hasConsent();
        console.log(`📋 User consent: ${hasConsent ? '✅ Granted' : '❌ Not granted'}`);
        
        // Check rate limiting
        const rateLimitStats = this.aiService.rateLimiter.getUsageStats();
        console.log('📊 Rate Limit Status:', rateLimitStats);
        console.log(`📊 Can make request: ${this.aiService.rateLimiter.canMakeRequest()}`);
        
        // Test a simple generation if everything looks good
        if (hasKey && hasConsent && this.aiService.rateLimiter.canMakeRequest()) {
            console.log('🧪 Testing AI generation with simple prompt...');
            try {
                const testReply = await this.aiService.generateEmailReply(
                    'Hello, thank you for your email. I wanted to follow up on our previous conversation.',
                    'professional'
                );
                console.log('✅ Test generation successful!');
                console.log(`📝 Generated reply: "${testReply.substring(0, 100)}..."`);
            } catch (error) {
                console.error('❌ Test generation failed:', error.message);
                
                // Provide specific guidance based on error
                if (error.message.includes('Invalid OpenAI API key')) {
                    console.log('💡 Solution: Check your API key at https://platform.openai.com/api-keys');
                } else if (error.message.includes('quota exceeded')) {
                    console.log('💡 Solution: Add billing info or upgrade your OpenAI plan');
                } else if (error.message.includes('rate limit')) {
                    console.log('💡 Solution: Wait a moment and try again');
                }
            }
        } else {
            console.log('⚠️ Cannot test generation - missing requirements');
            if (!hasKey) console.log('   • Need to configure API key');
            if (!hasConsent) console.log('   • Need to grant consent');
            if (!this.aiService.rateLimiter.canMakeRequest()) console.log('   • Rate limit exceeded');
        }
        
        console.log('\n🔧 To run this debug again, type: draftly.debugOpenAI()');
    }

    /**
     * Quick test function for manual debugging
     */
    async testConnection() {
        console.log('🧪 Testing OpenAI connection...');
        
        if (!this.aiService || !this.aiService.apiKey) {
            console.error('❌ No API key configured');
            return;
        }

        try {
            // Test with minimal request to check connection
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.aiService.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`📡 Response status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Connection successful! Available models: ${data.data?.length || 0}`);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Connection failed:', response.status, errorData);
                return false;
            }
        } catch (error) {
            console.error('❌ Network error:', error);
            return false;
        }
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Draftly Email Assistant...');
    
    try {
        const popup = new DraftlyPopup();
        
        // Make instance globally accessible for debugging
        window.draftly = popup;
        
        console.log('✅ Draftly popup initialized successfully');
        
        // Add debugging helper
        window.debugDraftly = () => {
            console.log('📊 Draftly Debug Info:');
            console.log('- Instance:', popup);
            console.log('- Current input:', popup.currentInput);
            console.log('- Current tone:', popup.currentTone);
            console.log('- Has AI service:', !!popup.aiService);
            console.log('- Has API key:', popup.aiService?.hasAPIKey());
            console.log('- Elements:', {
                emailInput: !!popup.emailInput,
                generateBtn: !!popup.generateBtn,
                outputSection: !!popup.outputSection
            });
            console.log('\n🔧 Available debug functions:');
            console.log('- draftly.debugOpenAI() - Full AI debug');
            console.log('- draftly.testConnection() - Test OpenAI connection');
        };
        
        console.log('🔧 Debug helpers available:');
        console.log('- window.debugDraftly() - Basic debug info');
        console.log('- draftly.debugOpenAI() - OpenAI debug');
        console.log('- draftly.testConnection() - Connection test');
        
    } catch (error) {
        console.error('❌ Failed to initialize Draftly popup:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #fca5a5;
            z-index: 10000;
            font-family: system-ui, sans-serif;
            font-size: 14px;
        `;
        errorDiv.textContent = `Extension Error: ${error.message}. Please reload the extension.`;
        document.body.appendChild(errorDiv);
    }
});
