function showStatus(message, type = "error") {
  const statusEl = document.getElementById("statusMessage");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
  }
}

function disableButtons() {
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const continueFreeBtn = document.getElementById("continueFreeBtn");
  if (tryAgainBtn) tryAgainBtn.disabled = true;
  if (continueFreeBtn) continueFreeBtn.disabled = true;
}

function enableButtons() {
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const continueFreeBtn = document.getElementById("continueFreeBtn");
  if (tryAgainBtn) tryAgainBtn.disabled = false;
  if (continueFreeBtn) continueFreeBtn.disabled = false;
}

function tryAgain() {
  console.log("Trying payment again...");
  disableButtons();

  try {
    chrome.runtime.sendMessage(
      {
        type: "OPEN_EXTENSION",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error opening extension:", chrome.runtime.lastError);
          showStatus(
            "Failed to open extension. Please click the PromptPilot icon in your browser toolbar."
          );
          enableButtons();
        } else if (response && response.status === "success") {
          console.log("Extension opened successfully");
          // Tab should be closed by background script
        } else {
          console.error("Failed to open extension:", response);
          showStatus(
            "Failed to open extension. Please click the PromptPilot icon in your browser toolbar."
          );
          enableButtons();
        }
      }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    showStatus(
      "Failed to communicate with extension. Please click the PromptPilot icon in your browser toolbar."
    );
    enableButtons();
  }
}

function continueFree() {
  console.log("Continuing with free plan...");
  disableButtons();

  try {
    chrome.runtime.sendMessage(
      {
        type: "OPEN_EXTENSION",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error opening extension:", chrome.runtime.lastError);
          showStatus(
            "Failed to open extension. Please click the PromptPilot icon in your browser toolbar."
          );
          enableButtons();
        } else if (response && response.status === "success") {
          console.log("Extension opened successfully");
          // Tab should be closed by background script
        } else {
          console.error("Failed to open extension:", response);
          showStatus(
            "Failed to open extension. Please click the PromptPilot icon in your browser toolbar."
          );
          enableButtons();
        }
      }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    showStatus(
      "Failed to communicate with extension. Please click the PromptPilot icon in your browser toolbar."
    );
    enableButtons();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Auto-close after 15 seconds if user doesn't interact
  setTimeout(() => {
    if (document.visibilityState === "visible") {
      continueFree();
    }
  }, 15000);

  // Check if extension context is available
  if (typeof chrome === "undefined" || !chrome.runtime) {
    console.error("Chrome extension context not available");
    showStatus(
      "Extension context not available. Please ensure you accessed this page through the PromptPilot extension."
    );
  }

  // Add event listeners
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const continueFreeBtn = document.getElementById("continueFreeBtn");

  if (tryAgainBtn) {
    tryAgainBtn.addEventListener("click", tryAgain);
  }
  if (continueFreeBtn) {
    continueFreeBtn.addEventListener("click", continueFree);
  }
});
