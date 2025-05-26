let f=!1,c=null,S="",g=!1,b=!1,h=!1,L=0,N=0,I=0,C=0,m=0,u=0,l="default";const D=["Academic","Professional","Creative","Technical","Personal"],d={openai:{name:"OpenAI",selectors:["textarea[data-id]",'textarea[placeholder*="message"]','div[contenteditable="true"]',"#prompt-textarea"],waitForLoad:1e3},anthropic:{name:"Anthropic",selectors:['div[contenteditable="true"]',"textarea",'div[role="textbox"]'],waitForLoad:1500},google:{name:"Google",selectors:['textarea[aria-label*="message"]','div[contenteditable="true"]','textarea[placeholder*="Enter a prompt"]'],waitForLoad:2e3},grok:{name:"Grok",selectors:['div[contenteditable="true"]','textarea[placeholder*="Ask Grok"]','div[role="textbox"]','textarea[data-testid*="compose"]'],waitForLoad:2e3},deepseek:{name:"DeepSeek",selectors:['textarea[placeholder*="Send a message"]','div[contenteditable="true"]','textarea[class*="input"]'],waitForLoad:1500},mistral:{name:"Mistral",selectors:['textarea[placeholder*="Type a message"]','div[contenteditable="true"]','textarea[class*="chat"]'],waitForLoad:1500},perplexity:{name:"Perplexity",selectors:['textarea[placeholder*="Ask anything"]','div[contenteditable="true"]'],waitForLoad:1e3},huggingface:{name:"Hugging Face",selectors:['textarea[placeholder*="Type a message"]','div[contenteditable="true"]'],waitForLoad:1500},default:{name:"Generic",selectors:["textarea",'input[type="text"]','div[contenteditable="true"]','div[role="textbox"]'],waitForLoad:500}};function k(){console.log("PromptPilot content script initializing..."),z(),J();const t=d[l]||d.default;setTimeout(()=>{_(),P()},t.waitForLoad),chrome.runtime.onMessage.addListener(H),document.addEventListener("mouseup",j),document.addEventListener("mousedown",E),document.addEventListener("focusin",E),O(),console.log(`PromptPilot content script initialized for platform: ${l}`)}function z(){const t=window.location.hostname.toLowerCase();t.includes("openai.com")||t.includes("chatgpt.com")?l="openai":t.includes("anthropic.com")||t.includes("claude.ai")?l="anthropic":t.includes("google.com")||t.includes("bard.google.com")||t.includes("gemini.google.com")?l="google":t.includes("grok.com")||t.includes("x.ai")?l="grok":t.includes("deepseek.com")||t.includes("deepseek.ai")?l="deepseek":t.includes("mistral.ai")?l="mistral":t.includes("perplexity.ai")?l="perplexity":t.includes("huggingface.co")?l="huggingface":l="default",console.log(`Detected platform: ${l} (${t})`)}function P(){(d[l]||d.default).selectors.forEach(e=>{try{document.querySelectorAll(e).forEach(n=>{n.hasAttribute("data-promptpilot-tracked")||(n.setAttribute("data-promptpilot-tracked","true"),n.addEventListener("focus",E),n.addEventListener("click",E))})}catch(o){console.warn(`Failed to setup handler for selector ${e}:`,o)}})}function O(){new MutationObserver(e=>{let o=!1;e.forEach(n=>{n.type==="childList"&&n.addedNodes.length>0&&n.addedNodes.forEach(r=>{if(r.nodeType===Node.ELEMENT_NODE){const i=r;i.matches&&(i.matches("textarea")||i.matches('input[type="text"]')||i.matches('div[contenteditable="true"]')||i.matches('div[role="textbox"]'))&&(o=!0),i.querySelector&&(i.querySelector("textarea")||i.querySelector('input[type="text"]')||i.querySelector('div[contenteditable="true"]')||i.querySelector('div[role="textbox"]'))&&(o=!0)}})}),o&&setTimeout(P,500)}).observe(document.body,{childList:!0,subtree:!0})}function H(t,e,o){if(console.log("Content script received message:",t.type),t.type==="IMPROVED_TEXT_FOR_REPLACEMENT")F(t.text,o);else if(t.type==="IMPROVEMENT_ERROR")q(t.error,o);else if(t.type==="GET_SELECTED_TEXT"){const n=M();console.log("GET_SELECTED_TEXT request received, returning:",n.substring(0,50)+(n.length>50?"...":"")),o({text:n})}return!0}function F(t,e){try{if(console.log("Received improved text for replacement"),!t){x("Received empty text from server","error"),v(),f=!1,e({status:"error"});return}X(t),V(),chrome.storage.session.set({lastImprovedText:t},()=>{console.log("Saved improved text to session storage")}),e({status:"text_updated"})}catch(o){console.error("Error handling improved text:",o),x("Failed to update text with improvements","error"),v(),f=!1,e({status:"error"})}}function q(t,e){console.error("Received improvement error:",t),x(t||"Error improving text","error"),v(),f=!1,e({status:"error_displayed"})}function X(t){var n;const e=window.getSelection();if(e&&!e.isCollapsed){const r=e.getRangeAt(0);r.deleteContents(),r.insertNode(document.createTextNode(t));const i=(n=e.anchorNode)==null?void 0:n.parentElement;i&&T(i);return}const o=document.activeElement;o&&w(o,t)||c&&w(c,t)||$(t)||(console.warn("No target element found to insert improved text"),x("Please select text or click in a text field before improving","error"))}function w(t,e){if(!t)return!1;try{if(t.tagName==="TEXTAREA"||t.tagName==="INPUT"){const o=t,n=o.selectionStart||0,r=o.selectionEnd||0;if(n!==r){const i=o.value;o.value=i.substring(0,n)+e+i.substring(r),o.setSelectionRange(n+e.length,n+e.length)}else o.value=e,o.setSelectionRange(e.length,e.length);return T(o),!0}else if(t.getAttribute("contenteditable")==="true"){const o=window.getSelection();if(t.focus(),o&&!o.isCollapsed&&o.anchorNode&&t.contains(o.anchorNode)){const n=o.getRangeAt(0);n.deleteContents(),n.insertNode(document.createTextNode(e))}else t.textContent=e;return T(t),!0}}catch(o){console.warn("Error inserting text into element:",o)}return!1}function $(t){const e=d[l]||d.default;for(const o of e.selectors)try{const n=document.querySelectorAll(o);for(const r of n){const i=r;if(B(i)&&w(i,t))return c=i,!0}}catch(n){console.warn(`Error with platform-specific insertion for selector ${o}:`,n)}return!1}function T(t){if(t)try{if([new Event("input",{bubbles:!0}),new Event("change",{bubbles:!0}),new InputEvent("input",{bubbles:!0,inputType:"insertText"}),new Event("blur",{bubbles:!0}),new Event("focus",{bubbles:!0})].forEach(o=>{try{t.dispatchEvent(o)}catch{}}),l==="openai"||l==="anthropic"){const o=Object.getOwnPropertyDescriptor(t,"value")||Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")||Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value");o&&o.set&&o.set.call(t,t.value)}}catch(e){console.warn("Error triggering input events:",e)}}function _(){const t=document.createElement("div");t.id="promptpilot-container",t.className="promptpilot-container",nt(t);const e=document.createElement("button");e.id="promptpilot-main-button",e.className="promptpilot-main-button",e.innerHTML='<span class="promptpilot-main-icon">✏️</span>',e.title="PromptPilot - Click to expand",e.addEventListener("click",W);const o=document.createElement("div");o.className="promptpilot-drag-handle",o.title="Drag to move widget",o.innerHTML='<span class="promptpilot-drag-dots">⋮⋮</span>',o.addEventListener("mousedown",tt),document.addEventListener("mousemove",et),document.addEventListener("mouseup",ot),e.appendChild(o);const n=document.createElement("div");n.id="promptpilot-expanded",n.className="promptpilot-expanded";const r=document.createElement("button");r.className="promptpilot-intent-button",r.innerHTML='<span class="promptpilot-intent-icon">🎯</span>',r.title="Select intent category",r.addEventListener("click",A);const i=document.createElement("div");i.className="promptpilot-intent-dropdown";const a=document.createElement("ul");a.className="promptpilot-intent-list",D.forEach(p=>{const y=document.createElement("li");y.className="promptpilot-intent-item",y.textContent=p,y.addEventListener("click",()=>Q(p)),a.appendChild(y)}),i.appendChild(a);const s=document.createElement("button");s.id="promptpilot-improve-button",s.className="promptpilot-improve-button",s.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',s.title="Improve selected text",s.addEventListener("click",G),n.appendChild(r),n.appendChild(i),n.appendChild(s),t.appendChild(e),t.appendChild(n),document.body.appendChild(t),document.addEventListener("click",Z),window.addEventListener("resize",it),console.log("PromptPilot minimalistic widget added to page")}function W(t){if(h)return;t.stopPropagation(),b=!b;const e=document.getElementById("promptpilot-expanded"),o=document.getElementById("promptpilot-main-button");e&&o&&(b?(e.classList.add("expanded"),o.classList.add("expanded")):(e.classList.remove("expanded"),o.classList.remove("expanded"),g&&A(t)))}function A(t){t.stopPropagation(),g=!g;const e=document.querySelector(".promptpilot-intent-dropdown"),o=document.querySelector(".promptpilot-intent-button");e&&o&&(g?(e.classList.add("open"),o.classList.add("active")):(e.classList.remove("open"),o.classList.remove("active")))}function G(){if(f){console.log("Improvement already in progress");return}const t=M();if(!t){x("No text found. Please click or focus on a text field.","error");return}console.log("Improving text:",t.substring(0,50)+(t.length>50?"...":"")),f=!0,U(),chrome.storage.session.set({lastCapturedText:t},()=>{console.log("Saved text to session storage")}),chrome.runtime.sendMessage({type:"IMPROVE_AND_REPLACE",text:t,intent:S||"General"},e=>{chrome.runtime.lastError&&(console.error("Error sending improvement request:",chrome.runtime.lastError),x("Failed to communicate with extension. Please try again.","error"),v(),f=!1)})}function M(){var n,r;const t=window.getSelection();if(t&&t.toString().trim()!=="")return t.toString().trim();const e=document.activeElement;if(e){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){c=e;const i=e;return i.selectionStart!==void 0&&i.selectionEnd!==void 0&&i.selectionStart!==null&&i.selectionEnd!==null&&i.selectionStart!==i.selectionEnd?i.value.substring(i.selectionStart,i.selectionEnd).trim():i.value.trim()}else if(e.getAttribute("contenteditable")==="true")return c=e,t&&t.toString().trim()!==""?t.toString().trim():((n=e.textContent)==null?void 0:n.trim())||""}const o=Y();if(o)return o;if(c){if(c.tagName==="TEXTAREA"||c.tagName==="INPUT")return c.value.trim();if(c.getAttribute("contenteditable")==="true")return((r=c.textContent)==null?void 0:r.trim())||""}return""}function Y(){var e,o;const t=d[l]||d.default;for(const n of t.selectors)try{const r=document.querySelectorAll(n);for(const i of r){const a=i;if(B(a)&&(a===document.activeElement||a===c)){if(c=a,a.tagName==="TEXTAREA"||a.tagName==="INPUT"){const s=a;if(s.value.trim())return s.value.trim()}else if(a.getAttribute("contenteditable")==="true"){const s=((e=a.textContent)==null?void 0:e.trim())||((o=a.innerText)==null?void 0:o.trim())||"";if(s)return s}}}}catch(r){console.warn(`Error with selector ${n}:`,r)}return""}function B(t){if(!t)return!1;const e=window.getComputedStyle(t);if(e.display==="none"||e.visibility==="hidden"||e.opacity==="0")return!1;const o=t.getBoundingClientRect();return!(o.width===0||o.height===0)}function j(t){var o;const e=window.getSelection();if(e&&e.toString().trim()!==""){const n=(o=e.anchorNode)==null?void 0:o.parentElement;n&&(n.tagName==="TEXTAREA"||n.tagName==="INPUT"||n.getAttribute("contenteditable")==="true")&&(c=n)}}function U(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button loading",t.innerHTML='<span class="promptpilot-loader"></span>',t.title="Improving text...")}function v(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button",t.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',t.title="Improve selected text")}function V(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button success",t.innerHTML='<span class="promptpilot-improve-icon">✓</span>',t.title="Text improved successfully!",x("Text successfully improved!","success"),setTimeout(()=>{v(),f=!1},2e3))}function x(t,e){const o=document.createElement("div");o.className=`promptpilot-notification ${e}`,o.textContent=t,document.body.appendChild(o),setTimeout(()=>{o.parentNode&&document.body.removeChild(o)},4e3)}function J(){const t=document.createElement("style");t.textContent=`
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
      box-shadow: 0 8px 20px rgba(66, 133, 244, 0.4);
    }
    
    .promptpilot-main-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(66, 133, 244, 0.4);
    }
    
    /* Drag handle in corner */
    .promptpilot-drag-handle {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 16px;
      height: 16px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s ease;
      z-index: 2147483648;
    }
    
    .promptpilot-main-button:hover .promptpilot-drag-handle {
      opacity: 1;
      transform: scale(1);
    }
    
    .promptpilot-drag-handle:hover {
      background: rgba(255, 255, 255, 1);
      transform: scale(1.1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    
    .promptpilot-drag-handle:active,
    .promptpilot-container.dragging .promptpilot-drag-handle {
      cursor: grabbing;
      background: rgba(255, 255, 255, 1);
      transform: scale(1.1);
    }
    
    .promptpilot-drag-dots {
      font-size: 8px;
      color: #666;
      line-height: 1;
      transform: rotate(90deg);
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
  `,document.head.appendChild(t)}function E(t){const e=t.target;if(!e)return;if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"||e.getAttribute("contenteditable")==="true"){console.log(`Tracking text element: ${e.tagName} (${l})`),c=e;return}const o=d[l]||d.default;for(const a of o.selectors)try{if(e.matches&&e.matches(a)){console.log(`Tracking platform-specific element: ${a} (${l})`),c=e;return}}catch{}let n=e.parentElement,r=0;const i=5;for(;n&&r<i;){if(n.tagName==="TEXTAREA"||n.tagName==="INPUT"||n.getAttribute("contenteditable")==="true"){console.log(`Tracking parent text element: ${n.tagName} (${l})`),c=n;return}for(const a of o.selectors)try{if(n.matches&&n.matches(a)){console.log(`Tracking platform-specific parent: ${a} (${l})`),c=n;return}}catch{}n=n.parentElement,r++}K(e)}function K(t){var e,o,n;switch(l){case"openai":if(t.closest("form")||t.closest('[data-testid*="composer"]')){const i=((e=t.closest("form"))==null?void 0:e.querySelector("textarea"))||((o=t.closest('[data-testid*="composer"]'))==null?void 0:o.querySelector("textarea"));i&&(c=i,console.log("Tracking OpenAI textarea via form/composer"))}break;case"anthropic":if(t.closest('[data-testid*="chat"]')||t.closest(".ProseMirror")){const i=t.closest('[contenteditable="true"]')||t.closest(".ProseMirror");i&&(c=i,console.log("Tracking Anthropic contenteditable via chat container"))}break;case"google":if(t.closest('[data-test-id*="input"]')||t.closest('[role="textbox"]')){const i=t.closest('[role="textbox"]')||t.closest("textarea");i&&(c=i,console.log("Tracking Google textbox via role or test-id"))}break;case"grok":if(t.closest('[data-testid*="compose"]')||t.closest('[role="textbox"]')){const i=t.closest('[role="textbox"]')||t.closest('[contenteditable="true"]');i&&(c=i,console.log("Tracking Grok compose element"))}break;case"deepseek":case"mistral":if(t.closest('[class*="chat"]')||t.closest('[class*="input"]')){const i=t.closest("textarea")||t.closest('[contenteditable="true"]');i&&(c=i,console.log(`Tracking ${l} chat input`))}break;default:const r=((n=t.closest("form"))==null?void 0:n.querySelector('textarea, input[type="text"], [contenteditable="true"]'))||document.querySelector('textarea:focus, input[type="text"]:focus, [contenteditable="true"]:focus');r&&(c=r,console.log("Tracking nearby text input for unknown platform"));break}}function Q(t){S=t,g=!1;const e=document.querySelector(".promptpilot-intent-dropdown"),o=document.querySelector(".promptpilot-intent-button");e&&e.classList.remove("open"),o&&(o.classList.remove("active"),o.innerHTML='<span class="promptpilot-intent-icon">🎯</span><span class="promptpilot-intent-indicator"></span>',o.title=`Intent: ${t}`),console.log("Selected intent:",t)}function Z(t){const e=t.target,o=document.getElementById("promptpilot-container");if(o&&!o.contains(e)){if(b){b=!1;const n=document.getElementById("promptpilot-expanded"),r=document.getElementById("promptpilot-main-button");n&&n.classList.remove("expanded"),r&&r.classList.remove("expanded")}if(g){g=!1;const n=document.querySelector(".promptpilot-intent-dropdown"),r=document.querySelector(".promptpilot-intent-button");n&&n.classList.remove("open"),r&&r.classList.remove("active")}}}function tt(t){t.preventDefault(),t.stopPropagation();const e=document.getElementById("promptpilot-container");if(!e)return;const o=e.getBoundingClientRect();I=o.left,C=o.top,L=t.clientX,N=t.clientY,h=!0,e.classList.add("dragging")}function et(t){if(!h)return;t.preventDefault();const e=document.getElementById("promptpilot-container");if(!e)return;m=I+(t.clientX-L),u=C+(t.clientY-N);const o=window.innerWidth,n=window.innerHeight,r=48,i=48;m=Math.max(0,Math.min(m,o-r)),u=Math.max(0,Math.min(u,n-i)),e.style.left=m+"px",e.style.top=u+"px",e.style.right="auto",e.style.bottom="auto"}function ot(t){if(!h)return;const e=document.getElementById("promptpilot-container");e&&(e.classList.remove("dragging"),R(m,u)),h=!1}function R(t,e){try{const o={x:t,y:e};localStorage.setItem("promptpilot-widget-position",JSON.stringify(o))}catch(o){console.warn("Failed to save widget position:",o)}}function nt(t){try{const e=localStorage.getItem("promptpilot-widget-position");if(e){const o=JSON.parse(e),n=window.innerWidth,r=window.innerHeight,i=48,a=48,s=Math.max(0,Math.min(o.x,n-i)),p=Math.max(0,Math.min(o.y,r-a));t.style.left=s+"px",t.style.top=p+"px",t.style.right="auto",t.style.bottom="auto",m=s,u=p}}catch(e){console.warn("Failed to restore widget position:",e)}}function it(){const t=document.getElementById("promptpilot-container");if(!t||!(t.style.left||t.style.top))return;const o=window.innerWidth,n=window.innerHeight,r=48,i=48,a=t.getBoundingClientRect();let s=a.left,p=a.top;s=Math.max(0,Math.min(s,o-r)),p=Math.max(0,Math.min(p,n-i)),(s!==a.left||p!==a.top)&&(t.style.left=s+"px",t.style.top=p+"px",m=s,u=p,R(s,p))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",k):k();
