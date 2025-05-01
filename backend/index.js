/**
 * Express server for PromptPilot
 * Provides an API endpoint for improving prompts using OpenAI
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import { createImprovePromptTemplate } from "./src/prompts/improve.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = 4001; // Explicitly set port to 4001 to match client configuration

// Initialize OpenAI client if API key is available
let openai = null;
let demoMode = false;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log("OpenAI API Key status: Configured ✓");
  } else {
    demoMode = true;
    console.log("OpenAI API Key status: Missing ✗ - Running in demo mode");
  }
} catch (error) {
  demoMode = true;
  console.error("Error initializing OpenAI client:", error);
  console.log("Running in demo mode due to OpenAI initialization error");
}

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
app.post("/improve", async (req, res) => {
  console.log("Received /improve request:", req.body);

  try {
    const { prompt } = req.body;

    if (!prompt) {
      console.error("Missing prompt in request body");
      return res.status(400).json({
        error: "Missing prompt in request body",
      });
    }

    console.log(`Processing prompt with ${prompt.length} characters`);

    // If in demo mode, return a simulated improvement
    if (demoMode) {
      console.log("Using demo mode for prompt improvement");

      // Wait a bit to simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate a simple "improved" version for demo purposes
      const improvedPrompt = generateDemoImprovement(prompt);
      console.log("Generated demo improvement, returning response");
      return res.json({ improvedPrompt });
    }

    console.log("Calling OpenAI for prompt improvement");

    // Generate an improved prompt using OpenAI
    const improvedPrompt = await improvePromptWithAI(prompt);
    console.log("OpenAI improvement successful, returning response");

    res.json({ improvedPrompt });
  } catch (error) {
    console.error("Error processing improve request:", error);

    // Handle different types of errors
    if (error.message && error.message.includes("rate limit")) {
      return res.status(429).json({
        error: "API rate limit exceeded. Please try again later.",
      });
    } else if (error.message && error.message.includes("quota")) {
      return res.status(402).json({
        error: "API quota exceeded. Please check your billing status.",
      });
    }

    res.status(500).json({
      error: "Server error while processing prompt",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Generate a demo improvement without using OpenAI
 * @param {string} prompt - The original prompt to improve
 * @returns {string} A simulated improved prompt
 */
function generateDemoImprovement(prompt) {
  // Add some common improvements to make it look like AI enhanced it
  const originalWords = prompt.split(/\s+/).length;
  let improved = prompt;

  // Add specificity
  improved = "I need " + improved;

  // Add some structure
  improved +=
    "\n\nPlease include the following:\n- Detailed explanations\n- Examples if possible\n- Step-by-step instructions";

  // Add context
  improved += "\n\nThis is for educational purposes.";

  console.log(`Demo mode: Improved prompt from ${originalWords} words`);
  return improved;
}

/**
 * Improve a prompt using OpenAI
 * @param {string} prompt - The original prompt to improve
 * @returns {Promise<string>} The improved prompt
 */
async function improvePromptWithAI(prompt) {
  try {
    // Create the prompt template
    const template = createImprovePromptTemplate(prompt);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: template.system },
        { role: "user", content: template.user },
      ],
      temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
      max_tokens: parseInt(process.env.MAX_TOKENS || "1000"),
    });

    // Extract the improved prompt from the response
    const improvedPrompt = response.choices[0].message.content.trim();

    // Log for debugging
    console.log(
      `Original prompt: "${prompt.substring(0, 50)}${
        prompt.length > 50 ? "..." : ""
      }"`
    );
    console.log(
      `Improved prompt: "${improvedPrompt.substring(0, 50)}${
        improvedPrompt.length > 50 ? "..." : ""
      }"`
    );

    return improvedPrompt;
  } catch (error) {
    console.error("Error improving prompt with AI:", error);
    throw error;
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  // Check if OpenAI API key is set
  const apiKeyStatus = process.env.OPENAI_API_KEY ? "configured" : "missing";

  res.json({
    status: "ok",
    openai: apiKeyStatus,
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    demoMode: demoMode,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`PromptPilot backend server running at http://localhost:${PORT}`);
  if (demoMode) {
    console.log(
      "DEMO MODE ACTIVE: Using simulated responses instead of OpenAI API"
    );
    console.log(
      "To use real OpenAI improvements, add a valid API key to your .env file"
    );
  } else {
    console.log(
      "OpenAI integration active with model:",
      process.env.OPENAI_MODEL || "gpt-3.5-turbo"
    );
  }
});
