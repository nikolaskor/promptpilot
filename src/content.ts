/**
 * Content script for PromptPilot
 * Uses a fixed button approach for better reliability
 * Enhanced with multi-platform support for various LLM websites
 */

// State tracking
let isImprovementInProgress = false;
let lastTextElement: HTMLElement | null = null;
let selectedIntent = "";
let isDropdownOpen = false;
let isWidgetExpanded = false;

// Enhanced loading state tracking
let loadingStartTime = 0;
let currentLoadingStage = 1;
let loadingMessageInterval: number | null = null;
let loadingStageInterval: number | null = null;
let enhancedTimeoutId: number | null = null;

// Drag functionality state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialX = 0;
let initialY = 0;
let currentX = 0;
let currentY = 0;

// Platform detection
let currentPlatform: keyof typeof PLATFORM_CONFIGS = "default";

// Intent categories
const INTENT_CATEGORIES = [
  "Academic",
  "Professional",
  "Creative",
  "Technical",
  "Personal",
];

// Platform-specific configurations
const PLATFORM_CONFIGS = {
  openai: {
    name: "OpenAI",
    selectors: [
      "textarea[data-id]", // ChatGPT main input
      'textarea[placeholder*="message"]',
      'div[contenteditable="true"]',
      "#prompt-textarea",
    ],
    waitForLoad: 1000,
  },
  anthropic: {
    name: "Anthropic",
    selectors: [
      'div[contenteditable="true"]',
      "textarea",
      'div[role="textbox"]',
    ],
    waitForLoad: 1500,
  },
  google: {
    name: "Google",
    selectors: [
      'textarea[aria-label*="message"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="Enter a prompt"]',
    ],
    waitForLoad: 2000,
  },
  grok: {
    name: "Grok",
    selectors: [
      'div[contenteditable="true"]',
      'textarea[placeholder*="Ask Grok"]',
      'div[role="textbox"]',
      'textarea[data-testid*="compose"]',
    ],
    waitForLoad: 2000,
  },
  deepseek: {
    name: "DeepSeek",
    selectors: [
      'textarea[placeholder*="Send a message"]',
      'div[contenteditable="true"]',
      'textarea[class*="input"]',
    ],
    waitForLoad: 1500,
  },
  mistral: {
    name: "Mistral",
    selectors: [
      'textarea[placeholder*="Type a message"]',
      'div[contenteditable="true"]',
      'textarea[class*="chat"]',
    ],
    waitForLoad: 1500,
  },
  perplexity: {
    name: "Perplexity",
    selectors: [
      'textarea[placeholder*="Ask anything"]',
      'div[contenteditable="true"]',
    ],
    waitForLoad: 1000,
  },
  huggingface: {
    name: "Hugging Face",
    selectors: [
      'textarea[placeholder*="Type a message"]',
      'div[contenteditable="true"]',
    ],
    waitForLoad: 1500,
  },
  default: {
    name: "Generic",
    selectors: [
      "textarea",
      'input[type="text"]',
      'div[contenteditable="true"]',
      'div[role="textbox"]',
    ],
    waitForLoad: 500,
  },
} as const;

// Enhanced loading configurations
const LOADING_STAGES = {
  1: {
    duration: 3000, // 3 seconds
    messages: [
      "Analyzing your prompt...",
      "Understanding context...",
      "Preparing enhancement...",
    ],
    className: "stage-1",
    icon: "🔍",
  },
  2: {
    duration: 8000, // 8 seconds
    messages: [
      "AI is thinking...",
      "Crafting improvements...",
      "Refining suggestions...",
      "Optimizing clarity...",
    ],
    className: "stage-2",
    icon: "🤖",
  },
  3: {
    duration: 15000, // 15+ seconds
    messages: [
      "Finalizing enhancements...",
      "Adding finishing touches...",
      "Almost ready...",
      "Polishing results...",
    ],
    className: "stage-3",
    icon: "✨",
  },
};

const CONTEXTUAL_MESSAGES = {
  Academic: [
    "Enhancing academic tone...",
    "Improving scholarly structure...",
    "Refining research clarity...",
  ],
  Professional: [
    "Polishing professional language...",
    "Enhancing business clarity...",
    "Optimizing formal tone...",
  ],
  Creative: [
    "Boosting creative expression...",
    "Enhancing narrative flow...",
    "Amplifying creative voice...",
  ],
  Technical: [
    "Clarifying technical details...",
    "Improving precision...",
    "Enhancing technical accuracy...",
  ],
  Personal: [
    "Personalizing your message...",
    "Improving conversational tone...",
    "Enhancing personal expression...",
  ],
};

// Initialize the content script
function initialize() {
  try {
    console.log("PromptPilot content script initializing...");

    // Detect current platform
    detectPlatform();

    // Inject styles
    injectStyles();

    // Wait for platform-specific load time before creating button
    const config =
      PLATFORM_CONFIGS[currentPlatform] || PLATFORM_CONFIGS.default;
    setTimeout(() => {
      try {
        createFixedButton();
        setupPlatformSpecificHandlers();
      } catch (error) {
        console.error("Error during delayed initialization:", error);
      }
    }, config.waitForLoad);

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessages);

    // Add event listener for text selection
    document.addEventListener("mouseup", handleTextSelection);

    // Track input elements when clicked or focused
    document.addEventListener("mousedown", trackTextElement);
    document.addEventListener("focusin", trackTextElement);

    // Handle dynamic content loading (for SPAs)
    setupMutationObserver();

    console.log(
      `PromptPilot content script initialized for platform: ${currentPlatform}`
    );

    // Show onboarding notification for new users
    showOnboardingNotification();

    // Show platform-specific help if it's a recognized platform
    if (currentPlatform !== "default") {
      setTimeout(() => {
        try {
          showContextualHelp("platform-detected");
        } catch (error) {
          console.error("Error showing contextual help:", error);
        }
      }, 5000);
    }
  } catch (error) {
    console.error("Error during PromptPilot initialization:", error);
  }
}

/**
 * Detect the current platform based on hostname
 */
