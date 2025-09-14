import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { sendAlert } from "../helpers/alertService.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`🧪 TESTING EMAIL for shop: ${shop}`);
    
    // Get settings for the shop
    const settings = await prisma.alertSettings.findUnique({
      where: { shop },
      select: {
        alertEmail: true,
        slackWebhookUrl: true,
        slackEnabled: true,
        revenueRateLow: true,
        orderGrowthLow: true,
        trafficRateLow: true,
        conversionRateLow: true
      },
    });

    if (!settings || !settings.alertEmail) {
      return json({
        success: false,
        error: "No email configured for this shop",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Send test email
    const result = await sendAlert('emailTest', shop, settings);
    
    console.log('🧪 Email test result:', result);
    
    return json({
      success: result.sent,
      shop,
      timestamp: new Date().toISOString(),
      message: result.sent ? "Test email sent successfully!" : "Failed to send test email",
      result
    });
  } catch (error) {
    console.error('❌ Error in email test:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`🧪 TESTING EMAIL (POST) for shop: ${shop}`);
    
    // Get settings for the shop
    const settings = await prisma.alertSettings.findUnique({
      where: { shop },
      select: {
        alertEmail: true,
        slackWebhookUrl: true,
        slackEnabled: true,
        revenueRateLow: true,
        orderGrowthLow: true,
        trafficRateLow: true,
        conversionRateLow: true
      },
    });

    if (!settings || !settings.alertEmail) {
      return json({
        success: false,
        error: "No email configured for this shop",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Send test email
    const result = await sendAlert('emailTest', shop, settings);
    
    console.log('🧪 Email test result:', result);
    
    return json({
      success: result.sent,
      shop,
      timestamp: new Date().toISOString(),
      message: result.sent ? "Test email sent successfully!" : "Failed to send test email",
      result
    });
  } catch (error) {
    console.error('❌ Error in email test:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
