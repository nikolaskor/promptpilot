# PromptPilot Chrome Extension

A Chrome extension that helps improve prompts for AI platforms. PromptPilot detects textareas and contenteditable fields, adds an "Improve" button next to them, and sends the prompt to an AI backend for enhancement.

## Features

- Detects focused text input areas on any website
- Injects an "Improve" button next to the active field
- Sends prompts to a backend API for improvement
- Shows original and improved prompts side-by-side
- One-click copy to clipboard

## Installation

### Development Setup

1. Clone this repository:

```bash
git clone https://github.com/yourusername/prompt-improve-ext.git
cd prompt-improve-ext
```

2. Install dependencies:

```bash
npm install
cd backend && npm install && cd ..
```

3. Build the extension:

```bash
npm run build
```

4. Start the backend server:

```bash
npm run backend
```

5. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select the `dist` folder from this project

## Usage

1. Navigate to any website with text fields (like ChatGPT, Claude, etc.)
2. Click on a textarea or contenteditable element
3. An "✏️ Improve" button will appear near the field
4. Click the button to send the prompt to the improvement service
5. View the improved prompt in the popup and copy it to clipboard

## Project Structure

- `public/manifest.json` - Chrome extension manifest file
- `src/`
  - `content.ts` - Content script that injects the button
  - `background.ts` - Background service worker for API communication
  - `popup.tsx` - React popup UI
  - `index.html` - HTML template for the popup
- `backend/` - Express server for prompt improvement

## Next Steps

- Replace the echo server with an actual AI service (OpenAI GPT-4, etc.)
- Set up HTTPS with ngrok for secure communication
- Implement prompt history storage with `chrome.storage.local`
- Add authentication for API requests
- Improve UI with better styling and animations

## Development

- Run in development mode: `npm run dev`
- Build for production: `npm run build`
- Start backend server: `npm run backend`
- Run both together: `npm run start`

## License

MIT