function detectPlatform() {
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes("openai.com") || hostname.includes("chatgpt.com")) {
    currentPlatform = "openai";
  } else if (
    hostname.includes("anthropic.com") ||
    hostname.includes("claude.ai")
  ) {
    currentPlatform = "anthropic";
  } else if (
    hostname.includes("google.com") ||
    hostname.includes("bard.google.com") ||
    hostname.includes("gemini.google.com")
  ) {
    currentPlatform = "google";
  } else if (hostname.includes("grok.com") || hostname.includes("x.ai")) {
    currentPlatform = "grok";
  } else if (
    hostname.includes("deepseek.com") ||
    hostname.includes("deepseek.ai")
  ) {
    currentPlatform = "deepseek";
  } else if (hostname.includes("mistral.ai")) {
    currentPlatform = "mistral";
  } else if (hostname.includes("perplexity.ai")) {
    currentPlatform = "perplexity";
  } else if (hostname.includes("huggingface.co")) {
    currentPlatform = "huggingface";
  } else {
    currentPlatform = "default";
  }

  console.log(`Detected platform: ${currentPlatform} (${hostname})`);
}

/**
 * Setup platform-specific event handlers and optimizations
 */
function setupPlatformSpecificHandlers() {
  const config = PLATFORM_CONFIGS[currentPlatform] || PLATFORM_CONFIGS.default;

  // Add platform-specific text element detection
  config.selectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (!element.hasAttribute("data-promptpilot-tracked")) {
          element.setAttribute("data-promptpilot-tracked", "true");
          element.addEventListener("focus", trackTextElement);
          element.addEventListener("click", trackTextElement);
        }
      });
    } catch (error) {
      console.warn(`Failed to setup handler for selector ${selector}:`, error);
    }
  });
}

/**
 * Setup mutation observer to handle dynamically loaded content
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldSetupHandlers = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if new text inputs were added
            if (
              element.matches &&
              (element.matches("textarea") ||
                element.matches('input[type="text"]') ||
                element.matches('div[contenteditable="true"]') ||
                element.matches('div[role="textbox"]'))
            ) {
              shouldSetupHandlers = true;
            }
            // Also check children
            if (
              element.querySelector &&
              (element.querySelector("textarea") ||
                element.querySelector('input[type="text"]') ||
                element.querySelector('div[contenteditable="true"]') ||
                element.querySelector('div[role="textbox"]'))
            ) {
              shouldSetupHandlers = true;
            }
          }
        });
      }
    });

    if (shouldSetupHandlers) {
      // Debounce the setup to avoid excessive calls
      setTimeout(setupPlatformSpecificHandlers, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
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
  } else if (message.type === "USAGE_LIMIT_REACHED") {
    handleUsageLimitReached(message, sendResponse);
  } else if (message.type === "USAGE_WARNING") {
    handleUsageWarning(message, sendResponse);
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
      showNotification({
        message:
          "No improvement suggestions received. Please try again with different text.",
        type: "warning",
        icon: "🤔",
        duration: 6000,
        dismissible: true,
        actionText: "Try Again",
        actionCallback: () => {
          handleImproveClick();
        },
      });
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
    showNotification({
      message:
        "Failed to insert improved text. You can copy it from the popup instead.",
      type: "error",
      icon: "📋",
      duration: 8000,
      dismissible: true,
      actionText: "Open Popup",
      actionCallback: () => {
        chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
      },
    });
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

  // Enhanced error notification with better messaging
  let errorMessage = error || "Error improving text";
  let actionText = undefined;
  let actionCallback = undefined;

  // Provide specific actions based on error type
  if (error.includes("API key") || error.includes("authentication")) {
    errorMessage = "API authentication failed. Please check your settings.";
    actionText = "Open Settings";
    actionCallback = () => {
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
    };
  } else if (error.includes("network") || error.includes("connection")) {
    errorMessage =
      "Network error. Please check your internet connection and try again.";
    actionText = "Retry";
    actionCallback = () => {
      // Retry the last improvement
      handleImproveClick();
    };
  } else if (error.includes("rate limit") || error.includes("quota")) {
    errorMessage =
      "API rate limit reached. Please wait a moment and try again.";
    actionText = "Learn More";
    actionCallback = () => {
      chrome.runtime.sendMessage({ type: "OPEN_HELP_PAGE" });
    };
  }

  showNotification({
    message: errorMessage,
    type: "error",
    icon: "❌",
    duration: 8000,
    dismissible: true,
    actionText,
    actionCallback,
  });

  resetButtonState();
  isImprovementInProgress = false;
  sendResponse({ status: "error_displayed" });
}

/**
 * Handle usage limit reached message
 */
function handleUsageLimitReached(message: any, sendResponse: Function) {
  console.log("Usage limit reached:", message);

  const { remaining, limit, subscriptionStatus } = message;

  let notificationMessage = `You've reached your monthly limit of ${limit} improvements.`;

  if (subscriptionStatus === "free") {
    showNotification({
      message: notificationMessage,
      type: "error",
      icon: "🚫",
      duration: 8000,
      dismissible: true,
      actionText: "Upgrade Now",
      actionCallback: () => {
        // Open upgrade page or popup
        chrome.runtime.sendMessage({ type: "OPEN_UPGRADE_PAGE" });
      },
    });
  } else {
    showNotification({
      message:
        notificationMessage +
        " Please contact support if this seems incorrect.",
      type: "error",
      icon: "⚠️",
      duration: 6000,
      dismissible: true,
    });
  }

  resetButtonState();
  isImprovementInProgress = false;
  sendResponse({ status: "limit_displayed" });
}

/**
 * Handle usage warning message for proactive notifications
 */
function handleUsageWarning(message: any, sendResponse: Function) {
  console.log("Usage warning:", message);

  const { remaining, limit, subscriptionStatus } = message;

  if (subscriptionStatus === "free") {
    if (remaining === 1) {
      showNotification({
        message:
          "Last improvement remaining! Your usage resets on the 1st of next month.",
        type: "warning",
        icon: "🚨",
        duration: 8000,
        dismissible: true,
        actionText: "Upgrade Now",
        actionCallback: () => {
          chrome.runtime.sendMessage({ type: "OPEN_UPGRADE_PAGE" });
        },
      });
    } else if (remaining === 4) {
      showNotification({
        message: `${remaining} improvements left this month. Upgrade for unlimited access!`,
        type: "warning",
        icon: "⚠️",
        duration: 6000,
        dismissible: true,
        actionText: "Learn More",
        actionCallback: () => {
          chrome.runtime.sendMessage({ type: "OPEN_UPGRADE_PAGE" });
        },
      });
    }
  }

  sendResponse({ status: "warning_displayed" });
}

