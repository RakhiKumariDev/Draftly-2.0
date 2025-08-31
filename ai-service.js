/**
 * Draftly AI Service - OpenAI Integration
 * Handles AI-powered email generation with rate limiting and user consent
 */

class DraftlyAIService {
    constructor() {
        this.apiKey = 'my api key'; 
        this.rateLimiter = new RateLimiter();
        this.consentManager = new ConsentManager();
        this.isInitialized = false;
    }

    /**
     * Initialize the AI service
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Check user consent
            await this.consentManager.initialize();
            
            this.isInitialized = true;
            console.log('✅ Draftly AI Service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize AI service:', error);
            throw new Error('AI service initialization failed');
        }
    }

    /**
     * Generate email reply using OpenAI
     * @param {string} input - The input email or prompt
     * @param {string} tone - The desired tone for the reply
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - The generated reply
     */
    async generateEmailReply(input, tone = 'formal', options = {}) {
        try {
            console.log('🤖 Starting AI email generation...', { tone, inputLength: input?.length });

            if (!['formal', 'casual'].includes(tone.toLowerCase())) {
                throw new Error('Invalid tone. Only "Formal" and "Casual" are allowed.');
            }

            // Check initialization
            if (!this.isInitialized) {
                console.log('🔄 Initializing AI service...');
                await this.initialize();
            }

            // Check user consent
            if (!await this.consentManager.hasConsent()) {
                throw new Error('User consent required for AI processing');
            }
            console.log('✅ User consent verified');

            // Check API key
            if (!this.apiKey) {
                throw new Error('OpenAI API key not configured');
            }
            console.log('✅ API key configured');

            // Check rate limit (our internal limiter)
            const rateLimitStatus = this.rateLimiter.getUsageStats();
            console.log('📊 Rate limit status:', rateLimitStatus);
            
            if (!this.rateLimiter.canMakeRequest()) {
                const resetTime = this.rateLimiter.getResetTime();
                throw new Error(`Draftly rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds.`);
            }

            // Validate input
            if (!input || input.trim().length === 0) {
                throw new Error('Input cannot be empty');
            }

            console.log('🚀 Making OpenAI API request...');
            
            // Generate system prompt
            const systemPrompt = this.createSystemPrompt(tone, options);
            
            // Make API request
            const reply = await this.callOpenAI(systemPrompt, input);
            
            console.log('✅ AI reply generated successfully');
            
            // Record successful request
            this.rateLimiter.recordRequest();
            
            // Track usage
            await this.trackUsage('generate_reply', {
                tone,
                inputLength: input.length,
                outputLength: reply.length,
                success: true
            });

            return reply;

        } catch (error) {
            console.error('❌ Error generating AI reply:', error);
            
            // Track error
            await this.trackUsage('generate_reply_error', {
                tone,
                inputLength: input?.length || 0,
                error: error.message,
                success: false
            });

            throw error;
        }
    }

    /**
     * Create system prompt based on tone and options
     * @param {string} tone - The desired tone
     * @param {Object} options - Additional options
     * @returns {string} - System prompt
     */
    createSystemPrompt(tone, options = {}) {
        const basePrompt = `You are a professional email assistant. Generate a well-structured email reply based on the user's input.`;
        
        const toneInstructions = {
            professional: 'Use a professional, business-appropriate tone. Be formal but approachable.',
            friendly: 'Use a friendly, warm tone while maintaining professionalism. Be conversational but respectful.',
            formal: 'Use a very formal, structured tone. Be respectful and follow business etiquette strictly.',
            casual: 'Use a casual, relaxed tone. Be informal but still professional and helpful.'
        };

        const guidelines = `
Guidelines:
- Keep the response concise and relevant
- Include appropriate greeting and closing
- Address the main points from the input
- Be helpful and constructive
- Maintain the ${tone} tone throughout
- Format as a proper email reply
- Do not include subject lines or email headers
- Ensure the response is complete and actionable
`;

        return `${basePrompt}

${toneInstructions[tone] || toneInstructions.professional}

${guidelines}`;
    }

