let p=!1,i=null,x="",a=!1;const w=["Academic","Professional","Creative","Technical","Personal"];function f(){console.log("PromptPilot content script initializing..."),A(),T(),chrome.runtime.onMessage.addListener(E),document.addEventListener("mouseup",N),document.addEventListener("mousedown",g),document.addEventListener("focusin",g),console.log("PromptPilot content script initialized")}function E(t,e,o){if(console.log("Content script received message:",t.type),t.type==="IMPROVED_TEXT_FOR_REPLACEMENT")y(t.text,o);else if(t.type==="IMPROVEMENT_ERROR")h(t.error,o);else if(t.type==="GET_SELECTED_TEXT"){const n=b();console.log("GET_SELECTED_TEXT request received, returning:",n.substring(0,50)+(n.length>50?"...":"")),o({text:n})}return!0}function y(t,e){try{if(console.log("Received improved text for replacement"),!t){l("Received empty text from server","error"),c(),p=!1,e({status:"error"});return}v(t),I(),chrome.storage.session.set({lastImprovedText:t},()=>{console.log("Saved improved text to session storage")}),e({status:"text_updated"})}catch(o){console.error("Error handling improved text:",o),l("Failed to update text with improvements","error"),c(),p=!1,e({status:"error"})}}function h(t,e){console.error("Received improvement error:",t),l(t||"Error improving text","error"),c(),p=!1,e({status:"error_displayed"})}function v(t){const e=window.getSelection();if(e&&!e.isCollapsed){const o=e.getRangeAt(0);o.deleteContents(),o.insertNode(document.createTextNode(t));return}if(i)if(i.tagName==="TEXTAREA"||i.tagName==="INPUT"){const o=i;o.value=t,o.dispatchEvent(new Event("input",{bubbles:!0}))}else i.getAttribute("contenteditable")==="true"&&(i.innerText=t,i.dispatchEvent(new InputEvent("input",{bubbles:!0})));else console.warn("No target element found to insert improved text"),l("Please select text or click in a text field before improving","error")}function T(){const t=document.createElement("div");t.id="promptpilot-container",t.className="promptpilot-container";const e=document.createElement("div");e.className="promptpilot-intent-selector";const o=document.createElement("div");o.className="promptpilot-intent-label",o.textContent="Intent Category";const n=document.createElement("div");n.className="promptpilot-dropdown-container";const r=document.createElement("button");r.className="promptpilot-dropdown-trigger",r.innerHTML=`
    <span class="promptpilot-dropdown-text">Select intent category</span>
    <span class="promptpilot-dropdown-arrow">▼</span>
  `;const d=document.createElement("ul");d.className="promptpilot-dropdown-menu",d.style.display="none",w.forEach(u=>{const m=document.createElement("li");m.className="promptpilot-dropdown-item",m.textContent=u,m.addEventListener("click",()=>M(u)),d.appendChild(m)}),r.addEventListener("click",k),n.appendChild(r),n.appendChild(d),e.appendChild(o),e.appendChild(n);const s=document.createElement("button");s.id="promptpilot-button",s.className="promptpilot-button",s.innerHTML='<span class="promptpilot-icon">✏️</span> Improve Text',s.addEventListener("click",S),t.appendChild(e),t.appendChild(s),document.body.appendChild(t),document.addEventListener("click",P),console.log("PromptPilot container with intent selector added to page")}function S(){if(p){console.log("Improvement already in progress");return}const t=b();if(!t){l("No text found. Please click or focus on a text field.","error");return}console.log("Improving text:",t.substring(0,50)+(t.length>50?"...":"")),p=!0,C(),chrome.storage.session.set({lastCapturedText:t},()=>{console.log("Saved text to session storage")}),chrome.runtime.sendMessage({type:"IMPROVE_AND_REPLACE",text:t,intent:x||"General"},e=>{chrome.runtime.lastError&&(console.error("Error sending improvement request:",chrome.runtime.lastError),l("Failed to communicate with extension. Please try again.","error"),c(),p=!1)})}function b(){var o,n;const t=window.getSelection();if(t&&t.toString().trim()!=="")return t.toString().trim();const e=document.activeElement;if(e){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){i=e;const r=e;return r.selectionStart!==void 0&&r.selectionEnd!==void 0&&r.selectionStart!==null&&r.selectionEnd!==null&&r.selectionStart!==r.selectionEnd?r.value.substring(r.selectionStart,r.selectionEnd).trim():r.value.trim()}else if(e.getAttribute("contenteditable")==="true")return i=e,t&&t.toString().trim()!==""?t.toString().trim():((o=e.textContent)==null?void 0:o.trim())||""}if(i){if(i.tagName==="TEXTAREA"||i.tagName==="INPUT")return i.value.trim();if(i.getAttribute("contenteditable")==="true")return((n=i.textContent)==null?void 0:n.trim())||""}return""}function N(t){var o;const e=window.getSelection();if(e&&e.toString().trim()!==""){const n=(o=e.anchorNode)==null?void 0:o.parentElement;n&&(n.tagName==="TEXTAREA"||n.tagName==="INPUT"||n.getAttribute("contenteditable")==="true")&&(i=n)}}function C(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button loading",t.innerHTML='<span class="promptpilot-loader"></span> Improving...')}function c(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button",t.innerHTML='<span class="promptpilot-icon">✏️</span> Improve Text')}function I(){const t=document.getElementById("promptpilot-button");t&&(t.className="promptpilot-button success",t.innerHTML='<span class="promptpilot-icon">✓</span> Improved!',l("Text successfully improved!","success"),setTimeout(()=>{c(),p=!1},2e3))}function l(t,e){const o=document.createElement("div");o.className=`promptpilot-notification ${e}`,o.textContent=t,document.body.appendChild(o),setTimeout(()=>{o.parentNode&&document.body.removeChild(o)},4e3)}function A(){const t=document.createElement("style");t.textContent=`
    /* Container styles */
    .promptpilot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 2147483646;
    }
    
    /* Intent selector styles */
    .promptpilot-intent-selector {
      background-color: white;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      min-width: 200px;
    }
    
    .promptpilot-intent-label {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
    }
    
    .promptpilot-dropdown-container {
      position: relative;
      width: 100%;
    }
    
    .promptpilot-dropdown-trigger {
      width: 100%;
      padding: 6px 8px;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      text-align: left;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #333;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    
    .promptpilot-dropdown-trigger:hover {
      border-color: #4285f4;
      background-color: #f8f9fa;
    }
    
    .promptpilot-dropdown-arrow {
      transition: transform 0.2s ease;
      font-size: 10px;
      color: #666;
    }
    
    .promptpilot-dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background-color: white;
      border: 1px solid #ccc;
      border-top: none;
      border-radius: 0 0 4px 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 2147483647;
      margin: 0;
      padding: 0;
      list-style: none;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .promptpilot-dropdown-item {
      padding: 6px 8px;
      cursor: pointer;
      font-size: 12px;
      color: #333;
      border-bottom: 1px solid #f0f0f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    
    .promptpilot-dropdown-item:last-child {
      border-bottom: none;
    }
    
    .promptpilot-dropdown-item:hover {
      background-color: #f8f9fa;
      color: #4285f4;
    }

    /* Button styles */
    .promptpilot-button {
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
      transition: background-color 0.2s;
      min-width: 200px;
      justify-content: center;
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
      bottom: 120px;
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
  `,document.head.appendChild(t)}function g(t){const e=t.target;e&&(e.tagName==="TEXTAREA"||e.tagName==="INPUT"||e.getAttribute("contenteditable")==="true")&&(console.log("Tracking text element:",e.tagName),i=e)}function k(t){t.stopPropagation(),a=!a;const e=document.querySelector(".promptpilot-dropdown-menu"),o=document.querySelector(".promptpilot-dropdown-arrow");e&&o&&(a?(e.style.display="block",o.style.transform="rotate(180deg)"):(e.style.display="none",o.style.transform="rotate(0deg)"))}function M(t){x=t,a=!1;const e=document.querySelector(".promptpilot-dropdown-text"),o=document.querySelector(".promptpilot-dropdown-menu"),n=document.querySelector(".promptpilot-dropdown-arrow");e&&(e.textContent=t),o&&(o.style.display="none"),n&&(n.style.transform="rotate(0deg)"),console.log("Selected intent:",t)}function P(t){const e=t.target,o=document.querySelector(".promptpilot-dropdown-container");if(a&&o&&!o.contains(e)){a=!1;const n=document.querySelector(".promptpilot-dropdown-menu"),r=document.querySelector(".promptpilot-dropdown-arrow");n&&(n.style.display="none"),r&&(r.style.transform="rotate(0deg)")}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f();
