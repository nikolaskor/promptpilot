import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { StripeService } from "./src/stripe/stripe-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from multiple locations
console.log("🔍 Loading environment variables...");

// Try backend directory first
const backendEnvPath = path.join(__dirname, ".env");
dotenv.config({ path: backendEnvPath });

// Try parent directory if backend .env doesn't work
if (!process.env.STRIPE_SECRET_KEY) {
  const rootEnvPath = path.join(__dirname, "..", ".env");
  dotenv.config({ path: rootEnvPath });
}

console.log("🔍 Stripe Configuration Status:");
console.log("================================");
console.log(
  "STRIPE_SECRET_KEY:",
  process.env.STRIPE_SECRET_KEY ? "Set ✓" : "Missing ✗"
);
console.log(
  "STRIPE_PUBLISHABLE_KEY:",
  process.env.STRIPE_PUBLISHABLE_KEY ? "Set ✓" : "Missing ✗"
);
console.log(
  "STRIPE_WEBHOOK_SECRET:",
  process.env.STRIPE_WEBHOOK_SECRET ? "Set ✓" : "Missing ✗"
);
console.log("");
console.log("💰 Pricing Plans:");
console.log("==================");
console.log(
  "STRIPE_MONTHLY_PRICE_ID:",
  process.env.STRIPE_MONTHLY_PRICE_ID ? "Set ✓" : "Missing ✗"
);
console.log(
  "STRIPE_ANNUAL_PRICE_ID:",
  process.env.STRIPE_ANNUAL_PRICE_ID ? "Set ✓" : "Missing ✗"
);
console.log(
  "STRIPE_LIFETIME_PRICE_ID:",
  process.env.STRIPE_LIFETIME_PRICE_ID ? "Set ✓" : "Missing ✗"
);
console.log("");

console.log("🔑 Key Mode Analysis:");
console.log("=====================");
if (process.env.STRIPE_SECRET_KEY) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key.startsWith("sk_live_")) {
    console.log("Secret Key Mode: 🟢 LIVE/PRODUCTION ✓");
  } else if (key.startsWith("sk_test_")) {
    console.log("Secret Key Mode: 🟡 TEST MODE ⚠️");
  } else {
    console.log("Secret Key Mode: ❓ UNKNOWN FORMAT");
  }
}

if (process.env.STRIPE_PUBLISHABLE_KEY) {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (key.startsWith("pk_live_")) {
    console.log("Publishable Key Mode: 🟢 LIVE/PRODUCTION ✓");
  } else if (key.startsWith("pk_test_")) {
    console.log("Publishable Key Mode: 🟡 TEST MODE ⚠️");
  } else {
    console.log("Publishable Key Mode: ❓ UNKNOWN FORMAT");
  }
}

// Test Stripe connection if keys are available
if (process.env.STRIPE_SECRET_KEY) {
  console.log("");
  console.log("🧪 Testing Stripe Connection:");
  console.log("==============================");

  try {
    const connectionTest = await StripeService.testConnection();
    if (connectionTest) {
      console.log("✅ Stripe API connection successful!");

      // Test price ID validation for all three plans
      console.log("\n🔧 Validating Price IDs:");
      console.log("=========================");

      const priceIds = {
        monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
        annual: process.env.STRIPE_ANNUAL_PRICE_ID,
        lifetime: process.env.STRIPE_LIFETIME_PRICE_ID,
      };

      for (const [plan, priceId] of Object.entries(priceIds)) {
        if (priceId) {
          try {
            const stripeInstance =
              StripeService.testConnection.stripe ||
              new (await import("stripe")).default(
                process.env.STRIPE_SECRET_KEY
              );
            await stripeInstance.prices.retrieve(priceId);
            console.log(
              `${
                plan.charAt(0).toUpperCase() + plan.slice(1)
              } Plan (${priceId}): ✅ Valid`
            );
          } catch (error) {
            console.log(
              `${
                plan.charAt(0).toUpperCase() + plan.slice(1)
              } Plan (${priceId}): ❌ Invalid - ${error.message}`
            );
          }
        } else {
          console.log(
            `${
              plan.charAt(0).toUpperCase() + plan.slice(1)
            } Plan: ❌ Not configured`
          );
        }
      }
    } else {
      console.log("❌ Stripe API connection failed!");
    }
  } catch (error) {
    console.log("❌ Stripe connection error:", error.message);
  }
}

console.log("");
console.log("📋 Production Readiness Checklist:");
console.log("===================================");

const isLive = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");
const hasWebhook = !!process.env.STRIPE_WEBHOOK_SECRET;
const hasAllPrices = !!(
  process.env.STRIPE_MONTHLY_PRICE_ID &&
  process.env.STRIPE_ANNUAL_PRICE_ID &&
  process.env.STRIPE_LIFETIME_PRICE_ID
);

if (isLive && hasWebhook && hasAllPrices) {
  console.log("🎉 PRODUCTION READY! All requirements met.");
  console.log("→ Monthly, Annual, and Lifetime plans configured");
  console.log("→ Live Stripe keys active");
  console.log("→ Webhook secret configured");
  console.log("→ Ready to accept real payments!");
  console.log("");
  console.log("💡 Next Steps:");
  console.log("• Test payments with real payment methods");
  console.log("• Verify webhook endpoint in Stripe Dashboard");
  console.log("• Deploy to production environment");
} else {
  console.log("⚠️  Missing production requirements:");
  if (!isLive)
    console.log("  • Switch to live Stripe keys (sk_live_... and pk_live_...)");
  if (!hasWebhook) console.log("  • Configure webhook secret");
  if (!hasAllPrices) {
    console.log("  • Set up missing price IDs:");
    if (!process.env.STRIPE_MONTHLY_PRICE_ID)
      console.log("    - STRIPE_MONTHLY_PRICE_ID");
    if (!process.env.STRIPE_ANNUAL_PRICE_ID)
      console.log("    - STRIPE_ANNUAL_PRICE_ID");
    if (!process.env.STRIPE_LIFETIME_PRICE_ID)
      console.log("    - STRIPE_LIFETIME_PRICE_ID");
  }
}
