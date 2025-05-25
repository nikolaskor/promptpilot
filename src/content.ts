/**
 * Content script for PromptPilot
 * Uses a fixed button approach for better reliability
 */

// State tracking
let isImprovementInProgress = false;
let lastTextElement: HTMLElement | null = null;
let selectedIntent = "";
let isDropdownOpen = false;
let isWidgetExpanded = false;

// Drag functionality state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialX = 0;
let initialY = 0;
let currentX = 0;
let currentY = 0;

// Intent categories
const INTENT_CATEGORIES = [
  "Academic",
  "Professional",
  "Creative",
  "Technical",
  "Personal",
];

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
 * Create the minimalistic floating widget with intent selector
 */
function createFixedButton() {
  // Create main container
  const container = document.createElement("div");
  container.id = "promptpilot-container";
  container.className = "promptpilot-container";

  // Restore saved position or use default
  restoreWidgetPosition(container);

  // Create main toggle button (always visible)
  const mainButton = document.createElement("button");
  mainButton.id = "promptpilot-main-button";
  mainButton.className = "promptpilot-main-button";
  mainButton.innerHTML = '<span class="promptpilot-main-icon">✏️</span>';
  mainButton.title = "PromptPilot - Click to expand, drag to move";
  mainButton.addEventListener("click", handleMainButtonClick);

  // Add drag functionality
  mainButton.addEventListener("mousedown", handleDragStart);
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);

  // Create expanded content (hidden by default)
  const expandedContent = document.createElement("div");
  expandedContent.id = "promptpilot-expanded";
  expandedContent.className = "promptpilot-expanded";

  // Create intent selector icon
  const intentButton = document.createElement("button");
  intentButton.className = "promptpilot-intent-button";
  intentButton.innerHTML = '<span class="promptpilot-intent-icon">🎯</span>';
  intentButton.title = "Select intent category";
  intentButton.addEventListener("click", handleIntentButtonClick);

  // Create intent dropdown (hidden by default)
  const intentDropdown = document.createElement("div");
  intentDropdown.className = "promptpilot-intent-dropdown";

  const dropdownList = document.createElement("ul");
  dropdownList.className = "promptpilot-intent-list";

  // Populate dropdown with categories
  INTENT_CATEGORIES.forEach((category) => {
    const item = document.createElement("li");
    item.className = "promptpilot-intent-item";
    item.textContent = category;
    item.addEventListener("click", () => handleIntentSelect(category));
    dropdownList.appendChild(item);
  });

  intentDropdown.appendChild(dropdownList);

  // Create improve button
  const improveButton = document.createElement("button");
  improveButton.id = "promptpilot-improve-button";
  improveButton.className = "promptpilot-improve-button";
  improveButton.innerHTML = '<span class="promptpilot-improve-icon">⚡</span>';
  improveButton.title = "Improve selected text";
  improveButton.addEventListener("click", handleImproveClick);

  // Assemble expanded content
  expandedContent.appendChild(intentButton);
  expandedContent.appendChild(intentDropdown);
  expandedContent.appendChild(improveButton);

  // Assemble main container
  container.appendChild(mainButton);
  container.appendChild(expandedContent);

  // Add to the page
  document.body.appendChild(container);

  // Add click outside listener
  document.addEventListener("click", handleClickOutside);

  // Add window resize listener to keep widget in bounds
  window.addEventListener("resize", handleWindowResize);

  console.log("PromptPilot minimalistic widget added to page");
}

/**
 * Handle main button click to expand/collapse widget
 */
function handleMainButtonClick(event: Event) {
  // Don't expand/collapse if we just finished dragging
  if (isDragging) {
    return;
  }

  event.stopPropagation();
  isWidgetExpanded = !isWidgetExpanded;

  const expandedContent = document.getElementById("promptpilot-expanded");
  const mainButton = document.getElementById("promptpilot-main-button");

  if (expandedContent && mainButton) {
    if (isWidgetExpanded) {
      expandedContent.classList.add("expanded");
      mainButton.classList.add("expanded");
    } else {
      expandedContent.classList.remove("expanded");
      mainButton.classList.remove("expanded");
      // Also close intent dropdown if open
      if (isDropdownOpen) {
        handleIntentButtonClick(event);
      }
    }
  }
}

