# Alert System Testing Guide

## 🚀 Quick Test Setup

Your alert system is now **backend-driven** and will automatically check alerts when you visit any dashboard page. No cron jobs needed!

## 🧪 How to Test Alerts

### 1. **Enable Alert Settings**
First, make sure your alert settings are enabled in your app:
- Go to your app settings page
- Enable the alerts you want to test (conversion rate, sales growth, traffic)
- Set appropriate thresholds
- Add your email address for notifications

### 2. **Reset Alert Flags (if needed)**
If you've already triggered alerts and want to test again:
```
POST /api/reset-alert-flags
```
This resets all alert flags to `false` so alerts can be triggered again.

### 3. **Test Alerts Manually**
Visit any of these URLs to trigger alert checking:
- **Main Dashboard**: `/app` (conversion rate alerts)
- **Sales Dashboard**: `/app/sales` (sales growth alerts)  
- **Traffic Dashboard**: `/app/traffic` (traffic alerts)
- **Manual Test**: `/api/test-alerts` (all alerts)

### 4. **Check Results**
- **Console Logs**: Check your server console for detailed alert checking logs
- **Email**: Check your configured email for alert notifications
- **Slack**: Check your Slack channel if configured
- **Database**: Check the `sendConversionAlert`, `sendSalesAlert`, `sendTrafficAlert` flags

## 🔍 Alert Logic Flow

### Conversion Rate Alert
1. ✅ Check if `conversionRateLow` setting is `true`
2. ✅ Check if `sendConversionAlert` is `false` 
3. ✅ Compare current conversion rate < threshold
4. ✅ Send alert and set `sendConversionAlert` to `true`
5. ✅ Reset `sendConversionAlert` to `false` when rate >= threshold

### Sales Growth Alert  
1. ✅ Check if `orderGrowthLow` setting is `true`
2. ✅ Check if `sendSalesAlert` is `false`
3. ✅ Compare current week sales < previous week sales
4. ✅ Send alert and set `sendSalesAlert` to `true`
5. ✅ Reset `sendSalesAlert` to `false` when current >= previous

### Traffic Alert
1. ✅ Check if `trafficRateLow` setting is `true`
2. ✅ Check if `sendTrafficAlert` is `false`
3. ✅ Compare current week traffic < previous week traffic
4. ✅ Send alert and set `sendTrafficAlert` to `true`
5. ✅ Reset `sendTrafficAlert` to `false` when current >= previous

## 🐛 Troubleshooting

### Alerts Not Sending?
1. **Check Settings**: Make sure alert types are enabled in settings
2. **Check Thresholds**: Verify thresholds are set correctly
3. **Check Flags**: Use reset endpoint to clear alert flags
4. **Check Logs**: Look for error messages in console
5. **Check Email Config**: Verify SMTP settings are correct

### Console Log Messages to Look For:
```
✅ "Checking alerts for shop: your-shop.myshopify.com"
✅ "Conversion rate check for shop: 2.5% (threshold: 5.0%)"
✅ "Conversion rate alert triggered for shop - sending alert"
✅ "Alert sent and flag set to true for shop"
✅ "Alert check results: {...}"
```

### Error Messages to Watch For:
```
❌ "Conversion rate alert not enabled"
❌ "Error checking alerts: ..."
❌ "Error sending email: ..."
❌ "Settings not found for shop: ..."
```

## 🎯 Testing Scenarios

### Test Conversion Rate Alert
1. Set conversion rate threshold to a high value (e.g., 10%)
2. Reset alert flags: `POST /api/reset-alert-flags`
3. Visit main dashboard: `/app`
4. Should trigger alert if current rate < 10%

### Test Sales Growth Alert
1. Enable sales growth alert in settings
2. Reset alert flags: `POST /api/reset-alert-flags`  
3. Visit sales dashboard: `/app/sales`
4. Should trigger alert if current week sales < previous week

### Test Traffic Alert
1. Enable traffic alert in settings
2. Reset alert flags: `POST /api/reset-alert-flags`
3. Visit traffic dashboard: `/app/traffic`
4. Should trigger alert if current week traffic < previous week

## 📧 Email Testing

Make sure these environment variables are set:
- `SMTP_HOST`
- `SMTP_PORT` 
- `EMAIL`
- `PASSWORD`

Test email delivery by checking your inbox after triggering alerts.

## 🔄 Alert Flag Management

- **Reset All Flags**: `POST /api/reset-alert-flags`
- **Check Current Flags**: Look in database `alertSettings` table
- **Flags Reset Automatically**: When metrics return to safe zones

## ✅ Success Indicators

You'll know the system is working when you see:
1. Console logs showing alert checks
2. Email notifications in your inbox
3. Alert flags being set to `true` after sending
4. Flags resetting to `false` when metrics improve

The system is now **completely backend-driven** and will work automatically every time someone visits your dashboard!
