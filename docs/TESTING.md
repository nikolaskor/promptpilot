# PromptPilot Testing Guide

## Prerequisites

- Chrome/Chromium-based browser
- Node.js 14+ installed

## Step 1: Build and Run the Backend

```bash
# Clone the repository if you haven't already
git clone https://github.com/yourusername/prompt-improve-ext.git
cd prompt-improve-ext

# Install dependencies
npm install
cd backend && npm install && cd ..

# Run the build and test script
chmod +x build-and-test.sh
./build-and-test.sh
```

The script will:

1. Build the extension
2. Start the backend server
3. Test the backend /improve endpoint
4. Provide instructions for loading the extension

## Step 2: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" with the toggle in the top-right corner
3. Click "Load unpacked" and select the `dist` folder from this project
4. Verify the extension is loaded and enabled

## Step 3: Test the Extension

1. Open a website with text input fields (e.g., ChatGPT, Google Docs, or any site with textareas)
2. Click on a text field to focus it
3. Enter some text in the field
4. You should see the "Improve" button appear near the text field
5. Click the "Improve" button
6. The button should show a loading spinner, then replace the text with the improved version

## Debugging Tips

### If the "Improve" button disappears without improving text:

1. **Enable Chrome DevTools:**

   - Right-click anywhere on the page and select "Inspect"
   - Go to the "Console" tab
   - Look for any error messages or logs from "PromptPilot"

2. **Check background script logs:**

   - In Chrome, go to `chrome://extensions/`
   - Find PromptPilot and click "Details"
   - Scroll down to "Inspect views" and click "service worker"
   - This opens DevTools for the background script
   - Check the console for errors or logs

3. **Verify backend connection:**

   - Ensure the backend server is running (you should see logs in the terminal)
   - Open a new tab and navigate to `http://localhost:4000/health`
   - You should see a JSON response with `{"status":"ok",...}`

4. **Test the backend manually:**
   - Use curl or Postman to test the API:
   ```bash
   curl -X POST http://localhost:4000/improve -H "Content-Type: application/json" -d '{"prompt":"Test prompt"}'
   ```

### If other issues occur:

1. **Check for content script injection:**

   - Open DevTools on the page (right-click > Inspect)
   - Go to "Sources" tab
   - Look for a "Content Scripts" section under the domain
   - Verify "content.js" is listed

2. **Check for focus issues:**

   - The button works based on detecting focused text fields
   - Try clicking into different text areas to trigger the focus event

3. **Try in incognito mode:**
   - Sometimes extensions with conflicting permissions can interfere
   - Enable the extension in incognito mode and test there

## Common Error Messages and Solutions

| Error                                  | Solution                                                       |
| -------------------------------------- | -------------------------------------------------------------- |
| "Failed to communicate with extension" | Reload the extension and refresh the page                      |
| "Backend server is not available"      | Check if the backend server is running on port 4000            |
| "No text was captured"                 | Make sure to enter text in the field before clicking "Improve" |

Remember: The extension is running in "demo mode" by default, which means it will return a simulated improvement rather than using a real AI service. To use real AI improvements, you need to add an OpenAI API key to the `.env` file in the backend directory.
