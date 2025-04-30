import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

type PopupState = {
  originalPrompt: string;
  improvedPrompt: string;
  isLoading: boolean;
  error: string | null;
};

const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    originalPrompt: "",
    improvedPrompt: "",
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Listen for messages from the background script
    const messageListener = (message: any) => {
      if (message.type === "CAPTURED_TEXT") {
        setState((prev) => ({ ...prev, originalPrompt: message.text }));
      } else if (message.type === "IMPROVED_TEXT") {
        setState((prev) => ({
          ...prev,
          improvedPrompt: message.text,
          isLoading: false,
        }));
      } else if (message.type === "ERROR") {
        setState((prev) => ({
          ...prev,
          error: message.error,
          isLoading: false,
        }));
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Delay the initial tab query to ensure extension is ready
    const timeoutId = setTimeout(() => {
      // Request the current prompt from the content script
      // but only if Chrome APIs are ready
      if (chrome.tabs && chrome.tabs.query) {
        try {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0]?.id) {
              // Only send message if tab exists
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
                    }
                  }
                );
              } catch (err) {
                console.log("Error sending message to tab:", err);
              }
            }
          });
        } catch (err) {
          console.log("Error querying tabs:", err);
        }
      }
    }, 300); // Short delay to allow extension to initialize

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleImprove = () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
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
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((prev) => ({ ...prev, originalPrompt: e.target.value }));
  };

  return (
    <div className="container">
      <h2>PromptPilot</h2>

      <div>
        <div className="label">Original Prompt</div>
        <textarea
          value={state.originalPrompt}
          onChange={handleTextChange}
          placeholder="Your original prompt text will appear here"
        />
      </div>

      <div className="button-row">
        <button
          onClick={handleImprove}
          disabled={state.isLoading || !state.originalPrompt}
        >
          {state.isLoading ? "Improving..." : "✏️ Improve Prompt"}
        </button>
      </div>

      {state.error && <div style={{ color: "red" }}>{state.error}</div>}

      {state.improvedPrompt && (
        <>
          <div>
            <div className="label">Improved Prompt</div>
            <textarea value={state.improvedPrompt} readOnly />
          </div>
          <div className="button-row">
            <button onClick={handleCopy}>📋 Copy to Clipboard</button>
          </div>
        </>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
