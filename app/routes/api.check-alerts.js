import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { checkAllAlerts } from "../helpers/alertService.server";

export const loader = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`Manual alert check triggered for shop: ${shop}`);
    
    const results = await checkAllAlerts(shop, admin);
    
    return json({
      success: true,
      shop,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Error in alert check API:', error);
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

    console.log(`Alert check action triggered for shop: ${shop}`);
    
    const results = await checkAllAlerts(shop, admin);
    
    return json({
      success: true,
      shop,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Error in alert check action:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
