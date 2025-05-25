let m=!1,r=null,E="",u=!1,f=!1,x=!1,w=0,y=0,T=0,I=0,c=0,d=0;const C=["Academic","Professional","Creative","Technical","Personal"];function h(){console.log("PromptPilot content script initializing..."),W(),A(),chrome.runtime.onMessage.addListener(M),document.addEventListener("mouseup",X),document.addEventListener("mousedown",v),document.addEventListener("focusin",v),console.log("PromptPilot content script initialized")}function M(t,e,n){if(console.log("Content script received message:",t.type),t.type==="IMPROVED_TEXT_FOR_REPLACEMENT")k(t.text,n);else if(t.type==="IMPROVEMENT_ERROR")B(t.error,n);else if(t.type==="GET_SELECTED_TEXT"){const o=L();console.log("GET_SELECTED_TEXT request received, returning:",o.substring(0,50)+(o.length>50?"...":"")),n({text:o})}return!0}function k(t,e){try{if(console.log("Received improved text for replacement"),!t){g("Received empty text from server","error"),b(),m=!1,e({status:"error"});return}P(t),H(),chrome.storage.session.set({lastImprovedText:t},()=>{console.log("Saved improved text to session storage")}),e({status:"text_updated"})}catch(n){console.error("Error handling improved text:",n),g("Failed to update text with improvements","error"),b(),m=!1,e({status:"error"})}}function B(t,e){console.error("Received improvement error:",t),g(t||"Error improving text","error"),b(),m=!1,e({status:"error_displayed"})}function P(t){const e=window.getSelection();if(e&&!e.isCollapsed){const n=e.getRangeAt(0);n.deleteContents(),n.insertNode(document.createTextNode(t));return}if(r)if(r.tagName==="TEXTAREA"||r.tagName==="INPUT"){const n=r;n.value=t,n.dispatchEvent(new Event("input",{bubbles:!0}))}else r.getAttribute("contenteditable")==="true"&&(r.innerText=t,r.dispatchEvent(new InputEvent("input",{bubbles:!0})));else console.warn("No target element found to insert improved text"),g("Please select text or click in a text field before improving","error")}function A(){const t=document.createElement("div");t.id="promptpilot-container",t.className="promptpilot-container",U(t);const e=document.createElement("button");e.id="promptpilot-main-button",e.className="promptpilot-main-button",e.innerHTML='<span class="promptpilot-main-icon">✏️</span>',e.title="PromptPilot - Click to expand, drag to move",e.addEventListener("click",z),e.addEventListener("mousedown",Y),document.addEventListener("mousemove",q),document.addEventListener("mouseup",F);const n=document.createElement("div");n.id="promptpilot-expanded",n.className="promptpilot-expanded";const o=document.createElement("button");o.className="promptpilot-intent-button",o.innerHTML='<span class="promptpilot-intent-icon">🎯</span>',o.title="Select intent category",o.addEventListener("click",S);const i=document.createElement("div");i.className="promptpilot-intent-dropdown";const l=document.createElement("ul");l.className="promptpilot-intent-list",C.forEach(s=>{const a=document.createElement("li");a.className="promptpilot-intent-item",a.textContent=s,a.addEventListener("click",()=>_(s)),l.appendChild(a)}),i.appendChild(l);const p=document.createElement("button");p.id="promptpilot-improve-button",p.className="promptpilot-improve-button",p.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',p.title="Improve selected text",p.addEventListener("click",R),n.appendChild(o),n.appendChild(i),n.appendChild(p),t.appendChild(e),t.appendChild(n),document.body.appendChild(t),document.addEventListener("click",O),window.addEventListener("resize",j),console.log("PromptPilot minimalistic widget added to page")}function z(t){if(x)return;t.stopPropagation(),f=!f;const e=document.getElementById("promptpilot-expanded"),n=document.getElementById("promptpilot-main-button");e&&n&&(f?(e.classList.add("expanded"),n.classList.add("expanded")):(e.classList.remove("expanded"),n.classList.remove("expanded"),u&&S(t)))}function S(t){t.stopPropagation(),u=!u;const e=document.querySelector(".promptpilot-intent-dropdown"),n=document.querySelector(".promptpilot-intent-button");e&&n&&(u?(e.classList.add("open"),n.classList.add("active")):(e.classList.remove("open"),n.classList.remove("active")))}function R(){if(m){console.log("Improvement already in progress");return}const t=L();if(!t){g("No text found. Please click or focus on a text field.","error");return}console.log("Improving text:",t.substring(0,50)+(t.length>50?"...":"")),m=!0,D(),chrome.storage.session.set({lastCapturedText:t},()=>{console.log("Saved text to session storage")}),chrome.runtime.sendMessage({type:"IMPROVE_AND_REPLACE",text:t,intent:E||"General"},e=>{chrome.runtime.lastError&&(console.error("Error sending improvement request:",chrome.runtime.lastError),g("Failed to communicate with extension. Please try again.","error"),b(),m=!1)})}function L(){var n,o;const t=window.getSelection();if(t&&t.toString().trim()!=="")return t.toString().trim();const e=document.activeElement;if(e){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){r=e;const i=e;return i.selectionStart!==void 0&&i.selectionEnd!==void 0&&i.selectionStart!==null&&i.selectionEnd!==null&&i.selectionStart!==i.selectionEnd?i.value.substring(i.selectionStart,i.selectionEnd).trim():i.value.trim()}else if(e.getAttribute("contenteditable")==="true")return r=e,t&&t.toString().trim()!==""?t.toString().trim():((n=e.textContent)==null?void 0:n.trim())||""}if(r){if(r.tagName==="TEXTAREA"||r.tagName==="INPUT")return r.value.trim();if(r.getAttribute("contenteditable")==="true")return((o=r.textContent)==null?void 0:o.trim())||""}return""}function X(t){var n;const e=window.getSelection();if(e&&e.toString().trim()!==""){const o=(n=e.anchorNode)==null?void 0:n.parentElement;o&&(o.tagName==="TEXTAREA"||o.tagName==="INPUT"||o.getAttribute("contenteditable")==="true")&&(r=o)}}function D(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button loading",t.innerHTML='<span class="promptpilot-loader"></span>',t.title="Improving text...")}function b(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button",t.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',t.title="Improve selected text")}function H(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button success",t.innerHTML='<span class="promptpilot-improve-icon">✓</span>',t.title="Text improved successfully!",g("Text successfully improved!","success"),setTimeout(()=>{b(),m=!1},2e3))}function g(t,e){const n=document.createElement("div");n.className=`promptpilot-notification ${e}`,n.textContent=t,document.body.appendChild(n),setTimeout(()=>{n.parentNode&&document.body.removeChild(n)},4e3)}function W(){const t=document.createElement("style");t.textContent=`
    /* Main container - minimalistic floating widget */
    .promptpilot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      transition: transform 0.2s ease;
    }
    
    .promptpilot-container.dragging {
      transform: scale(1.05);
      z-index: 2147483647;
      transition: none;
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
      user-select: none;
    }
    
    .promptpilot-container.dragging .promptpilot-main-button {
      cursor: grabbing;
      box-shadow: 0 8px 20px rgba(66, 133, 244, 0.4);
    }
    
    .promptpilot-main-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(66, 133, 244, 0.4);
      cursor: grab;
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
  `,document.head.appendChild(t)}function v(t){const e=t.target;e&&(e.tagName==="TEXTAREA"||e.tagName==="INPUT"||e.getAttribute("contenteditable")==="true")&&(console.log("Tracking text element:",e.tagName),r=e)}function _(t){E=t,u=!1;const e=document.querySelector(".promptpilot-intent-dropdown"),n=document.querySelector(".promptpilot-intent-button");e&&e.classList.remove("open"),n&&(n.classList.remove("active"),n.innerHTML='<span class="promptpilot-intent-icon">🎯</span><span class="promptpilot-intent-indicator"></span>',n.title=`Intent: ${t}`),console.log("Selected intent:",t)}function O(t){const e=t.target,n=document.getElementById("promptpilot-container");if(n&&!n.contains(e)){if(f){f=!1;const o=document.getElementById("promptpilot-expanded"),i=document.getElementById("promptpilot-main-button");o&&o.classList.remove("expanded"),i&&i.classList.remove("expanded")}if(u){u=!1;const o=document.querySelector(".promptpilot-intent-dropdown"),i=document.querySelector(".promptpilot-intent-button");o&&o.classList.remove("open"),i&&i.classList.remove("active")}}}function Y(t){t.preventDefault();const e=document.getElementById("promptpilot-container");if(!e)return;const n=e.getBoundingClientRect();T=n.left,I=n.top,w=t.clientX,y=t.clientY,setTimeout(()=>{t.buttons===1&&(x=!0,e.classList.add("dragging"))},100)}function q(t){if(!x)return;t.preventDefault();const e=document.getElementById("promptpilot-container");if(!e)return;c=T+(t.clientX-w),d=I+(t.clientY-y);const n=window.innerWidth,o=window.innerHeight,i=48,l=48;c=Math.max(0,Math.min(c,n-i)),d=Math.max(0,Math.min(d,o-l)),e.style.left=c+"px",e.style.top=d+"px",e.style.right="auto",e.style.bottom="auto"}function F(t){if(!x)return;const e=document.getElementById("promptpilot-container");e&&(e.classList.remove("dragging"),N(c,d)),setTimeout(()=>{x=!1},50)}function N(t,e){try{const n={x:t,y:e};localStorage.setItem("promptpilot-widget-position",JSON.stringify(n))}catch(n){console.warn("Failed to save widget position:",n)}}function U(t){try{const e=localStorage.getItem("promptpilot-widget-position");if(e){const n=JSON.parse(e),o=window.innerWidth,i=window.innerHeight,l=48,p=48,s=Math.max(0,Math.min(n.x,o-l)),a=Math.max(0,Math.min(n.y,i-p));t.style.left=s+"px",t.style.top=a+"px",t.style.right="auto",t.style.bottom="auto",c=s,d=a}}catch(e){console.warn("Failed to restore widget position:",e)}}function j(){const t=document.getElementById("promptpilot-container");if(!t||!(t.style.left||t.style.top))return;const n=window.innerWidth,o=window.innerHeight,i=48,l=48,p=t.getBoundingClientRect();let s=p.left,a=p.top;s=Math.max(0,Math.min(s,n-i)),a=Math.max(0,Math.min(a,o-l)),(s!==p.left||a!==p.top)&&(t.style.left=s+"px",t.style.top=a+"px",c=s,d=a,N(s,a))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",h):h();
