/**
 * Content script for PromptPilot
 * Uses a fixed button approach for better reliability
 */

// State tracking
let isImprovementInProgress = false;
let lastTextElement: HTMLElement | null = null;

// Initialize the content script
function initialize() {
  console.log("PromptPilot content script initializing...");

  // Inject styles
  injectStyles();

  // Create and add the fixed button
  createFixedButton();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessages);

  // Add event listener for text selection
  document.addEventListener("mouseup", handleTextSelection);

  // Track input elements when clicked or focused
  document.addEventListener("mousedown", trackTextElement);
  document.addEventListener("focusin", trackTextElement);

  console.log("PromptPilot content script initialized");
}

/**
 * Handle messages from other parts of the extension
 */
function handleMessages(message: any, sender: any, sendResponse: any) {
  console.log("Content script received message:", message.type);

  if (message.type === "IMPROVED_TEXT_FOR_REPLACEMENT") {
    handleImprovedText(message.text, sendResponse);
  } else if (message.type === "IMPROVEMENT_ERROR") {
    handleError(message.error, sendResponse);
  } else if (message.type === "GET_SELECTED_TEXT") {
    const selectedText = getSelectedText();
    console.log(
      "GET_SELECTED_TEXT request received, returning:",
      selectedText.substring(0, 50) + (selectedText.length > 50 ? "..." : "")
    );
    sendResponse({ text: selectedText });
  }

  return true; // Keep the message channel open
}

/**
 * Handle improved text from the backend
 */
function handleImprovedText(improvedText: string, sendResponse: Function) {
  try {
    console.log("Received improved text for replacement");

    if (!improvedText) {
      showNotification("Received empty text from server", "error");
      resetButtonState();
      isImprovementInProgress = false;
      sendResponse({ status: "error" });
      return;
    }

    // Insert the improved text
    insertImprovedText(improvedText);

    // Show success UI
    showSuccessState();

    // Store the improved text in session storage
    chrome.storage.session.set({ lastImprovedText: improvedText }, () => {
      console.log("Saved improved text to session storage");
    });

    sendResponse({ status: "text_updated" });
  } catch (error) {
    console.error("Error handling improved text:", error);
    showNotification("Failed to update text with improvements", "error");
    resetButtonState();
    isImprovementInProgress = false;
    sendResponse({ status: "error" });
  }
}

/**
 * Handle errors during the improvement process
 */
function handleError(error: string, sendResponse: Function) {
  console.error("Received improvement error:", error);
  showNotification(error || "Error improving text", "error");
  resetButtonState();
  isImprovementInProgress = false;
  sendResponse({ status: "error_displayed" });
}

/**
 * Insert improved text at the appropriate location
 */
function insertImprovedText(newText: string) {
  const selection = window.getSelection();

  // If we have an active selection, replace it
  if (selection && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(newText));
    return;
  }

  // Otherwise, use the last text element if available
  if (lastTextElement) {
    if (
      lastTextElement.tagName === "TEXTAREA" ||
      lastTextElement.tagName === "INPUT"
    ) {
      const input = lastTextElement as HTMLInputElement | HTMLTextAreaElement;
      input.value = newText;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (lastTextElement.getAttribute("contenteditable") === "true") {
      lastTextElement.innerText = newText;
      lastTextElement.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  } else {
    console.warn("No target element found to insert improved text");
    showNotification(
      "Please select text or click in a text field before improving",
      "error"
    );
  }
}

/**
 * Create the fixed position improve button
 */
function createFixedButton() {
  const button = document.createElement("button");
  button.id = "promptpilot-button";
  button.className = "promptpilot-button";
  button.innerHTML = '<span class="promptpilot-icon">✏️</span> Improve Text';

  // Add click listener
  button.addEventListener("click", handleImproveClick);

  // Add to the page
  document.body.appendChild(button);

  console.log("PromptPilot button added to page");
}

/**
 * Handle improve button click
 */
function handleImproveClick() {
  if (isImprovementInProgress) {
    console.log("Improvement already in progress");
    return;
  }

  // Get the text to improve
  const text = getSelectedText();

  if (!text) {
    showNotification(
      "No text found. Please click or focus on a text field.",
      "error"
    );
    return;
  }

  console.log(
    "Improving text:",
    text.substring(0, 50) + (text.length > 50 ? "..." : "")
  );

  // Update UI to show progress
  isImprovementInProgress = true;
  showLoadingState();

  // Save to session storage for popup
  chrome.storage.session.set({ lastCapturedText: text }, () => {
    console.log("Saved text to session storage");
  });

  // Send to background script for improvement
  chrome.runtime.sendMessage(
    { type: "IMPROVE_AND_REPLACE", text: text },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending improvement request:",
          chrome.runtime.lastError
        );
        showNotification(
          "Failed to communicate with extension. Please try again.",
          "error"
        );
        resetButtonState();
        isImprovementInProgress = false;
      }
    }
  );
}

/**
 * Get currently selected text or text from an input field
 */
