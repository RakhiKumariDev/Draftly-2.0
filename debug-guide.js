/**
 * Quick debugging steps for "Failed to generate reply" error
 * 
 * Follow these steps in order to find the root cause:
 */

console.log(`
🔍 DRAFTLY DEBUG GUIDE - "Failed to generate reply" Error

Follow these steps in the browser console:

STEP 1: Basic Check
-----------------
draftly.debugOpenAI()

This will show you:
✅ Is AI service working?
✅ Is API key configured correctly?
✅ Do you have consent?
✅ Are you hitting rate limits?

STEP 2: Test Connection
--------------------
draftly.testConnection()

This will test if your API key can connect to OpenAI.

STEP 3: Check Console Logs
------------------------
Look for error messages starting with ❌ in the console.
They will show the exact error from OpenAI.

STEP 4: Manual API Test
---------------------
If steps 1-3 don't help, test your API key manually:

fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': 'Bearer YOUR_API_KEY_HERE' }
}).then(r => console.log('Status:', r.status))

Replace YOUR_API_KEY_HERE with your actual API key.

COMMON CAUSES:
=============
❌ Invalid API Key → Status 401
   Fix: Get new key from platform.openai.com

❌ No Billing Info → Status 429 "quota exceeded"  
   Fix: Add payment method to OpenAI account

❌ Rate Limit → Status 429 "rate limit"
   Fix: Wait 60 seconds and try again

❌ Network Issue → "Failed to fetch"
   Fix: Check internet, disable VPN/proxy

❌ CORS/Extension Issue → Console shows security errors
   Fix: Reload extension, check permissions

NEXT STEPS:
==========
1. Run the debug commands above
2. Share the console output
3. We can pinpoint the exact issue!
`);

// Auto-run basic debug if draftly is available
if (typeof window !== 'undefined' && window.draftly) {
    console.log('🔧 Auto-running debug...');
    setTimeout(() => {
        window.draftly.debugOpenAI();
    }, 1000);
}
