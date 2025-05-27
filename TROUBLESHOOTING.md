# PromptPilot Troubleshooting Guide

## Issue: Prompt improvement stuck in loading state

### Quick Fixes

1. **Reload the extension**:

   - Go to `chrome://extensions/`
   - Find PromptPilot
   - Click the reload button (🔄)
   - Refresh the webpage you're testing on

2. **Check if backend is running**:

   - The backend should be running on `http://localhost:4001`
   - Test: Open `http://localhost:4001/health` in your browser
   - You should see a JSON response with status "ok"

3. **Reload the webpage**:
   - After reloading the extension, refresh the webpage
   - The content script needs to reinitialize

### Debugging Steps

#### Step 1: Check Browser Console

1. Open the webpage where you're testing (e.g., ChatGPT)
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Copy and paste this debug script:

```javascript
// Copy the contents of debug-extension.js and paste here
```

#### Step 2: Check Extension Console

1. Go to `chrome://extensions/`
2. Find PromptPilot
3. Click "service worker" link (this opens the background script console)
4. Look for any error messages

#### Step 3: Check Network Tab

1. In Developer Tools, go to Network tab
2. Try to improve a prompt
3. Look for requests to `localhost:4001/improve`
4. Check if the request is being made and what the response is

### Common Issues and Solutions

#### 1. Backend Not Running

**Symptoms**: No network requests to localhost:4001
**Solution**:

```bash
cd backend
npm start
```

#### 2. Extension Not Loaded Properly

**Symptoms**: No PromptPilot button visible on the page
**Solution**:

- Reload extension in `chrome://extensions/`
- Refresh the webpage
- Check if the website is supported (ChatGPT, Claude, etc.)

#### 3. Content Script Not Injected

**Symptoms**: Button not appearing, no console logs from content script
**Solution**:

- Check if the website URL matches the manifest permissions
- Reload extension and refresh page
- Check for JavaScript errors in console

#### 4. Background Script Errors

**Symptoms**: Button appears but clicking does nothing
**Solution**:

- Check background script console for errors
- Look for TypeScript compilation errors
- Check if AnalyticsStorage is working properly

#### 5. CORS Issues

**Symptoms**: Network errors when calling backend
**Solution**:

- Backend should be running with CORS enabled
- Check backend logs for incoming requests

### Testing Commands

Run these in the browser console to test specific parts:

```javascript
// Test if content script is loaded
document.getElementById("promptpilot-improve-button");

// Test background script communication
chrome.runtime.sendMessage({ type: "CHECK_BACKEND" }, console.log);

// Test analytics
chrome.runtime.sendMessage({ type: "GET_USER_SETTINGS" }, console.log);

// Test improvement (replace with actual text)
chrome.runtime.sendMessage(
  {
    type: "IMPROVE_AND_REPLACE",
    text: "Write a poem about love",
    intent: "Creative",
    platform: "test",
  },
  console.log
);
```

### Log Analysis

Look for these specific log messages:

**Content Script (webpage console)**:

- "PromptPilot content script initializing..."
- "PromptPilot content script initialized for platform: [platform]"
- "Improving text: [text preview]"

**Background Script (extension console)**:

- "PromptPilot background service worker initializing..."
- "Backend health check: OK"
- "IMPROVE_AND_REPLACE: Received text to improve"
- "Successfully improved prompt, sending for replacement"

**Popup (if open)**:

- "Popup initialized with state:"
- "Setting improved prompt to: [text]"

### If Nothing Works

1. **Check manifest.json permissions**:

   - Ensure the website you're testing is included in host permissions
   - Common sites: `*://*.openai.com/*`, `*://*.anthropic.com/*`

2. **Rebuild extension**:

   ```bash
   npm run build
   ```

3. **Check TypeScript errors**:

   ```bash
   npm run build
   ```

   Look for any compilation errors

4. **Reset extension data**:
   - Go to `chrome://extensions/`
   - Remove PromptPilot
   - Reload from `dist` folder

### Getting Help

If the issue persists:

1. **Collect logs**:

   - Browser console logs
   - Extension background script logs
   - Backend logs (if running)

2. **Check versions**:

   - Chrome version
   - Node.js version
   - Extension version

3. **Test environment**:
   - Operating system
   - Website being tested
   - Any browser extensions that might interfere

### Recent Fixes Applied

- ✅ Fixed syntax error in background script (duplicate function declaration)
- ✅ Added popup message forwarding for improved text
- ✅ Added popup error message forwarding
- ✅ Improved error handling and logging
- ✅ **MAJOR FIX**: Fixed content script not handling background script responses properly
- ✅ Added timeout mechanism to prevent infinite loading states
- ✅ Added proper response status handling in content script
