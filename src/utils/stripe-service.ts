/**
 * Frontend Stripe Service for PromptPilot Extension
 * Handles payment processing and subscription management
 * Chrome Extension compatible - no external script loading
 */

// Backend configuration
const BACKEND_URL = "https://promptpilot-production-up.railway.app";

// Type definitions
interface PricingTier {
  name: string;
  price: string;
  billing: string;
  savings: string | null;
  features: string[];
  priceId: string;
}

/**
 * Frontend Stripe Service
 */
export class StripeService {
  /**
   * Create checkout session and redirect to Stripe Checkout
   * @param email - Customer email
   * @param name - Customer name
   * @param priceId - Stripe price ID for the product
   * @param planType - 'premium' or 'lifetime'
   */
  static async createCheckoutSession(
    email: string,
    name: string,
    priceId: string,
    planType: "monthly" | "annual" | "lifetime"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("Creating checkout session for:", { email, planType });

      // Create checkout session via backend
      const response = await fetch(`${BACKEND_URL}/stripe/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          priceId,
          successUrl: `${BACKEND_URL}/stripe/success`,
          cancelUrl: `${BACKEND_URL}/stripe/cancel`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId, url, customerId, demoMode } = await response.json();

      // Handle demo mode
      if (demoMode) {
        console.log("Demo mode: Simulating checkout redirect");
        // In demo mode, just open the success page after a delay
        setTimeout(() => {
          chrome.tabs.create({ url: chrome.runtime.getURL("success.html") });
        }, 1000);
        return { success: true };
      }

      // Store customer ID for future use
      if (customerId) {
        await chrome.storage.local.set({ stripeCustomerId: customerId });
      }

      // Redirect to Stripe Checkout URL directly
      if (url) {
        await chrome.tabs.create({ url });
        return { success: true };
      }

      throw new Error("No checkout URL received from backend");
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get subscription status for current user
   */
  static async getSubscriptionStatus(): Promise<{
    status: "free" | "premium" | "lifetime";
    hasActiveSubscription: boolean;
    subscriptionId?: string;
    currentPeriodEnd?: number;
    error?: string;
    demoMode?: boolean;
  }> {
    try {
      // Get stored customer ID
      const result = await chrome.storage.local.get(["stripeCustomerId"]);
      const customerId = result.stripeCustomerId;

      if (!customerId) {
        return {
          status: "free",
          hasActiveSubscription: false,
        };
      }

      // Check subscription status via backend
      const response = await fetch(
        `${BACKEND_URL}/stripe/subscription-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customerId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get subscription status");
      }

      const statusData = await response.json();
      return statusData;
    } catch (error) {
      console.error("Error getting subscription status:", error);
      return {
        status: "free",
        hasActiveSubscription: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Open customer portal for subscription management
   */
  static async openCustomerPortal(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get stored customer ID
      const result = await chrome.storage.local.get(["stripeCustomerId"]);
      const customerId = result.stripeCustomerId;

      if (!customerId) {
        throw new Error(
          "No customer ID found. Please complete a purchase first."
        );
      }

      // Create portal session via backend
      const response = await fetch(`${BACKEND_URL}/stripe/create-portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          returnUrl: chrome.runtime.getURL("index.html"),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create portal session");
      }

      const { url, demoMode } = await response.json();

      // Handle demo mode
      if (demoMode) {
        console.log("Demo mode: Customer portal not available");
        throw new Error(
          "Customer portal not available in demo mode. Please configure Stripe API keys."
        );
      }

      // Open portal in new tab
      await chrome.tabs.create({ url });

      return { success: true };
    } catch (error) {
      console.error("Error opening customer portal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/stripe/cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscriptionId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      return { success: true };
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get pricing information from backend
   */
  static async getPricingInfo(): Promise<{
    monthly: PricingTier;
    annual: PricingTier;
    lifetime: PricingTier;
    demoMode?: boolean;
  }> {
    try {
      const response = await fetch(`${BACKEND_URL}/stripe/pricing`);

      if (!response.ok) {
        throw new Error("Failed to fetch pricing information");
      }

      const pricingData = await response.json();
      return pricingData;
    } catch (error) {
      console.error("Error fetching pricing information:", error);
      // Return fallback pricing if backend is unavailable
      return {
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
          priceId: "price_fallback_monthly",
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
          priceId: "price_fallback_annual",
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
          priceId: "price_fallback_lifetime",
        },
        demoMode: true,
      };
    }
  }

  /**
   * Check if backend is available
   */
  static async checkBackendHealth(): Promise<{
    available: boolean;
    stripeConfigured: boolean;
    demoMode: boolean;
  }> {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();

      return {
        available: data.status === "ok",
        stripeConfigured:
          data.services?.stripe?.status !== "not_tested" &&
          !data.services?.stripe?.demoMode,
        demoMode: data.services?.stripe?.demoMode || false,
      };
    } catch (error) {
      console.error("Backend health check failed:", error);
      return {
        available: false,
        stripeConfigured: false,
        demoMode: true,
      };
    }
  }

  /**
   * Clear stored customer data (for testing/reset)
   */
  static async clearCustomerData(): Promise<void> {
    try {
      await chrome.storage.local.remove(["stripeCustomerId"]);
      console.log("Cleared stored customer data");
    } catch (error) {
      console.error("Error clearing customer data:", error);
    }
  }
}

export default StripeService;
