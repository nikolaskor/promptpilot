/**
 * Background service worker for PromptPilot
 * Handles communication between content script, popup, and backend
 */

// Backend URL for the improve endpoint
const BACKEND_URL = "http://localhost:4001";

// Track whether the background script is initialized
let bgIsInitialized = false;

// Initialize the background script
function bgInitialize() {
  if (bgIsInitialized) return;

  console.log("PromptPilot background service worker initializing...");

  // Check if backend is running
  checkBackendHealth()
    .then((isHealthy) => {
      console.log(`Backend health check: ${isHealthy ? "OK" : "Failed"}`);
    })
    .catch((error) => {
      console.error("Backend health check error:", error);
    });

  // Set initialized flag
  bgIsInitialized = true;

  console.log("PromptPilot background service worker initialized");
}

/**
 * Check if the backend is healthy
 * @returns Promise<boolean> True if backend is healthy
 */
async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data.status === "ok";
  } catch (error) {
    console.error("Error checking backend health:", error);
    return false;
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    "Background received message:",
    request.type,
    "from",
    sender.tab ? "content script" : "popup"
  );

  // Always initialize the background script when a message is received
  bgInitialize();

  // Handle IMPROVE_AND_REPLACE message
  if (request.type === "IMPROVE_AND_REPLACE") {
    const text = request.text;
    console.log(
      "IMPROVE_AND_REPLACE: Received text to improve, length:",
      text.length
    );
    console.log(
      "IMPROVE_AND_REPLACE: Sender tab:",
      sender.tab ? sender.tab.id : "undefined"
    );

    // Let the content script know we're processing
    sendResponse({ status: "processing" });
    console.log(
      "IMPROVE_AND_REPLACE: Sent processing response to content script"
    );

    improvePrompt(text)
      .then((improvedText) => {
        console.log("Successfully improved prompt, sending for replacement");
        console.log("Improved prompt:", improvedText.substring(0, 100) + "...");

        // Send improved text back to content script for replacement
        if (sender.tab && typeof sender.tab.id === "number") {
          const tabId = sender.tab.id;
          console.log("Sending improved text to tab ID:", tabId);

          // Use a more reliable approach with the chrome.tabs API
          chrome.tabs.sendMessage(
            tabId,
            {
              type: "IMPROVED_TEXT_FOR_REPLACEMENT",
              text: improvedText,
            },
            (response) => {
              const lastError = chrome.runtime.lastError;
              if (lastError) {
                console.error(
                  "Error sending improved text to content script:",
                  lastError.message
                );

                // Try again with a delay in case of timing issues
                setTimeout(() => {
                  chrome.tabs.sendMessage(
                    tabId,
                    {
                      type: "IMPROVED_TEXT_FOR_REPLACEMENT",
                      text: improvedText,
                    },
                    (retryResponse) => {
                      const retryError = chrome.runtime.lastError;
                      if (retryError) {
                        console.error(
                          "Retry failed, error sending improved text:",
                          retryError.message
                        );
                      } else {
                        console.log(
                          "Retry successful, content script updated text:",
                          retryResponse
                        );
                      }
                    }
                  );
                }, 500);
              } else {
                console.log(
                  "Content script updated text successfully:",
                  response
                );
              }
            }
          );
        } else {
          console.error(
            "Cannot send improved text: sender.tab or sender.tab.id is undefined",
            sender
          );
        }
      })
      .catch((error) => {
        console.error("Error improving prompt:", error);
        console.error(
          "Full error object:",
          JSON.stringify(error, Object.getOwnPropertyNames(error))
        );

        // Send error back to content script
        if (sender.tab && typeof sender.tab.id === "number") {
          const tabId = sender.tab.id;
          chrome.tabs.sendMessage(
            tabId,
            {
              type: "IMPROVEMENT_ERROR",
              error:
                error.message || "Failed to improve prompt. Please try again.",
            },
            (response) => {
              const lastError = chrome.runtime.lastError;
              if (lastError) {
                console.error(
                  "Error sending error to content script:",
                  lastError.message
                );
              }
            }
          );
        } else {
          console.error(
            "Cannot send error: sender.tab or sender.tab.id is undefined",
            sender
          );
        }
      });

    return true; // Keep the message channel open
  }

  // Handle other message types
  if (request.type === "CAPTURED_TEXT") {
    console.log("Received CAPTURED_TEXT, forwarding to popup");

    // Store in session storage
    try {
      chrome.storage.session.set({ lastCapturedText: request.text }, () => {
        console.log("Saved captured text to session storage");
      });
    } catch (err) {
      console.error("Error saving to session storage:", err);
    }

    // Forward to popup if open
    try {
      chrome.runtime.sendMessage(request, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          // This is normal if popup isn't open
          console.log("Note: Popup may not be open to receive text");
        } else {
          console.log("Text forwarded to popup");
        }
      });
    } catch (err) {
      console.error("Error forwarding message:", err);
    }

    // Send response to the content script
    sendResponse({ status: "received" });
    return true;
  }

  if (request.type === "CHECK_BACKEND") {
    checkBackendHealth()
      .then((isHealthy) => {
        sendResponse({ status: isHealthy ? "healthy" : "unhealthy" });
      })
      .catch((error) => {
        sendResponse({ status: "error", error: error.message });
      });
    return true;
  }

  // Default response for unhandled messages
  console.log("Unhandled message type:", request.type);
  sendResponse({ status: "unhandled_message_type" });
  return true;
});

