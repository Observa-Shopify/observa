import { json } from "@remix-run/node";
import prisma from "../db.server";
import { checkAllAlerts } from "../helpers/alertService.server";

// This endpoint can be called by a cron service like Vercel Cron, GitHub Actions, or any external cron service
export const loader = async ({ request }) => {
  try {
    // Verify the request is from an authorized source (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting automated alert check for all shops...');
    
    // Get all shops that have alert settings
    const shopsWithAlerts = await prisma.alertSettings.findMany({
      select: { shop: true },
      where: {
        OR: [
          { conversionRateLow: true },
          { orderGrowthLow: true },
          { trafficRateLow: true }
        ]
      }
    });

    if (shopsWithAlerts.length === 0) {
      console.log('No shops with enabled alerts found');
      return json({
        success: true,
        message: 'No shops with enabled alerts found',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Found ${shopsWithAlerts.length} shops with enabled alerts`);

    const results = [];
    const errors = [];

    // Process each shop
    for (const { shop } of shopsWithAlerts) {
      try {
        console.log(`Checking alerts for shop: ${shop}`);
        
        // For cron jobs, we need to create a mock admin object
        // Since we can't authenticate in a cron context, we'll use a different approach
        // We'll check alerts that don't require admin access first
        
        // Check traffic alert (doesn't need admin)
        const trafficResult = await checkTrafficAlert(shop);
        results.push({
          shop,
          alertType: 'traffic',
          result: trafficResult
        });

        // For conversion and sales alerts that need admin access,
        // we'll need to implement a different strategy
        // For now, we'll skip them in cron context
        console.log(`Completed alert check for shop: ${shop}`);
        
      } catch (error) {
        console.error(`Error checking alerts for shop ${shop}:`, error);
        errors.push({
          shop,
          error: error.message
        });
      }
    }

    console.log(`Completed automated alert check. Processed: ${results.length}, Errors: ${errors.length}`);

    return json({
      success: true,
      message: `Processed ${results.length} shops`,
      timestamp: new Date().toISOString(),
      results,
      errors
    });

  } catch (error) {
    console.error('Error in cron alert check:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// Helper function to check traffic alert (doesn't require admin access)
async function checkTrafficAlert(shop) {
  try {
    const settings = await prisma.alertSettings.findUnique({
      where: { shop },
      select: {
        trafficRateLow: true,
        sendTrafficAlert: true,
        alertEmail: true,
        slackWebhookUrl: true,
        slackEnabled: true,
        revenueRateLow: true,
        orderGrowthLow: true,
        trafficRateLow: true,
        conversionRateLow: true
      },
    });

    if (!settings || !settings.trafficRateLow) {
      return { checked: false, reason: "Alert not enabled or settings not found" };
    }

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));
    const oneWeekAgo = new Date(startOfToday);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(startOfToday);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const currentWeekCount = await prisma.trafficEvent.count({
      where: {
        shopDomain: shop,
        eventDate: { gte: oneWeekAgo, lt: endOfToday },
      },
    });

    const previousWeekCount = await prisma.trafficEvent.count({
      where: {
        shopDomain: shop,
        eventDate: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    });

    console.log(`Traffic check for ${shop}: Current week: ${currentWeekCount}, Previous week: ${previousWeekCount}`);

    // Check if traffic is down and alert hasn't been sent
    if (currentWeekCount < previousWeekCount && !settings.sendTrafficAlert) {
      console.log(`Traffic alert triggered for ${shop}`);
      
      // Import and use the sendAlert function
      const { sendAlert } = await import("../helpers/alertService.server");
      const alertResult = await sendAlert('trafficRateLow', shop, settings);
      
      if (alertResult.sent) {
        // Update flag to prevent repeated alerts
        await prisma.alertSettings.update({
          where: { shop },
          data: { sendTrafficAlert: true }
        });
      }
      
      return { checked: true, alertSent: alertResult.sent, currentWeek: currentWeekCount, previousWeek: previousWeekCount };
    }
    
    // Reset flag if traffic is back to safe zone
    if (currentWeekCount >= previousWeekCount && settings.sendTrafficAlert) {
      console.log(`Traffic back to safe zone for ${shop}, resetting alert flag`);
      await prisma.alertSettings.update({
        where: { shop },
        data: { sendTrafficAlert: false }
      });
    }

    return { checked: true, alertSent: false, currentWeek: currentWeekCount, previousWeek: previousWeekCount };
  } catch (error) {
    console.error('Error checking traffic alert:', error);
    return { checked: false, error: error.message };
  }
}
