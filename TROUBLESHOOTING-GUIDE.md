# Draftly OpenAI Troubleshooting Guide

## The Issue: "OpenAI rate limit exceeded" on First Request

This error can happen for several reasons. Let's diagnose and fix it step by step.

## Step 1: Check the Browser Console

1. **Load the extension** in Chrome (chrome://extensions/ → Load unpacked)
2. **Click the Draftly icon** to open the popup
3. **Open Developer Tools** (F12 or right-click → Inspect)
4. **Go to the Console tab**
5. **Type this command**: `draftly.debugOpenAI()`
6. **Press Enter** and review the output

## Step 2: Common Issues and Solutions

### ❌ Invalid API Key Format
**Error**: API key doesn't start with "sk-"
**Solution**: 
- Get a new API key from https://platform.openai.com/api-keys
- Make sure it starts with "sk-"
- Copy and paste carefully (no extra spaces)

### ❌ API Key is Invalid/Expired
**Error**: HTTP 401 - Invalid API key
**Solution**:
- Generate a new API key at https://platform.openai.com/api-keys
- Delete old keys that aren't working
- Make sure you're logged into the correct OpenAI account

### ❌ No Billing Information
**Error**: HTTP 429 with "quota exceeded"
**Solution**:
- Go to https://platform.openai.com/account/billing
- Add a payment method (credit card)
- Even $5 credit is enough to test the extension

### ❌ Free Tier Quota Used Up
**Error**: Mentions quota exceeded
**Solution**:
- Check your usage at https://platform.openai.com/account/usage
- Wait for monthly reset or add billing info

### ❌ OpenAI's Rate Limiting
**Error**: "rate limit exceeded" but from OpenAI servers
**Solution**:
- Wait 1-2 minutes and try again
- This is normal if you make too many requests quickly

## Step 3: Test Your API Key Manually

Run this in the browser console to test your API key directly:

```javascript
// Replace 'your-api-key-here' with your actual API key
const apiKey = 'sk-your-api-key-here';

fetch('https://api.openai.com/v1/models', {
    headers: {
        'Authorization': `Bearer ${apiKey}`
    }
})
.then(response => {
    console.log('Status:', response.status);
    if (response.ok) {
        console.log('✅ API key is working!');
    } else {
        console.log('❌ API key problem');
        return response.json();
    }
})
.then(data => {
    if (data && data.error) {
        console.log('Error details:', data.error);
    }
});
```

## Step 4: Clear Extension Data

If issues persist, reset the extension:

1. Open Chrome → Settings → Privacy and Security → Site Settings
2. Find "chrome-extension://[your-extension-id]"
3. Clear all data
4. Reload the extension
5. Re-enter your API key and grant consent

## Step 5: Check Network Issues

- Disable any VPN/proxy temporarily
- Check if your firewall blocks api.openai.com
- Try from a different network

## Step 6: Verify Extension Permissions

Make sure the extension has these permissions in manifest.json:
- "activeTab"
- "storage" 
- "host_permissions": ["https://api.openai.com/*"]

## Getting Help

If none of these steps work:

1. **Run the debug command**: `draftly.debugOpenAI()`
2. **Copy the console output**
3. **Share the exact error message** you're seeing
4. **Mention which OpenAI plan** you're on (free/paid)

## Quick Fixes Summary

| Error Type | Quick Fix |
|------------|-----------|
| Invalid API key | Get new key from OpenAI dashboard |
| Quota exceeded | Add billing info to OpenAI account |
| Rate limit | Wait 1-2 minutes, try again |
| Network error | Check firewall/VPN settings |
| Permission denied | Verify API key has proper access |

The extension is designed to work seamlessly once your OpenAI API key is properly configured!
