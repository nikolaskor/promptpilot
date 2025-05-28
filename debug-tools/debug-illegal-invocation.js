// Debug script to test the TypeError: Illegal invocation fix
console.log("Testing TypeError: Illegal invocation fix...");

// Test 1: Test descriptor.set.call with proper context
function testDescriptorSetCall() {
  console.log("\n=== Test 1: Descriptor Set Call ===");

  try {
    // Create a test textarea
    const textarea = document.createElement("textarea");
    textarea.value = "test value";
    document.body.appendChild(textarea);

    // Get the descriptor (this was causing the error)
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    );

    if (descriptor && descriptor.set && typeof descriptor.set === "function") {
      console.log("✅ Descriptor found and is a function");

      // This was the problematic line - now fixed with proper error handling
      try {
        descriptor.set.call(textarea, "new test value");
        console.log("✅ descriptor.set.call succeeded");
        console.log("✅ New value:", textarea.value);
      } catch (error) {
        console.error("❌ descriptor.set.call failed:", error);
      }
    } else {
      console.warn("⚠️ Descriptor not found or not a function");
    }

    // Clean up
    document.body.removeChild(textarea);
  } catch (error) {
    console.error("❌ Test 1 failed:", error);
  }
}

// Test 2: Test setSelectionRange with proper error handling
function testSetSelectionRange() {
  console.log("\n=== Test 2: SetSelectionRange Call ===");

  try {
    // Create a test input
    const input = document.createElement("input");
    input.type = "text";
    input.value = "test selection range";
    document.body.appendChild(input);

    // Focus the input first
    input.focus();

    try {
      input.setSelectionRange(0, 4);
      console.log("✅ setSelectionRange succeeded");
      console.log("✅ Selection start:", input.selectionStart);
      console.log("✅ Selection end:", input.selectionEnd);
    } catch (error) {
      console.error("❌ setSelectionRange failed:", error);
    }

    // Clean up
    document.body.removeChild(input);
  } catch (error) {
    console.error("❌ Test 2 failed:", error);
  }
}

// Test 3: Test contenteditable element handling
function testContentEditableHandling() {
  console.log("\n=== Test 3: ContentEditable Handling ===");

  try {
    // Create a contenteditable div
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.textContent = "test contenteditable";
    document.body.appendChild(div);

    // Focus the div
    div.focus();

    // Test text replacement
    try {
      div.textContent = "new content";
      console.log("✅ ContentEditable text replacement succeeded");
      console.log("✅ New content:", div.textContent);
    } catch (error) {
      console.error("❌ ContentEditable handling failed:", error);
    }

    // Clean up
    document.body.removeChild(div);
  } catch (error) {
    console.error("❌ Test 3 failed:", error);
  }
}

// Test 4: Test event dispatching
function testEventDispatching() {
  console.log("\n=== Test 4: Event Dispatching ===");

  try {
    // Create a test textarea
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    // Test event creation and dispatching
    const events = [
      new Event("input", { bubbles: true }),
      new Event("change", { bubbles: true }),
      new InputEvent("input", { bubbles: true, inputType: "insertText" }),
      new Event("blur", { bubbles: true }),
      new Event("focus", { bubbles: true }),
    ];

    let successCount = 0;
    events.forEach((event, index) => {
      try {
        textarea.dispatchEvent(event);
        successCount++;
      } catch (error) {
        console.error(`❌ Event ${index} dispatch failed:`, error);
      }
    });

    console.log(
      `✅ ${successCount}/${events.length} events dispatched successfully`
    );

    // Clean up
    document.body.removeChild(textarea);
  } catch (error) {
    console.error("❌ Test 4 failed:", error);
  }
}

// Run all tests
function runAllTests() {
  console.log("🧪 Starting TypeError: Illegal invocation debug tests...");

  testDescriptorSetCall();
  testSetSelectionRange();
  testContentEditableHandling();
  testEventDispatching();

  console.log("\n🎉 All tests completed! Check the results above.");
}

// Run tests when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runAllTests);
} else {
  runAllTests();
}
