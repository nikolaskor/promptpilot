/**
 * Stripe Service for PromptPilot
 * Handles subscription management, payments, and webhook processing
 */

import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Stripe instance (lazy initialization)
let stripe = null;

/**
 * Initialize Stripe instance with lazy loading
 * @returns {Stripe} Stripe instance
 */
function getStripeInstance() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY environment variable is required. " +
          "Please add it to your .env file in the backend directory. " +
          "See backend/STRIPE_SETUP_GUIDE.md for setup instructions."
      );
    }

    stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });
  }

  return stripe;
}

/**
 * Stripe Service Class
 */
export class StripeService {
  /**
   * Create a new customer in Stripe
   * @param {string} email - Customer email
   * @param {string} name - Customer name
   * @param {Object} metadata - Additional customer metadata
   * @returns {Promise<Object>} Stripe customer object
   */
  static async createCustomer(email, name, metadata = {}) {
    try {
      const stripeInstance = getStripeInstance();
      const customer = await stripeInstance.customers.create({
        email,
        name,
        metadata: {
          source: "promptpilot-extension",
          ...metadata,
        },
      });

      console.log("Created Stripe customer:", customer.id);
      return customer;
    } catch (error) {
      console.error("Error creating Stripe customer:", error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   * @param {string} customerId - Stripe customer ID
   * @param {string} priceId - Stripe price ID
   * @param {string} successUrl - Success redirect URL
   * @param {string} cancelUrl - Cancel redirect URL
   * @returns {Promise<Object>} Checkout session object
   */
  static async createCheckoutSession(
    customerId,
    priceId,
    successUrl,
    cancelUrl
  ) {
    try {
      const stripeInstance = getStripeInstance();
      const session = await stripeInstance.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          source: "promptpilot-extension",
        },
      });

      console.log("Created checkout session:", session.id);
      return session;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw error;
    }
  }

