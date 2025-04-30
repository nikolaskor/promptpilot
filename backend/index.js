/**
 * Express server for PromptPilot
 * Provides an API endpoint for improving prompts
 */

import express from "express";
import cors from "cors";

// Initialize Express app
const app = express();
const PORT = 4000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*", // In production, restrict this to your extension ID
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Main endpoint for improving prompts
app.post("/improve", (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Missing prompt in request body",
      });
    }

    // For now, just echo back an "improved" version
    // In a real implementation, this would call an AI service like OpenAI
    const improvedPrompt = `[IMPROVED] ${prompt}`;

    // Simulate some processing delay
    setTimeout(() => {
      res.json({ improvedPrompt });
    }, 500);
  } catch (error) {
    console.error("Error processing improve request:", error);
    res.status(500).json({
      error: "Server error while processing prompt",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`PromptPilot backend server running at http://localhost:${PORT}`);
});
