import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

type PopupState = {
  originalPrompt: string;
  improvedPrompt: string;
  isLoading: boolean;
  error: string | null;
  isCopied: boolean;
  selectedIntent: string;
  isDropdownOpen: boolean;
  // Usage tracking state
  usageCount: number;
  monthlyLimit: number;
  subscriptionStatus: "free" | "premium" | "lifetime";
  remainingImprovements: number;
  isLoadingUsage: boolean;
  showUpgradePrompt: boolean;
  nextResetDate: Date | null;
};

const INTENT_CATEGORIES = [
  "Academic",
  "Professional",
  "Creative",
  "Technical",
  "Personal",
];

const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    originalPrompt: "",
    improvedPrompt: "",
    isLoading: false,
    error: null,
    isCopied: false,
    selectedIntent: "",
    isDropdownOpen: false,
    // Usage tracking initial state
    usageCount: 0,
    monthlyLimit: 20,
    subscriptionStatus: "free",
    remainingImprovements: 20,
    isLoadingUsage: true,
    showUpgradePrompt: false,
    nextResetDate: null,
  });

  // Load usage data from background script
  const loadUsageData = async () => {
    try {
      // Get user settings
      const settingsResponse = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_USER_SETTINGS" }, resolve);
      });

      // Get remaining improvements
      const remainingResponse = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "GET_REMAINING_IMPROVEMENTS" },
          resolve
        );
      });

      if (
        settingsResponse?.status === "success" &&
        remainingResponse?.status === "success"
      ) {
        const settings = settingsResponse.data;
        const remaining = remainingResponse.data;

        // Calculate next reset date (first day of next month)
        const now = new Date();
        const nextResetDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        );

        setState((prev) => ({
          ...prev,
          usageCount: settings.usageCount,
          monthlyLimit: settings.monthlyLimit,
          subscriptionStatus: settings.subscriptionStatus,
          remainingImprovements: remaining,
          isLoadingUsage: false,
          nextResetDate,
        }));

        // Show upgrade prompt if user is close to limit
        if (settings.subscriptionStatus === "free" && remaining <= 4) {
          setState((prev) => ({ ...prev, showUpgradePrompt: true }));
        }
      }
    } catch (error) {
      console.error("Error loading usage data:", error);
      setState((prev) => ({ ...prev, isLoadingUsage: false }));
    }
  };

  useEffect(() => {
    // Load usage data on popup open
    loadUsageData();

    // Listen for messages from the background script
    const messageListener = (message: any) => {
      console.log("Popup received message:", message.type, message);

      if (message.type === "CAPTURED_TEXT") {
        console.log("Setting original prompt to:", message.text);
        setState((prev) => ({ ...prev, originalPrompt: message.text }));
      } else if (message.type === "IMPROVED_TEXT") {
        console.log("Setting improved prompt to:", message.text);
        setState((prev) => ({
          ...prev,
          improvedPrompt: message.text,
          isLoading: false,
        }));
        // Reload usage data after successful improvement
        loadUsageData();
      } else if (message.type === "ERROR") {
        console.error("Received error message:", message.error);
        setState((prev) => ({
          ...prev,
          error: message.error,
          isLoading: false,
        }));
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Log the initial state
    console.log("Popup initialized with state:", state);

    // Try to load captured text and the last improved prompt from session storage
    try {
      chrome.storage.session.get(
        ["lastCapturedText", "lastImprovedText"],
        (result) => {
          // Update state with original text if available
          if (
            result.lastCapturedText &&
            typeof result.lastCapturedText === "string"
          ) {
            console.log(
              "Loaded text from session storage:",
              result.lastCapturedText
            );
            setState((prev) => ({
              ...prev,
              originalPrompt: result.lastCapturedText,
            }));
          } else {
            console.log("No captured text found in session storage");
          }

          // Also check if we have an improved version already
          if (
            result.lastImprovedText &&
            typeof result.lastImprovedText === "string"
          ) {
            console.log(
              "Loaded improved text from session storage:",
              result.lastImprovedText
            );
            setState((prev) => ({
              ...prev,
              improvedPrompt: result.lastImprovedText,
              isLoading: false,
            }));
          }
        }
      );
    } catch (e) {
      console.error("Error accessing session storage:", e);
    }

    // Function to get text from active tab
    const getTextFromActiveTab = () => {
      if (chrome.tabs && chrome.tabs.query) {
        try {
          console.log("Querying active tab to request text");
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0]?.id) {
              console.log(
                "Active tab found, sending GET_SELECTED_TEXT message"
              );
              try {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { type: "GET_SELECTED_TEXT" },
                  (response) => {
                    // Handle response gracefully
                    const lastError = chrome.runtime.lastError;
                    if (lastError) {
                      console.log(
                        "Content script not ready:",
                        lastError.message
                      );
                    } else if (response && response.text) {
                      console.log(
                        "Received text from content script:",
                        response.text.substring(0, 50) + "..."
                      );
                      if (response.text.trim()) {
                        setState((prev) => ({
                          ...prev,
                          originalPrompt: response.text,
                        }));
                        // Also save to session storage
                        chrome.storage.session.set({
                          lastCapturedText: response.text,
                        });
                      }
                    }
                  }
                );
              } catch (err) {
                console.error("Error sending message to tab:", err);
              }
            } else {
              console.warn("No active tab found or tab has no ID");
            }
          });
        } catch (err) {
          console.error("Error querying tabs:", err);
        }
      } else {
        console.warn("Chrome tabs API not available");
      }
    };

    // Try immediately and then again after a short delay to ensure content script is ready
    getTextFromActiveTab();

    const timeoutId = setTimeout(() => {
      getTextFromActiveTab();
    }, 500);

    // Cleanup listener on unmount
    return () => {
      console.log("Cleaning up popup event listeners");
      chrome.runtime.onMessage.removeListener(messageListener);
      clearTimeout(timeoutId);
    };
  }, []);

  // Reset the "Copied" status after 2 seconds
  useEffect(() => {
    if (state.isCopied) {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, isCopied: false }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.isCopied]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (state.isDropdownOpen && !target.closest(".dropdown-container")) {
        setState((prev) => ({ ...prev, isDropdownOpen: false }));
      }
    };

    if (state.isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [state.isDropdownOpen]);

  const handleImprove = () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      improvedPrompt: "",
    }));
    try {
      chrome.runtime.sendMessage(
        {
          type: "IMPROVE_PROMPT",
          text: state.originalPrompt,
        },
        (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.log("Error sending improve request:", lastError.message);
            setState((prev) => ({
              ...prev,
              error:
                "Connection error. Please check if the backend is running.",
              isLoading: false,
            }));
          }
        }
      );
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: "Failed to send improve request",
        isLoading: false,
      }));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(state.improvedPrompt);
    setState((prev) => ({ ...prev, isCopied: true }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((prev) => ({ ...prev, originalPrompt: e.target.value }));
  };

  const handleDropdownToggle = () => {
    setState((prev) => ({ ...prev, isDropdownOpen: !prev.isDropdownOpen }));
  };

  const handleIntentSelect = (intent: string) => {
    setState((prev) => ({
      ...prev,
      selectedIntent: intent,
      isDropdownOpen: false,
    }));
  };

  const handleUpgradeClick = () => {
    // For demo purposes, simulate subscription upgrade
    setState((prev) => ({ ...prev, showUpgradePrompt: false }));

    // In a real app, this would open a payment flow
    console.log("Upgrade to Premium clicked - would open payment flow");

    // For testing, we can simulate upgrading to premium
    chrome.runtime.sendMessage(
      {
        type: "UPDATE_USER_SETTINGS",
        updates: { subscriptionStatus: "premium" },
      },
      () => {
        loadUsageData(); // Reload to show updated status
      }
    );
  };

  const handleDismissUpgrade = () => {
    setState((prev) => ({ ...prev, showUpgradePrompt: false }));
  };

  const renderUsageStats = () => {
    if (state.isLoadingUsage) {
      return (
        <div className="usage-stats loading">
          <div className="usage-loader">Loading usage...</div>
        </div>
      );
    }

    const usagePercentage =
      state.subscriptionStatus === "free"
        ? (state.usageCount / state.monthlyLimit) * 100
        : 0;

    const isNearLimit =
      state.subscriptionStatus === "free" && state.remainingImprovements <= 4;
    const isAtLimit =
      state.subscriptionStatus === "free" && state.remainingImprovements <= 0;

    return (
      <div
        className={`usage-stats ${isNearLimit ? "warning" : ""} ${
          isAtLimit ? "danger" : ""
        }`}
      >
        <div className="usage-header">
          <span className="usage-title">
            {state.subscriptionStatus === "free"
              ? "Free Plan"
              : state.subscriptionStatus === "premium"
              ? "Premium Plan"
              : "Lifetime Plan"}
          </span>
          {state.subscriptionStatus !== "free" && (
            <span className="unlimited-badge">Unlimited</span>
          )}
        </div>

        {state.subscriptionStatus === "free" && (
          <>
            <div className="usage-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
              <div className="usage-text">
                {state.usageCount} / {state.monthlyLimit} improvements used
              </div>
            </div>

            <div className="remaining-count">
              <span
                className={`remaining-number ${isNearLimit ? "warning" : ""}`}
              >
                {state.remainingImprovements}
              </span>
              <span className="remaining-label">improvements remaining</span>
            </div>

            {state.nextResetDate && (
              <div className="reset-date">
                <span className="reset-label">Resets on:</span>
                <span className="reset-value">
                  {state.nextResetDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </>
        )}

        {state.subscriptionStatus === "free" && (
          <div className="upgrade-section">
            <button className="upgrade-button" onClick={handleUpgradeClick}>
              ⭐ Upgrade to Premium
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderUpgradePrompt = () => {
    if (!state.showUpgradePrompt) return null;

    return (
      <div className="upgrade-prompt">
        <div className="upgrade-content">
          <div className="upgrade-icon">⚠️</div>
          <div className="upgrade-message">
            <strong>Running low on improvements!</strong>
            <p>
              You have {state.remainingImprovements} improvements left this
              month.
            </p>
          </div>
          <div className="upgrade-actions">
            <button className="upgrade-now-button" onClick={handleUpgradeClick}>
              Upgrade Now
            </button>
            <button className="dismiss-button" onClick={handleDismissUpgrade}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderErrorMessage = () => {
    if (!state.error) return null;

    // Handle specific error types
    if (
      state.error.includes("API rate limit") ||
      state.error.includes("quota exceeded")
    ) {
      return (
        <div className="error-message">
          <p style={{ color: "red" }}>{state.error}</p>
          <p style={{ fontSize: "12px" }}>
            Please check your OpenAI API key and quota.
          </p>
        </div>
      );
    }

    if (
      state.error.includes("backend") ||
      state.error.includes("Connection error")
    ) {
      return (
        <div className="error-message">
          <p style={{ color: "red" }}>{state.error}</p>
          <p style={{ fontSize: "12px" }}>
            Make sure the backend server is running at http://localhost:4000
          </p>
        </div>
      );
    }

    // Default error message
    return (
      <div className="error-message" style={{ color: "red" }}>
        {state.error}
      </div>
    );
  };

  return (
    <div className="container">
      <h2>PromptPilot</h2>
      <p className="subtitle">AI-powered prompt improvement tool</p>

      {renderUpgradePrompt()}
      {renderUsageStats()}

      <div>
        <div className="label">Original Prompt</div>
        <textarea
          value={state.originalPrompt}
          onChange={handleTextChange}
          placeholder="Your original prompt text will appear here"
          disabled={state.isLoading}
        />
      </div>

      <div className="intent-selection">
        <div className="intent-selector-container">
          <button
            className={`intent-icon-button ${
              state.selectedIntent ? "selected" : ""
            }`}
            onClick={handleDropdownToggle}
            type="button"
            title={
              state.selectedIntent
                ? `Intent: ${state.selectedIntent}`
                : "Select intent category"
            }
          >
            <span className="intent-icon">🎯</span>
            {state.selectedIntent && <span className="intent-indicator"></span>}
          </button>
          {state.isDropdownOpen && (
            <div className="intent-dropdown">
              <div className="intent-dropdown-header">Select Intent</div>
              <ul className="intent-dropdown-menu">
                {INTENT_CATEGORIES.map((category) => (
                  <li
                    key={category}
                    className="intent-dropdown-item"
                    onClick={() => handleIntentSelect(category)}
                  >
                    {category}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="button-row">
        <button
          onClick={handleImprove}
          disabled={state.isLoading || !state.originalPrompt}
          className={`improve-button ${state.isLoading ? "loading" : ""}`}
        >
          <span className="improve-icon">{state.isLoading ? "" : "⚡"}</span>
          {state.isLoading ? "Improving..." : "Improve Prompt"}
          {state.isLoading && <span className="loader"></span>}
        </button>
      </div>

      {renderErrorMessage()}

      {state.improvedPrompt && (
        <>
          <div>
            <div className="label">Improved Prompt</div>
            <textarea
              value={state.improvedPrompt}
              readOnly
              className="improved-textarea"
            />
          </div>
          <div className="button-row">
            <button
              onClick={handleCopy}
              className={state.isCopied ? "copied-button" : ""}
            >
              {state.isCopied ? "✓ Copied!" : "📋 Copy to Clipboard"}
            </button>
          </div>
        </>
      )}

      <div className="footer">
        <p>Powered by OpenAI</p>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