/**
 * Handle intent button click to show/hide dropdown
 */
function handleIntentButtonClick(event: Event) {
  event.stopPropagation();
  isDropdownOpen = !isDropdownOpen;

  const intentDropdown = document.querySelector(
    ".promptpilot-intent-dropdown"
  ) as HTMLElement;
  const intentButton = document.querySelector(
    ".promptpilot-intent-button"
  ) as HTMLElement;

  if (intentDropdown && intentButton) {
    if (isDropdownOpen) {
      intentDropdown.classList.add("open");
      intentButton.classList.add("active");
    } else {
      intentDropdown.classList.remove("open");
      intentButton.classList.remove("active");
    }
  }
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
    {
      type: "IMPROVE_AND_REPLACE",
      text: text,
      intent: selectedIntent || "General",
    },
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
 * Show loading state on the improve button
 */
function showLoadingState() {
  const improveButton = document.getElementById("promptpilot-improve-button");
  if (improveButton) {
    improveButton.className = "promptpilot-improve-button loading";
    improveButton.innerHTML = '<span class="promptpilot-loader"></span>';
    improveButton.title = "Improving text...";
  }
}

/**
 * Reset improve button to original state
 */
function resetButtonState() {
  const improveButton = document.getElementById("promptpilot-improve-button");
  if (improveButton) {
    improveButton.className = "promptpilot-improve-button";
    improveButton.innerHTML =
      '<span class="promptpilot-improve-icon">⚡</span>';
    improveButton.title = "Improve selected text";
  }
}

/**
 * Show success state on the improve button
 */
function showSuccessState() {
  const improveButton = document.getElementById("promptpilot-improve-button");
  if (improveButton) {
    improveButton.className = "promptpilot-improve-button success";
    improveButton.innerHTML = '<span class="promptpilot-improve-icon">✓</span>';
    improveButton.title = "Text improved successfully!";

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
    /* Main container - minimalistic floating widget */
    .promptpilot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      transition: transform 0.2s ease;
    }
    
    .promptpilot-container.dragging {
      transform: scale(1.05);
      z-index: 2147483647;
      transition: none;
    }
    
    /* Main toggle button - always visible circular icon */
    .promptpilot-main-button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 2147483647;
      user-select: none;
    }
    
    .promptpilot-container.dragging .promptpilot-main-button {
      cursor: grabbing;
      box-shadow: 0 8px 20px rgba(66, 133, 244, 0.4);
    }
    
    .promptpilot-main-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(66, 133, 244, 0.4);
      cursor: grab;
    }
    
    .promptpilot-main-button.expanded {
      background: linear-gradient(135deg, #ea4335 0%, #fbbc04 100%);
      transform: rotate(45deg);
    }
    
    .promptpilot-main-icon {
      font-size: 20px;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .promptpilot-main-button.expanded .promptpilot-main-icon {
      transform: rotate(-45deg);
    }
    
    /* Expanded content container */
    .promptpilot-expanded {
      position: absolute;
      bottom: 60px;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.8);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    
    .promptpilot-expanded.expanded {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    
    /* Intent selector button */
    .promptpilot-intent-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(156, 39, 176, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      align-self: flex-end;
    }
    
    .promptpilot-intent-button:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(156, 39, 176, 0.4);
    }
    
    .promptpilot-intent-button.active {
      background: linear-gradient(135deg, #ff5722 0%, #ff9800 100%);
      transform: scale(1.1);
    }
    
    .promptpilot-intent-icon {
      font-size: 16px;
      transition: transform 0.3s ease;
    }
    
    .promptpilot-intent-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background: #4caf50;
      border-radius: 50%;
      border: 2px solid white;
      opacity: 0;
      transform: scale(0);
      transition: all 0.3s ease;
    }
    
    .promptpilot-intent-button:has(.promptpilot-intent-indicator) .promptpilot-intent-indicator {
      opacity: 1;
      transform: scale(1);
    }
    
    /* Intent dropdown */
    .promptpilot-intent-dropdown {
      position: absolute;
      bottom: 0;
      right: 50px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      opacity: 0;
      visibility: hidden;
      transform: translateX(10px) scale(0.9);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      min-width: 140px;
      overflow: hidden;
    }
    
    .promptpilot-intent-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateX(0) scale(1);
      pointer-events: auto;
    }
    
    .promptpilot-intent-list {
      margin: 0;
      padding: 8px 0;
      list-style: none;
    }
    
    .promptpilot-intent-item {
      padding: 10px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #333;
      transition: all 0.2s ease;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .promptpilot-intent-item:last-child {
      border-bottom: none;
    }
    
    .promptpilot-intent-item:hover {
      background: linear-gradient(90deg, #f8f9fa 0%, #e8f0fe 100%);
      color: #4285f4;
      transform: translateX(4px);
    }
    
    /* Improve button */
    .promptpilot-improve-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(255, 107, 53, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      align-self: flex-end;
    }
    
    .promptpilot-improve-button:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
    }
    
    .promptpilot-improve-button.loading {
      background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
      cursor: not-allowed;
      animation: promptpilot-pulse 1.5s ease-in-out infinite;
    }
    
    .promptpilot-improve-button.success {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      animation: promptpilot-success-bounce 0.6s ease;
    }
    
    .promptpilot-improve-icon {
      font-size: 16px;
      transition: transform 0.3s ease;
    }
    
    .promptpilot-loader {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: promptpilot-spin 1s linear infinite;
    }
    
    /* Animations */
    @keyframes promptpilot-spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes promptpilot-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes promptpilot-success-bounce {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    
    @keyframes promptpilot-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Notification styles */
    .promptpilot-notification {
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      max-width: 280px;
      color: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2147483647;
      animation: promptpilot-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .promptpilot-notification.success {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
    }
    
    .promptpilot-notification.error {
      background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .promptpilot-container {
        bottom: 16px;
        right: 16px;
      }
      
      .promptpilot-main-button {
        width: 44px;
        height: 44px;
      }
      
      .promptpilot-intent-button,
      .promptpilot-improve-button {
        width: 36px;
        height: 36px;
      }
      
      .promptpilot-intent-dropdown {
        min-width: 120px;
      }
      
      .promptpilot-intent-item {
        padding: 8px 12px;
        font-size: 12px;
      }
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

/**
 * Handle intent selection
 */
function handleIntentSelect(intent: string) {
  selectedIntent = intent;
  isDropdownOpen = false;

  const intentDropdown = document.querySelector(
    ".promptpilot-intent-dropdown"
  ) as HTMLElement;
  const intentButton = document.querySelector(
    ".promptpilot-intent-button"
  ) as HTMLElement;

  if (intentDropdown) {
    intentDropdown.classList.remove("open");
  }

  if (intentButton) {
    intentButton.classList.remove("active");
    // Update button to show selected intent with a small indicator
    intentButton.innerHTML = `<span class="promptpilot-intent-icon">🎯</span><span class="promptpilot-intent-indicator"></span>`;
    intentButton.title = `Intent: ${intent}`;
  }

  console.log("Selected intent:", intent);
}

/**
 * Handle click outside to close dropdowns
 */
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  const container = document.getElementById("promptpilot-container");

  if (container && !container.contains(target)) {
    // Close widget if expanded
    if (isWidgetExpanded) {
      isWidgetExpanded = false;
      const expandedContent = document.getElementById("promptpilot-expanded");
      const mainButton = document.getElementById("promptpilot-main-button");

      if (expandedContent) {
        expandedContent.classList.remove("expanded");
      }
      if (mainButton) {
        mainButton.classList.remove("expanded");
      }
    }

    // Close intent dropdown if open
    if (isDropdownOpen) {
      isDropdownOpen = false;
      const intentDropdown = document.querySelector(
        ".promptpilot-intent-dropdown"
      ) as HTMLElement;
      const intentButton = document.querySelector(
        ".promptpilot-intent-button"
      ) as HTMLElement;

      if (intentDropdown) {
        intentDropdown.classList.remove("open");
      }
      if (intentButton) {
        intentButton.classList.remove("active");
      }
    }
  }
}

/**
 * Handle drag start
 */
function handleDragStart(event: MouseEvent) {
  event.preventDefault();

  const container = document.getElementById("promptpilot-container");
  if (!container) return;

  // Get current position
  const rect = container.getBoundingClientRect();
  initialX = rect.left;
  initialY = rect.top;

  // Store mouse position
  dragStartX = event.clientX;
  dragStartY = event.clientY;

  // Set dragging state after a small delay to distinguish from click
  setTimeout(() => {
    if (event.buttons === 1) {
      // Left mouse button still pressed
      isDragging = true;
      container.classList.add("dragging");
    }
  }, 100);
}

/**
 * Handle drag move
 */
function handleDragMove(event: MouseEvent) {
  if (!isDragging) return;

  event.preventDefault();

  const container = document.getElementById("promptpilot-container");
  if (!container) return;

  // Calculate new position
  currentX = initialX + (event.clientX - dragStartX);
  currentY = initialY + (event.clientY - dragStartY);

  // Keep widget within viewport bounds
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const containerWidth = 48; // Main button width
  const containerHeight = 48; // Main button height

  // Constrain to viewport
  currentX = Math.max(0, Math.min(currentX, viewportWidth - containerWidth));
  currentY = Math.max(0, Math.min(currentY, viewportHeight - containerHeight));

  // Apply position
  container.style.left = currentX + "px";
  container.style.top = currentY + "px";
  container.style.right = "auto";
  container.style.bottom = "auto";
}

/**
 * Handle drag end
 */
function handleDragEnd(event: MouseEvent) {
  if (!isDragging) return;

  const container = document.getElementById("promptpilot-container");
  if (container) {
    container.classList.remove("dragging");

    // Save the current position
    saveWidgetPosition(currentX, currentY);
  }

  // Reset dragging state after a short delay to prevent click event
  setTimeout(() => {
    isDragging = false;
  }, 50);
}

/**
 * Save widget position to localStorage
 */
function saveWidgetPosition(x: number, y: number) {
  try {
    const position = { x, y };
    localStorage.setItem(
      "promptpilot-widget-position",
      JSON.stringify(position)
    );
  } catch (error) {
    console.warn("Failed to save widget position:", error);
  }
}

/**
 * Restore widget position from localStorage
 */
function restoreWidgetPosition(container: HTMLElement) {
  try {
    const savedPosition = localStorage.getItem("promptpilot-widget-position");
    if (savedPosition) {
      const position = JSON.parse(savedPosition);

      // Validate position is within current viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const containerWidth = 48;
      const containerHeight = 48;

      const x = Math.max(
        0,
        Math.min(position.x, viewportWidth - containerWidth)
      );
      const y = Math.max(
        0,
        Math.min(position.y, viewportHeight - containerHeight)
      );

      // Apply saved position
      container.style.left = x + "px";
      container.style.top = y + "px";
      container.style.right = "auto";
      container.style.bottom = "auto";

      // Update current position variables
      currentX = x;
      currentY = y;
    }
  } catch (error) {
    console.warn("Failed to restore widget position:", error);
    // Fall back to default positioning (CSS will handle this)
  }
}

/**
 * Handle window resize to keep widget within bounds
 */
function handleWindowResize() {
  const container = document.getElementById("promptpilot-container");
  if (!container) return;

  // Only adjust if widget has been moved from default position
  const hasCustomPosition = container.style.left || container.style.top;
  if (!hasCustomPosition) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const containerWidth = 48;
  const containerHeight = 48;

  // Get current position
  const rect = container.getBoundingClientRect();
  let newX = rect.left;
  let newY = rect.top;

  // Constrain to new viewport
  newX = Math.max(0, Math.min(newX, viewportWidth - containerWidth));
  newY = Math.max(0, Math.min(newY, viewportHeight - containerHeight));

  // Apply new position if it changed
  if (newX !== rect.left || newY !== rect.top) {
    container.style.left = newX + "px";
    container.style.top = newY + "px";

    // Update current position variables
    currentX = newX;
    currentY = newY;

    // Save the new position
    saveWidgetPosition(newX, newY);
  }
}

// Initialize when the page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