function getSelectedText(): string {
  // First check if there's a selection in the document
  const selection = window.getSelection();
  if (selection && selection.toString().trim() !== "") {
    // Get the selected text
    return selection.toString().trim();
  }

  // Check if an input or contenteditable is focused
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement) {
    if (
      activeElement.tagName === "TEXTAREA" ||
      activeElement.tagName === "INPUT"
    ) {
      // Store reference to the input element
      lastTextElement = activeElement;

      // Get text from input element
      const input = activeElement as HTMLInputElement | HTMLTextAreaElement;

      // Check if there's a selection within the input
      if (
        input.selectionStart !== undefined &&
        input.selectionEnd !== undefined &&
        input.selectionStart !== null &&
        input.selectionEnd !== null &&
        input.selectionStart !== input.selectionEnd
      ) {
        return input.value
          .substring(input.selectionStart, input.selectionEnd)
          .trim();
      }

      // Otherwise use the whole input value
      return input.value.trim();
    } else if (activeElement.getAttribute("contenteditable") === "true") {
      // Store reference to the contenteditable element
      lastTextElement = activeElement;

      // If there's a selection, use that
      if (selection && selection.toString().trim() !== "") {
        return selection.toString().trim();
      }

      // Otherwise use all the content
      return activeElement.textContent?.trim() || "";
    }
  }

  // If no active element with text is found, try to find the last clicked text element
  if (lastTextElement) {
    if (
      lastTextElement.tagName === "TEXTAREA" ||
      lastTextElement.tagName === "INPUT"
    ) {
      const input = lastTextElement as HTMLInputElement | HTMLTextAreaElement;
      return input.value.trim();
    } else if (lastTextElement.getAttribute("contenteditable") === "true") {
      return lastTextElement.textContent?.trim() || "";
    }
  }

  return "";
}

/**
 * Handle text selection in the document
 */
function handleTextSelection(event: MouseEvent) {
  const selection = window.getSelection();
  if (selection && selection.toString().trim() !== "") {
    // Store the container element if it's a text input
    const container = selection.anchorNode?.parentElement;
    if (
      container &&
      (container.tagName === "TEXTAREA" ||
        container.tagName === "INPUT" ||
        container.getAttribute("contenteditable") === "true")
    ) {
      lastTextElement = container as HTMLElement;
    }
  }
}

/**
 * Show loading state on the button
 */
function showLoadingState() {
  const button = document.getElementById("promptpilot-button");
  if (button) {
    button.className = "promptpilot-button loading";
    button.innerHTML = '<span class="promptpilot-loader"></span> Improving...';
  }
}

/**
 * Reset button to original state
 */
function resetButtonState() {
  const button = document.getElementById("promptpilot-button");
  if (button) {
    button.className = "promptpilot-button";
    button.innerHTML = '<span class="promptpilot-icon">✏️</span> Improve Text';
  }
}

/**
 * Show success state on the button
 */
function showSuccessState() {
  const button = document.getElementById("promptpilot-button");
  if (button) {
    button.className = "promptpilot-button success";
    button.innerHTML = '<span class="promptpilot-icon">✓</span> Improved!';

    // Show success notification
    showNotification("Text successfully improved!", "success");

    // Reset after delay
    setTimeout(() => {
      resetButtonState();
      isImprovementInProgress = false;
    }, 2000);
  }
}

/**
 * Show notification to the user
 */
function showNotification(message: string, type: "success" | "error") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `promptpilot-notification ${type}`;
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Remove after delay
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 4000);
}

/**
 * Inject CSS styles
 */
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* Button styles */
    .promptpilot-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 2147483646;
      transition: background-color 0.2s;
    }
    
    .promptpilot-button:hover {
      background-color: #3367d6;
    }
    
    .promptpilot-button.loading {
      background-color: #9aa0a6;
      cursor: not-allowed;
    }
    
    .promptpilot-button.success {
      background-color: #34A853;
    }
    
    .promptpilot-icon {
      font-size: 16px;
    }
    
    .promptpilot-loader {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: promptpilot-spin 1s linear infinite;
      margin-right: 4px;
    }
    
    @keyframes promptpilot-spin {
      to { transform: rotate(360deg); }
    }
    
    /* Notification styles */
    .promptpilot-notification {
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 14px;
      max-width: 300px;
      color: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
      animation: promptpilot-fade-in 0.3s;
    }
    
    .promptpilot-notification.success {
      background-color: #34A853;
    }
    
    .promptpilot-notification.error {
      background-color: #EA4335;
    }
    
    @keyframes promptpilot-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Track the last clicked or focused text element
 */
function trackTextElement(event: Event) {
  const target = event.target as HTMLElement;
  if (
    target &&
    (target.tagName === "TEXTAREA" ||
      target.tagName === "INPUT" ||
      target.getAttribute("contenteditable") === "true")
  ) {
    console.log("Tracking text element:", target.tagName);
    lastTextElement = target;
  }
}

// Initialize when the page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
