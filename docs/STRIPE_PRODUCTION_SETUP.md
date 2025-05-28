# Stripe Production Setup Guide

## Overview

This guide will help you set up Stripe for production with your new three-tier pricing structure:

- **Monthly Premium**: $7.99/month
- **Annual Premium**: $69.99/year (Save 26%)
- **Lifetime Access**: $129.00 one-time (Limited Offer)

## Step 1: Create Stripe Products and Prices

### 1.1 Log into Stripe Dashboard

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle in the top-left)

### 1.2 Create Products

Navigate to **Products** → **Add product** and create:

#### Product 1: PromptPilot Premium

- **Name**: PromptPilot Premium
- **Description**: AI-powered prompt improvement tool with unlimited access
- **Statement descriptor**: PROMPTPILOT

#### Product 2: PromptPilot Annual

- **Name**: PromptPilot Annual
- **Description**: AI-powered prompt improvement tool with unlimited access (Annual billing)
- **Statement descriptor**: PROMPTPILOT

#### Product 3: PromptPilot Lifetime

- **Name**: PromptPilot Lifetime
- **Description**: AI-powered prompt improvement tool with lifetime access
- **Statement descriptor**: PROMPTPILOT

### 1.3 Create Prices

For each product, create the following prices:

#### Monthly Premium Price

- **Product**: PromptPilot Premium
- **Pricing model**: Standard pricing
- **Price**: $7.99 USD
- **Billing period**: Monthly
- **Payment type**: Recurring
- **Copy the Price ID** (starts with `price_`)

#### Annual Premium Price

- **Product**: PromptPilot Annual
- **Pricing model**: Standard pricing
- **Price**: $69.99 USD
- **Billing period**: Yearly
- **Payment type**: Recurring
- **Copy the Price ID** (starts with `price_`)

#### Lifetime Price

- **Product**: PromptPilot Lifetime
- **Pricing model**: Standard pricing
- **Price**: $129.00 USD
- **Billing period**: One time
- **Payment type**: One-time
- **Copy the Price ID** (starts with `price_`)

## Step 2: Configure Environment Variables

Create a `.env` file in your project root with the following:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
TEMPERATURE=0.7
MAX_TOKENS=1000

# Stripe Configuration (Production)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (Replace with your actual Price IDs from Step 1.3)
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id_here
STRIPE_ANNUAL_PRICE_ID=price_your_annual_price_id_here
STRIPE_LIFETIME_PRICE_ID=price_your_lifetime_price_id_here

# Application Configuration
NODE_ENV=production
FRONTEND_URL=chrome-extension://your_extension_id_here
```

### 2.1 Get Your Stripe Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Copy your **Secret key** (starts with `sk_live_`)

### 2.2 Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://your-domain.com/stripe/webhook` (or your ngrok URL for testing)
4. **Events to send**: Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 3: Test the Setup

### 3.1 Start the Backend

```bash
cd backend
node index.js
```

You should see:

```
OpenAI API Key status: Configured ✓
Stripe API Key status: Configured ✓
PromptPilot backend server running at http://localhost:4001
```

### 3.2 Test Pricing Endpoint

```bash
curl -X GET http://localhost:4001/stripe/pricing
```

Should return your three pricing tiers with real price IDs (not demo ones).

### 3.3 Test Health Check

```bash
curl -X GET http://localhost:4001/health
```

Should show all Stripe configuration as "configured".

## Step 4: Update Extension

### 4.1 Build the Extension

```bash
npm run build
```

### 4.2 Load in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

### 4.3 Test Payment Flow

1. Open the extension popup
2. Click **Upgrade to Premium**
3. Select a plan (Monthly/Annual/Lifetime)
4. Complete the test payment with Stripe test cards

## Step 5: Production Deployment

### 5.1 Deploy Backend

Deploy your backend to a production server (Heroku, Railway, DigitalOcean, etc.)

### 5.2 Update Webhook URL

Update your Stripe webhook endpoint URL to point to your production backend.

### 5.3 Update Extension

Update `BACKEND_URL` in `src/utils/stripe-service.ts` to point to your production backend.

### 5.4 Publish Extension

Submit your extension to the Chrome Web Store.

## Troubleshooting

### Common Issues

1. **"Demo mode" still showing**: Check that all environment variables are set correctly
2. **Webhook errors**: Ensure your webhook URL is accessible and the signing secret is correct
3. **Payment failures**: Verify your Stripe keys are for live mode, not test mode

### Testing with Stripe Test Mode

For testing, you can use test mode:

- Use test API keys (start with `sk_test_` and `pk_test_`)
- Use test price IDs
- Use Stripe test card numbers: `4242424242424242`

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the backend logs
3. Verify all environment variables are set
4. Test with Stripe's test mode first

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive data
- Regularly rotate your API keys
- Monitor your Stripe dashboard for unusual activity