  /**
   * Get customer's active subscriptions
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Array>} Array of active subscriptions
   */
  static async getCustomerSubscriptions(customerId) {
    try {
      const stripeInstance = getStripeInstance();
      const subscriptions = await stripeInstance.subscriptions.list({
        customer: customerId,
        status: "active",
      });

      return subscriptions.data;
    } catch (error) {
      console.error("Error fetching customer subscriptions:", error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Promise<Object>} Cancelled subscription object
   */
  static async cancelSubscription(subscriptionId) {
    try {
      const stripeInstance = getStripeInstance();
      const subscription = await stripeInstance.subscriptions.cancel(
        subscriptionId
      );
      console.log("Cancelled subscription:", subscriptionId);
      return subscription;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  }

  /**
   * Create a customer portal session for subscription management
   * @param {string} customerId - Stripe customer ID
   * @param {string} returnUrl - Return URL after portal session
   * @returns {Promise<Object>} Portal session object
   */
  static async createPortalSession(customerId, returnUrl) {
    try {
      const stripeInstance = getStripeInstance();
      const session = await stripeInstance.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error("Error creating portal session:", error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Verified webhook event
   */
  static verifyWebhook(payload, signature) {
    try {
      const stripeInstance = getStripeInstance();
      const event = stripeInstance.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   * @param {Object} event - Stripe webhook event
   * @returns {Promise<Object>} Processing result
   */
  static async handleWebhookEvent(event) {
    console.log("Processing webhook event:", event.type);

    try {
      switch (event.type) {
        case "customer.subscription.created":
          return await this.handleSubscriptionCreated(event.data.object);

        case "customer.subscription.updated":
          return await this.handleSubscriptionUpdated(event.data.object);

        case "customer.subscription.deleted":
          return await this.handleSubscriptionDeleted(event.data.object);

        case "invoice.payment_succeeded":
          return await this.handlePaymentSucceeded(event.data.object);

        case "invoice.payment_failed":
          return await this.handlePaymentFailed(event.data.object);

        case "checkout.session.completed":
          return await this.handleCheckoutCompleted(event.data.object);

        default:
          console.log("Unhandled webhook event type:", event.type);
          return { status: "unhandled" };
      }
    } catch (error) {
      console.error("Error handling webhook event:", error);
      throw error;
    }
  }

  /**
   * Handle subscription created event
   * @param {Object} subscription - Stripe subscription object
   */
  static async handleSubscriptionCreated(subscription) {
    console.log("Subscription created:", subscription.id);

    // Here you would typically:
    // 1. Update user's subscription status in your database
    // 2. Grant premium features access
    // 3. Send welcome email

    return {
      status: "processed",
      action: "subscription_created",
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    };
  }

  /**
   * Handle subscription updated event
   * @param {Object} subscription - Stripe subscription object
   */
  static async handleSubscriptionUpdated(subscription) {
    console.log("Subscription updated:", subscription.id);

    // Handle subscription changes (plan changes, status updates, etc.)

    return {
      status: "processed",
      action: "subscription_updated",
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  /**
   * Handle subscription deleted event
   * @param {Object} subscription - Stripe subscription object
   */
  static async handleSubscriptionDeleted(subscription) {
    console.log("Subscription deleted:", subscription.id);

    // Revoke premium access, update user status

    return {
      status: "processed",
      action: "subscription_deleted",
      subscriptionId: subscription.id,
    };
  }

  /**
   * Handle successful payment event
   * @param {Object} invoice - Stripe invoice object
   */
  static async handlePaymentSucceeded(invoice) {
    console.log("Payment succeeded for invoice:", invoice.id);

    // Update payment records, extend subscription

    return {
      status: "processed",
      action: "payment_succeeded",
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
    };
  }

  /**
   * Handle failed payment event
   * @param {Object} invoice - Stripe invoice object
   */
  static async handlePaymentFailed(invoice) {
    console.log("Payment failed for invoice:", invoice.id);

    // Handle failed payment (send notification, retry logic, etc.)

    return {
      status: "processed",
      action: "payment_failed",
      invoiceId: invoice.id,
      customerId: invoice.customer,
    };
  }

  /**
   * Handle checkout session completed event
   * @param {Object} session - Stripe checkout session object
   */
  static async handleCheckoutCompleted(session) {
    console.log("Checkout completed:", session.id);

    // Handle one-time payments (lifetime access)
    if (session.mode === "payment") {
      // Grant lifetime access
      return {
        status: "processed",
        action: "lifetime_access_granted",
        sessionId: session.id,
        customerId: session.customer,
      };
    }

    return {
      status: "processed",
      action: "checkout_completed",
      sessionId: session.id,
    };
  }

  /**
   * Get subscription status for a customer
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object>} Subscription status information
   */
  static async getSubscriptionStatus(customerId) {
    try {
      const subscriptions = await this.getCustomerSubscriptions(customerId);

      if (subscriptions.length === 0) {
        return {
          status: "free",
          hasActiveSubscription: false,
        };
      }

      const activeSubscription = subscriptions[0];

      return {
        status: "premium",
        hasActiveSubscription: true,
        subscriptionId: activeSubscription.id,
        currentPeriodEnd: activeSubscription.current_period_end,
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
      };
    } catch (error) {
      console.error("Error getting subscription status:", error);
      return {
        status: "free",
        hasActiveSubscription: false,
        error: error.message,
      };
    }
  }

  /**
   * Test Stripe connection and API access
   * @returns {Promise<boolean>} True if connection is successful
   */
  static async testConnection() {
    try {
      // Simple test: retrieve account information
      const stripeInstance = getStripeInstance();
      const account = await stripeInstance.accounts.retrieve();
      console.log("Stripe connection test successful:", account.id);
      return true;
    } catch (error) {
      console.error("Stripe connection test failed:", error.message);
      return false;
    }
  }

  /**
   * Get webhook events for monitoring (development/testing)
   * @param {number} limit - Number of events to retrieve
   * @returns {Promise<Array>} Array of webhook events
   */
  static async getWebhookEvents(limit = 10) {
    try {
      const stripeInstance = getStripeInstance();
      const events = await stripeInstance.events.list({
        limit,
        type: "customer.subscription.*",
      });
      return events.data;
    } catch (error) {
      console.error("Error fetching webhook events:", error);
      throw error;
    }
  }

  /**
   * Validate webhook configuration
   * @returns {Promise<Object>} Validation results
   */
  static async validateWebhookConfig() {
    try {
      const validation = {
        webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        priceIds: {
          premium: !!process.env.STRIPE_PREMIUM_PRICE_ID,
          lifetime: !!process.env.STRIPE_LIFETIME_PRICE_ID,
        },
        endpoints: {
          secretKey: !!process.env.STRIPE_SECRET_KEY,
          publishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
        },
      };

      // Test price ID validity if configured
      if (validation.priceIds.premium) {
        try {
          const stripeInstance = getStripeInstance();
          await stripeInstance.prices.retrieve(
            process.env.STRIPE_PREMIUM_PRICE_ID
          );
          validation.priceIds.premiumValid = true;
        } catch (error) {
          validation.priceIds.premiumValid = false;
          validation.priceIds.premiumError = error.message;
        }
      }

      if (validation.priceIds.lifetime) {
        try {
          const stripeInstance = getStripeInstance();
          await stripeInstance.prices.retrieve(
            process.env.STRIPE_LIFETIME_PRICE_ID
          );
          validation.priceIds.lifetimeValid = true;
        } catch (error) {
          validation.priceIds.lifetimeValid = false;
          validation.priceIds.lifetimeError = error.message;
        }
      }

      return validation;
    } catch (error) {
      console.error("Error validating webhook config:", error);
      throw error;
    }
  }

  /**
   * Find customer by email address
   * @param {string} email - Customer email to search for
   * @returns {Promise<Object>} Customer information including ID and subscription status
   */
  static async findCustomerByEmail(email) {
    try {
      const stripeInstance = getStripeInstance();

      // Search for customers with this email
      const customers = await stripeInstance.customers.list({
        email: email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return {
          found: false,
          message: "No customer found with this email address",
        };
      }

      const customer = customers.data[0];
      console.log("Found customer:", customer.id);

      // Check if this customer has any active subscriptions
      const subscriptions = await this.getCustomerSubscriptions(customer.id);

      return {
        found: true,
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        hasActiveSubscription: subscriptions.length > 0,
        subscriptionCount: subscriptions.length,
      };
    } catch (error) {
      console.error("Error finding customer by email:", error);
      throw error;
    }
  }
}

export default StripeService;
