/**
 * Background service worker for PromptPilot
 * Handles communication between content script, popup, and backend
 */

import { AnalyticsStorage } from "./utils/storage";
import { PromptImprovement } from "./types/analytics";

// Backend URL for the improve endpoint
const BACKEND_URL = "https://promptpilot-production.up.railway.app";

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
    const response = await fetch(`${BACKEND_URL}/api/check`, {
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
    const intent = request.intent || "general";
    const platform = request.platform || "unknown";

    console.log(
      "IMPROVE_AND_REPLACE: Received text to improve, length:",
      text.length
    );
    console.log(
      "IMPROVE_AND_REPLACE: Sender tab:",
      sender.tab ? sender.tab.id : "undefined"
    );

    // Check usage limits before processing
    AnalyticsStorage.hasReachedLimit()
      .then(async (hasReachedLimit) => {
        if (hasReachedLimit) {
          const remaining = await AnalyticsStorage.getRemainingImprovements();
          const settings = await AnalyticsStorage.getUserSettings();

          console.log("User has reached monthly limit");

          // Send limit reached error to content script
          if (sender.tab && typeof sender.tab.id === "number") {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "USAGE_LIMIT_REACHED",
              remaining: remaining,
              limit: settings.monthlyLimit,
              subscriptionStatus: settings.subscriptionStatus,
            });
          }

          sendResponse({
            status: "limit_reached",
            remaining,
            limit: settings.monthlyLimit,
          });
          return;
        }

        // Let the content script know we're processing
        sendResponse({ status: "processing" });
        console.log(
          "IMPROVE_AND_REPLACE: Sent processing response to content script"
        );

        // Track the improvement attempt
        const startTime = Date.now();

        improvePrompt(text, intent)
          .then(async (improvedText) => {
            const endTime = Date.now();
            const processingTime = endTime - startTime;

            console.log(
              "Successfully improved prompt, sending for replacement"
            );
            console.log(
              "Improved prompt:",
              improvedText.substring(0, 100) + "..."
            );

            // Track successful improvement
            try {
              await AnalyticsStorage.incrementUsage();

              const improvement: PromptImprovement = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                originalPrompt: text,
                improvedPrompt: improvedText,
                intent: intent,
                timestamp: new Date(),
                modelUsed: "backend-api", // This could be made dynamic based on backend response
                originalLength: text.length,
                improvedLength: improvedText.length,
                platform: platform,
                processingTimeMs: processingTime,
                success: true,
              };

              await AnalyticsStorage.savePromptImprovement(improvement);
              console.log("Analytics tracked successfully");

              // Check for proactive warnings after successful improvement
              const remaining =
                await AnalyticsStorage.getRemainingImprovements();
              const settings = await AnalyticsStorage.getUserSettings();

              if (settings.subscriptionStatus === "free") {
                // Send proactive warnings at specific thresholds
                if (remaining === 4 || remaining === 1) {
                  if (sender.tab && typeof sender.tab.id === "number") {
                    chrome.tabs.sendMessage(sender.tab.id, {
                      type: "USAGE_WARNING",
                      remaining: remaining,
                      limit: settings.monthlyLimit,
                      subscriptionStatus: settings.subscriptionStatus,
                    });
                  }
                }
              }
            } catch (analyticsError) {
              console.error("Error tracking analytics:", analyticsError);
              // Don't fail the main operation if analytics fails
            }

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

            // Also send improved text to popup for display
            try {
              chrome.runtime.sendMessage(
                {
                  type: "IMPROVED_TEXT",
                  text: improvedText,
                },
                (response) => {
                  const lastError = chrome.runtime.lastError;
                  if (lastError) {
                    // This is normal if popup isn't open
                    console.log(
                      "Note: Popup may not be open to receive improved text"
                    );
                  } else {
                    console.log("Improved text forwarded to popup");
                  }
                }
              );
            } catch (err) {
              console.error("Error forwarding improved text to popup:", err);
            }
          })
          .catch(async (error) => {
            const endTime = Date.now();
            const processingTime = endTime - startTime;

            console.error("Error improving prompt:", error);
            console.error(
              "Full error object:",
              JSON.stringify(error, Object.getOwnPropertyNames(error))
            );

            // Track failed improvement
            try {
              const improvement: PromptImprovement = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                originalPrompt: text,
                improvedPrompt: "",
                intent: intent,
                timestamp: new Date(),
                modelUsed: "backend-api",
                originalLength: text.length,
                improvedLength: 0,
                platform: platform,
                processingTimeMs: processingTime,
                success: false,
                errorMessage: error.message || "Unknown error",
              };

              await AnalyticsStorage.savePromptImprovement(improvement);
              console.log("Failed improvement analytics tracked");
            } catch (analyticsError) {
              console.error(
                "Error tracking failed improvement analytics:",
                analyticsError
              );
            }

            // Send error back to content script
            if (sender.tab && typeof sender.tab.id === "number") {
              const tabId = sender.tab.id;
              chrome.tabs.sendMessage(
                tabId,
                {
                  type: "IMPROVEMENT_ERROR",
                  error:
                    error.message ||
                    "Failed to improve prompt. Please try again.",
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

            // Also send error to popup for display
            try {
              chrome.runtime.sendMessage(
                {
                  type: "ERROR",
                  error:
                    error.message ||
                    "Failed to improve prompt. Please try again.",
                },
                (response) => {
                  const lastError = chrome.runtime.lastError;
                  if (lastError) {
                    // This is normal if popup isn't open
                    console.log("Note: Popup may not be open to receive error");
                  } else {
                    console.log("Error forwarded to popup");
                  }
                }
              );
            } catch (err) {
              console.error("Error forwarding error to popup:", err);
            }
          });
      })
      .catch((error) => {
        console.error("Error checking usage limits:", error);
        sendResponse({
          status: "error",
          error: "Failed to check usage limits",
        });
      });

    return true; // Keep the message channel open
  }

  // Handle other message types
  if (request.type === "CAPTURED_TEXT") {
    console.log("Received CAPTURED_TEXT, forwarding to popup");

    // Store in local storage
    try {
      chrome.storage.local.set({ lastCapturedText: request.text }, () => {
        console.log("Saved captured text to local storage");
      });
    } catch (err) {
      console.error("Error saving to local storage:", err);
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

  // Handle analytics requests
  if (request.type === "GET_USER_SETTINGS") {
    AnalyticsStorage.getUserSettings()
      .then((settings) => {
        sendResponse({ status: "success", data: settings });
      })
      .catch((error) => {
        sendResponse({ status: "error", error: error.message });
      });
    return true;
  }

  if (request.type === "GET_USAGE_ANALYTICS") {
    AnalyticsStorage.getUsageAnalytics()
      .then((analytics) => {
        sendResponse({ status: "success", data: analytics });
      })
      .catch((error) => {
        sendResponse({ status: "error", error: error.message });
      });
    return true;
  }

  if (request.type === "GET_PROMPT_HISTORY") {
    const limit = request.limit || 50;
    AnalyticsStorage.getPromptHistory(limit)
      .then((history) => {
        sendResponse({ status: "success", data: history });
      })
      .catch((error) => {
        sendResponse({ status: "error", error: error.message });
      });
    return true;
  }

  if (request.type === "UPDATE_USER_SETTINGS") {
    AnalyticsStorage.updateUserSettings(request.updates)
      .then((settings) => {
        sendResponse({ status: "success", data: settings });
      })
      .catch((error) => {
        sendResponse({ status: "error", error: error.message });
      });
    return true;
  }

  if (request.type === "GET_REMAINING_IMPROVEMENTS") {
    AnalyticsStorage.getRemainingImprovements()
      .then((remaining) => {
        sendResponse({ status: "success", data: remaining });
      })
      .catch((error) => {
        sendResponse({ status: "error", error: error.message });
      });
    return true;
  }

  // Handle OPEN_CUSTOMER_PORTAL message
  if (request.type === "OPEN_CUSTOMER_PORTAL") {
    console.log("Opening customer portal...");

    chrome.storage.local.get(["stripeCustomerId"], async (result) => {
      const customerId = result.stripeCustomerId;

      if (!customerId) {
        console.error("No customer ID found");
        sendResponse({
          status: "error",
          error: "No customer ID found. Please complete a purchase first.",
        });
        return;
      }

      try {
        // Create portal session via backend
        const response = await fetch(
          "https://promptpilot-production-up.railway.app/stripe/create-portal",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerId,
              returnUrl: chrome.runtime.getURL("index.html"),
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create portal session");
        }

        const { url, demoMode } = await response.json();

        // Handle demo mode
        if (demoMode) {
          console.log("Demo mode: Customer portal not available");
          sendResponse({
            status: "error",
            error:
              "Customer portal not available in demo mode. Please configure Stripe API keys.",
          });
          return;
        }

        // Open portal in new tab
        chrome.tabs.create({ url });
        sendResponse({ status: "success" });
      } catch (error) {
        console.error("Error opening customer portal:", error);
        sendResponse({
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    return true; // Keep the message channel open
  }

  // Handle OPEN_EXTENSION message
  if (request.type === "OPEN_EXTENSION") {
    console.log("Opening extension popup...");

    // Close the current tab if it's a success/cancel page
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id);
    }

    // Try to open the popup
    try {
      chrome.action.openPopup();
      sendResponse({ status: "success" });
    } catch (error) {
      console.error("Error opening popup:", error);
      sendResponse({ status: "error", error: "Failed to open popup" });
    }

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
 * @param intent - The selected intent for improvement
 */
async function improvePrompt(text: string, intent: string): Promise<string> {
  console.log(
    "improvePrompt: Starting prompt improvement for text of length:",
    text.length,
    "with intent:",
    intent
  );

  // Try multiple approaches to fetch data
  const fetchApproaches = [
    // Approach 1: Standard CORS request
    async () => {
      console.log("improvePrompt: Trying standard CORS request");
      return await fetch(`${BACKEND_URL}/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ prompt: text, intent }),
        mode: "cors",
        credentials: "omit",
      });
    },
    // Approach 2: No CORS mode (for service workers)
    async () => {
      console.log("improvePrompt: Trying no-cors mode");
      return await fetch(`${BACKEND_URL}/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ prompt: text, intent }),
        credentials: "omit",
      });
    },
  ];

  for (const [index, fetchApproach] of fetchApproaches.entries()) {
    try {
      console.log(
        `improvePrompt: Attempt ${index + 1} of ${fetchApproaches.length}`
      );

      const response = await fetchApproach();

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
        console.error(
          `improvePrompt: Backend returned error (attempt ${index + 1}):`,
          errorMessage
        );

        // Try next approach
        if (index < fetchApproaches.length - 1) {
          continue;
        }

        // All approaches failed, use demo mode
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

      // Store the improved text in local storage
      try {
        chrome.storage.local.set({ lastImprovedText: data.improvedPrompt });
        console.log("improvePrompt: Saved improved text to local storage");
      } catch (err) {
        console.error(
          "improvePrompt: Error saving improved text to local storage:",
          err
        );
      }

      return data.improvedPrompt;
    } catch (error: any) {
      console.error(
        `improvePrompt: Error in attempt ${index + 1}:`,
        error.message
      );

      // If this was the last attempt, fall back to demo mode
      if (index === fetchApproaches.length - 1) {
        console.error("improvePrompt: All fetch attempts failed:", error);
        console.error(
          "improvePrompt: Full error details:",
          error.message,
          error.stack
        );

        // Fall back to demo mode
        console.log("improvePrompt: All attempts failed, using demo mode");
        const demoImprovedText = `Write a better prompt for ${intent} purposes [DEMO MODE] Backend connection failed after ${fetchApproaches.length} attempts. This is a simulated improved prompt. Error: ${error.message}`;

        // Store the improved text in local storage
        try {
          chrome.storage.local.set({ lastImprovedText: demoImprovedText });
          console.log(
            "improvePrompt: Saved demo fallback text to local storage"
          );
        } catch (err) {
          console.error(
            "improvePrompt: Error saving demo text to local storage:",
            err
          );
        }

        return demoImprovedText;
      }
    }
  }

  // This should never be reached, but just in case
  return `Write a better prompt for ${intent} purposes [DEMO MODE] Unexpected error occurred.`;
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
