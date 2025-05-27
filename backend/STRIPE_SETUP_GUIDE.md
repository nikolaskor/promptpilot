# PromptPilot Stripe Integration Setup Guide

This guide walks you through setting up Stripe payment processing for the PromptPilot Chrome extension in both development and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Environment Configuration](#environment-configuration)
4. [Product and Price Setup](#product-and-price-setup)
5. [Webhook Configuration](#webhook-configuration)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ installed
- Stripe account (free to create)
- Chrome extension development environment
- Backend server running on localhost:4001

## Stripe Account Setup

### 1. Create Stripe Account

1. Visit [https://stripe.com](https://stripe.com)
2. Click "Start now" and create your account
3. Complete the account verification process
4. Navigate to the Stripe Dashboard

### 2. Get API Keys

1. In the Stripe Dashboard, go to **Developers > API keys**
2. Copy your **Publishable key** (starts with `pk_test_` for test mode)
3. Copy your **Secret key** (starts with `sk_test_` for test mode)
4. Keep these keys secure - never commit them to version control

### 3. Enable Test Mode

- Ensure you're in **Test mode** (toggle in the top-left of the dashboard)
- All development should be done in test mode first

## Environment Configuration

### 1. Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# OpenAI Configuration (existing)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
TEMPERATURE=0.7
MAX_TOKENS=1000

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Product IDs (will be set after creating products)
STRIPE_PREMIUM_PRICE_ID=price_premium_monthly_id_here
STRIPE_LIFETIME_PRICE_ID=price_lifetime_one_time_id_here

# Server Configuration
NODE_ENV=development
PORT=4001

# Frontend URL for CORS and redirects
FRONTEND_URL=chrome-extension://your-extension-id
```

### 2. Frontend Configuration

Update the Stripe publishable key in `src/utils/stripe-service.ts`:

```typescript
const STRIPE_PUBLISHABLE_KEY = "pk_test_your_stripe_publishable_key_here";
```

## Product and Price Setup

### 1. Create Products in Stripe Dashboard

#### Premium Subscription Product

1. Go to **Products** in the Stripe Dashboard
2. Click **+ Add product**
3. Fill in the details:
   - **Name**: PromptPilot Premium
   - **Description**: Monthly subscription for unlimited prompt improvements
   - **Image**: Upload your product image (optional)
4. Click **Save product**

#### Lifetime Access Product

1. Click **+ Add product** again
2. Fill in the details:
   - **Name**: PromptPilot Lifetime
   - **Description**: One-time payment for lifetime access
   - **Image**: Upload your product image (optional)
3. Click **Save product**

### 2. Create Prices

#### Premium Monthly Price

1. In the Premium product, click **+ Add price**
2. Configure:
   - **Pricing model**: Standard pricing
   - **Price**: $9.99
   - **Billing period**: Monthly
   - **Currency**: USD
3. Click **Save price**
4. Copy the Price ID (starts with `price_`) and add it to your `.env` file as `STRIPE_PREMIUM_PRICE_ID`

#### Lifetime One-time Price

1. In the Lifetime product, click **+ Add price**
2. Configure:
   - **Pricing model**: Standard pricing
   - **Price**: $99.99
   - **Billing period**: One time
   - **Currency**: USD
3. Click **Save price**
4. Copy the Price ID (starts with `price_`) and add it to your `.env` file as `STRIPE_LIFETIME_PRICE_ID`

## Webhook Configuration

### 1. Create Webhook Endpoint

1. In the Stripe Dashboard, go to **Developers > Webhooks**
2. Click **+ Add endpoint**
3. Configure:
   - **Endpoint URL**: `https://your-domain.com/stripe/webhook` (for production) or use ngrok for local testing
   - **Events to send**: Select these events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `checkout.session.completed`
4. Click **Add endpoint**

### 2. Get Webhook Secret

1. Click on your newly created webhook endpoint
2. In the **Signing secret** section, click **Reveal**
3. Copy the webhook secret (starts with `whsec_`)
4. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### 3. Local Testing with ngrok (Development)

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 4001

# Use the HTTPS URL for your webhook endpoint
# Example: https://abc123.ngrok.io/stripe/webhook
```

## Testing

### 1. Run the Test Suite

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run the comprehensive test suite
node test-stripe-integration.js
```

### 2. Manual Testing

#### Test Payment Flow

1. Start your backend server:

   ```bash
   npm start
   ```

2. Load your Chrome extension in development mode

3. Open the extension popup and try the upgrade flow

4. Use Stripe test card numbers:
   - **Success**: `4242424242424242`
   - **Decline**: `4000000000000002`
   - **Requires authentication**: `4000002500003155`

#### Test Webhooks

1. Use the Stripe CLI to forward webhooks to your local server:

   ```bash
   stripe listen --forward-to localhost:4001/stripe/webhook
   ```

2. Trigger test events:
   ```bash
   stripe trigger customer.subscription.created
   ```

### 3. Health Check

Visit `http://localhost:4001/health` to verify all services are configured correctly.

## Production Deployment

### 1. Environment Variables

Update your production environment variables:

```bash
# Use live Stripe keys (pk_live_ and sk_live_)
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key

# Update webhook secret for production endpoint
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Set production environment
NODE_ENV=production

# Update frontend URL to your published extension ID
FRONTEND_URL=chrome-extension://your-published-extension-id
```

### 2. Update Frontend Configuration

Update the publishable key in your frontend code to use the live key.

### 3. SSL Certificate

Ensure your production server has a valid SSL certificate. Stripe requires HTTPS for all webhook endpoints.

### 4. Webhook Endpoint

Update your webhook endpoint URL in the Stripe Dashboard to point to your production server.

## Security Considerations

### 1. API Key Security

- **Never** commit API keys to version control
- Use environment variables for all sensitive data
- Rotate keys regularly
- Use different keys for development and production

### 2. Webhook Security

- Always verify webhook signatures using `StripeService.verifyWebhook()`
- Use HTTPS for all webhook endpoints
- Implement proper error handling and logging
- Consider implementing idempotency for webhook processing

### 3. Customer Data

- Store minimal customer data
- Use Stripe Customer IDs instead of storing payment information
- Implement proper data retention policies
- Ensure GDPR compliance if applicable

### 4. Error Handling

- Never expose sensitive error details to the frontend
- Log all payment-related errors for monitoring
- Implement proper fallback mechanisms
- Use appropriate HTTP status codes

## Troubleshooting

### Common Issues

#### 1. Webhook Signature Verification Failed

**Symptoms**: Webhook endpoint returns 400 errors

**Solutions**:

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure you're using the raw request body for verification
- Check that the webhook endpoint URL matches exactly

#### 2. Invalid Price ID

**Symptoms**: Checkout session creation fails

**Solutions**:

- Verify price IDs in your `.env` file
- Ensure you're using the correct price IDs for your environment (test vs live)
- Check that the prices exist in your Stripe account

#### 3. CORS Issues

**Symptoms**: Frontend requests to backend fail

**Solutions**:

- Update CORS configuration in `backend/index.js`
- Ensure your extension ID is correct in the CORS settings
- Check that the backend URL is correct in the frontend

#### 4. Extension Permissions

**Symptoms**: Payment pages don't open or redirect properly

**Solutions**:

- Verify `tabs` permission is in your manifest
- Check that success/cancel pages are in `web_accessible_resources`
- Ensure the extension ID matches your configuration

### Debug Commands

```bash
# Test Stripe connection
curl http://localhost:4001/health

# Test webhook configuration
curl http://localhost:4001/stripe/webhook-status

# Run comprehensive tests
node backend/test-stripe-integration.js

# Check Stripe CLI events
stripe events list --limit 10
```

### Monitoring

Set up monitoring for:

- Payment success/failure rates
- Webhook processing times
- API error rates
- Customer subscription status changes

## Support

For additional help:

1. **Stripe Documentation**: [https://stripe.com/docs](https://stripe.com/docs)
2. **Stripe Support**: Available through your Stripe Dashboard
3. **Chrome Extension Documentation**: [https://developer.chrome.com/docs/extensions/](https://developer.chrome.com/docs/extensions/)

## Changelog

- **v1.0.0**: Initial Stripe integration setup
- Added comprehensive testing suite
- Added webhook security enhancements
- Added production deployment guide
