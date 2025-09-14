import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`🔄 RESETTING ALERT FLAGS for shop: ${shop}`);
    
    // Reset all alert flags to false
    await prisma.alertSettings.update({
      where: { shop },
      data: {
        sendConversionAlert: false,
        sendSalesAlert: false,
        sendTrafficAlert: false
      }
    });
    
    console.log(`✅ Alert flags reset for shop: ${shop}`);
    
    return json({
      success: true,
      shop,
      timestamp: new Date().toISOString(),
      message: "All alert flags have been reset to false - alerts can now be triggered again"
    });
  } catch (error) {
    console.error('❌ Error resetting alert flags:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
