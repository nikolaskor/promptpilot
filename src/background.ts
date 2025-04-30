/**
 * Background service worker for PromptPilot
 * Handles communication between content script, popup, and backend
 */

// Backend URL for the improve endpoint
const BACKEND_URL = "http://localhost:4000";

// Track whether the background script is initialized
let bgIsInitialized = false;

// Initialize the background script
function bgInitialize() {
  if (bgIsInitialized) return;

  console.log("PromptPilot background service worker initializing...");

  // Set initialized flag
  bgIsInitialized = true;

  console.log("PromptPilot background service worker initialized");
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ensure initialization
  bgInitialize();

  console.log("Background received message:", message.type);

  if (message.type === "IMPROVE_PROMPT") {
    improvePrompt(message.text);
    // Send an immediate response to prevent connection errors
    sendResponse({ status: "processing" });
    return true; // Indicate we will send a response asynchronously
  } else if (message.type === "OPEN_POPUP") {
    // Just acknowledge receipt
    sendResponse({ status: "received" });
    return true;
  } else if (message.type === "CAPTURED_TEXT") {
    // Just acknowledge receipt
    sendResponse({ status: "received" });
    return true;
  }

  // For unhandled message types, send a response to prevent connection errors
  sendResponse({ status: "unhandled_message_type" });
  return true;
});

/**
 * Send prompt to backend for improvement
 * @param text - The original prompt text to improve
 */
async function improvePrompt(text: string): Promise<void> {
  try {
    console.log("Sending prompt to backend for improvement");

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
    console.log("Received improved prompt from backend");

    // Send improved prompt back to popup
    try {
      chrome.runtime.sendMessage(
        {
          type: "IMPROVED_TEXT",
          text: data.improvedPrompt,
        },
        (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.error(
              "Error sending improved text - popup may be closed:",
              lastError.message
            );
          }
        }
      );
    } catch (err) {
      console.error("Error sending improved text to popup:", err);
    }
  } catch (error) {
    console.error("Error improving prompt:", error);
    try {
      chrome.runtime.sendMessage(
        {
          type: "ERROR",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.error(
              "Error sending error message - popup may be closed:",
              lastError.message
            );
          }
        }
      );
    } catch (err) {
      console.error("Error sending error to popup:", err);
    }
  }
}

// Initialize immediately
bgInitialize();

// Add listener for connections
chrome.runtime.onConnect.addListener((port) => {
  console.log("Connection established with", port.name);

  port.onMessage.addListener((message) => {
    console.log("Received port message:", message);
    // Handle any port-specific messages here
  });

  port.onDisconnect.addListener(() => {
    console.log("Port disconnected:", port.name);
  });
});
