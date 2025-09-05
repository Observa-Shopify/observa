import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    // Get the update type and value from the request
    const { type, value } = await request.json();
    console.log("Updating setting:", type, value);

    // Find the settings for this shop
    const settings = await prisma.alertSettings.findUnique({ where: { shop } });
    if (!settings) {
        console.error("Settings not found for shop:", shop);
        return json({ updated: false, reason: "Settings not found." }, { status: 404 });
    }

    try {
        // Update the appropriate flag based on the type
        switch (type) {
            case 'setSendConversionAlert':
                await prisma.alertSettings.update({
                    where: { shop },
                    data: { sendConversionAlert: value }
                });
                break;
            case 'setSendSalesAlert':
                await prisma.alertSettings.update({
                    where: { shop },
                    data: { sendSalesAlert: value }
                });
                break;
            case 'setSendTrafficAlert':
                await prisma.alertSettings.update({
                    where: { shop },
                    data: { sendTrafficAlert: value }
                });
                break;
            default:
                console.error("Unknown update type:", type);
                return json({ updated: false, reason: "Unknown update type." }, { status: 400 });
        }

        console.log(`Successfully updated ${type} to ${value} for shop ${shop}`);
        return json({ updated: true, type, value });
    } catch (error) {
        console.error("Error updating settings:", error);
        return json({ updated: false, reason: error.message }, { status: 500 });
    }
};