    /**
     * Make API call to OpenAI
     * @param {string} systemPrompt - System instructions
     * @param {string} userInput - User's email input
     * @returns {Promise<string>} - Generated reply
     */
    async callOpenAI(systemPrompt, userInput) {
        // Validate API key format
        if (!this.apiKey || !this.apiKey.startsWith('sk-')) {
            throw new Error('❌ Invalid API key format. OpenAI API keys should start with "sk-"');
        }

        const requestBody = {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `Please generate a professional email reply to the following message:\n\n${userInput}`
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0.2,
            presence_penalty: 0.1
        };

        console.log('📤 Making OpenAI API request to:', 'https://api.openai.com/v1/chat/completions');
        console.log('📋 Request model:', requestBody.model);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 OpenAI API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ OpenAI API error details:', errorData);
            
            if (response.status === 401) {
                throw new Error('❌ Invalid OpenAI API key. Please check your API key in settings.');
            } else if (response.status === 429) {
                // Check if it's rate limiting or quota exceeded
                const errorMessage = errorData.error?.message || '';
                if (errorMessage.includes('quota')) {
                    throw new Error('❌ OpenAI API quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
                } else {
                    throw new Error('❌ OpenAI API rate limit exceeded. This is from OpenAI\'s servers, not Draftly. Please wait a moment and try again.');
                }
            } else if (response.status === 400) {
                throw new Error('❌ Invalid request to OpenAI API. Please try a different prompt.');
            } else if (response.status === 403) {
                throw new Error('❌ OpenAI API access forbidden. Please check your API key permissions.');
            } else {
                const errorMsg = errorData.error?.message || 'Unknown error';
                throw new Error(`❌ OpenAI API error (${response.status}): ${errorMsg}`);
            }
        }

        const data = await response.json();
        console.log('✅ OpenAI API response received successfully');
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response generated by OpenAI');
        }

        const reply = data.choices[0].message?.content?.trim();
        
        if (!reply) {
            throw new Error('Empty response from OpenAI');
        }

        console.log('📝 Generated reply length:', reply.length);
        return reply;
    }

    /**
     * Load API key from storage
     */
    async loadAPIKey() {
        try {
            const result = await chrome.storage.sync.get(['openai_api_key']);
            this.apiKey = result.openai_api_key;
        } catch (error) {
            console.error('Failed to load API key:', error);
        }
    }

    /**
     * Save API key to storage
     * @param {string} apiKey - The OpenAI API key
     */
    async saveAPIKey(apiKey) {
        try {
            if (!apiKey || !apiKey.startsWith('sk-')) {
                throw new Error('Invalid OpenAI API key format');
            }

            await chrome.storage.sync.set({ openai_api_key: apiKey });
            this.apiKey = apiKey;
            console.log('✅ API key saved successfully');
        } catch (error) {
            console.error('Failed to save API key:', error);
            throw error;
        }
    }

    /**
     * Check if API key is configured
     * @returns {boolean} - Whether API key is set
     */
    hasAPIKey() {
        return this.apiKey && this.apiKey.startsWith('sk-');
    }

    /**
     * Track usage statistics
     * @param {string} action - Action performed
     * @param {Object} metadata - Additional data
     */
    async trackUsage(action, metadata = {}) {
        try {
            const usage = {
                action,
                metadata,
                timestamp: Date.now()
            };

            // Store locally for analytics
            const { usage_stats = [] } = await chrome.storage.local.get(['usage_stats']);
            usage_stats.push(usage);

            // Keep only last 100 entries
            if (usage_stats.length > 100) {
                usage_stats.splice(0, usage_stats.length - 100);
            }

            await chrome.storage.local.set({ usage_stats });
        } catch (error) {
            console.error('Failed to track usage:', error);
        }
    }
}

/**
 * Rate Limiter Class
 * Implements rate limiting to prevent API abuse
 */
