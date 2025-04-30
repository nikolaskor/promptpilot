/**
 * Content script for PromptPilot
 * Detects text input fields and injects an "Improve" button
 */

// Store the currently focused element
let currentFocusedElement: HTMLElement | null = null;
let improveButton: HTMLElement | null = null;
let contentIsInitialized = false;

// Initialize the content script safely
function contentInitialize() {
  if (contentIsInitialized) return;

  console.log("PromptPilot content script initializing...");

  // Listen for focusin events to detect when user focuses on a text area
  document.addEventListener("focusin", handleFocusIn);

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message.type);

    if (message.type === "GET_SELECTED_TEXT") {
      sendTextToPopup();
      // Always send a response to prevent connection errors
      sendResponse({ status: "text_requested" });
    } else {
      // For unhandled message types, send a response to prevent connection errors
      sendResponse({ status: "unhandled_message_type" });
    }
    return true; // Indicate we will send a response asynchronously
  });

  contentIsInitialized = true;
  console.log("PromptPilot content script initialized");
}

/**
 * Handle focus events on the page
 * @param event - The focus event
 */
function handleFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement;

  // Check if the focused element is a textarea or contenteditable
  if (
    target.tagName === "TEXTAREA" ||
    target.getAttribute("contenteditable") === "true"
  ) {
    currentFocusedElement = target;
    injectImproveButton(target);
  } else {
    // Remove button if focus moves to non-text element
    removeImproveButton();
    currentFocusedElement = null;
  }
}

/**
 * Create and inject the "Improve" button next to the focused element
 * @param element - The element to inject the button next to
 */
function injectImproveButton(element: HTMLElement) {
  // Remove any existing buttons
  removeImproveButton();

  // Create the button element
  improveButton = document.createElement("button");
  improveButton.textContent = "✏️ Improve";
  improveButton.style.position = "absolute";
  improveButton.style.zIndex = "10000";
  improveButton.style.padding = "4px 8px";
  improveButton.style.backgroundColor = "#4285f4";
  improveButton.style.color = "white";
  improveButton.style.border = "none";
  improveButton.style.borderRadius = "4px";
  improveButton.style.fontSize = "12px";
  improveButton.style.cursor = "pointer";
  improveButton.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.3)";

  // Position the button near the element
  const rect = element.getBoundingClientRect();
  improveButton.style.top = `${window.scrollY + rect.top - 30}px`;
  improveButton.style.left = `${window.scrollX + rect.right - 100}px`;

  // Add click event listener
  improveButton.addEventListener("click", handleImproveClick);

  // Add the button to the page
  document.body.appendChild(improveButton);
}

/**
 * Remove the improve button from the page
 */
function removeImproveButton() {
  if (improveButton && improveButton.parentNode) {
    improveButton.removeEventListener("click", handleImproveClick);
    improveButton.parentNode.removeChild(improveButton);
    improveButton = null;
  }
}

/**
 * Handle clicks on the improve button
 */
function handleImproveClick() {
  if (currentFocusedElement) {
    sendTextToPopup();

    // Open the popup
    try {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.log("Error opening popup:", lastError.message);
        }
      });
    } catch (err) {
      console.log("Error sending open popup message:", err);
    }
  }
}

/**
 * Send the text from the current focused element to the popup
 */
function sendTextToPopup() {
  if (currentFocusedElement) {
    let text = "";

    if (currentFocusedElement.tagName === "TEXTAREA") {
      text = (currentFocusedElement as HTMLTextAreaElement).value;
    } else if (
      currentFocusedElement.getAttribute("contenteditable") === "true"
    ) {
      text = currentFocusedElement.innerText;
    }

    try {
      chrome.runtime.sendMessage(
        {
          type: "CAPTURED_TEXT",
          text: text,
        },
        (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.log("Error sending captured text:", lastError.message);
          }
        }
      );
    } catch (err) {
      console.log("Error sending captured text message:", err);
    }
  }
}

// Initialize the content script when the page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", contentInitialize);
} else {
  contentInitialize();
}
