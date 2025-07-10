
import { json } from "@remix-run/node";
import prisma from "../db.server";

export const loader = () => {
    // Respond to OPTIONS or any accidental GET requests
    return json({ status: "OK" }, {
        headers: { "Access-Control-Allow-Origin": "*" },
    });
};

export const action = async ({ request }) => {
    const { shop, timestamp, url } = await request.json();

    if (!shop) {
        return json({ error: 'Shop missing' }, {
            status: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
        });
    }

    await prisma.trafficEvent.create({
        data: {
            shopDomain: shop,
            eventDate: new Date(timestamp),
            pageUrl: url || '',
        },
    });

    return json({ success: true }, {
        headers: { "Access-Control-Allow-Origin": "*" },
    });
};