class RateLimiter {
    constructor() {
        this.requests = [];
        this.maxRequestsPerMinute = 15; // Increased from 10 for better UX
        this.maxRequestsPerHour = 100; // Increased from 50 for better UX
        this.windowSizeMinute = 60 * 1000; // 1 minute
        this.windowSizeHour = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Check if a request can be made
     * @returns {boolean} - Whether request is allowed
     */
    canMakeRequest() {
        const now = Date.now();
        
        // Clean old requests
        this.cleanOldRequests(now);
        
        // Check minute limit
        const recentRequests = this.requests.filter(
            time => now - time < this.windowSizeMinute
        );
        
        if (recentRequests.length >= this.maxRequestsPerMinute) {
            return false;
        }

        // Check hour limit
        const hourlyRequests = this.requests.filter(
            time => now - time < this.windowSizeHour
        );
        
        return hourlyRequests.length < this.maxRequestsPerHour;
    }

    /**
     * Record a successful request
     */
    recordRequest() {
        this.requests.push(Date.now());
    }

    /**
     * Get time until rate limit resets
     * @returns {number} - Milliseconds until reset
     */
    getResetTime() {
        if (this.requests.length === 0) return 0;
        
        const now = Date.now();
        const oldestRecentRequest = Math.min(...this.requests.filter(
            time => now - time < this.windowSizeMinute
        ));
        
        return Math.max(0, this.windowSizeMinute - (now - oldestRecentRequest));
    }

    /**
     * Clean old request timestamps
     * @param {number} now - Current timestamp
     */
    cleanOldRequests(now) {
        this.requests = this.requests.filter(
            time => now - time < this.windowSizeHour
        );
    }

    /**
     * Get current usage statistics
     * @returns {Object} - Usage stats
     */
    getUsageStats() {
        const now = Date.now();
        const recentRequests = this.requests.filter(
            time => now - time < this.windowSizeMinute
        );
        const hourlyRequests = this.requests.filter(
            time => now - time < this.windowSizeHour
        );

        return {
            requestsThisMinute: recentRequests.length,
            maxPerMinute: this.maxRequestsPerMinute,
            requestsThisHour: hourlyRequests.length,
            maxPerHour: this.maxRequestsPerHour,
            resetTime: this.getResetTime()
        };
    }
}

/**
 * Consent Manager Class
 * Handles user consent for data processing
 */
class ConsentManager {
    constructor() {
        this.consentGiven = false;
        this.consentTimestamp = null;
    }

    /**
     * Initialize consent manager
     */
    async initialize() {
        try {
            const result = await chrome.storage.sync.get([
                'user_consent',
                'consent_timestamp',
                'consent_version'
            ]);

            this.consentGiven = result.user_consent === true;
            this.consentTimestamp = result.consent_timestamp;
            this.consentVersion = result.consent_version;

            // Check if consent needs renewal (every 6 months)
            if (this.consentGiven && this.consentTimestamp) {
                const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
                if (this.consentTimestamp < sixMonthsAgo) {
                    this.consentGiven = false;
                    console.log('User consent expired, renewal required');
                }
            }
        } catch (error) {
            console.error('Failed to load consent settings:', error);
        }
    }

    /**
     * Check if user has given consent
     * @returns {boolean} - Whether consent is given
     */
    async hasConsent() {
        if (!this.consentGiven) {
            await this.initialize();
        }
        return this.consentGiven;
    }

    /**
     * Request user consent
     * @returns {Promise<boolean>} - Whether consent was granted
     */
    async requestConsent() {
        return new Promise((resolve) => {
            // This will be handled by the popup UI
            chrome.runtime.sendMessage({
                type: 'REQUEST_CONSENT',
                data: {
                    callback: (granted) => {
                        if (granted) {
                            this.grantConsent();
                        }
                        resolve(granted);
                    }
                }
            });
        });
    }

    /**
     * Grant user consent
     */
    async grantConsent() {
        try {
            this.consentGiven = true;
            this.consentTimestamp = Date.now();
            this.consentVersion = '1.0';

            await chrome.storage.sync.set({
                user_consent: true,
                consent_timestamp: this.consentTimestamp,
                consent_version: this.consentVersion
            });

            console.log('✅ User consent granted');
        } catch (error) {
            console.error('Failed to save consent:', error);
        }
    }

    /**
     * Revoke user consent
     */
    async revokeConsent() {
        try {
            this.consentGiven = false;
            this.consentTimestamp = null;

            await chrome.storage.sync.set({
                user_consent: false,
                consent_timestamp: null
            });

            // Clear API key as well
            await chrome.storage.sync.remove(['openai_api_key']);

            console.log('✅ User consent revoked');
        } catch (error) {
            console.error('Failed to revoke consent:', error);
        }
    }

    /**
     * Get consent information
     * @returns {Object} - Consent details
     */
    getConsentInfo() {
        return {
            granted: this.consentGiven,
            timestamp: this.consentTimestamp,
            version: this.consentVersion,
            expiresAt: this.consentTimestamp ? 
                new Date(this.consentTimestamp + (6 * 30 * 24 * 60 * 60 * 1000)) : null
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DraftlyAIService = DraftlyAIService;
    window.RateLimiter = RateLimiter;
    window.ConsentManager = ConsentManager;
}
