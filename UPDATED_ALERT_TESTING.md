# Updated Alert System Testing Guide

## 🎉 **Successfully Merged with observa-dev Branch!**

Your backend alert system has been successfully integrated with the latest observa-dev changes. Here's what's new and how to test everything:

## 🆕 **New Features Added from observa-dev**

### 1. **SetupGuide Component**
- Beautiful onboarding guide for new users
- Helps users set up Slack, App Embed, and test emails
- Automatically appears on the main dashboard
- Can be dismissed when setup is complete

### 2. **EmailTest Alert Type**
- New test email functionality for email deliverability testing
- Integrated into the SetupGuide workflow
- Helps users verify their email settings work correctly

### 3. **Enhanced UI/UX**
- Better user experience with guided setup
- Improved navigation and visual design
- More intuitive alert configuration

## 🧪 **How to Test the Updated System**

### **1. Test Email Functionality**
Visit: `/api/test-email` (GET or POST)
- Tests email delivery without triggering actual alerts
- Perfect for verifying SMTP configuration
- Uses the new `emailTest` alert type

### **2. Test All Alerts**
Visit: `/api/test-alerts` (GET or POST)
- Tests all alert types (conversion, sales, traffic)
- Shows detailed results in console logs
- Verifies backend alert system is working

### **3. Reset Alert Flags**
Visit: `/api/reset-alert-flags` (POST)
- Resets all alert flags to `false`
- Allows retesting of alert conditions
- Useful for development and testing

### **4. Test Dashboard Integration**
Visit any dashboard page:
- **Main Dashboard**: `/app` - Tests conversion rate alerts
- **Sales Dashboard**: `/app/sales` - Tests sales growth alerts  
- **Traffic Dashboard**: `/app/traffic` - Tests traffic alerts

## 🔍 **What to Look For**

### **Console Logs (Success Indicators)**
```
✅ "Checking alerts for shop: your-shop.myshopify.com"
✅ "Conversion rate check for shop: 2.5% (threshold: 5.0%)"
✅ "Conversion rate alert triggered for shop - sending alert"
✅ "Alert sent and flag set to true for shop"
✅ "Alert check results: {...}"
```

### **Email Notifications**
- Check your configured email inbox
- Look for both regular alerts and test emails
- Verify email templates are working correctly

### **SetupGuide Integration**
- Should appear on main dashboard if not completed
- Test email button should work from the guide
- Guide should disappear when all steps are complete

## 🚀 **Complete Testing Workflow**

### **Step 1: Basic Setup**
1. Go to `/app/settings` and configure:
   - Alert email address
   - Slack webhook (optional)
   - Alert thresholds
   - Enable desired alert types

### **Step 2: Test Email Delivery**
1. Visit `/api/test-email` to send a test email
2. Check your inbox (and spam folder)
3. Mark as "Not Spam" if needed
4. Complete the email test step in SetupGuide

### **Step 3: Test Alert System**
1. Reset flags: `POST /api/reset-alert-flags`
2. Visit `/api/test-alerts` to test all alerts
3. Check console logs for detailed results
4. Verify email notifications are sent

### **Step 4: Test Dashboard Integration**
1. Visit `/app` (main dashboard)
2. Check console for alert checking logs
3. Repeat for `/app/sales` and `/app/traffic`
4. Verify alerts trigger based on actual data

## 🎯 **Alert Logic Verification**

### **Conversion Rate Alert**
- ✅ Setting enabled: `conversionRateLow = true`
- ✅ Flag check: `sendConversionAlert = false`
- ✅ Threshold: Current rate < `conversionRateThreshold`
- ✅ Action: Send alert + set flag to `true`
- ✅ Reset: When rate >= threshold, set flag to `false`

### **Sales Growth Alert**
- ✅ Setting enabled: `orderGrowthLow = true`
- ✅ Flag check: `sendSalesAlert = false`
- ✅ Comparison: Current week sales < previous week sales
- ✅ Action: Send alert + set flag to `true`
- ✅ Reset: When current >= previous, set flag to `false`

### **Traffic Alert**
- ✅ Setting enabled: `trafficRateLow = true`
- ✅ Flag check: `sendTrafficAlert = false`
- ✅ Comparison: Current week traffic < previous week traffic
- ✅ Action: Send alert + set flag to `true`
- ✅ Reset: When current >= previous, set flag to `false`

## 🔧 **Troubleshooting**

### **If Alerts Don't Send**
1. Check SMTP configuration in environment variables
2. Verify alert settings are enabled in database
3. Check console logs for error messages
4. Test email delivery with `/api/test-email`

### **If SetupGuide Doesn't Appear**
1. Check if all setup steps are marked complete
2. Try refreshing the page
3. Check browser console for errors

### **If Flags Don't Reset**
1. Use `/api/reset-alert-flags` endpoint
2. Check database directly for flag values
3. Verify alert conditions are met for reset

## ✅ **Success Checklist**

- [ ] SetupGuide appears on main dashboard
- [ ] Test email sends successfully (`/api/test-email`)
- [ ] All alerts check automatically on dashboard load
- [ ] Console shows detailed alert processing logs
- [ ] Email notifications are received
- [ ] Alert flags are managed correctly
- [ ] System works independently of frontend

## 🎉 **You're All Set!**

Your backend alert system is now:
- ✅ **Fully integrated** with observa-dev branch
- ✅ **Backend-driven** and independent of frontend
- ✅ **Enhanced** with new SetupGuide and email testing
- ✅ **Ready for production** use

The system will automatically check and send alerts every time someone visits your dashboard, ensuring your merchants are always informed about their store performance!
