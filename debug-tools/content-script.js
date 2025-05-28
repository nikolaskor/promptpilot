// Simple test content script
console.log("Simple test content script loaded");

// Create a button in the top-right corner of the page
const button = document.createElement("button");
button.textContent = "Test Improve Button";
button.style.position = "fixed";
button.style.top = "10px";
button.style.right = "10px";
button.style.zIndex = "10000";
button.style.padding = "8px 16px";
button.style.backgroundColor = "#4285f4";
button.style.color = "white";
button.style.border = "none";
button.style.borderRadius = "4px";
button.style.fontFamily = "Arial, sans-serif";
button.style.cursor = "pointer";

// Add click event to the button
button.addEventListener("click", () => {
  console.log("Test button clicked");
  button.textContent = "Improving...";
  button.style.backgroundColor = "#9aa0a6";

  // Simulate improvement process
  setTimeout(() => {
    button.textContent = "Improved!";
    button.style.backgroundColor = "#34A853";

    // Show a notification
    const notification = document.createElement("div");
    notification.textContent = "Prompt successfully improved!";
    notification.style.position = "fixed";
    notification.style.top = "50px";
    notification.style.right = "10px";
    notification.style.padding = "12px";
    notification.style.backgroundColor = "#34A853";
    notification.style.color = "white";
    notification.style.borderRadius = "4px";
    notification.style.zIndex = "10001";
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      document.body.removeChild(notification);
      button.textContent = "Test Improve Button";
      button.style.backgroundColor = "#4285f4";
    }, 3000);
  }, 2000);
});

// Add the button to the page
document.body.appendChild(button);

console.log("Test button added to page");
