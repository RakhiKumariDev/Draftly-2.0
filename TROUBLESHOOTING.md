# Draftly Extension - Installation & Troubleshooting Guide

## 🚀 Installation Steps

1. **Open Chrome Extensions Page**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

2. **Load the Extension**
   - Click "Load unpacked"
   - Select the `Draftly 2.0` folder
   - The extension should appear in your extensions list

3. **Verify Installation**
   - Look for the Draftly icon in your Chrome toolbar
   - Click the icon to open the popup

## 🔧 Troubleshooting the "Failed to generate reply" Error

### Step 1: Check Browser Console

1. **Open the Popup**
   - Click the Draftly extension icon

2. **Open Developer Tools**
   - Right-click in the popup window
   - Select "Inspect" or press F12
   - Go to the "Console" tab

3. **Look for Error Messages**
   - Check for any red error messages
   - Look for messages starting with "❌" or "Error"

### Step 2: Test Basic Functionality

1. **In the Console, run:**
   ```javascript
   window.debugDraftly()
   ```

2. **Test email generation manually:**
   ```javascript
   window.draftly.generateEmailReply("Hello, I need help", "professional")
     .then(reply => console.log("✅ Reply:", reply))
     .catch(error => console.error("❌ Error:", error))
   ```

### Step 3: Common Issues & Solutions

#### Issue 1: Extension Not Loading
**Symptoms:** No Draftly icon in toolbar, or clicking it does nothing
**Solutions:**
- Refresh the extensions page (`chrome://extensions/`)
- Click the refresh button for Draftly extension
- Check if there are any errors on the extensions page

#### Issue 2: JavaScript Errors
**Symptoms:** Console shows red error messages
**Solutions:**
- Check if all files are present in the Draftly 2.0 folder
- Ensure `popup.html`, `popup.js`, and `popup.css` exist
- Reload the extension

#### Issue 3: Empty Template Error
**Symptoms:** "Generated reply is empty" error
**Solutions:**
- Test different tones (Professional, Friendly, Formal, Casual)
- Try with different input text (at least 10 characters)
- Check console for template-related errors

#### Issue 4: Chrome APIs Not Available
**Symptoms:** Storage errors, permission errors
**Solutions:**
- Make sure you're testing as an extension (not opening HTML directly)
- Check if manifest.json has correct permissions
- Reload the extension

### Step 4: Manual Testing

1. **Test with Sample Inputs:**
   ```
   Input: "Hello, I need help with my account. Can you assist me?"
   Expected: Should generate a professional reply
   ```

2. **Test Different Tones:**
   - Professional: Formal, business-like tone
   - Friendly: Casual but professional
   - Formal: Very structured and official
   - Casual: Relaxed and informal

3. **Test Edge Cases:**
   - Very short input (should show error)
   - Empty input (should show error)
   - Very long input (should work fine)

### Step 5: Advanced Debugging

1. **Run Full Test Suite:**
   ```javascript
   // Copy and paste the content of test-extension.js into console
   window.testDraftly.runAllTests()
   ```

2. **Check Individual Components:**
   ```javascript
   // Test templates
   window.testDraftly.testTemplates()
   
   // Test generation
   window.testDraftly.testGeneration()
   ```

## 🛠 Manual Fixes

### Fix 1: If Templates Are Missing

1. Open `popup/popup.js`
2. Find the `getEmailTemplates` method
3. Ensure all four tones have complete templates

### Fix 2: If Extension Won't Load

1. Check `manifest.json` for syntax errors
2. Ensure all file paths are correct
3. Verify all required files exist

### Fix 3: If Generation Always Fails

1. Check the `generateEmailReply` method
2. Look for the try-catch block
3. Ensure the fallback response function exists

## 📊 Expected Behavior

### Normal Operation:
1. User enters text in input area
2. Selects a tone
3. Clicks "Generate Reply"
4. Loading animation appears
5. Reply is generated and displayed
6. Success message appears
7. User can copy the reply

### Error Handling:
- Empty input → "Please enter an email message"
- Too short input → "Please enter a more detailed message"
- Generation failure → Fallback response is shown
- Network issues → Specific error message

## 🆘 Get Help

If you're still experiencing issues:

1. **Check the Console Logs**
   - Look for the 🚀 initialization message
   - Check for any ❌ error messages

2. **Verify File Structure**
   ```
   Draftly 2.0/
   ├── manifest.json
   ├── popup/
   │   ├── popup.html
   │   ├── popup.css
   │   └── popup.js
   ├── background/
   │   └── background.js
   └── icons/ (with placeholder files)
   ```

3. **Test with Minimal Input**
   - Use simple text like "Hello, I need help"
   - Try the "Professional" tone first

4. **Check Chrome Version**
   - Ensure you're using Chrome 88 or later
   - Update Chrome if necessary

The extension includes comprehensive error handling and should provide fallback responses even if the main generation logic fails. If you're still seeing the "Failed to generate reply" error, please check the browser console for specific error details.
