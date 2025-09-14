# Automated Alert Checking Setup

## Overview

Your alert system has been moved from frontend to backend for better reliability and independence. The system now includes:

- **Backend Alert Service** (`app/helpers/alertService.server.js`)
- **Manual Alert Check API** (`/api/check-alerts`)
- **Automated Cron API** (`/api/cron-alerts`)
- **Removed Frontend Alert Logic** from all dashboard components

## Option 1: Using Vercel Cron (Recommended for Vercel deployments)

1. Add this to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron-alerts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

2. Set environment variable:
```
CRON_SECRET_TOKEN=your-secret-token-here
```

## Option 2: Using GitHub Actions

Create `.github/workflows/alert-check.yml`:
```yaml
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
          curl -X GET "${{ secrets.APP_URL }}/api/cron-alerts" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}"
```

## Option 3: Using External Cron Service

Set up a cron job to call:
```
GET https://your-app-domain.com/api/cron-alerts
Authorization: Bearer your-secret-token
```

## Option 4: Using Node-cron (For self-hosted)

Install node-cron:
```bash
npm install node-cron
```

Create a cron job file:
```javascript
const cron = require('node-cron');
const axios = require('axios');

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    await axios.get('https://your-app-domain.com/api/cron-alerts', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET_TOKEN}`
      }
    });
    console.log('Alert check completed');
  } catch (error) {
    console.error('Alert check failed:', error.message);
  }
});
```

## Manual Testing

Test the alert system manually:
```bash
curl -X GET "https://your-app-domain.com/api/check-alerts" \
  -H "Authorization: Bearer your-shopify-session-token"
```

## Environment Variables

Make sure to set these environment variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `EMAIL`
- `PASSWORD`
- `CRON_SECRET_TOKEN` (for cron endpoint security)

## How It Works

### Backend Alert Service
The `alertService.server.js` file contains all alert logic:
- `checkConversionRateAlert()` - Checks conversion rate against threshold
- `checkSalesAlert()` - Compares current vs previous week sales
- `checkTrafficAlert()` - Compares current vs previous week traffic
- `checkAllAlerts()` - Runs all alert checks for a shop

### Alert Flow
1. **Data Collection**: Fetches current metrics from database and Shopify API
2. **Threshold Comparison**: Compares current values against thresholds
3. **Alert Triggering**: Sends email/Slack notifications if conditions are met
4. **Flag Management**: Updates database flags to prevent duplicate alerts
5. **Reset Logic**: Resets flags when metrics return to safe zones

### API Endpoints
- **`/api/check-alerts`**: Manual trigger (requires Shopify authentication)
- **`/api/cron-alerts`**: Automated trigger (requires CRON_SECRET_TOKEN)

## Benefits of Backend Alert System

✅ **Independent of Frontend**: Alerts work even if users don't visit the dashboard
✅ **Reliable**: No dependency on browser sessions or user activity
✅ **Scalable**: Can handle multiple shops efficiently
✅ **Automated**: Runs on schedule without manual intervention
✅ **Secure**: Uses proper authentication and authorization
✅ **Maintainable**: Centralized alert logic in one place

## Next Steps

1. Choose your preferred cron method from the options above
2. Set up the necessary environment variables
3. Test the alert system manually first
4. Deploy and monitor the automated alerts
5. Adjust alert thresholds in your app settings as needed

## Troubleshooting

- Check server logs for alert processing errors
- Verify environment variables are set correctly
- Test email/Slack webhook configurations
- Monitor cron job execution logs
- Check database for alert flag states
