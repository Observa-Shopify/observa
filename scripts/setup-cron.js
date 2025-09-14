#!/usr/bin/env node

/**
 * Setup script for automated alert checking
 * This script helps you set up cron jobs for your alert system
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up automated alert checking system...\n');

// Create a simple cron setup guide
const cronGuide = `# Automated Alert Checking Setup

## Option 1: Using Vercel Cron (Recommended for Vercel deployments)

1. Add this to your vercel.json:
{
  "crons": [
    {
      "path": "/api/cron-alerts",
      "schedule": "0 */6 * * *"
    }
  ]
}

2. Set environment variable:
CRON_SECRET_TOKEN=your-secret-token-here

## Option 2: Using GitHub Actions

Create .github/workflows/alert-check.yml:
name: Alert Check
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Alert Check
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron-alerts" \\
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}"

## Option 3: Using External Cron Service

Set up a cron job to call:
GET https://your-app-domain.com/api/cron-alerts
Authorization: Bearer your-secret-token

## Option 4: Using Node-cron (For self-hosted)

Install node-cron:
npm install node-cron

Create a cron job file:
const cron = require('node-cron');
const axios = require('axios');

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    await axios.get('https://your-app-domain.com/api/cron-alerts', {
      headers: {
        'Authorization': \`Bearer \${process.env.CRON_SECRET_TOKEN}\`
      }
    });
    console.log('Alert check completed');
  } catch (error) {
    console.error('Alert check failed:', error.message);
  }
});

## Manual Testing

Test the alert system manually:
curl -X GET "https://your-app-domain.com/api/check-alerts" \\
  -H "Authorization: Bearer your-shopify-session-token"

## Environment Variables

Make sure to set these environment variables:
- SMTP_HOST
- SMTP_PORT
- EMAIL
- PASSWORD
- CRON_SECRET_TOKEN (for cron endpoint security)
`;

// Write the guide to a file
const guidePath = path.join(process.cwd(), 'ALERT_SETUP.md');
fs.writeFileSync(guidePath, cronGuide);

console.log('✅ Created ALERT_SETUP.md with setup instructions');
console.log('📋 Next steps:');
console.log('1. Review ALERT_SETUP.md for setup options');
console.log('2. Choose your preferred cron method');
console.log('3. Set up the necessary environment variables');
console.log('4. Test the alert system manually first');
console.log('\n🎉 Alert system setup complete!');