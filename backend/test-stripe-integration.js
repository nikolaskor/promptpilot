#!/usr/bin/env node

/**
 * Comprehensive Stripe Integration Test Suite
 * Tests payment workflows, webhook handling, and security measures
 */

import dotenv from "dotenv";
import { StripeService } from "./src/stripe/stripe-service.js";

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  testEmail: "test@promptpilot.com",
  testName: "Test User",
  testPriceIds: {
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,
    lifetime: process.env.STRIPE_LIFETIME_PRICE_ID,
  },
  backendUrl: "http://localhost:4001",
};

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

/**
 * Utility functions for test output
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function section(title) {
  log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}`);
}

/**
 * Test environment configuration
 */
async function testEnvironmentConfig() {
  section("Environment Configuration Test");

  const requiredEnvVars = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PREMIUM_PRICE_ID",
    "STRIPE_LIFETIME_PRICE_ID",
  ];

  let allConfigured = true;

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      success(`${envVar}: Configured`);
    } else {
      error(`${envVar}: Missing`);
      allConfigured = false;
    }
  }

  return allConfigured;
}

/**
 * Test Stripe connection
 */
async function testStripeConnection() {
  section("Stripe Connection Test");

  try {
    const isConnected = await StripeService.testConnection();
    if (isConnected) {
      success("Stripe API connection successful");
      return true;
    } else {
      error("Stripe API connection failed");
      return false;
    }
  } catch (err) {
    error(`Stripe connection error: ${err.message}`);
    return false;
  }
}

/**
 * Test webhook configuration validation
 */
async function testWebhookConfig() {
  section("Webhook Configuration Test");

  try {
    const validation = await StripeService.validateWebhookConfig();

    info("Webhook Configuration Status:");
    console.log(JSON.stringify(validation, null, 2));

    let isValid = true;

    if (validation.webhookSecret) {
      success("Webhook secret: Configured");
    } else {
      error("Webhook secret: Missing");
      isValid = false;
    }

    if (validation.priceIds.premium && validation.priceIds.premiumValid) {
      success("Premium price ID: Valid");
    } else {
      error(
        `Premium price ID: ${validation.priceIds.premiumError || "Invalid"}`
      );
      isValid = false;
    }

    if (validation.priceIds.lifetime && validation.priceIds.lifetimeValid) {
      success("Lifetime price ID: Valid");
    } else {
      error(
        `Lifetime price ID: ${validation.priceIds.lifetimeError || "Invalid"}`
      );
      isValid = false;
    }

    return isValid;
  } catch (err) {
    error(`Webhook config validation error: ${err.message}`);
    return false;
  }
}

/**
 * Test customer creation
 */
async function testCustomerCreation() {
  section("Customer Creation Test");

  try {
    const customer = await StripeService.createCustomer(
      TEST_CONFIG.testEmail,
      TEST_CONFIG.testName,
      { test: "true" }
    );

    if (customer && customer.id) {
      success(`Customer created: ${customer.id}`);
      return customer;
    } else {
      error("Customer creation failed");
      return null;
    }
  } catch (err) {
    error(`Customer creation error: ${err.message}`);
    return null;
  }
}

/**
 * Test checkout session creation
 */
async function testCheckoutSession(customer) {
  section("Checkout Session Test");

  if (!customer) {
    error("Cannot test checkout session without customer");
    return false;
  }

  try {
    // Test premium checkout session
    const premiumSession = await StripeService.createCheckoutSession(
      customer.id,
      TEST_CONFIG.testPriceIds.premium,
      "http://localhost:3000/success",
      "http://localhost:3000/cancel"
    );

    if (premiumSession && premiumSession.id) {
      success(`Premium checkout session created: ${premiumSession.id}`);
    } else {
      error("Premium checkout session creation failed");
      return false;
    }

    // Test lifetime checkout session
    const lifetimeSession = await StripeService.createCheckoutSession(
      customer.id,
      TEST_CONFIG.testPriceIds.lifetime,
      "http://localhost:3000/success",
      "http://localhost:3000/cancel"
    );

    if (lifetimeSession && lifetimeSession.id) {
      success(`Lifetime checkout session created: ${lifetimeSession.id}`);
    } else {
      error("Lifetime checkout session creation failed");
      return false;
    }

    return true;
  } catch (err) {
    error(`Checkout session error: ${err.message}`);
    return false;
  }
}

/**
 * Test subscription status retrieval
 */
async function testSubscriptionStatus(customer) {
  section("Subscription Status Test");

  if (!customer) {
    error("Cannot test subscription status without customer");
    return false;
  }

  try {
    const status = await StripeService.getSubscriptionStatus(customer.id);

    if (status) {
      success("Subscription status retrieved successfully");
      info(`Status: ${status.status}`);
      info(`Has active subscription: ${status.hasActiveSubscription}`);
      return true;
    } else {
      error("Subscription status retrieval failed");
      return false;
    }
  } catch (err) {
    error(`Subscription status error: ${err.message}`);
    return false;
  }
}

/**
 * Test customer portal session
 */
