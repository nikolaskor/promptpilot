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
    chrome.runtime.onMessage.addListener((message) => {
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
    });

    // Request the current prompt from the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "GET_SELECTED_TEXT" });
      }
    });
  }, []);

  const handleImprove = () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    chrome.runtime.sendMessage({
      type: "IMPROVE_PROMPT",
      text: state.originalPrompt,
    });
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
