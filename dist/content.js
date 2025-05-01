let s=!1,n=null;function c(){console.log("PromptPilot content script initializing..."),h(),x(),chrome.runtime.onMessage.addListener(m),document.addEventListener("mouseup",E),document.addEventListener("mousedown",p),document.addEventListener("focusin",p),console.log("PromptPilot content script initialized")}function m(t,e,o){if(console.log("Content script received message:",t.type),t.type==="IMPROVED_TEXT_FOR_REPLACEMENT")u(t.text,o);else if(t.type==="IMPROVEMENT_ERROR")g(t.error,o);else if(t.type==="GET_SELECTED_TEXT"){const r=d();console.log("GET_SELECTED_TEXT request received, returning:",r.substring(0,50)+(r.length>50?"...":"")),o({text:r})}return!0}function u(t,e){try{if(console.log("Received improved text for replacement"),!t){a("Received empty text from server","error"),l(),s=!1,e({status:"error"});return}f(t),T(),chrome.storage.session.set({lastImprovedText:t},()=>{console.log("Saved improved text to session storage")}),e({status:"text_updated"})}catch(o){console.error("Error handling improved text:",o),a("Failed to update text with improvements","error"),l(),s=!1,e({status:"error"})}}function g(t,e){console.error("Received improvement error:",t),a(t||"Error improving text","error"),l(),s=!1,e({status:"error_displayed"})}function f(t){const e=window.getSelection();if(e&&!e.isCollapsed){const o=e.getRangeAt(0);o.deleteContents(),o.insertNode(document.createTextNode(t));return}if(n)if(n.tagName==="TEXTAREA"||n.tagName==="INPUT"){const o=n;o.value=t,o.dispatchEvent(new Event("input",{bubbles:!0}))}else n.getAttribute("contenteditable")==="true"&&(n.innerText=t,n.dispatchEvent(new InputEvent("input",{bubbles:!0})));else console.warn("No target element found to insert improved text"),a("Please select text or click in a text field before improving","error")}function x(){const t=document.createElement("button");t.id="promptpilot-button",t.className="promptpilot-button",t.innerHTML='<span class="promptpilot-icon">✏️</span> Improve Text',t.addEventListener("click",b),document.body.appendChild(t),console.log("PromptPilot button added to page")}function b(){if(s){console.log("Improvement already in progress");return}const t=d();if(!t){a("No text found. Please click or focus on a text field.","error");return}console.log("Improving text:",t.substring(0,50)+(t.length>50?"...":"")),s=!0,v(),chrome.storage.session.set({lastCapturedText:t},()=>{console.log("Saved text to session storage")}),chrome.runtime.sendMessage({type:"IMPROVE_AND_REPLACE",text:t},e=>{chrome.runtime.lastError&&(console.error("Error sending improvement request:",chrome.runtime.lastError),a("Failed to communicate with extension. Please try again.","error"),l(),s=!1)})}function d(){var o,r;const t=window.getSelection();if(t&&t.toString().trim()!=="")return t.toString().trim();const e=document.activeElement;if(e){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){n=e;const i=e;return i.selectionStart!==void 0&&i.selectionEnd!==void 0&&i.selectionStart!==null&&i.selectionEnd!==null&&i.selectionStart!==i.selectionEnd?i.value.substring(i.selectionStart,i.selectionEnd).trim():i.value.trim()}else if(e.getAttribute("contenteditable")==="true")return n=e,t&&t.toString().trim()!==""?t.toString().trim():((o=e.textContent)==null?void 0:o.trim())||""}if(n){if(n.tagName==="TEXTAREA"||n.tagName==="INPUT")return n.value.trim();if(n.getAttribute("contenteditable")==="true")return((r=n.textContent)==null?void 0:r.trim())||""}return""}function E(t){var o;const e=window.getSelection();if(e&&e.toString().trim()!==""){const r=(o=e.anchorNode)==null?void 0:o.parentElement;r&&(r.tagName==="TEXTAREA"||r.tagName==="INPUT"||r.getAttribute("contenteditable")==="true")&&(n=r)}}function v(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button loading",t.innerHTML='<span class="promptpilot-loader"></span> Improving...')}function l(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button",t.innerHTML='<span class="promptpilot-icon">✏️</span> Improve Text')}function T(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button success",t.innerHTML='<span class="promptpilot-icon">✓</span> Improved!',a("Text successfully improved!","success"),setTimeout(()=>{l(),s=!1},2e3))}function a(t,e){const o=document.createElement("div");o.className=`promptpilot-notification ${e}`,o.textContent=t,document.body.appendChild(o),setTimeout(()=>{o.parentNode&&document.body.removeChild(o)},4e3)}function h(){const t=document.createElement("style");t.textContent=`
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
  `,document.head.appendChild(t)}function p(t){const e=t.target;e&&(e.tagName==="TEXTAREA"||e.tagName==="INPUT"||e.getAttribute("contenteditable")==="true")&&(console.log("Tracking text element:",e.tagName),n=e)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c();
