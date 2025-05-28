// Simple debug script for PromptPilot loading issue
console.log("🔍 PromptPilot Simple Debug - Checking loading issue...");

// Step 1: Check if extension is loaded
console.log("Step 1: Checking extension status...");
if (typeof chrome !== "undefined" && chrome.runtime) {
  console.log("✅ Chrome extension APIs available");
  console.log("Extension ID:", chrome.runtime.id);
} else {
  console.log("❌ Chrome extension APIs not available");
}

// Step 2: Check if content script button exists
console.log("Step 2: Checking content script...");
const button = document.getElementById("promptpilot-improve-button");
if (button) {
  console.log("✅ PromptPilot button found");
  console.log("Button state:", {
    className: button.className,
    disabled: button.disabled,
    textContent: button.textContent,
  });
} else {
  console.log("❌ PromptPilot button not found");
}

// Step 3: Test background script communication
console.log("Step 3: Testing background script...");
chrome.runtime.sendMessage({ type: "CHECK_BACKEND" }, (response) => {
  if (chrome.runtime.lastError) {
    console.log(
      "❌ Background script error:",
      chrome.runtime.lastError.message
    );
  } else {
    console.log("✅ Background script response:", response);
  }
});

// Step 4: Check if there's text to improve
console.log("Step 4: Checking for text...");
const textareas = document.querySelectorAll("textarea");
const contentEditables = document.querySelectorAll('[contenteditable="true"]');
console.log("Found textareas:", textareas.length);
console.log("Found contenteditable elements:", contentEditables.length);

if (textareas.length > 0) {
  console.log(
    "First textarea value:",
    textareas[0].value.substring(0, 50) + "..."
  );
}

// Step 5: Test improvement with sample text
console.log("Step 5: Testing improvement with sample text...");
const testText = "Write a poem about love";

console.log("📤 Sending test improvement request...");
const startTime = Date.now();

chrome.runtime.sendMessage(
  {
    type: "IMPROVE_AND_REPLACE",
    text: testText,
    intent: "Creative",
    platform: "debug",
  },
  (response) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (chrome.runtime.lastError) {
      console.log("❌ Improvement failed:", chrome.runtime.lastError.message);
    } else {
      console.log(
        "✅ Improvement response received in",
        duration + "ms:",
        response
      );
    }
  }
);

// Step 6: Monitor for messages
console.log("Step 6: Setting up message listener...");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Received message:", message.type, message);
  return true;
});

console.log("🏁 Debug script completed. Watch for responses above...");
