/**
 * Background service worker for PromptPilot
 * Handles communication between content script, popup, and backend
 */

// Backend URL for the improve endpoint
const BACKEND_URL = "http://localhost:4000";

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPROVE_PROMPT") {
    improvePrompt(message.text);
  }
});

/**
 * Send prompt to backend for improvement
 * @param text - The original prompt text to improve
 */
async function improvePrompt(text: string): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/improve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: text }),
    });

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    // Send improved prompt back to popup
    chrome.runtime.sendMessage({
      type: "IMPROVED_TEXT",
      text: data.improvedPrompt,
    });
  } catch (error) {
    console.error("Error improving prompt:", error);
    chrome.runtime.sendMessage({
      type: "ERROR",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

// Log when the service worker is installed
console.log("PromptPilot background service worker initialized");
