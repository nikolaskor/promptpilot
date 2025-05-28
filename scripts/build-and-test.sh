#!/bin/bash

# Build the extension
echo "Building the extension..."
npm run build

# Check if the build was successful
if [ ! -d "dist" ]; then
  echo "Error: Build failed - dist directory not found"
  exit 1
fi

echo "Build complete! dist directory created."

# Start the backend server
echo "Starting the backend server..."
cd backend
node index.js &
BACKEND_PID=$!

# Wait a moment to let the server start
sleep 2

# Check if the server is running
if ! curl -s http://localhost:4000/health > /dev/null; then
  echo "Error: Backend server is not responding. Check for errors above."
  # Optionally kill the process if it did start but isn't responding
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

echo "Backend server started and responding!"

# Test the improve endpoint with demo mode
echo "Testing /improve endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:4000/improve \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test prompt"}')

if [[ $RESPONSE == *"improvedPrompt"* ]]; then
  echo "✅ Backend /improve endpoint is working!"
else
  echo "❌ Backend /improve endpoint test failed. Response:"
  echo $RESPONSE
fi

# Instructions for testing
echo ""
echo "=================================================================="
echo "Extension built and backend server started!"
echo ""
echo "To test the extension:"
echo "1. Go to chrome://extensions/ in Chrome"
echo "2. Enable 'Developer mode' with the toggle in the top-right corner"
echo "3. Click 'Load unpacked' and select the 'dist' folder in this project"
echo "4. Navigate to any website with text input fields"
echo "5. Click on a text field and use the 'Improve' button"
echo ""
echo "Debugging tips:"
echo "- Open Chrome DevTools and switch to the Console tab to see logs"
echo "- If the button disappears without improving text, check the logs for errors"
echo "- The backend is running in demo mode, so improvements are simulated"
echo "=================================================================="
echo ""
echo "Press Ctrl+C to stop the backend server when done testing."

# Wait for user to press Ctrl+C
wait $BACKEND_PID 