/**
 * Check usage limits and show proactive warnings
 */
function checkUsageLimitsAndWarn() {
  chrome.runtime.sendMessage(
    { type: "GET_REMAINING_IMPROVEMENTS" },
    (response) => {
      if (response?.status === "success") {
        const remaining = response.data;

        // Show warning at 80% usage (4 remaining for free tier)
        if (remaining === 4) {
          showNotification({
            message: `${remaining} improvements left this month. Upgrade for unlimited access!`,
            type: "warning",
            icon: "⚠️",
            duration: 6000,
            dismissible: true,
            actionText: "Learn More",
            actionCallback: () => {
              chrome.runtime.sendMessage({ type: "OPEN_UPGRADE_PAGE" });
            },
          });
        }
        // Final warning at 95% usage (1 remaining for free tier)
        else if (remaining === 1) {
          showNotification({
            message:
              "Last improvement remaining! Your usage resets on the 1st of next month.",
            type: "warning",
            icon: "🚨",
            duration: 8000,
            dismissible: true,
            actionText: "Upgrade Now",
            actionCallback: () => {
              chrome.runtime.sendMessage({ type: "OPEN_UPGRADE_PAGE" });
            },
          });
        }
      }
    }
  );
}

/**
 * Insert improved text at the appropriate location
 * Enhanced with platform-specific insertion methods
 */
function insertImprovedText(newText: string) {
  const selection = window.getSelection();

  // If we have an active selection, replace it
  if (selection && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(newText));

    // Trigger input events for React/Vue components
    const parentElement = selection.anchorNode?.parentElement;
    if (parentElement) {
      triggerInputEvents(parentElement);
    }
    return;
  }

  // Try to use the active element first
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement && insertTextIntoElement(activeElement, newText)) {
    return;
  }

  // Otherwise, use the last text element if available
  if (lastTextElement && insertTextIntoElement(lastTextElement, newText)) {
    return;
  }

  // Platform-specific insertion fallback
  if (insertTextPlatformSpecific(newText)) {
    return;
  }

  console.warn("No target element found to insert improved text");
  showNotification({
    message: "Please select text or click in a text field before improving",
    type: "error",
    icon: "❌",
    duration: 5000,
    dismissible: true,
  });
}

/**
 * Insert text into a specific element with proper event handling
 */
function insertTextIntoElement(element: HTMLElement, newText: string): boolean {
  if (!element) return false;

  try {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      const input = element as HTMLInputElement | HTMLTextAreaElement;

      // Store cursor position for better UX
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      // If there's a selection, replace it; otherwise replace all
      if (start !== end) {
        const value = input.value;
        input.value =
          value.substring(0, start) + newText + value.substring(end);

        // Safely set selection range
        try {
          input.setSelectionRange(
            start + newText.length,
            start + newText.length
          );
        } catch (selectionError) {
          console.warn("Error setting selection range:", selectionError);
        }
      } else {
        input.value = newText;

        // Safely set selection range
        try {
          input.setSelectionRange(newText.length, newText.length);
        } catch (selectionError) {
          console.warn("Error setting selection range:", selectionError);
        }
      }

      // Trigger events for React/Vue components
      triggerInputEvents(input);
      return true;
    } else if (element.getAttribute("contenteditable") === "true") {
      // For contenteditable elements
      const selection = window.getSelection();

      // Focus the element first
      element.focus();

      // Clear existing content or replace selection
      if (
        selection &&
        !selection.isCollapsed &&
        selection.anchorNode &&
        element.contains(selection.anchorNode)
      ) {
        // Replace selection
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
      } else {
        // Replace all content
        element.textContent = newText;
      }

      // Trigger events for React/Vue components
      triggerInputEvents(element);
      return true;
    }
  } catch (error) {
    console.warn("Error inserting text into element:", error);
  }

  return false;
}

/**
 * Insert text using platform-specific methods
 */
function insertTextPlatformSpecific(newText: string): boolean {
  const config = PLATFORM_CONFIGS[currentPlatform] || PLATFORM_CONFIGS.default;

  // Try each platform-specific selector to find an active input
  for (const selector of config.selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const htmlElement = element as HTMLElement;

        // Skip if element is not visible or interactable
        if (!isElementVisible(htmlElement)) {
          continue;
        }

        // Try to insert text into this element
        if (insertTextIntoElement(htmlElement, newText)) {
          lastTextElement = htmlElement;
          return true;
        }
      }
    } catch (error) {
      console.warn(
        `Error with platform-specific insertion for selector ${selector}:`,
        error
      );
    }
  }

  return false;
}

/**
 * Trigger appropriate input events for modern web frameworks
 */