async function testCustomerPortal(customer) {
  section("Customer Portal Test");

  if (!customer) {
    error("Cannot test customer portal without customer");
    return false;
  }

  try {
    const portalSession = await StripeService.createPortalSession(
      customer.id,
      "http://localhost:3000"
    );

    if (portalSession && portalSession.url) {
      success(`Customer portal session created: ${portalSession.url}`);
      return true;
    } else {
      error("Customer portal session creation failed");
      return false;
    }
  } catch (err) {
    error(`Customer portal error: ${err.message}`);
    return false;
  }
}

/**
 * Test backend health endpoint
 */
async function testBackendHealth() {
  section("Backend Health Check Test");

  try {
    const response = await fetch(`${TEST_CONFIG.backendUrl}/health`);
    const healthData = await response.json();

    if (response.ok) {
      success("Backend health check passed");
      info("Health data:");
      console.log(JSON.stringify(healthData, null, 2));
      return true;
    } else {
      error(`Backend health check failed: ${response.status}`);
      console.log(healthData);
      return false;
    }
  } catch (err) {
    error(`Backend health check error: ${err.message}`);
    return false;
  }
}

/**
 * Test webhook status endpoint
 */
async function testWebhookStatus() {
  section("Webhook Status Test");

  try {
    const response = await fetch(
      `${TEST_CONFIG.backendUrl}/stripe/webhook-status`
    );
    const webhookData = await response.json();

    if (response.ok) {
      success("Webhook status check passed");
      info("Webhook data:");
      console.log(JSON.stringify(webhookData, null, 2));
      return true;
    } else {
      error(`Webhook status check failed: ${response.status}`);
      console.log(webhookData);
      return false;
    }
  } catch (err) {
    error(`Webhook status check error: ${err.message}`);
    return false;
  }
}

/**
 * Test webhook signature verification
 */
async function testWebhookSignatureVerification() {
  section("Webhook Signature Verification Test");

  try {
    // Create a test webhook payload
    const testPayload = JSON.stringify({
      id: "evt_test_webhook",
      object: "event",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test",
          customer: "cus_test",
        },
      },
    });

    // Test with invalid signature (should fail)
    try {
      StripeService.verifyWebhook(testPayload, "invalid_signature");
      error("Webhook verification should have failed with invalid signature");
      return false;
    } catch (err) {
      success("Webhook correctly rejected invalid signature");
    }

    // Note: Testing with valid signature requires actual Stripe webhook secret
    // This would be done in integration testing with real webhook events

    return true;
  } catch (err) {
    error(`Webhook signature verification test error: ${err.message}`);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData(customer) {
  section("Cleanup Test Data");

  if (!customer) {
    info("No customer to cleanup");
    return;
  }

  try {
    // Note: In a real test environment, you might want to delete test customers
    // For now, we'll just log that cleanup would happen here
    info(`Test customer ${customer.id} would be cleaned up in production test`);
    success("Cleanup completed");
  } catch (err) {
    warning(`Cleanup error: ${err.message}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log(
    `${colors.bright}${colors.magenta}🧪 PromptPilot Stripe Integration Test Suite${colors.reset}\n`
  );

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  const tests = [
    { name: "Environment Configuration", fn: testEnvironmentConfig },
    { name: "Stripe Connection", fn: testStripeConnection },
    { name: "Webhook Configuration", fn: testWebhookConfig },
    { name: "Backend Health", fn: testBackendHealth },
    { name: "Webhook Status", fn: testWebhookStatus },
    {
      name: "Webhook Signature Verification",
      fn: testWebhookSignatureVerification,
    },
  ];

  let customer = null;

  // Run basic tests first
  for (const test of tests) {
    results.total++;
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (err) {
      error(`Test "${test.name}" threw an error: ${err.message}`);
      results.failed++;
    }
  }

  // Run customer-dependent tests
  const customerTests = [
    { name: "Customer Creation", fn: () => testCustomerCreation() },
    { name: "Checkout Session", fn: (cust) => testCheckoutSession(cust) },
    { name: "Subscription Status", fn: (cust) => testSubscriptionStatus(cust) },
    { name: "Customer Portal", fn: (cust) => testCustomerPortal(cust) },
  ];

  for (const test of customerTests) {
    results.total++;
    try {
      if (test.name === "Customer Creation") {
        customer = await test.fn();
        if (customer) {
          results.passed++;
        } else {
          results.failed++;
        }
      } else {
        const passed = await test.fn(customer);
        if (passed) {
          results.passed++;
        } else {
          results.failed++;
        }
      }
    } catch (err) {
      error(`Test "${test.name}" threw an error: ${err.message}`);
      results.failed++;
    }
  }

  // Cleanup
  await cleanupTestData(customer);

  // Print results
  section("Test Results");
  log(`Total tests: ${results.total}`);
  success(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    error(`Failed: ${results.failed}`);
  } else {
    log(`Failed: ${results.failed}`, colors.green);
  }

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(
    `Success rate: ${successRate}%`,
    results.failed === 0 ? colors.green : colors.yellow
  );

  if (results.failed === 0) {
    log(
      `\n${colors.bright}${colors.green}🎉 All tests passed! Stripe integration is ready.${colors.reset}`
    );
  } else {
    log(
      `\n${colors.bright}${colors.red}❌ Some tests failed. Please check the configuration and try again.${colors.reset}`
    );
  }

  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((err) => {
    error(`Test runner error: ${err.message}`);
    process.exit(1);
  });
}

export { runTests };
