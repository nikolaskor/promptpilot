// Debug script for PromptPilot extension
// Run this in the browser console to test extension functionality

console.log("🔍 PromptPilot Debug Script Starting...");

// Test 1: Check if content script is loaded
function testContentScript() {
  console.log("📝 Testing content script...");

  // Check if PromptPilot button exists
  const button = document.getElementById("promptpilot-improve-button");
  if (button) {
    console.log("✅ PromptPilot button found:", button);
  } else {
    console.log("❌ PromptPilot button not found");
  }

  // Check if content script variables are available
  if (typeof window.promptPilotDebug !== "undefined") {
    console.log("✅ Content script debug info available");
  } else {
    console.log("❌ Content script debug info not available");
  }
}

// Test 2: Check background script communication
function testBackgroundScript() {
  console.log("🔧 Testing background script communication...");

  if (typeof chrome !== "undefined" && chrome.runtime) {
    // Test basic communication
    chrome.runtime.sendMessage({ type: "CHECK_BACKEND" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log(
          "❌ Background script communication failed:",
          chrome.runtime.lastError
        );
      } else {
        console.log("✅ Background script responded:", response);
      }
    });

    // Test analytics
    chrome.runtime.sendMessage({ type: "GET_USER_SETTINGS" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log(
          "❌ Analytics communication failed:",
          chrome.runtime.lastError
        );
      } else {
        console.log("✅ Analytics responded:", response);
      }
    });
  } else {
    console.log("❌ Chrome extension APIs not available");
  }
}

// Test 3: Simulate improvement request
function testImprovement() {
  console.log("⚡ Testing improvement functionality...");

  const testText = "Write a poem about love";

  if (typeof chrome !== "undefined" && chrome.runtime) {
    console.log("📤 Sending improvement request for:", testText);

    chrome.runtime.sendMessage(
      {
        type: "IMPROVE_AND_REPLACE",
        text: testText,
        intent: "Creative",
        platform: "test",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log(
            "❌ Improvement request failed:",
            chrome.runtime.lastError
          );
        } else {
          console.log("✅ Improvement request responded:", response);
        }
      }
    );
  } else {
    console.log("❌ Chrome extension APIs not available");
  }
}

// Test 4: Check backend directly
async function testBackendDirect() {
  console.log("🌐 Testing backend directly...");

  try {
    const response = await fetch("http://localhost:4001/health");
    const data = await response.json();
    console.log("✅ Backend health check:", data);

    // Test improvement endpoint
    const improveResponse = await fetch("http://localhost:4001/improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "Test prompt" }),
    });

    if (improveResponse.ok) {
      const improveData = await improveResponse.json();
      console.log("✅ Backend improvement test:", improveData);
    } else {
      console.log(
        "❌ Backend improvement failed:",
        improveResponse.status,
        improveResponse.statusText
      );
    }
  } catch (error) {
    console.log("❌ Backend test failed:", error);
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Running all PromptPilot debug tests...");

  testContentScript();
  testBackgroundScript();

  // Wait a bit for async responses
  setTimeout(() => {
    testImprovement();
  }, 1000);

  await testBackendDirect();

  console.log("🏁 Debug tests completed. Check the logs above for any issues.");
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.promptPilotDebug = {
  testContentScript,
  testBackgroundScript,
  testImprovement,
  testBackendDirect,
  runAllTests,
};

console.log("🔍 Debug script loaded. You can run individual tests with:");
console.log("- promptPilotDebug.testContentScript()");
console.log("- promptPilotDebug.testBackgroundScript()");
console.log("- promptPilotDebug.testImprovement()");
console.log("- promptPilotDebug.testBackendDirect()");
console.log("- promptPilotDebug.runAllTests()");