function triggerInputEvents(element: HTMLElement | null) {
  if (!element) return;

  try {
    // Trigger multiple events to ensure compatibility with React, Vue, etc.
    const events = [
      new Event("input", { bubbles: true }),
      new Event("change", { bubbles: true }),
      new InputEvent("input", { bubbles: true, inputType: "insertText" }),
      new Event("blur", { bubbles: true }),
      new Event("focus", { bubbles: true }),
    ];

    events.forEach((event) => {
      try {
        element.dispatchEvent(event);
      } catch (e) {
        // Ignore individual event errors
      }
    });

    // For some platforms, we need to trigger React's internal events
    if (currentPlatform === "openai" || currentPlatform === "anthropic") {
      try {
        // Only attempt this for input/textarea elements
        if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
          const inputElement = element as
            | HTMLInputElement
            | HTMLTextAreaElement;

          // Get the appropriate descriptor based on element type
          let descriptor = null;

          try {
            if (element.tagName === "TEXTAREA") {
              descriptor = Object.getOwnPropertyDescriptor(
                HTMLTextAreaElement.prototype,
                "value"
              );
            } else {
              descriptor = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
              );
            }

            // If no descriptor found, try getting it from the element itself
            if (!descriptor) {
              descriptor = Object.getOwnPropertyDescriptor(element, "value");
            }
          } catch (descriptorGetError) {
            console.warn(
              "Error getting property descriptor:",
              descriptorGetError
            );
            descriptor = null;
          }

          // Only proceed if we have a valid descriptor with a setter
          if (
            descriptor &&
            typeof descriptor === "object" &&
            descriptor.set &&
            typeof descriptor.set === "function"
          ) {
            try {
              // Use the current value of the element
              const currentValue = inputElement.value;
              descriptor.set.call(element, currentValue);
            } catch (setError) {
              console.warn("Error calling descriptor setter:", setError);
            }
          }
        }
      } catch (descriptorError) {
        console.warn(
          "Error triggering React descriptor events:",
          descriptorError
        );
      }
    }
  } catch (error) {
    console.warn("Error triggering input events:", error);
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
  mainButton.title = "PromptPilot - Click to expand";
  mainButton.addEventListener("click", handleMainButtonClick);

  // Create drag handle in the corner
  const dragHandle = document.createElement("div");
  dragHandle.className = "promptpilot-drag-handle";
  dragHandle.title = "Drag to move widget";
  dragHandle.innerHTML = '<span class="promptpilot-drag-dots">⋮⋮</span>';

  // Add drag functionality only to the drag handle
  dragHandle.addEventListener("mousedown", handleDragStart);
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);

  // Append drag handle to main button
  mainButton.appendChild(dragHandle);

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
    showNotification({
      message: "No text found. Please click or focus on a text field first.",
      type: "warning",
      icon: "⚠️",
      duration: 5000,
      dismissible: true,
      actionText: "Help",
      actionCallback: () => {
        chrome.runtime.sendMessage({ type: "OPEN_HELP_PAGE" });
      },
    });
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
      platform: currentPlatform,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending improvement request:",
          chrome.runtime.lastError
        );
        showNotification({
          message:
            "Extension communication failed. Please refresh the page and try again.",
          type: "error",
          icon: "🔄",
          duration: 8000,
          dismissible: true,
          actionText: "Refresh Page",
          actionCallback: () => {
            window.location.reload();
          },
        });
        resetButtonState();
        isImprovementInProgress = false;
      } else {
        // Handle successful response from background script
        console.log("Background script response:", response);

        if (response && response.status === "processing") {
          console.log("Background script is processing the request");
          // Keep loading state - the background script will send IMPROVED_TEXT_FOR_REPLACEMENT when done

          // Setup enhanced timeout with user control
          setupEnhancedTimeout();
        } else if (response && response.status === "limit_reached") {
          console.log("Usage limit reached");
          resetButtonState();
          isImprovementInProgress = false;
          // The background script will also send USAGE_LIMIT_REACHED message
        } else if (response && response.status === "error") {
          console.error("Background script returned error:", response.error);
          showNotification({
            message:
              response.error || "Failed to improve prompt. Please try again.",
            type: "error",
            icon: "❌",
            duration: 8000,
            dismissible: true,
          });
          resetButtonState();
          isImprovementInProgress = false;
        } else {
          console.log("Unexpected response from background script:", response);
        }
      }
    }
  );
}

/**
 * Get currently selected text or text from an input field
 * Enhanced with platform-specific text detection
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

  // Platform-specific text detection fallback
  const text = getPlatformSpecificText();
  if (text) {
    return text;
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
 * Get text using platform-specific selectors and methods
 */
