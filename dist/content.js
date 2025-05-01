let i=!1,n=null;function a(){console.log("PromptPilot content script initializing..."),v(),f(),chrome.runtime.onMessage.addListener(c),document.addEventListener("mouseup",x),console.log("PromptPilot content script initialized")}function c(t,o,e){if(console.log("Content script received message:",t.type),t.type==="IMPROVED_TEXT_FOR_REPLACEMENT")d(t.text,e);else if(t.type==="IMPROVEMENT_ERROR")m(t.error,e);else if(t.type==="GET_SELECTED_TEXT"){const r=p();e({text:r})}return!0}function d(t,o){try{if(console.log("Received improved text for replacement"),!t){s("Received empty text from server","error"),l(),i=!1,o({status:"error"});return}u(t),E(),chrome.storage.session.set({lastImprovedText:t},()=>{console.log("Saved improved text to session storage")}),o({status:"text_updated"})}catch(e){console.error("Error handling improved text:",e),s("Failed to update text with improvements","error"),l(),i=!1,o({status:"error"})}}function m(t,o){console.error("Received improvement error:",t),s(t||"Error improving text","error"),l(),i=!1,o({status:"error_displayed"})}function u(t){const o=window.getSelection();if(o&&!o.isCollapsed){const e=o.getRangeAt(0);e.deleteContents(),e.insertNode(document.createTextNode(t));return}if(n)if(n.tagName==="TEXTAREA"||n.tagName==="INPUT"){const e=n;e.value=t,e.dispatchEvent(new Event("input",{bubbles:!0}))}else n.getAttribute("contenteditable")==="true"&&(n.innerText=t,n.dispatchEvent(new InputEvent("input",{bubbles:!0})));else console.warn("No target element found to insert improved text"),s("Please select text or click in a text field before improving","error")}function f(){const t=document.createElement("button");t.id="promptpilot-button",t.className="promptpilot-button",t.innerHTML='<span class="promptpilot-icon">✏️</span> Improve Text',t.addEventListener("click",g),document.body.appendChild(t),console.log("PromptPilot button added to page")}function g(){if(i){console.log("Improvement already in progress");return}const t=p();if(!t){s("Please select text or click in a text field first","error");return}console.log("Improving text:",t.substring(0,50)+(t.length>50?"...":"")),i=!0,b(),chrome.storage.session.set({lastCapturedText:t},()=>{console.log("Saved text to session storage")}),chrome.runtime.sendMessage({type:"IMPROVE_AND_REPLACE",text:t},o=>{chrome.runtime.lastError&&(console.error("Error sending improvement request:",chrome.runtime.lastError),s("Failed to communicate with extension. Please try again.","error"),l(),i=!1)})}function p(){const t=window.getSelection();if(t&&t.toString().trim()!=="")return t.toString().trim();const o=document.activeElement;if(o){if(o.tagName==="TEXTAREA"||o.tagName==="INPUT"){n=o;const e=o;return e.selectionStart!==void 0&&e.selectionEnd!==void 0&&e.selectionStart!==null&&e.selectionEnd!==null&&e.selectionStart!==e.selectionEnd?e.value.substring(e.selectionStart,e.selectionEnd).trim():e.value.trim()}else if(o.getAttribute("contenteditable")==="true")return n=o,t&&t.toString().trim()!==""?t.toString().trim():o.innerText.trim()}return""}function x(t){var e;const o=window.getSelection();if(o&&o.toString().trim()!==""){const r=(e=o.anchorNode)==null?void 0:e.parentElement;r&&(r.tagName==="TEXTAREA"||r.tagName==="INPUT"||r.getAttribute("contenteditable")==="true")&&(n=r)}}function b(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button loading",t.innerHTML='<span class="promptpilot-loader"></span> Improving...')}function l(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button",t.innerHTML='<span class="promptpilot-icon">✏️</span> Improve Text')}function E(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button success",t.innerHTML='<span class="promptpilot-icon">✓</span> Improved!',s("Text successfully improved!","success"),setTimeout(()=>{l(),i=!1},2e3))}function s(t,o){const e=document.createElement("div");e.className=`promptpilot-notification ${o}`,e.textContent=t,document.body.appendChild(e),setTimeout(()=>{e.parentNode&&document.body.removeChild(e)},4e3)}function v(){const t=document.createElement("style");t.textContent=`
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
  `,document.head.appendChild(t)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",a):a();
