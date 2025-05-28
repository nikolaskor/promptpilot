let m=!1,l=null,C="",b=!1,y=!1,v=!1,L=0,I=0,M=0,_=0,g=0,h=0,s="default";const H=["Academic","Professional","Creative","Technical","Personal"],u={openai:{name:"OpenAI",selectors:["textarea[data-id]",'textarea[placeholder*="message"]','div[contenteditable="true"]',"#prompt-textarea"],waitForLoad:1e3},anthropic:{name:"Anthropic",selectors:['div[contenteditable="true"]',"textarea",'div[role="textbox"]'],waitForLoad:1500},google:{name:"Google",selectors:['textarea[aria-label*="message"]','div[contenteditable="true"]','textarea[placeholder*="Enter a prompt"]'],waitForLoad:2e3},grok:{name:"Grok",selectors:['div[contenteditable="true"]','textarea[placeholder*="Ask Grok"]','div[role="textbox"]','textarea[data-testid*="compose"]'],waitForLoad:2e3},deepseek:{name:"DeepSeek",selectors:['textarea[placeholder*="Send a message"]','div[contenteditable="true"]','textarea[class*="input"]'],waitForLoad:1500},mistral:{name:"Mistral",selectors:['textarea[placeholder*="Type a message"]','div[contenteditable="true"]','textarea[class*="chat"]'],waitForLoad:1500},perplexity:{name:"Perplexity",selectors:['textarea[placeholder*="Ask anything"]','div[contenteditable="true"]'],waitForLoad:1e3},huggingface:{name:"Hugging Face",selectors:['textarea[placeholder*="Type a message"]','div[contenteditable="true"]'],waitForLoad:1500},default:{name:"Generic",selectors:["textarea",'input[type="text"]','div[contenteditable="true"]','div[role="textbox"]'],waitForLoad:500}};function A(){try{console.log("PromptPilot content script initializing..."),X(),ct();const t=u[s]||u.default;setTimeout(()=>{try{K(),R()}catch(e){console.error("Error during delayed initialization:",e)}},t.waitForLoad),chrome.runtime.onMessage.addListener(q),document.addEventListener("mouseup",et),document.addEventListener("mousedown",T),document.addEventListener("focusin",T),F(),console.log(`PromptPilot content script initialized for platform: ${s}`),at(),s!=="default"&&setTimeout(()=>{try{st("platform-detected")}catch(e){console.error("Error showing contextual help:",e)}},5e3)}catch(t){console.error("Error during PromptPilot initialization:",t)}}function X(){const t=window.location.hostname.toLowerCase();t.includes("openai.com")||t.includes("chatgpt.com")?s="openai":t.includes("anthropic.com")||t.includes("claude.ai")?s="anthropic":t.includes("google.com")||t.includes("bard.google.com")||t.includes("gemini.google.com")?s="google":t.includes("grok.com")||t.includes("x.ai")?s="grok":t.includes("deepseek.com")||t.includes("deepseek.ai")?s="deepseek":t.includes("mistral.ai")?s="mistral":t.includes("perplexity.ai")?s="perplexity":t.includes("huggingface.co")?s="huggingface":s="default",console.log(`Detected platform: ${s} (${t})`)}function R(){(u[s]||u.default).selectors.forEach(e=>{try{document.querySelectorAll(e).forEach(n=>{n.hasAttribute("data-promptpilot-tracked")||(n.setAttribute("data-promptpilot-tracked","true"),n.addEventListener("focus",T),n.addEventListener("click",T))})}catch(o){console.warn(`Failed to setup handler for selector ${e}:`,o)}})}function F(){new MutationObserver(e=>{let o=!1;e.forEach(n=>{n.type==="childList"&&n.addedNodes.length>0&&n.addedNodes.forEach(r=>{if(r.nodeType===Node.ELEMENT_NODE){const i=r;i.matches&&(i.matches("textarea")||i.matches('input[type="text"]')||i.matches('div[contenteditable="true"]')||i.matches('div[role="textbox"]'))&&(o=!0),i.querySelector&&(i.querySelector("textarea")||i.querySelector('input[type="text"]')||i.querySelector('div[contenteditable="true"]')||i.querySelector('div[role="textbox"]'))&&(o=!0)}})}),o&&setTimeout(R,500)}).observe(document.body,{childList:!0,subtree:!0})}function q(t,e,o){if(console.log("Content script received message:",t.type),t.type==="IMPROVED_TEXT_FOR_REPLACEMENT")$(t.text,o);else if(t.type==="IMPROVEMENT_ERROR")W(t.error,o);else if(t.type==="USAGE_LIMIT_REACHED")Y(t,o);else if(t.type==="USAGE_WARNING")j(t,o);else if(t.type==="GET_SELECTED_TEXT"){const n=B();console.log("GET_SELECTED_TEXT request received, returning:",n.substring(0,50)+(n.length>50?"...":"")),o({text:n})}return!0}function $(t,e){try{if(console.log("Received improved text for replacement"),!t){p({message:"No improvement suggestions received. Please try again with different text.",type:"warning",icon:"🤔",duration:6e3,dismissible:!0,actionText:"Try Again",actionCallback:()=>{k()}}),f(),m=!1,e({status:"error"});return}Q(t),nt(),chrome.storage.session.set({lastImprovedText:t},()=>{console.log("Saved improved text to session storage")}),e({status:"text_updated"})}catch(o){console.error("Error handling improved text:",o),p({message:"Failed to insert improved text. You can copy it from the popup instead.",type:"error",icon:"📋",duration:8e3,dismissible:!0,actionText:"Open Popup",actionCallback:()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"})}}),f(),m=!1,e({status:"error"})}}function W(t,e){console.error("Received improvement error:",t);let o=t||"Error improving text",n,r;t.includes("API key")||t.includes("authentication")?(o="API authentication failed. Please check your settings.",n="Open Settings",r=()=>{chrome.runtime.sendMessage({type:"OPEN_OPTIONS_PAGE"})}):t.includes("network")||t.includes("connection")?(o="Network error. Please check your internet connection and try again.",n="Retry",r=()=>{k()}):(t.includes("rate limit")||t.includes("quota"))&&(o="API rate limit reached. Please wait a moment and try again.",n="Learn More",r=()=>{chrome.runtime.sendMessage({type:"OPEN_HELP_PAGE"})}),p({message:o,type:"error",icon:"❌",duration:8e3,dismissible:!0,actionText:n,actionCallback:r}),f(),m=!1,e({status:"error_displayed"})}function Y(t,e){console.log("Usage limit reached:",t);const{remaining:o,limit:n,subscriptionStatus:r}=t;let i=`You've reached your monthly limit of ${n} improvements.`;p(r==="free"?{message:i,type:"error",icon:"🚫",duration:8e3,dismissible:!0,actionText:"Upgrade Now",actionCallback:()=>{chrome.runtime.sendMessage({type:"OPEN_UPGRADE_PAGE"})}}:{message:i+" Please contact support if this seems incorrect.",type:"error",icon:"⚠️",duration:6e3,dismissible:!0}),f(),m=!1,e({status:"limit_displayed"})}function j(t,e){console.log("Usage warning:",t);const{remaining:o,limit:n,subscriptionStatus:r}=t;r==="free"&&(o===1?p({message:"Last improvement remaining! Your usage resets on the 1st of next month.",type:"warning",icon:"🚨",duration:8e3,dismissible:!0,actionText:"Upgrade Now",actionCallback:()=>{chrome.runtime.sendMessage({type:"OPEN_UPGRADE_PAGE"})}}):o===4&&p({message:`${o} improvements left this month. Upgrade for unlimited access!`,type:"warning",icon:"⚠️",duration:6e3,dismissible:!0,actionText:"Learn More",actionCallback:()=>{chrome.runtime.sendMessage({type:"OPEN_UPGRADE_PAGE"})}})),e({status:"warning_displayed"})}function V(){chrome.runtime.sendMessage({type:"GET_REMAINING_IMPROVEMENTS"},t=>{if((t==null?void 0:t.status)==="success"){const e=t.data;e===4?p({message:`${e} improvements left this month. Upgrade for unlimited access!`,type:"warning",icon:"⚠️",duration:6e3,dismissible:!0,actionText:"Learn More",actionCallback:()=>{chrome.runtime.sendMessage({type:"OPEN_UPGRADE_PAGE"})}}):e===1&&p({message:"Last improvement remaining! Your usage resets on the 1st of next month.",type:"warning",icon:"🚨",duration:8e3,dismissible:!0,actionText:"Upgrade Now",actionCallback:()=>{chrome.runtime.sendMessage({type:"OPEN_UPGRADE_PAGE"})}})}})}function Q(t){var n;const e=window.getSelection();if(e&&!e.isCollapsed){const r=e.getRangeAt(0);r.deleteContents(),r.insertNode(document.createTextNode(t));const i=(n=e.anchorNode)==null?void 0:n.parentElement;i&&P(i);return}const o=document.activeElement;o&&N(o,t)||l&&N(l,t)||J(t)||(console.warn("No target element found to insert improved text"),p({message:"Please select text or click in a text field before improving",type:"error",icon:"❌",duration:5e3,dismissible:!0}))}function N(t,e){if(!t)return!1;try{if(t.tagName==="TEXTAREA"||t.tagName==="INPUT"){const o=t,n=o.selectionStart||0,r=o.selectionEnd||0;if(n!==r){const i=o.value;o.value=i.substring(0,n)+e+i.substring(r);try{o.setSelectionRange(n+e.length,n+e.length)}catch(a){console.warn("Error setting selection range:",a)}}else{o.value=e;try{o.setSelectionRange(e.length,e.length)}catch(i){console.warn("Error setting selection range:",i)}}return P(o),!0}else if(t.getAttribute("contenteditable")==="true"){const o=window.getSelection();if(t.focus(),o&&!o.isCollapsed&&o.anchorNode&&t.contains(o.anchorNode)){const n=o.getRangeAt(0);n.deleteContents(),n.insertNode(document.createTextNode(e))}else t.textContent=e;return P(t),!0}}catch(o){console.warn("Error inserting text into element:",o)}return!1}function J(t){const e=u[s]||u.default;for(const o of e.selectors)try{const n=document.querySelectorAll(o);for(const r of n){const i=r;if(D(i)&&N(i,t))return l=i,!0}}catch(n){console.warn(`Error with platform-specific insertion for selector ${o}:`,n)}return!1}function P(t){if(t)try{if([new Event("input",{bubbles:!0}),new Event("change",{bubbles:!0}),new InputEvent("input",{bubbles:!0,inputType:"insertText"}),new Event("blur",{bubbles:!0}),new Event("focus",{bubbles:!0})].forEach(o=>{try{t.dispatchEvent(o)}catch{}}),s==="openai"||s==="anthropic")try{if(t.tagName==="TEXTAREA"||t.tagName==="INPUT"){const o=t;let n;if(t.tagName==="TEXTAREA"?n=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value"):n=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value"),n||(n=Object.getOwnPropertyDescriptor(t,"value")),n&&n.set&&typeof n.set=="function"){const r=o.value;n.set.call(t,r)}}}catch(o){console.warn("Error triggering React descriptor events:",o)}}catch(e){console.warn("Error triggering input events:",e)}}function K(){const t=document.createElement("div");t.id="promptpilot-container",t.className="promptpilot-container",gt(t);const e=document.createElement("button");e.id="promptpilot-main-button",e.className="promptpilot-main-button",e.innerHTML='<span class="promptpilot-main-icon">✏️</span>',e.title="PromptPilot - Click to expand",e.addEventListener("click",Z);const o=document.createElement("div");o.className="promptpilot-drag-handle",o.title="Drag to move widget",o.innerHTML='<span class="promptpilot-drag-dots">⋮⋮</span>',o.addEventListener("mousedown",mt),document.addEventListener("mousemove",ut),document.addEventListener("mouseup",ft),e.appendChild(o);const n=document.createElement("div");n.id="promptpilot-expanded",n.className="promptpilot-expanded";const r=document.createElement("button");r.className="promptpilot-intent-button",r.innerHTML='<span class="promptpilot-intent-icon">🎯</span>',r.title="Select intent category",r.addEventListener("click",O);const i=document.createElement("div");i.className="promptpilot-intent-dropdown";const a=document.createElement("ul");a.className="promptpilot-intent-list",H.forEach(d=>{const E=document.createElement("li");E.className="promptpilot-intent-item",E.textContent=d,E.addEventListener("click",()=>pt(d)),a.appendChild(E)}),i.appendChild(a);const c=document.createElement("button");c.id="promptpilot-improve-button",c.className="promptpilot-improve-button",c.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',c.title="Improve selected text",c.addEventListener("click",k),n.appendChild(r),n.appendChild(i),n.appendChild(c),t.appendChild(e),t.appendChild(n),document.body.appendChild(t),document.addEventListener("click",dt),window.addEventListener("resize",ht),console.log("PromptPilot minimalistic widget added to page")}function Z(t){if(v)return;t.stopPropagation(),y=!y;const e=document.getElementById("promptpilot-expanded"),o=document.getElementById("promptpilot-main-button");e&&o&&(y?(e.classList.add("expanded"),o.classList.add("expanded")):(e.classList.remove("expanded"),o.classList.remove("expanded"),b&&O(t)))}function O(t){t.stopPropagation(),b=!b;const e=document.querySelector(".promptpilot-intent-dropdown"),o=document.querySelector(".promptpilot-intent-button");e&&o&&(b?(e.classList.add("open"),o.classList.add("active")):(e.classList.remove("open"),o.classList.remove("active")))}function k(){if(m){console.log("Improvement already in progress");return}const t=B();if(!t){p({message:"No text found. Please click or focus on a text field first.",type:"warning",icon:"⚠️",duration:5e3,dismissible:!0,actionText:"Help",actionCallback:()=>{chrome.runtime.sendMessage({type:"OPEN_HELP_PAGE"})}});return}console.log("Improving text:",t.substring(0,50)+(t.length>50?"...":"")),m=!0,ot(),chrome.storage.session.set({lastCapturedText:t},()=>{console.log("Saved text to session storage")}),chrome.runtime.sendMessage({type:"IMPROVE_AND_REPLACE",text:t,intent:C||"General",platform:s},e=>{chrome.runtime.lastError?(console.error("Error sending improvement request:",chrome.runtime.lastError),p({message:"Extension communication failed. Please refresh the page and try again.",type:"error",icon:"🔄",duration:8e3,dismissible:!0,actionText:"Refresh Page",actionCallback:()=>{window.location.reload()}}),f(),m=!1):(console.log("Background script response:",e),e&&e.status==="processing"?(console.log("Background script is processing the request"),setTimeout(()=>{m&&(console.warn("Improvement timeout - resetting state"),p({message:"Request timed out. Please try again.",type:"warning",icon:"⏰",duration:6e3,dismissible:!0,actionText:"Try Again",actionCallback:()=>{k()}}),f(),m=!1)},3e4)):e&&e.status==="limit_reached"?(console.log("Usage limit reached"),f(),m=!1):e&&e.status==="error"?(console.error("Background script returned error:",e.error),p({message:e.error||"Failed to improve prompt. Please try again.",type:"error",icon:"❌",duration:8e3,dismissible:!0}),f(),m=!1):console.log("Unexpected response from background script:",e))})}function B(){var n,r;const t=window.getSelection();if(t&&t.toString().trim()!=="")return t.toString().trim();const e=document.activeElement;if(e){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){l=e;const i=e;return i.selectionStart!==void 0&&i.selectionEnd!==void 0&&i.selectionStart!==null&&i.selectionEnd!==null&&i.selectionStart!==i.selectionEnd?i.value.substring(i.selectionStart,i.selectionEnd).trim():i.value.trim()}else if(e.getAttribute("contenteditable")==="true")return l=e,t&&t.toString().trim()!==""?t.toString().trim():((n=e.textContent)==null?void 0:n.trim())||""}const o=tt();if(o)return o;if(l){if(l.tagName==="TEXTAREA"||l.tagName==="INPUT")return l.value.trim();if(l.getAttribute("contenteditable")==="true")return((r=l.textContent)==null?void 0:r.trim())||""}return""}function tt(){var e,o;const t=u[s]||u.default;for(const n of t.selectors)try{const r=document.querySelectorAll(n);for(const i of r){const a=i;if(D(a)&&(a===document.activeElement||a===l)){if(l=a,a.tagName==="TEXTAREA"||a.tagName==="INPUT"){const c=a;if(c.value.trim())return c.value.trim()}else if(a.getAttribute("contenteditable")==="true"){const c=((e=a.textContent)==null?void 0:e.trim())||((o=a.innerText)==null?void 0:o.trim())||"";if(c)return c}}}}catch(r){console.warn(`Error with selector ${n}:`,r)}return""}function D(t){if(!t)return!1;const e=window.getComputedStyle(t);if(e.display==="none"||e.visibility==="hidden"||e.opacity==="0")return!1;const o=t.getBoundingClientRect();return!(o.width===0||o.height===0)}function et(t){var o;const e=window.getSelection();if(e&&e.toString().trim()!==""){const n=(o=e.anchorNode)==null?void 0:o.parentElement;n&&(n.tagName==="TEXTAREA"||n.tagName==="INPUT"||n.getAttribute("contenteditable")==="true")&&(l=n)}}function ot(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button loading",t.innerHTML='<span class="promptpilot-loader"></span>',t.title="Improving text...")}function f(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button",t.innerHTML='<span class="promptpilot-improve-icon">⚡</span>',t.title="Improve selected text")}function nt(){const t=document.getElementById("promptpilot-improve-button");t&&(t.className="promptpilot-improve-button success",t.innerHTML='<span class="promptpilot-improve-icon">✓</span>',t.title="Text improved successfully!",p({message:"Text successfully improved!",type:"success",icon:"✅",duration:3e3,dismissible:!1}),V(),setTimeout(()=>{f(),m=!1},2e3))}let S=[],x=[];const U=3;function it(){if(S.length===0||x.length>=U)return;const t=S.shift();if(t){const e=z(t);x.push(e);const o=t.duration??4e3;o>0&&setTimeout(()=>{w(e)},o)}}function z(t){const e=document.createElement("div");e.className=`promptpilot-notification ${t.type}`;const o=document.createElement("div");if(o.className="promptpilot-notification-content",t.icon){const r=document.createElement("div");r.className="promptpilot-notification-icon",r.textContent=t.icon,o.appendChild(r)}const n=document.createElement("div");if(n.className="promptpilot-notification-message",n.textContent=t.message,o.appendChild(n),e.appendChild(o),t.actionText&&t.actionCallback){const r=document.createElement("button");r.className="promptpilot-notification-action",r.textContent=t.actionText,r.onclick=i=>{i.stopPropagation(),t.actionCallback(),w(e)},e.appendChild(r)}if(t.dismissible){const r=document.createElement("button");r.className="promptpilot-notification-close",r.innerHTML="×",r.onclick=i=>{i.stopPropagation(),w(e)},e.appendChild(r)}return document.body.appendChild(e),e}function w(t){rt(t);const e=x.indexOf(t);e>-1&&(x.splice(e,1),setTimeout(it,100))}function p(t,e){let o;if(typeof t=="string"?o={message:t,type:e||"info",duration:4e3,dismissible:!1}:o={duration:4e3,dismissible:!1,...t},x.length>=U)return S.push(o),null;const n=z(o);x.push(n);const r=o.duration??4e3;return r>0&&setTimeout(()=>{w(n)},r),n}function rt(t){t.parentNode&&(t.style.animation="promptpilot-fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",setTimeout(()=>{t.parentNode&&document.body.removeChild(t)},300))}function at(){chrome.storage.local.get(["promptpilot_onboarding_shown"],t=>{t.promptpilot_onboarding_shown||setTimeout(()=>{p({message:"Welcome to PromptPilot! Click the floating button to improve any text on this page.",type:"info",icon:"👋",duration:1e4,dismissible:!0,actionText:"Got it!",actionCallback:()=>{chrome.storage.local.set({promptpilot_onboarding_shown:!0})}})},2e3)})}function st(t){const o={"no-text-selected":{message:"💡 Tip: Select text or click in a text field, then use PromptPilot to improve it!",duration:6e3},"first-improvement":{message:"🎯 Pro tip: Use the intent selector (target icon) to get more specific improvements!",duration:8e3},"platform-detected":{message:`✨ PromptPilot is optimized for ${(u[s]||u.default).name}. Start improving your prompts!`,duration:5e3}}[t];o&&p({message:o.message,type:"info",icon:"💡",duration:o.duration,dismissible:!0})}function ct(){const t=document.createElement("style");t.textContent=`
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
    
    /* Enhanced Notification styles */
    .promptpilot-notification {
      position: fixed;
      bottom: 80px;
      right: 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      max-width: 320px;
      min-width: 280px;
      color: white;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
      animation: promptpilot-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0;
      overflow: hidden;
    }
    
    .promptpilot-notification-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      flex: 1;
    }
    
    .promptpilot-notification-icon {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 1px;
    }
    
    .promptpilot-notification-message {
      flex: 1;
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .promptpilot-notification-action {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin: 0 16px 12px 16px;
      align-self: flex-start;
    }
    
    .promptpilot-notification-action:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }
    
    .promptpilot-notification-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      line-height: 1;
    }
    
    .promptpilot-notification-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    .promptpilot-notification.success {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
    }
    
    .promptpilot-notification.error {
      background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
    }
    
    .promptpilot-notification.warning {
      background: linear-gradient(135deg, #ff9800 0%, #ffb300 100%);
    }
    
    .promptpilot-notification.info {
      background: linear-gradient(135deg, #2196f3 0%, #03a9f4 100%);
    }
    
    /* Notification animations */
    @keyframes promptpilot-fade-in {
      from {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    
    @keyframes promptpilot-fade-out {
      from {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
      }
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
  `,document.head.appendChild(t)}function T(t){const e=t.target;if(!e)return;if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"||e.getAttribute("contenteditable")==="true"){console.log(`Tracking text element: ${e.tagName} (${s})`),l=e;return}const o=u[s]||u.default;for(const a of o.selectors)try{if(e.matches&&e.matches(a)){console.log(`Tracking platform-specific element: ${a} (${s})`),l=e;return}}catch{}let n=e.parentElement,r=0;const i=5;for(;n&&r<i;){if(n.tagName==="TEXTAREA"||n.tagName==="INPUT"||n.getAttribute("contenteditable")==="true"){console.log(`Tracking parent text element: ${n.tagName} (${s})`),l=n;return}for(const a of o.selectors)try{if(n.matches&&n.matches(a)){console.log(`Tracking platform-specific parent: ${a} (${s})`),l=n;return}}catch{}n=n.parentElement,r++}lt(e)}function lt(t){var e,o,n;switch(s){case"openai":if(t.closest("form")||t.closest('[data-testid*="composer"]')){const i=((e=t.closest("form"))==null?void 0:e.querySelector("textarea"))||((o=t.closest('[data-testid*="composer"]'))==null?void 0:o.querySelector("textarea"));i&&(l=i,console.log("Tracking OpenAI textarea via form/composer"))}break;case"anthropic":if(t.closest('[data-testid*="chat"]')||t.closest(".ProseMirror")){const i=t.closest('[contenteditable="true"]')||t.closest(".ProseMirror");i&&(l=i,console.log("Tracking Anthropic contenteditable via chat container"))}break;case"google":if(t.closest('[data-test-id*="input"]')||t.closest('[role="textbox"]')){const i=t.closest('[role="textbox"]')||t.closest("textarea");i&&(l=i,console.log("Tracking Google textbox via role or test-id"))}break;case"grok":if(t.closest('[data-testid*="compose"]')||t.closest('[role="textbox"]')){const i=t.closest('[role="textbox"]')||t.closest('[contenteditable="true"]');i&&(l=i,console.log("Tracking Grok compose element"))}break;case"deepseek":case"mistral":if(t.closest('[class*="chat"]')||t.closest('[class*="input"]')){const i=t.closest("textarea")||t.closest('[contenteditable="true"]');i&&(l=i,console.log(`Tracking ${s} chat input`))}break;default:const r=((n=t.closest("form"))==null?void 0:n.querySelector('textarea, input[type="text"], [contenteditable="true"]'))||document.querySelector('textarea:focus, input[type="text"]:focus, [contenteditable="true"]:focus');r&&(l=r,console.log("Tracking nearby text input for unknown platform"));break}}function pt(t){C=t,b=!1;const e=document.querySelector(".promptpilot-intent-dropdown"),o=document.querySelector(".promptpilot-intent-button");e&&e.classList.remove("open"),o&&(o.classList.remove("active"),o.innerHTML='<span class="promptpilot-intent-icon">🎯</span><span class="promptpilot-intent-indicator"></span>',o.title=`Intent: ${t}`),console.log("Selected intent:",t)}function dt(t){const e=t.target,o=document.getElementById("promptpilot-container");if(o&&!o.contains(e)){if(y){y=!1;const n=document.getElementById("promptpilot-expanded"),r=document.getElementById("promptpilot-main-button");n&&n.classList.remove("expanded"),r&&r.classList.remove("expanded")}if(b){b=!1;const n=document.querySelector(".promptpilot-intent-dropdown"),r=document.querySelector(".promptpilot-intent-button");n&&n.classList.remove("open"),r&&r.classList.remove("active")}}}function mt(t){t.preventDefault(),t.stopPropagation();const e=document.getElementById("promptpilot-container");if(!e)return;const o=e.getBoundingClientRect();M=o.left,_=o.top,L=t.clientX,I=t.clientY,v=!0,e.classList.add("dragging")}function ut(t){if(!v)return;t.preventDefault();const e=document.getElementById("promptpilot-container");if(!e)return;g=M+(t.clientX-L),h=_+(t.clientY-I);const o=window.innerWidth,n=window.innerHeight,r=48,i=48;g=Math.max(0,Math.min(g,o-r)),h=Math.max(0,Math.min(h,n-i)),e.style.left=g+"px",e.style.top=h+"px",e.style.right="auto",e.style.bottom="auto"}function ft(t){if(!v)return;const e=document.getElementById("promptpilot-container");e&&(e.classList.remove("dragging"),G(g,h)),v=!1}function G(t,e){try{const o={x:t,y:e};localStorage.setItem("promptpilot-widget-position",JSON.stringify(o))}catch(o){console.warn("Failed to save widget position:",o)}}function gt(t){try{const e=localStorage.getItem("promptpilot-widget-position");if(e){const o=JSON.parse(e),n=window.innerWidth,r=window.innerHeight,i=48,a=48,c=Math.max(0,Math.min(o.x,n-i)),d=Math.max(0,Math.min(o.y,r-a));t.style.left=c+"px",t.style.top=d+"px",t.style.right="auto",t.style.bottom="auto",g=c,h=d}}catch(e){console.warn("Failed to restore widget position:",e)}}function ht(){const t=document.getElementById("promptpilot-container");if(!t||!(t.style.left||t.style.top))return;const o=window.innerWidth,n=window.innerHeight,r=48,i=48,a=t.getBoundingClientRect();let c=a.left,d=a.top;c=Math.max(0,Math.min(c,o-r)),d=Math.max(0,Math.min(d,n-i)),(c!==a.left||d!==a.top)&&(t.style.left=c+"px",t.style.top=d+"px",g=c,h=d,G(c,d))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",A):A();