/**
 * Send text to the backend API for improvement
 * @param text - The text to improve
 */
async function improvePrompt(text: string): Promise<string> {
  console.log(
    "improvePrompt: Starting prompt improvement for text of length:",
    text.length
  );

  try {
    // First, check if backend is healthy
    console.log("improvePrompt: Checking backend health");
    const isHealthy = await checkBackendHealth();
    console.log("improvePrompt: Backend health check result:", isHealthy);

    if (!isHealthy) {
      console.log("improvePrompt: Backend not healthy, using demo mode");
      // Fallback to demo mode
      const demoImprovedText = `${text}\n\n[DEMO MODE] This is a simulated improved prompt. In production, this would be an AI-enhanced version of your text.`;

      // Store the improved text in session storage
      try {
        chrome.storage.session.set({ lastImprovedText: demoImprovedText });
        console.log(
          "improvePrompt: Saved demo improved text to session storage"
        );
      } catch (err) {
        console.error(
          "improvePrompt: Error saving improved text to session storage:",
          err
        );
      }

      return demoImprovedText;
    }

    console.log("improvePrompt: Sending text to backend for improvement");

    // Send text to backend for improvement
    try {
      const response = await fetch(`${BACKEND_URL}/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: text }),
      });

      console.log(
        "improvePrompt: Received response from backend:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          `Server returned ${response.status}: ${response.statusText}`;
        console.error("improvePrompt: Backend returned error:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json().catch(() => {
        throw new Error("Failed to parse backend response as JSON");
      });

      console.log(
        "improvePrompt: Successfully parsed JSON response from backend"
      );

      if (!data.improvedPrompt) {
        console.error(
          "improvePrompt: Backend response missing improvedPrompt field:",
          data
        );
        throw new Error("Backend response missing improvedPrompt field");
      }

      // Store the improved text in session storage
      try {
        chrome.storage.session.set({ lastImprovedText: data.improvedPrompt });
        console.log("improvePrompt: Saved improved text to session storage");
      } catch (err) {
        console.error(
          "improvePrompt: Error saving improved text to session storage:",
          err
        );
      }

      return data.improvedPrompt;
    } catch (error) {
      console.error("improvePrompt: Error in fetch operation:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("improvePrompt: Error in improvePrompt:", error);
    throw new Error(`Failed to improve prompt: ${error.message}`);
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
