
import { json } from "@remix-run/node";
import prisma from "../db.server";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
};

export const loader = ({ request }) => {
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }
    
    // Respond to any accidental GET requests
    return json({ status: "OK" }, {
        headers: corsHeaders,
    });
};

export const action = async ({ request }) => {
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    try {
        const { shop, timestamp, url } = await request.json();

        if (!shop) {
            return json({ error: 'Shop missing' }, {
                status: 400,
                headers: corsHeaders,
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
            headers: corsHeaders,
        });
    } catch (error) {
        console.error('[API] Track traffic error:', error);
        return json({ error: 'Server error', details: error.message }, {
            status: 500,
            headers: corsHeaders,
        });
    }
};