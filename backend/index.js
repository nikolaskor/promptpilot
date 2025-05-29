/**
 * Express server for PromptPilot
 * Provides an API endpoint for improving prompts using OpenAI
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import { createImprovePromptTemplate } from "./src/prompts/improve.js";
import { StripeService } from "./src/stripe/stripe-service.js";

// ADD THIS SECTION - Error handling for production stability
console.log("Setting up error handlers...");

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("🔴 UNCAUGHT EXCEPTION:", error.message);
  console.error("Stack:", error.stack);
  console.error("This should not cause app termination in Railway");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("🔴 UNHANDLED PROMISE REJECTION at:", promise);
  console.error("Reason:", reason);
  if (reason?.stack) {
    console.error("Stack:", reason.stack);
  }
  console.error("This should not cause app termination in Railway");
});

// Log process signals
process.on("SIGTERM", () => {
  console.log("📡 Received SIGTERM signal - graceful shutdown");
});

process.on("SIGINT", () => {
  console.log("📡 Received SIGINT signal - graceful shutdown");
});

process.on("exit", (code) => {
  console.log(`📡 Process exiting with code: ${code}`);
});

console.log("Error handlers set up successfully ✅");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4001; // Explicitly set port to 4001 to match client configuration

// Initialize OpenAI client if API key is available
let openai = null;
let demoMode = false;
let stripeDemoMode = false;

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

// Check Stripe configuration
try {
  if (process.env.STRIPE_SECRET_KEY) {
    console.log("Stripe API Key status: Configured ✓");
  } else {
    stripeDemoMode = true;
    console.log(
      "Stripe API Key status: Missing ✗ - Stripe endpoints will return demo responses"
    );
  }
} catch (error) {
  stripeDemoMode = true;
  console.error("Error checking Stripe configuration:", error);
  console.log("Running Stripe endpoints in demo mode");
}

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // Allow Chrome extension origins
      if (origin.startsWith("chrome-extension://")) {
        return callback(null, true);
      }

      // Allow specific domains in production
      const allowedOrigins = [
        "https://promptpilot-production-up.railway.app",
        "https://promptpilot-production.up.railway.app",
        "http://localhost:3000",
        "http://localhost:4001",
        "https://railway.app",
        "https://railway.com",
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // For development, allow all origins
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      // Allow all origins for now (can be restricted later)
      return callback(null, true);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "stripe-signature"],
    credentials: false,
  })
);

// Add this after the CORS middleware (around line 50)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${
      req.ip
    } - Origin: ${origin || "no-origin"}`
  );
  next();
});

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
      details: error.message,
      stack: error.stack,
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

// Stripe Endpoints

/**
 * Create a new customer and checkout session
 */
