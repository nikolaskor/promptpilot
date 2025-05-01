import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

type PopupState = {
  originalPrompt: string;
  improvedPrompt: string;
  isLoading: boolean;
  error: string | null;
  isCopied: boolean;
};

const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    originalPrompt: "",
    improvedPrompt: "",
    isLoading: false,
    error: null,
    isCopied: false,
  });

  useEffect(() => {
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

    // Delay the initial tab query to ensure extension is ready
    const timeoutId = setTimeout(() => {
      // Request the current prompt from the content script
      // but only if Chrome APIs are ready
      if (chrome.tabs && chrome.tabs.query) {
        try {
          console.log("Querying active tab to request text");
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0]?.id) {
              // Only send message if tab exists
              console.log(
                "Active tab found, sending GET_SELECTED_TEXT message"
              );
              try {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { type: "GET_SELECTED_TEXT" },
                  // Add response callback
                  (response) => {
                    // Handle no response or error gracefully
                    const lastError = chrome.runtime.lastError;
                    if (lastError) {
                      console.log(
                        "Content script not ready:",
                        lastError.message
                      );
                      // Don't show this error to user as it's common when tab isn't ready
                    } else if (response) {
                      console.log(
                        "Received response from content script:",
                        response
                      );
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
    }, 300); // Short delay to allow extension to initialize

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

      <div>
        <div className="label">Original Prompt</div>
        <textarea
          value={state.originalPrompt}
          onChange={handleTextChange}
          placeholder="Your original prompt text will appear here"
          disabled={state.isLoading}
        />
      </div>

      <div className="button-row">
        <button
          onClick={handleImprove}
          disabled={state.isLoading || !state.originalPrompt}
          className={state.isLoading ? "loading-button" : ""}
        >
          {state.isLoading ? "Improving..." : "✏️ Improve Prompt"}
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

// Add some additional CSS for better UI
const style = document.createElement("style");
style.textContent = `
  .subtitle {
    margin-top: -10px;
    color: #666;
    font-size: 14px;
  }
  
  .loading-button {
    position: relative;
    background-color: #9aa0a6 !important;
  }
  
  .loader {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-left: 8px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .copied-button {
    background-color: #34A853 !important;
  }
  
  .improved-textarea {
    border: 1px solid #4285f4;
    background-color: #f8f9fa;
  }
  
  .error-message {
    margin: 8px 0;
    padding: 8px;
    border-radius: 4px;
    background-color: #fef7f7;
    border-left: 3px solid #ea4335;
  }
  
  .footer {
    margin-top: 16px;
    font-size: 12px;
    color: #666;
    text-align: center;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
