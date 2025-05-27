function showStatus(message, type = "error") {
  const statusEl = document.getElementById("statusMessage");
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
}

function disableButtons() {
  document.getElementById("openExtensionBtn").disabled = true;
  document.getElementById("manageSubscriptionBtn").disabled = true;
}

function enableButtons() {
  document.getElementById("openExtensionBtn").disabled = false;
  document.getElementById("manageSubscriptionBtn").disabled = false;
}

function openExtension() {
  console.log("Opening extension...");
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

function manageSubscription() {
  console.log("Opening customer portal...");
  disableButtons();

  try {
    chrome.runtime.sendMessage(
      {
        type: "OPEN_CUSTOMER_PORTAL",
      },
      (response) => {
        enableButtons();

        if (chrome.runtime.lastError) {
          console.error(
            "Error opening customer portal:",
            chrome.runtime.lastError
          );
          showStatus(
            "Failed to open subscription management. Please try again."
          );
        } else if (response && response.status === "success") {
          console.log("Customer portal opened successfully");
          showStatus("Subscription management opened in a new tab.", "success");
        } else {
          console.error("Failed to open customer portal:", response);
          showStatus(
            response?.error ||
              "Failed to open subscription management. Please try again."
          );
        }
      }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    showStatus("Failed to communicate with extension. Please try again.");
    enableButtons();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Auto-close after 10 seconds if user doesn't interact
  setTimeout(() => {
    if (document.visibilityState === "visible") {
      openExtension();
    }
  }, 10000);

  // Check if extension context is available
  if (typeof chrome === "undefined" || !chrome.runtime) {
    console.error("Chrome extension context not available");
    showStatus(
      "Extension context not available. Please ensure you accessed this page through the PromptPilot extension."
    );
  }

  // Add event listeners
  document
    .getElementById("openExtensionBtn")
    .addEventListener("click", openExtension);
  document
    .getElementById("manageSubscriptionBtn")
    .addEventListener("click", manageSubscription);
});
