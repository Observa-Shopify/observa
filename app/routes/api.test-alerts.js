import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { checkAllAlerts } from "../helpers/alertService.server";

export const loader = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`🧪 TESTING ALERTS for shop: ${shop}`);
    
    // Force check all alerts
    const results = await checkAllAlerts(shop, admin);
    
    console.log('🧪 Test alert results:', results);
    
    return json({
      success: true,
      shop,
      timestamp: new Date().toISOString(),
      message: "Alert test completed - check console logs and email/Slack",
      results
    });
  } catch (error) {
    console.error('❌ Error in alert test:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`🧪 TESTING ALERTS (POST) for shop: ${shop}`);
    
    // Force check all alerts
    const results = await checkAllAlerts(shop, admin);
    
    console.log('🧪 Test alert results:', results);
    
    return json({
      success: true,
      shop,
      timestamp: new Date().toISOString(),
      message: "Alert test completed - check console logs and email/Slack",
      results
    });
  } catch (error) {
    console.error('❌ Error in alert test:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
