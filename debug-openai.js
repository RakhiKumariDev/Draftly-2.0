/**
 * Debug script for Draftly OpenAI API issues
 * Run this in the browser console to diagnose problems
 */

// Add this function to your popup.js for debugging
function debugOpenAIIssue() {
    console.log('🔍 Debugging OpenAI API Issue...\n');
    
    // Check if AI service exists
    if (typeof window.draftlyAI === 'undefined') {
        console.error('❌ AI service not found. Extension may not be properly loaded.');
        return;
    }
    
    const ai = window.draftlyAI;
    
    // Check API key
    const hasKey = ai.hasAPIKey();
    console.log(`🔑 API Key configured: ${hasKey}`);
    
    if (hasKey && ai.apiKey) {
        const keyFormat = ai.apiKey.startsWith('sk-') ? '✅ Valid format' : '❌ Invalid format';
        console.log(`🔑 API Key format: ${keyFormat} (starts with "sk-")`);
        console.log(`🔑 API Key length: ${ai.apiKey.length} characters`);
    }
    
    // Check consent
    ai.consentManager.hasConsent().then(hasConsent => {
        console.log(`📋 User consent: ${hasConsent ? '✅ Granted' : '❌ Not granted'}`);
    });
    
    // Check rate limiting
    const rateLimitStats = ai.rateLimiter.getUsageStats();
    console.log('📊 Rate Limit Status:', rateLimitStats);
    console.log(`📊 Can make request: ${ai.rateLimiter.canMakeRequest()}`);
    
    // Test API key by making a simple request
    if (hasKey) {
        console.log('🧪 Testing OpenAI API connection...');
        
        fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ai.apiKey}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log(`🌐 OpenAI API test response: ${response.status}`);
            if (response.ok) {
                console.log('✅ API key is valid and working!');
                return response.json();
            } else {
                console.error('❌ API key test failed');
                return response.json().then(err => {
                    console.error('❌ Error details:', err);
                    
                    if (response.status === 401) {
                        console.error('🔐 This means your API key is invalid or expired');
                    } else if (response.status === 429) {
                        console.error('⏰ This means you hit OpenAI\'s rate limit');
                    } else if (response.status === 403) {
                        console.error('🚫 This means your API key doesn\'t have permission');
                    }
                });
            }
        })
        .then(data => {
            if (data && data.data) {
                console.log(`✅ Available models: ${data.data.length}`);
                console.log('✅ Your API key has access to OpenAI models');
            }
        })
        .catch(error => {
            console.error('❌ Network error testing API:', error);
        });
    }
}

// Instructions for user
console.log(`
🔧 Draftly OpenAI Debug Instructions:

1. Open the Draftly extension popup
2. Open browser developer tools (F12)
3. Go to Console tab
4. Run: debugOpenAIIssue()

This will show you:
✅ Whether your API key is properly configured
✅ Whether the key format is correct
✅ Whether you have proper consent
✅ Your current rate limit status
✅ Whether the API key actually works with OpenAI

Common Issues:
❌ API key doesn't start with "sk-" → Invalid format
❌ API key is expired → Get new key from OpenAI
❌ No billing info on OpenAI account → Add payment method
❌ Free tier quota exceeded → Upgrade OpenAI plan
❌ Network blocking OpenAI → Check firewall/proxy
`);

// Export for use in popup
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { debugOpenAIIssue };
}
