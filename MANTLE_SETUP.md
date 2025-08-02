# Mantle Integration Setup Guide

This guide will help you complete the Mantle integration for your Shopify Remix app.

## Prerequisites

1. A Shopify Partner account
2. A Mantle account (sign up at https://mantle.com)

## Step 1: Add your app to Mantle

1. Log in to your Mantle dashboard
2. Click "Add app"
3. Once added, go to Settings for the app
4. Create a new API key
5. Note down your App ID and API Key

## Step 2: Configure Environment Variables

Add these environment variables to your `.env` file:

```bash
# Mantle Configuration
MANTLE_APP_ID=your_mantle_app_id_here
MANTLE_API_KEY=your_mantle_api_key_here
```

## Step 3: Create Plans in Mantle Dashboard

1. Go to your app in the Mantle dashboard
2. Navigate to "Plans"
3. Click "Add plan" and create at least one plan
4. Configure pricing, features, and billing cycles as needed

## Step 4: Configure Shopify App for Public Distribution

1. Go to your Shopify partner dashboard
2. Select your app
3. Click the "Choose Distribution" button
4. Select "Public distribution"

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Install your app on a test store
3. Navigate to the "Plans" page in your app
4. Verify that plans are displayed correctly
5. Test the subscription flow

## Features Implemented

- ✅ Mantle client integration
- ✅ Shop identification during app installation
- ✅ MantleProvider context setup
- ✅ Plans page with subscription functionality
- ✅ Database schema updated with mantleApiToken
- ✅ Navigation menu updated with Plans link

## File Changes Made

1. **package.json**: Added `@heymantle/polaris` dependency
2. **prisma/schema.prisma**: Added `mantleApiToken` field to Session model
3. **app/shopify.server.js**: Added Mantle client import and afterAuth hook
4. **app/routes/app.jsx**: Added MantleProvider and updated loader
5. **app/routes/app.plans.jsx**: Created new plans page

## Troubleshooting

### Common Issues

1. **Environment variables not set**: Ensure MANTLE_APP_ID and MANTLE_API_KEY are properly configured
2. **Database migration failed**: Run `npm run prisma migrate dev` to apply schema changes
3. **Plans not showing**: Verify that plans are created in your Mantle dashboard
4. **Authentication errors**: Check that your Mantle API key has the correct permissions

### Support

For Mantle-specific issues, refer to the [Mantle documentation](https://docs.mantle.com) or contact Mantle support.

For Shopify app issues, refer to the [Shopify App documentation](https://shopify.dev/docs/apps). 