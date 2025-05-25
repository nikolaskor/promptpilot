let p=!1,r=null,x="",a=!1,c=!1;const E=["Academic","Professional","Creative","Technical","Personal"];function g(){console.log("PromptPilot content script initializing..."),B(),I(),chrome.runtime.onMessage.addListener(y),document.addEventListener("mouseup",C),document.addEventListener("mousedown",b),document.addEventListener("focusin",b),console.log("PromptPilot content script initialized")}function y(t,e,o){if(console.log("Content script received message:",t.type),t.type==="IMPROVED_TEXT_FOR_REPLACEMENT")w(t.text,o);else if(t.type==="IMPROVEMENT_ERROR")T(t.error,o);else if(t.type==="GET_SELECTED_TEXT"){const n=h();console.log("GET_SELECTED_TEXT request received, returning:",n.substring(0,50)+(n.length>50?"...":"")),o({text:n})}return!0}function w(t,e){try{if(console.log("Received improved text for replacement"),!t){s("Received empty text from server","error"),d(),p=!1,e({status:"error"});return}N(t),P(),chrome.storage.session.set({lastImprovedText:t},()=>{console.log("Saved improved text to session storage")}),e({status:"text_updated"})}catch(o){console.error("Error handling improved text:",o),s("Failed to update text with improvements","error"),d(),p=!1,e({status:"error"})}}function T(t,e){console.error("Received improvement error:",t),s(t||"Error improving text","error"),d(),p=!1,e({status:"error_displayed"})}function N(t){const e=window.getSelection();if(e&&!e.isCollapsed){const o=e.getRangeAt(0);o.deleteContents(),o.insertNode(document.createTextNode(t));return}if(r)if(r.tagName==="TEXTAREA"||r.tagName==="INPUT"){const o=r;o.value=t,o.dispatchEvent(new Event("input",{bubbles:!0}))}else r.getAttribute("contenteditable")==="true"&&(r.innerText=t,r.dispatchEvent(new InputEvent("input",{bubbles:!0})));else console.warn("No target element found to insert improved text"),s("Please select text or click in a text field before improving","error")}function I(){const t=document.createElement("div");t.id="promptpilot-container",t.className="promptpilot-container";const e=document.createElement("button");e.id="promptpilot-main-button",e.className="promptpilot-main-button",e.innerHTML='<span class="promptpilot-main-icon">✏️</span>',e.title="PromptPilot - Click to expand",e.addEventListener("click",L);const o=document.createElement("div");o.id="promptpilot-expanded",o.className="promptpilot-expanded";const n=document.createElement("button");n.className="promptpilot-intent-button",n.innerHTML='<span class="promptpilot-intent-icon">🎯</span>',n.title="Select intent category",n.addEventListener("click",v);const i=document.createElement("div");i.className="promptpilot-intent-dropdown";const u=document.createElement("ul");u.className="promptpilot-intent-list",E.forEach(f=>{const m=document.createElement("li");m.className="promptpilot-intent-item",m.textContent=f,m.addEventListener("click",()=>A(f)),u.appendChild(m)}),i.appendChild(u);const l=document.createElement("button");l.id="promptpilot-improve-button",l.className="promptpilot-improve-button",l.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',l.title="Improve selected text",l.addEventListener("click",S),o.appendChild(n),o.appendChild(i),o.appendChild(l),t.appendChild(e),t.appendChild(o),document.body.appendChild(t),document.addEventListener("click",M),console.log("PromptPilot minimalistic widget added to page")}function L(t){t.stopPropagation(),c=!c;const e=document.getElementById("promptpilot-expanded"),o=document.getElementById("promptpilot-main-button");e&&o&&(c?(e.classList.add("expanded"),o.classList.add("expanded")):(e.classList.remove("expanded"),o.classList.remove("expanded"),a&&v(t)))}function v(t){t.stopPropagation(),a=!a;const e=document.querySelector(".promptpilot-intent-dropdown"),o=document.querySelector(".promptpilot-intent-button");e&&o&&(a?(e.classList.add("open"),o.classList.add("active")):(e.classList.remove("open"),o.classList.remove("active")))}function S(){if(p){console.log("Improvement already in progress");return}const t=h();if(!t){s("No text found. Please click or focus on a text field.","error");return}console.log("Improving text:",t.substring(0,50)+(t.length>50?"...":"")),p=!0,k(),chrome.storage.session.set({lastCapturedText:t},()=>{console.log("Saved text to session storage")}),chrome.runtime.sendMessage({type:"IMPROVE_AND_REPLACE",text:t,intent:x||"General"},e=>{chrome.runtime.lastError&&(console.error("Error sending improvement request:",chrome.runtime.lastError),s("Failed to communicate with extension. Please try again.","error"),d(),p=!1)})}function h(){var o,n;const t=window.getSelection();if(t&&t.toString().trim()!=="")return t.toString().trim();const e=document.activeElement;if(e){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){r=e;const i=e;return i.selectionStart!==void 0&&i.selectionEnd!==void 0&&i.selectionStart!==null&&i.selectionEnd!==null&&i.selectionStart!==i.selectionEnd?i.value.substring(i.selectionStart,i.selectionEnd).trim():i.value.trim()}else if(e.getAttribute("contenteditable")==="true")return r=e,t&&t.toString().trim()!==""?t.toString().trim():((o=e.textContent)==null?void 0:o.trim())||""}if(r){if(r.tagName==="TEXTAREA"||r.tagName==="INPUT")return r.value.trim();if(r.getAttribute("contenteditable")==="true")return((n=r.textContent)==null?void 0:n.trim())||""}return""}function C(t){var o;const e=window.getSelection();if(e&&e.toString().trim()!==""){const n=(o=e.anchorNode)==null?void 0:o.parentElement;n&&(n.tagName==="TEXTAREA"||n.tagName==="INPUT"||n.getAttribute("contenteditable")==="true")&&(r=n)}}function k(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button loading",t.innerHTML='<span class="promptpilot-loader"></span>',t.title="Improving text...")}function d(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button",t.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',t.title="Improve selected text")}function P(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button success",t.innerHTML='<span class="promptpilot-improve-icon">✓</span>',t.title="Text improved successfully!",s("Text successfully improved!","success"),setTimeout(()=>{d(),p=!1},2e3))}function s(t,e){const o=document.createElement("div");o.className=`promptpilot-notification ${e}`,o.textContent=t,document.body.appendChild(o),setTimeout(()=>{o.parentNode&&document.body.removeChild(o)},4e3)}function B(){const t=document.createElement("style");t.textContent=`
    /* Main container - minimalistic floating widget */
    .promptpilot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    
    /* Main toggle button - always visible circular icon */
    .promptpilot-main-button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 2147483647;
    }
    
    .promptpilot-main-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(66, 133, 244, 0.4);
    }
    
    .promptpilot-main-button.expanded {
      background: linear-gradient(135deg, #ea4335 0%, #fbbc04 100%);
      transform: rotate(45deg);
    }
    
    .promptpilot-main-icon {
      font-size: 20px;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .promptpilot-main-button.expanded .promptpilot-main-icon {
      transform: rotate(-45deg);
    }
    
    /* Expanded content container */
    .promptpilot-expanded {
      position: absolute;
      bottom: 60px;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.8);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    
    .promptpilot-expanded.expanded {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    
    /* Intent selector button */
    .promptpilot-intent-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(156, 39, 176, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      align-self: flex-end;
    }
    
    .promptpilot-intent-button:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(156, 39, 176, 0.4);
    }
    
    .promptpilot-intent-button.active {
      background: linear-gradient(135deg, #ff5722 0%, #ff9800 100%);
      transform: scale(1.1);
    }
    
    .promptpilot-intent-icon {
      font-size: 16px;
      transition: transform 0.3s ease;
    }
    
    .promptpilot-intent-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background: #4caf50;
      border-radius: 50%;
      border: 2px solid white;
      opacity: 0;
      transform: scale(0);
      transition: all 0.3s ease;
    }
    
    .promptpilot-intent-button:has(.promptpilot-intent-indicator) .promptpilot-intent-indicator {
      opacity: 1;
      transform: scale(1);
    }
    
    /* Intent dropdown */
    .promptpilot-intent-dropdown {
      position: absolute;
      bottom: 0;
      right: 50px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      opacity: 0;
      visibility: hidden;
      transform: translateX(10px) scale(0.9);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      min-width: 140px;
      overflow: hidden;
    }
    
    .promptpilot-intent-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateX(0) scale(1);
      pointer-events: auto;
    }
    
    .promptpilot-intent-list {
      margin: 0;
      padding: 8px 0;
      list-style: none;
    }
    
    .promptpilot-intent-item {
      padding: 10px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #333;
      transition: all 0.2s ease;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .promptpilot-intent-item:last-child {
      border-bottom: none;
    }
    
    .promptpilot-intent-item:hover {
      background: linear-gradient(90deg, #f8f9fa 0%, #e8f0fe 100%);
      color: #4285f4;
      transform: translateX(4px);
    }
    
    /* Improve button */
    .promptpilot-improve-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(255, 107, 53, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      align-self: flex-end;
    }
    
    .promptpilot-improve-button:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
    }
    
    .promptpilot-improve-button.loading {
      background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
      cursor: not-allowed;
      animation: promptpilot-pulse 1.5s ease-in-out infinite;
    }
    
    .promptpilot-improve-button.success {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      animation: promptpilot-success-bounce 0.6s ease;
    }
    
    .promptpilot-improve-icon {
      font-size: 16px;
      transition: transform 0.3s ease;
    }
    
    .promptpilot-loader {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: promptpilot-spin 1s linear infinite;
    }
    
    /* Animations */
    @keyframes promptpilot-spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes promptpilot-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes promptpilot-success-bounce {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    
    @keyframes promptpilot-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Notification styles */
    .promptpilot-notification {
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      max-width: 280px;
      color: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2147483647;
      animation: promptpilot-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .promptpilot-notification.success {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
    }
    
    .promptpilot-notification.error {
      background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .promptpilot-container {
        bottom: 16px;
        right: 16px;
      }
      
      .promptpilot-main-button {
        width: 44px;
        height: 44px;
      }
      
      .promptpilot-intent-button,
      .promptpilot-improve-button {
        width: 36px;
        height: 36px;
      }
      
      .promptpilot-intent-dropdown {
        min-width: 120px;
      }
      
      .promptpilot-intent-item {
        padding: 8px 12px;
        font-size: 12px;
      }
    }
  `,document.head.appendChild(t)}function b(t){const e=t.target;e&&(e.tagName==="TEXTAREA"||e.tagName==="INPUT"||e.getAttribute("contenteditable")==="true")&&(console.log("Tracking text element:",e.tagName),r=e)}function A(t){x=t,a=!1;const e=document.querySelector(".promptpilot-intent-dropdown"),o=document.querySelector(".promptpilot-intent-button");e&&e.classList.remove("open"),o&&(o.classList.remove("active"),o.innerHTML='<span class="promptpilot-intent-icon">🎯</span><span class="promptpilot-intent-indicator"></span>',o.title=`Intent: ${t}`),console.log("Selected intent:",t)}function M(t){const e=t.target,o=document.getElementById("promptpilot-container");if(o&&!o.contains(e)){if(c){c=!1;const n=document.getElementById("promptpilot-expanded"),i=document.getElementById("promptpilot-main-button");n&&n.classList.remove("expanded"),i&&i.classList.remove("expanded")}if(a){a=!1;const n=document.querySelector(".promptpilot-intent-dropdown"),i=document.querySelector(".promptpilot-intent-button");n&&n.classList.remove("open"),i&&i.classList.remove("active")}}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",g):g();
