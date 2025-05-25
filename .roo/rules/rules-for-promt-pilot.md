---
description: 
globs: 
alwaysApply: true
---
# Roo Code Rules for PromptPilot Extension
## 1. Scope & Priority  
- **Focus on Core MVP**  
  - Manifest V3, content/popup/background split, secure messaging  
  - Real-time prompt capture, “Improve” button injection, popup UI, backend hook  
- **Defer Extras Until v2+**  
  - chrome.alarms, offline support, scheduled tasks  
  - Full internationalization, advanced analytics, marketplace publishing  

## 2. Code Style & Structure  
- Write clear, modular **TypeScript** with strict typings  
- Follow **functional programming** patterns; avoid classes  
- Use **descriptive** variable names (e.g. `isLoading`, `hasPermission`)  
- Organize files by responsibility:  
  - `src/content.ts`  
  - `src/background.ts`  
  - `src/popup.tsx`  
  - `src/utils/…`  
  - `src/prompts/…` (store your LLM-template strings here)  
- Document functions with **JSDoc**  
- Implement proper **error handling** and console logging

## 3. Permissions & Security  
- **Least-privilege host permissions**: only target known LLM domains (e.g. `*://*.openai.com/*`)  
- Use a **strict Content Security Policy** (CSP) in `manifest.json`  
- Serve your backend over **HTTPS** (ngrok or a `.dev` domain)  
- Securely handle user data; avoid exposing API keys in client code  
- Follow `web_accessible_resources` best practices

## 4. Chrome API Usage  
- Adhere to **Manifest V3** service-worker model for `background.js`  
- Use only needed `chrome.*` APIs:  
  - `chrome.scripting` to inject UI  
  - `chrome.runtime` for messaging  
  - `chrome.storage.session` for temp state (later `chrome.storage.local` for history)  
  - `chrome.action` to update popup badge/UI  
- Handle async operations with **Promises**/`async`–`await`  
- Defer chrome.alarms until scheduling features are added

## 5. Performance & Optimization  
- **Inject UI only on focus**, don’t scan the entire DOM continuously  
- **Lazy-load** the popup bundle so it only downloads on click  
- Cache identical prompt requests (backend or client) to reduce API calls  
- Monitor and avoid memory leaks in content/background scripts

## 6. UX & Accessibility  
- Keep popup UI minimal (Tailwind or vanilla CSS); Material-style optional  
- Provide clear **loading** and **error** states  
- Ensure **keyboard navigation** and focus management  
- Add `aria-label` and semantic HTML for screen readers  
- Use high-contrast styling for buttons/text

## 7. Testing & CI/CD  
- **Unit tests** (Jest) for prompt-templating logic and utils  
- **End-to-end tests** (Puppeteer) to verify content-script injection and popup flow  
- GitHub Actions: lint, type-check, run tests on every PR  
- Automate builds (`npm run dev`, `npm run build`) and backend start

## 8. Internationalization & Localization (v2)  
- Follow Chrome’s `_locales/` structure  
- Use `chrome.i18n` API for all user-facing strings  
- Plan for RTL language support

## 9. Publishing & Maintenance (later)  
- Prepare store assets: icons, screenshots, demo video  
- Write a clear privacy policy  
- Implement auto-update via Web Store  
- Collect and triage user feedback; maintain changelog  
- Stay up-to-date with Chrome Web Store guidelines and Manifest V3 updates