app.post("/stripe/create-checkout", async (req, res) => {
  console.log("Received /stripe/create-checkout request:", req.body);

  try {
    const { email, name, priceId, successUrl, cancelUrl } = req.body;

    if (!email || !priceId) {
      return res.status(400).json({
        error: "Missing required fields: email and priceId",
      });
    }

    // Demo mode response if Stripe is not configured
    if (stripeDemoMode) {
      console.log("Stripe demo mode: Returning simulated checkout session");
      return res.json({
        sessionId: "cs_demo_" + Date.now(),
        url: "https://checkout.stripe.com/demo",
        customerId: "cus_demo_" + Date.now(),
        demoMode: true,
        message:
          "Demo mode: Stripe not configured. See backend/STRIPE_SETUP_GUIDE.md for setup instructions.",
      });
    }

    // Create or get customer
    const customer = await StripeService.createCustomer(email, name);

    // Create checkout session
    const session = await StripeService.createCheckoutSession(
      customer.id,
      priceId,
      successUrl || `${process.env.FRONTEND_URL}/success`,
      cancelUrl || `${process.env.FRONTEND_URL}/cancel`
    );

    res.json({
      sessionId: session.id,
      url: session.url,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: "Failed to create checkout session",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Get customer subscription status
 */
app.post("/stripe/subscription-status", async (req, res) => {
  console.log("Received /stripe/subscription-status request:", req.body);

  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({
        error: "Missing customerId",
      });
    }

    // Demo mode response if Stripe is not configured
    if (stripeDemoMode) {
      console.log("Stripe demo mode: Returning simulated subscription status");
      return res.json({
        status: "free",
        hasActiveSubscription: false,
        demoMode: true,
        message:
          "Demo mode: Stripe not configured. See backend/STRIPE_SETUP_GUIDE.md for setup instructions.",
      });
    }

    const status = await StripeService.getSubscriptionStatus(customerId);
    res.json(status);
  } catch (error) {
    console.error("Error getting subscription status:", error);
    res.status(500).json({
      error: "Failed to get subscription status",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Create customer portal session
 */
app.post("/stripe/create-portal", async (req, res) => {
  console.log("Received /stripe/create-portal request:", req.body);

  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({
        error: "Missing customerId",
      });
    }

    // Demo mode response if Stripe is not configured
    if (stripeDemoMode) {
      console.log("Stripe demo mode: Customer portal not available");
      return res.status(400).json({
        error:
          "Customer portal not available in demo mode. Please configure Stripe API keys.",
        demoMode: true,
        message:
          "Demo mode: Stripe not configured. See backend/STRIPE_SETUP_GUIDE.md for setup instructions.",
      });
    }

    const session = await StripeService.createPortalSession(
      customerId,
      returnUrl || process.env.FRONTEND_URL
    );

    res.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({
      error: "Failed to create portal session",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Cancel subscription
 */
app.post("/stripe/cancel-subscription", async (req, res) => {
  console.log("Received /stripe/cancel-subscription request:", req.body);

  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        error: "Missing subscriptionId",
      });
    }

    const subscription = await StripeService.cancelSubscription(subscriptionId);
    res.json({
      status: "cancelled",
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({
      error: "Failed to cancel subscription",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Get pricing configuration
 */
app.get("/stripe/pricing", (req, res) => {
  try {
    // Demo mode response if Stripe is not configured
    if (stripeDemoMode) {
      console.log("Stripe demo mode: Returning demo pricing configuration");
      return res.json({
        monthly: {
          name: "Monthly Premium",
          price: "$7.99",
          billing: "per month",
          savings: null,
          features: [
            "Unlimited prompt improvements",
            "Priority support",
            "Advanced AI models",
            "Usage analytics",
          ],
          priceId: "price_demo_monthly",
        },
        annual: {
          name: "Annual Premium",
          price: "$69.99",
          billing: "per year",
          savings: "Save 26%",
          features: [
            "Unlimited prompt improvements",
            "Priority support",
            "Advanced AI models",
            "Usage analytics",
            "2 months free",
          ],
          priceId: "price_demo_annual",
        },
        lifetime: {
          name: "Lifetime Access",
          price: "$129.00",
          billing: "one-time (Limited Offer)",
          savings: "Best Value",
          features: [
            "Lifetime unlimited access",
            "All premium features",
            "Future updates included",
            "Priority support",
            "Early access to new features",
          ],
          priceId: "price_demo_lifetime",
        },
        demoMode: true,
        message:
          "Demo mode: Stripe not configured. See backend/STRIPE_SETUP_GUIDE.md for setup instructions.",
      });
    }

    // Return actual pricing configuration
    res.json({
      monthly: {
        name: "Monthly Premium",
        price: "$7.99",
        billing: "per month",
        savings: null,
        features: [
          "Unlimited prompt improvements",
          "Priority support",
          "Advanced AI models",
          "Usage analytics",
        ],
        priceId: process.env.STRIPE_MONTHLY_PRICE_ID,
      },
      annual: {
        name: "Annual Premium",
        price: "$69.99",
        billing: "per year",
        savings: "Save 26%",
        features: [
          "Unlimited prompt improvements",
          "Priority support",
          "Advanced AI models",
          "Usage analytics",
          "2 months free",
        ],
        priceId: process.env.STRIPE_ANNUAL_PRICE_ID,
      },
      lifetime: {
        name: "Lifetime Access",
        price: "$129.00",
        billing: "one-time (Limited Offer)",
        savings: "Best Value",
        features: [
          "Lifetime unlimited access",
          "All premium features",
          "Future updates included",
          "Priority support",
          "Early access to new features",
        ],
        priceId: process.env.STRIPE_LIFETIME_PRICE_ID,
      },
      demoMode: false,
    });
  } catch (error) {
    console.error("Error getting pricing configuration:", error);
    res.status(500).json({
      error: "Failed to get pricing configuration",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Stripe webhook endpoint with enhanced security and logging
 */
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const startTime = Date.now();
    console.log("Received Stripe webhook at", new Date().toISOString());

    try {
      const signature = req.headers["stripe-signature"];

      if (!signature) {
        console.error("Missing Stripe signature header");
        return res.status(400).json({
          error: "Missing Stripe signature header",
        });
      }

      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("STRIPE_WEBHOOK_SECRET not configured");
        return res.status(500).json({
          error: "Webhook secret not configured",
        });
      }

      // Verify webhook signature
      const event = StripeService.verifyWebhook(req.body, signature);
      console.log(`Webhook event verified: ${event.type} (ID: ${event.id})`);

      // Handle the webhook event
      const result = await StripeService.handleWebhookEvent(event);

      const processingTime = Date.now() - startTime;
      console.log(`Webhook processed in ${processingTime}ms:`, result);

      // Return success response
      res.status(200).json({
        received: true,
        eventId: event.id,
        eventType: event.type,
        result,
        processingTime,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Webhook error after ${processingTime}ms:`, error.message);

      // Return appropriate error status
      if (error.message.includes("signature")) {
        return res.status(400).json({
          error: "Webhook signature verification failed",
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(500).json({
        error: "Webhook processing failed",
        timestamp: new Date().toISOString(),
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * Webhook validation endpoint for testing
 */
app.get("/stripe/webhook-status", async (req, res) => {
  try {
    const validation = await StripeService.validateWebhookConfig();
    const recentEvents = await StripeService.getWebhookEvents(5);

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      validation,
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString(),
        processed: event.request ? "yes" : "no",
      })),
    });
  } catch (error) {
    console.error("Error getting webhook status:", error);
    res.status(500).json({
      error: "Failed to get webhook status",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Stripe checkout success redirect handler
 */
app.get("/stripe/success", (req, res) => {
  console.log("Stripe checkout success redirect");

  // Create a simple HTML page that closes the tab and notifies the extension
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container { 
          max-width: 400px; 
          margin: 0 auto; 
          background: white; 
          color: #333; 
          padding: 30px; 
          border-radius: 10px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .success-icon { 
          font-size: 48px; 
          color: #4CAF50; 
          margin-bottom: 20px; 
        }
        h1 { color: #4CAF50; margin-bottom: 10px; }
        p { margin-bottom: 20px; color: #666; }
        .close-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        .close-btn:hover { background: #45a049; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for upgrading to PromptPilot Premium. Your subscription is now active.</p>
        <button class="close-btn" onclick="closeTab()">Close Tab</button>
      </div>
      <script>
        function closeTab() {
          window.close();
        }
        // Auto-close after 5 seconds
        setTimeout(closeTab, 5000);
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

/**
 * Stripe checkout cancel redirect handler
 */
app.get("/stripe/cancel", (req, res) => {
  console.log("Stripe checkout cancel redirect");

  // Create a simple HTML page that closes the tab
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: linear-gradient(135deg, #ff7b7b 0%, #ff9a9e 100%);
          color: white;
        }
        .container { 
          max-width: 400px; 
          margin: 0 auto; 
          background: white; 
          color: #333; 
          padding: 30px; 
          border-radius: 10px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .cancel-icon { 
          font-size: 48px; 
          color: #f44336; 
          margin-bottom: 20px; 
        }
        h1 { color: #f44336; margin-bottom: 10px; }
        p { margin-bottom: 20px; color: #666; }
        .close-btn {
          background: #f44336;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        .close-btn:hover { background: #da190b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="cancel-icon">❌</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. You can try again anytime from the PromptPilot extension.</p>
        <button class="close-btn" onclick="closeTab()">Close Tab</button>
      </div>
      <script>
        function closeTab() {
          window.close();
        }
        // Auto-close after 3 seconds
        setTimeout(closeTab, 3000);
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

// Health check endpoint with comprehensive status
app.get("/health", async (req, res) => {
  try {
    // Check if OpenAI API key is set
    const apiKeyStatus = process.env.OPENAI_API_KEY ? "configured" : "missing";

    // Check Stripe configuration
    const stripeSecretStatus = process.env.STRIPE_SECRET_KEY
      ? "configured"
      : "missing";
    const stripePublishableStatus = process.env.STRIPE_PUBLISHABLE_KEY
      ? "configured"
      : "missing";
    const stripeWebhookStatus = process.env.STRIPE_WEBHOOK_SECRET
      ? "configured"
      : "missing";
    const stripeMonthlyPriceStatus = process.env.STRIPE_MONTHLY_PRICE_ID
      ? "configured"
      : "missing";
    const stripeAnnualPriceStatus = process.env.STRIPE_ANNUAL_PRICE_ID
      ? "configured"
      : "missing";
    const stripeLifetimePriceStatus = process.env.STRIPE_LIFETIME_PRICE_ID
      ? "configured"
      : "missing";

    // Test Stripe connection if keys are available
    let stripeConnectionStatus = "not_tested";
    if (stripeSecretStatus === "configured") {
      try {
        console.log("Testing Stripe connection...");
        const testResult = await StripeService.testConnection();
        stripeConnectionStatus = testResult ? "connected" : "failed";
        console.log(
          "Stripe connection test completed:",
          stripeConnectionStatus
        );
      } catch (error) {
        stripeConnectionStatus = "failed";
        console.error("Stripe connection test failed:", error.message);
        // Don't let this crash the whole health endpoint
      }
    }

    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        openai: {
          status: apiKeyStatus,
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          demoMode: demoMode,
        },
        stripe: {
          status: stripeConnectionStatus,
          demoMode: stripeDemoMode,
          configuration: {
            secretKey: stripeSecretStatus,
            publishableKey: stripePublishableStatus,
            webhookSecret: stripeWebhookStatus,
            monthlyPriceId: stripeMonthlyPriceStatus,
            annualPriceId: stripeAnnualPriceStatus,
            lifetimePriceId: stripeLifetimePriceStatus,
          },
        },
      },
      server: {
        port: PORT,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    };

    // Set appropriate status code based on service health
    const hasErrors =
      apiKeyStatus === "missing" ||
      stripeConnectionStatus === "failed" ||
      stripeSecretStatus === "missing";

    res.status(hasErrors ? 503 : 200).json(healthData);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Add error handling middleware at the very end, before app.listen()
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Add a simple root route for testing
app.get("/", (req, res) => {
  console.log("Root endpoint accessed successfully");
  res.json({
    message: "PromptPilot Backend is running!",
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`PromptPilot backend server running at http://0.0.0.0:${PORT}`);

  // Memory monitoring for Railway debugging
  const memoryMonitor = setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log("💾 Memory usage:", {
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
    });
  }, 60000); // Log every 60 seconds

  // Clear interval on shutdown
  process.on("SIGTERM", () => {
    clearInterval(memoryMonitor);
  });

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
      process.env.OPENAI_MODEL || "gpt-4o"
    );
  }
});