function getPlatformSpecificText(): string {
  const config = PLATFORM_CONFIGS[currentPlatform] || PLATFORM_CONFIGS.default;

  // Try each platform-specific selector
  for (const selector of config.selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const htmlElement = element as HTMLElement;

        // Skip if element is not visible or interactable
        if (!isElementVisible(htmlElement)) {
          continue;
        }

        // Check if this element has focus or was recently interacted with
        if (
          htmlElement === document.activeElement ||
          htmlElement === lastTextElement
        ) {
          lastTextElement = htmlElement;

          if (
            htmlElement.tagName === "TEXTAREA" ||
            htmlElement.tagName === "INPUT"
          ) {
            const input = htmlElement as HTMLInputElement | HTMLTextAreaElement;
            if (input.value.trim()) {
              return input.value.trim();
            }
          } else if (htmlElement.getAttribute("contenteditable") === "true") {
            const text =
              htmlElement.textContent?.trim() ||
              htmlElement.innerText?.trim() ||
              "";
            if (text) {
              return text;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Error with selector ${selector}:`, error);
    }
  }

  return "";
}

/**
 * Check if an element is visible and interactable
 */
function isElementVisible(element: HTMLElement): boolean {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  return true;
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
 * Show enhanced loading state with multi-stage feedback and contextual messaging
 */
function showLoadingState() {
  const improveButton = document.getElementById("promptpilot-improve-button");
  if (!improveButton) return;

  // Record start time
  loadingStartTime = Date.now();
  currentLoadingStage = 1;

  // Clear any existing intervals
  clearLoadingIntervals();

  // Start with Stage 1
  updateLoadingStage(1);

  // Setup stage progression
  setupStageProgression();

  // Setup contextual messaging
  setupContextualMessaging();

  // Add accessibility attributes
  improveButton.setAttribute("aria-busy", "true");
  improveButton.setAttribute("aria-live", "polite");
  improveButton.setAttribute("aria-describedby", "promptpilot-loading-status");

  // Create screen reader status element
  createScreenReaderStatus();
}

/**
 * Update loading stage with visual and contextual feedback
 */
function updateLoadingStage(stage: number) {
  const improveButton = document.getElementById("promptpilot-improve-button");
  if (!improveButton) return;

  const stageConfig = LOADING_STAGES[stage as keyof typeof LOADING_STAGES];
  if (!stageConfig) return;

  currentLoadingStage = stage;

  // Update button appearance
  improveButton.className = `promptpilot-improve-button loading ${stageConfig.className}`;
  improveButton.innerHTML = `<span class="promptpilot-loader-${stage}">${stageConfig.icon}</span>`;

  // Update initial tooltip
  improveButton.title = stageConfig.messages[0];

  console.log(`Loading stage ${stage}: ${stageConfig.messages[0]}`);
}

/**
 * Setup stage progression timeline
 */
function setupStageProgression() {
  // Progress to Stage 2 after 3 seconds
  loadingStageInterval = window.setTimeout(() => {
    if (isImprovementInProgress) {
      updateLoadingStage(2);

      // Progress to Stage 3 after 8 more seconds (11 total)
      loadingStageInterval = window.setTimeout(() => {
        if (isImprovementInProgress) {
          updateLoadingStage(3);
        }
      }, 8000);
    }
  }, 3000);
}

/**
 * Setup contextual messaging that rotates through stage-appropriate messages
 */
function setupContextualMessaging() {
  let messageIndex = 0;

  const updateMessage = () => {
    if (!isImprovementInProgress) return;

    const improveButton = document.getElementById("promptpilot-improve-button");
    if (!improveButton) return;

    const stageConfig =
      LOADING_STAGES[currentLoadingStage as keyof typeof LOADING_STAGES];
    if (!stageConfig) return;

    // Get contextual messages based on selected intent
    let messages = stageConfig.messages;
    if (
      selectedIntent &&
      CONTEXTUAL_MESSAGES[selectedIntent as keyof typeof CONTEXTUAL_MESSAGES]
    ) {
      messages =
        CONTEXTUAL_MESSAGES[selectedIntent as keyof typeof CONTEXTUAL_MESSAGES];
    }

    // Update tooltip with current message
    const currentMessage = messages[messageIndex % messages.length];
    improveButton.title = currentMessage;

    // Update screen reader status
    updateScreenReaderStatus(currentMessage);

    // Show subtle notification for important stage transitions
    if (messageIndex === 0 && currentLoadingStage > 1) {
      showStageTransitionNotification(currentLoadingStage, currentMessage);
    }

    messageIndex++;
  };

  // Update message every 2.5 seconds
  loadingMessageInterval = window.setInterval(updateMessage, 2500);

  // Initial message update
  updateMessage();
}

/**
 * Show subtle notification for stage transitions
 */
function showStageTransitionNotification(stage: number, message: string) {
  const stageConfig = LOADING_STAGES[stage as keyof typeof LOADING_STAGES];
  if (!stageConfig) return;

  // Only show notification for stages 2 and 3, and only once per improvement
  if (stage === 2) {
    showNotification({
      message: `${stageConfig.icon} ${message}`,
      type: "info",
      duration: 2000,
      dismissible: false,
    });
  } else if (stage === 3) {
    showNotification({
      message: `${stageConfig.icon} Taking longer than usual - ${message}`,
      type: "warning",
      duration: 3000,
      dismissible: true,
    });
  }
}

/**
 * Create screen reader status element
 */
function createScreenReaderStatus() {
  // Remove existing status element
  const existing = document.getElementById("promptpilot-loading-status");
  if (existing) {
    existing.remove();
  }

  const statusElement = document.createElement("div");
  statusElement.id = "promptpilot-loading-status";
  statusElement.className = "sr-only";
  statusElement.style.cssText = `
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0,0,0,0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  `;
  statusElement.textContent = "Improving your prompt, please wait...";
  document.body.appendChild(statusElement);
}

/**
 * Update screen reader status
 */
function updateScreenReaderStatus(message: string) {
  const statusElement = document.getElementById("promptpilot-loading-status");
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * Clear all loading intervals
 */
function clearLoadingIntervals() {
  if (loadingMessageInterval) {
    clearInterval(loadingMessageInterval);
    loadingMessageInterval = null;
  }
  if (loadingStageInterval) {
    clearTimeout(loadingStageInterval);
    loadingStageInterval = null;
  }
  if (enhancedTimeoutId) {
    clearTimeout(enhancedTimeoutId);
    enhancedTimeoutId = null;
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

    // Reset accessibility attributes
    improveButton.removeAttribute("aria-busy");
    improveButton.removeAttribute("aria-live");
    improveButton.removeAttribute("aria-describedby");
  }

  // Clear all loading intervals and timers
  clearLoadingIntervals();

  // Reset loading state variables
  currentLoadingStage = 1;
  loadingStartTime = 0;

  // Remove screen reader status element
  const statusElement = document.getElementById("promptpilot-loading-status");
  if (statusElement) {
    statusElement.remove();
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
    showNotification({
      message: "Text successfully improved!",
      type: "success",
      icon: "✅",
      duration: 3000,
      dismissible: false,
    });

    // Check usage limits and show proactive warnings
    checkUsageLimitsAndWarn();

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

/**
 * Enhanced notification options
 */
interface NotificationOptions {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number; // Duration in milliseconds, 0 for persistent
  dismissible?: boolean; // Show close button
  icon?: string; // Icon to display
  actionText?: string; // Action button text
  actionCallback?: () => void; // Action button callback
  secondaryActionText?: string; // Secondary action button text
  secondaryActionCallback?: () => void; // Secondary action button callback
}

/**
 * Notification queue management
 */
let notificationQueue: NotificationOptions[] = [];
let activeNotifications: HTMLElement[] = [];
const MAX_CONCURRENT_NOTIFICATIONS = 3;

/**
 * Process notification queue
 */
function processNotificationQueue() {
  if (
    notificationQueue.length === 0 ||
    activeNotifications.length >= MAX_CONCURRENT_NOTIFICATIONS
  ) {
    return;
  }

  const options = notificationQueue.shift();
  if (options) {
    const notification = createNotificationElement(options);
    activeNotifications.push(notification);

    // Auto-remove after delay (if not persistent)
    const duration = options.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        removeNotificationFromQueue(notification);
      }, duration);
    }
  }
}

/**
 * Create notification element
 */
function createNotificationElement(options: NotificationOptions): HTMLElement {
  // Create notification container
  const notification = document.createElement("div");
  notification.className = `promptpilot-notification ${options.type}`;

  // Create notification content
  const content = document.createElement("div");
  content.className = "promptpilot-notification-content";

  // Add icon if specified
  if (options.icon) {
    const icon = document.createElement("div");
    icon.className = "promptpilot-notification-icon";
    icon.textContent = options.icon;
    content.appendChild(icon);
  }

  // Add message
  const messageEl = document.createElement("div");
  messageEl.className = "promptpilot-notification-message";
  messageEl.textContent = options.message;
  content.appendChild(messageEl);

  notification.appendChild(content);

  // Add action button if specified
  if (options.actionText && options.actionCallback) {
    const actionButton = document.createElement("button");
    actionButton.className = "promptpilot-notification-action";
    actionButton.textContent = options.actionText;
    actionButton.onclick = (e) => {
      e.stopPropagation();
      options.actionCallback!();
      removeNotificationFromQueue(notification);
    };
    notification.appendChild(actionButton);
  }

  // Add secondary action button if specified
  if (options.secondaryActionText && options.secondaryActionCallback) {
    const secondaryActionButton = document.createElement("button");
    secondaryActionButton.className =
      "promptpilot-notification-action secondary";
    secondaryActionButton.textContent = options.secondaryActionText;
    secondaryActionButton.onclick = (e) => {
      e.stopPropagation();
      options.secondaryActionCallback!();
      removeNotificationFromQueue(notification);
    };
    notification.appendChild(secondaryActionButton);
  }

  // Add close button if dismissible
  if (options.dismissible) {
    const closeButton = document.createElement("button");
    closeButton.className = "promptpilot-notification-close";
    closeButton.innerHTML = "×";
    closeButton.onclick = (e) => {
      e.stopPropagation();
      removeNotificationFromQueue(notification);
    };
    notification.appendChild(closeButton);
  }

  // Add to page
  document.body.appendChild(notification);

  return notification;
}

/**
 * Remove notification from queue and DOM
 */
function removeNotificationFromQueue(notification: HTMLElement) {
  removeNotification(notification);
  const index = activeNotifications.indexOf(notification);
  if (index > -1) {
    activeNotifications.splice(index, 1);
    // Process next notification in queue
    setTimeout(processNotificationQueue, 100);
  }
}

/**
 * Show enhanced notification to user
 */
function showNotification(
  messageOrOptions: string | NotificationOptions,
  type?: "success" | "error" | "warning" | "info"
) {
  // Handle backward compatibility
  let options: NotificationOptions;
  if (typeof messageOrOptions === "string") {
    options = {
      message: messageOrOptions,
      type: type || "info",
      duration: 4000,
      dismissible: false,
    };
  } else {
    options = {
      duration: 4000,
      dismissible: false,
      ...messageOrOptions,
    };
  }

  // Add to queue if we have too many active notifications
  if (activeNotifications.length >= MAX_CONCURRENT_NOTIFICATIONS) {
    notificationQueue.push(options);
    return null;
  }

  // Create and show notification immediately
  const notification = createNotificationElement(options);
  activeNotifications.push(notification);

  // Auto-remove after delay (if not persistent)
  const duration = options.duration ?? 4000;
  if (duration > 0) {
    setTimeout(() => {
      removeNotificationFromQueue(notification);
    }, duration);
  }

  return notification;
}

/**
 * Remove notification with animation
 */
function removeNotification(notification: HTMLElement) {
  if (notification.parentNode) {
    notification.style.animation =
      "promptpilot-fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }
}

/**
 * Show onboarding notification for first-time users
 */
function showOnboardingNotification() {
  // Check if user has seen onboarding
  chrome.storage.local.get(["promptpilot_onboarding_shown"], (result) => {
    if (!result.promptpilot_onboarding_shown) {
      setTimeout(() => {
        showNotification({
          message:
            "Welcome to PromptPilot! Click the floating button to improve any text on this page.",
          type: "info",
          icon: "👋",
          duration: 10000,
          dismissible: true,
          actionText: "Got it!",
          actionCallback: () => {
            // Mark onboarding as shown
            chrome.storage.local.set({ promptpilot_onboarding_shown: true });
          },
        });
      }, 2000); // Show after 2 seconds to let page load
    }
  });
}

/**
 * Show contextual help notifications
 */
function showContextualHelp(context: string) {
  const helpMessages = {
    "no-text-selected": {
      message:
        "💡 Tip: Select text or click in a text field, then use PromptPilot to improve it!",
      duration: 6000,
    },
    "first-improvement": {
      message:
        "🎯 Pro tip: Use the intent selector (target icon) to get more specific improvements!",
      duration: 8000,
    },
    "platform-detected": {
      message: `✨ PromptPilot is optimized for ${
        (PLATFORM_CONFIGS[currentPlatform] || PLATFORM_CONFIGS.default).name
      }. Start improving your prompts!`,
      duration: 5000,
    },
  };

  const help = helpMessages[context as keyof typeof helpMessages];
  if (help) {
    showNotification({
      message: help.message,
      type: "info",
      icon: "💡",
      duration: help.duration,
      dismissible: true,
    });
  }
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
      box-shadow: 0 8px 20px rgba(66, 133, 244, 0.4);
    }
    
    .promptpilot-main-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(66, 133, 244, 0.4);
    }
    
    /* Drag handle in corner */
    .promptpilot-drag-handle {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 16px;
      height: 16px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s ease;
      z-index: 2147483648;
    }
    
    .promptpilot-main-button:hover .promptpilot-drag-handle {
      opacity: 1;
      transform: scale(1);
    }
    
    .promptpilot-drag-handle:hover {
      background: rgba(255, 255, 255, 1);
      transform: scale(1.1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    
    .promptpilot-drag-handle:active,
    .promptpilot-container.dragging .promptpilot-drag-handle {
      cursor: grabbing;
      background: rgba(255, 255, 255, 1);
      transform: scale(1.1);
    }
    
    .promptpilot-drag-dots {
      font-size: 8px;
      color: #666;
      line-height: 1;
      transform: rotate(90deg);
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
    
    .promptpilot-improve-button.loading.stage-1 {
      background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
      animation: promptpilot-gentle-pulse 2s ease-in-out infinite;
    }
    
    .promptpilot-improve-button.loading.stage-2 {
      background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
      animation: promptpilot-thinking 1.5s ease-in-out infinite;
    }
    
    .promptpilot-improve-button.loading.stage-3 {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      animation: promptpilot-processing 1s linear infinite;
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
    
    /* Enhanced Loading Animations for Different Stages */
    .promptpilot-loader-1 {
      display: inline-block;
      font-size: 16px;
      animation: promptpilot-pulse-glow 1.5s ease-in-out infinite;
    }
    
    .promptpilot-loader-2 {
      display: inline-block;
      font-size: 16px;
      animation: promptpilot-thinking-bounce 1.4s ease-in-out infinite;
    }
    
    .promptpilot-loader-3 {
      display: inline-block;
      font-size: 16px;
      animation: promptpilot-final-glow 1s ease-in-out infinite;
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
    
    /* Enhanced Loading Stage Animations */
    @keyframes promptpilot-gentle-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.02); opacity: 0.9; }
    }

    @keyframes promptpilot-thinking {
      0%, 100% { transform: scale(1) rotate(0deg); }
      25% { transform: scale(1.05) rotate(-1deg); }
      75% { transform: scale(1.05) rotate(1deg); }
    }

    @keyframes promptpilot-processing {
      0% { transform: scale(1) rotate(0deg); }
      100% { transform: scale(1) rotate(360deg); }
    }

    @keyframes promptpilot-pulse-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }

    @keyframes promptpilot-thinking-bounce {
      0%, 20%, 80%, 100% { transform: translateY(0) scale(1); }
      40% { transform: translateY(-3px) scale(1.1); }
      60% { transform: translateY(-1px) scale(1.05); }
    }

    @keyframes promptpilot-final-glow {
      0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
      50% { opacity: 0.8; transform: scale(1.15) rotate(180deg); }
    }
    
    /* Enhanced Notification styles */
    .promptpilot-notification {
      position: fixed;
      bottom: 80px;
      right: 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      max-width: 320px;
      min-width: 280px;
      color: white;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
      animation: promptpilot-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0;
      overflow: hidden;
    }
    
    .promptpilot-notification-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      flex: 1;
    }
    
    .promptpilot-notification-icon {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 1px;
    }
    
    .promptpilot-notification-message {
      flex: 1;
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .promptpilot-notification-action {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin: 0 16px 12px 16px;
      align-self: flex-start;
    }
    
    .promptpilot-notification-action:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }
    
    .promptpilot-notification-action.secondary {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-top: 8px;
    }
    
    .promptpilot-notification-action.secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
    
    .promptpilot-notification-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      line-height: 1;
    }
    
    .promptpilot-notification-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    .promptpilot-notification.success {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
    }
    
    .promptpilot-notification.error {
      background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
    }
    
    .promptpilot-notification.warning {
      background: linear-gradient(135deg, #ff9800 0%, #ffb300 100%);
    }
    
    .promptpilot-notification.info {
      background: linear-gradient(135deg, #2196f3 0%, #03a9f4 100%);
    }
    
    /* Notification animations */
    @keyframes promptpilot-fade-in {
      from {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    
    @keyframes promptpilot-fade-out {
      from {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
      }
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
 * Enhanced with platform-specific element detection
 */
function trackTextElement(event: Event) {
  const target = event.target as HTMLElement;
  if (!target) return;

  // Standard text element detection
  if (
    target.tagName === "TEXTAREA" ||
    target.tagName === "INPUT" ||
    target.getAttribute("contenteditable") === "true"
  ) {
    console.log(
      `Tracking text element: ${target.tagName} (${currentPlatform})`
    );
    lastTextElement = target;
    return;
  }

  // Platform-specific element detection
  const config = PLATFORM_CONFIGS[currentPlatform] || PLATFORM_CONFIGS.default;

  // Check if the target matches any platform-specific selectors
  for (const selector of config.selectors) {
    try {
      if (target.matches && target.matches(selector)) {
        console.log(
          `Tracking platform-specific element: ${selector} (${currentPlatform})`
        );
        lastTextElement = target;
        return;
      }
    } catch (error) {
      // Ignore selector errors
    }
  }

  // Check if target is within a text container (for complex nested structures)
  let parent = target.parentElement;
  let depth = 0;
  const maxDepth = 5; // Limit traversal depth

  while (parent && depth < maxDepth) {
    // Check standard elements
    if (
      parent.tagName === "TEXTAREA" ||
      parent.tagName === "INPUT" ||
      parent.getAttribute("contenteditable") === "true"
    ) {
      console.log(
        `Tracking parent text element: ${parent.tagName} (${currentPlatform})`
      );
      lastTextElement = parent;
      return;
    }

    // Check platform-specific selectors on parent
    for (const selector of config.selectors) {
      try {
        if (parent.matches && parent.matches(selector)) {
          console.log(
            `Tracking platform-specific parent: ${selector} (${currentPlatform})`
          );
          lastTextElement = parent;
          return;
        }
      } catch (error) {
        // Ignore selector errors
      }
    }

    parent = parent.parentElement;
    depth++;
  }

  // Special handling for specific platforms
  handlePlatformSpecificTracking(target);
}

/**
 * Handle platform-specific text element tracking
 */
function handlePlatformSpecificTracking(target: HTMLElement) {
  switch (currentPlatform) {
    case "openai":
      // ChatGPT often uses nested div structures
      if (
        target.closest("form") ||
        target.closest('[data-testid*="composer"]')
      ) {
        const textArea =
          target.closest("form")?.querySelector("textarea") ||
          target
            .closest('[data-testid*="composer"]')
            ?.querySelector("textarea");
        if (textArea) {
          lastTextElement = textArea as HTMLElement;
          console.log("Tracking OpenAI textarea via form/composer");
        }
      }
      break;

    case "anthropic":
      // Claude often uses contenteditable divs within specific containers
      if (
        target.closest('[data-testid*="chat"]') ||
        target.closest(".ProseMirror")
      ) {
        const editableDiv =
          target.closest('[contenteditable="true"]') ||
          target.closest(".ProseMirror");
        if (editableDiv) {
          lastTextElement = editableDiv as HTMLElement;
          console.log("Tracking Anthropic contenteditable via chat container");
        }
      }
      break;

    case "google":
      // Gemini/Bard may use complex nested structures
      if (
        target.closest('[data-test-id*="input"]') ||
        target.closest('[role="textbox"]')
      ) {
        const textBox =
          target.closest('[role="textbox"]') || target.closest("textarea");
        if (textBox) {
          lastTextElement = textBox as HTMLElement;
          console.log("Tracking Google textbox via role or test-id");
        }
      }
      break;

    case "grok":
      // Grok (X.ai) likely uses Twitter-like compose structures
      if (
        target.closest('[data-testid*="compose"]') ||
        target.closest('[role="textbox"]')
      ) {
        const composeElement =
          target.closest('[role="textbox"]') ||
          target.closest('[contenteditable="true"]');
        if (composeElement) {
          lastTextElement = composeElement as HTMLElement;
          console.log("Tracking Grok compose element");
        }
      }
      break;

    case "deepseek":
    case "mistral":
      // These platforms likely use standard chat interfaces
      if (
        target.closest('[class*="chat"]') ||
        target.closest('[class*="input"]')
      ) {
        const chatInput =
          target.closest("textarea") ||
          target.closest('[contenteditable="true"]');
        if (chatInput) {
          lastTextElement = chatInput as HTMLElement;
          console.log(`Tracking ${currentPlatform} chat input`);
        }
      }
      break;

    default:
      // For unknown platforms, try to find any nearby text input
      const nearbyInput =
        target
          .closest("form")
          ?.querySelector(
            'textarea, input[type="text"], [contenteditable="true"]'
          ) ||
        document.querySelector(
          'textarea:focus, input[type="text"]:focus, [contenteditable="true"]:focus'
        );
      if (nearbyInput) {
        lastTextElement = nearbyInput as HTMLElement;
        console.log("Tracking nearby text input for unknown platform");
      }
      break;
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
  event.stopPropagation(); // Prevent button click

  const container = document.getElementById("promptpilot-container");
  if (!container) return;

  // Get current position
  const rect = container.getBoundingClientRect();
  initialX = rect.left;
  initialY = rect.top;

  // Store mouse position
  dragStartX = event.clientX;
  dragStartY = event.clientY;

  // Start dragging immediately since we're on the drag handle
  isDragging = true;
  container.classList.add("dragging");
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

  // Reset dragging state immediately
  isDragging = false;
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

/**
 * Setup enhanced timeout system with progressive warnings and user control
 */
function setupEnhancedTimeout() {
  // First warning at 15 seconds
  enhancedTimeoutId = window.setTimeout(() => {
    if (isImprovementInProgress) {
      showTimeoutWarning(15);

      // Second warning at 25 seconds
      enhancedTimeoutId = window.setTimeout(() => {
        if (isImprovementInProgress) {
          showTimeoutWarning(25);

          // Final timeout at 40 seconds with recovery options
          enhancedTimeoutId = window.setTimeout(() => {
            if (isImprovementInProgress) {
              showTimeoutRecovery();
            }
          }, 15000); // 25 + 15 = 40 seconds total
        }
      }, 10000); // 15 + 10 = 25 seconds total
    }
  }, 15000); // 15 seconds
}

/**
 * Show timeout warning with current elapsed time
 */
function showTimeoutWarning(elapsedSeconds: number) {
  const currentStage =
    LOADING_STAGES[currentLoadingStage as keyof typeof LOADING_STAGES];

  showNotification({
    message: `Still working... (${elapsedSeconds}s elapsed) ${
      currentStage?.icon || "⏳"
    }`,
    type: "info",
    duration: 3000,
    dismissible: true,
    actionText: "Keep Waiting",
    actionCallback: () => {
      // User chose to keep waiting, show encouragement
      showNotification({
        message: "Thanks for your patience! AI is working hard on your prompt.",
        type: "info",
        duration: 2000,
        dismissible: false,
      });
    },
  });
}

/**
 * Show timeout recovery options with user control
 */
function showTimeoutRecovery() {
  console.warn("Enhanced timeout reached - showing recovery options");

  showNotification({
    message:
      "This is taking longer than usual. Would you like to keep waiting or try again?",
    type: "warning",
    icon: "⏱️",
    duration: 0, // Persistent until user acts
    dismissible: false, // Force user to choose
    actionText: "Keep Waiting",
    actionCallback: () => {
      extendTimeout();
    },
    secondaryActionText: "Try Again",
    secondaryActionCallback: () => {
      cancelCurrentImprovement();
      setTimeout(() => handleImproveClick(), 1000);
    },
  });
}

/**
 * Extend timeout for users who want to keep waiting
 */
function extendTimeout() {
  showNotification({
    message: "Extending wait time... We'll check again in 30 seconds.",
    type: "info",
    duration: 3000,
    dismissible: false,
  });

  // Setup another 30-second timeout
  enhancedTimeoutId = window.setTimeout(() => {
    if (isImprovementInProgress) {
      showFinalTimeoutRecovery();
    }
  }, 30000);
}

/**
 * Show final timeout recovery after extension
 */
function showFinalTimeoutRecovery() {
  showNotification({
    message:
      "Request is taking unusually long. This might indicate a server issue.",
    type: "error",
    icon: "🚫",
    duration: 0,
    dismissible: false,
    actionText: "Cancel & Retry",
    actionCallback: () => {
      cancelCurrentImprovement();
      setTimeout(() => handleImproveClick(), 1000);
    },
    secondaryActionText: "Report Issue",
    secondaryActionCallback: () => {
      cancelCurrentImprovement();
      chrome.runtime.sendMessage({
        type: "REPORT_TIMEOUT_ISSUE",
        duration: Date.now() - loadingStartTime,
      });
    },
  });
}

/**
 * Cancel current improvement and reset state
 */
function cancelCurrentImprovement() {
  console.log("Canceling current improvement process");

  // Reset state
  resetButtonState();
  isImprovementInProgress = false;

  // Notify background script to cancel if possible
  chrome.runtime.sendMessage({ type: "CANCEL_IMPROVEMENT" }, () => {
    // Ignore response - this is best effort
  });
}
