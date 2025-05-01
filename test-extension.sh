#!/bin/bash

echo "Building the extension..."
npm run build

echo "Starting the backend server..."
cd backend
node index.js &
SERVER_PID=$!

echo ""
echo "==================== INSTRUCTIONS ===================="
echo "Extension built and backend server running."
echo ""
echo "1. Go to chrome://extensions/ in Chrome"
echo "2. Enable 'Developer mode' (top right toggle)"
echo "3. Click 'Load unpacked' and select the 'dist' folder"
echo "4. Open any website with text fields"
echo "5. Click on a text field and use the 'Improve' button"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo "===================================================="

# Wait for the server process
wait $SERVER_PID 