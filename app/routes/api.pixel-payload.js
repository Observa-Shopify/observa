// app/routes/api.pixel-payload.jsx
import { json } from '@remix-run/node';
import prisma from '../db.server';

// Loader for GET requests (mainly for debugging)
export const loader = async () => {
  return json(
    { ok: true, message: "This endpoint is primarily for POST requests from the Web Pixel." },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
};

// Action for POST requests (main handler for Web Pixel)
export const action = async ({ request }) => {
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const body = await request.json();
    let { shop, sessionId, eventName } = body;

    // Validate required fields
    if (!shop || !sessionId || !eventName) {
      console.error('[API] Missing required data in pixel payload:', { shop, sessionId, eventName });
      return json({ error: 'Missing shop, sessionId, or eventName' }, { status: 400 });
    }

    // Normalize the shop domain
    shop = shop.replace(/^https?:\/\//, '').toLowerCase();

    // Check if session already exists
    let sessionRecord = await prisma.sessionCheckout.findUnique({
      where: { sessionIdFromPixel: sessionId },
    });

    if (!sessionRecord) {
      // Create new session record
      sessionRecord = await prisma.sessionCheckout.create({
        data: {
          shop,
          sessionIdFromPixel: sessionId,
          pageViews: eventName === 'page_viewed' ? 1 : 0,
          hasInitiatedCheckout: eventName === 'checkout_started',
          createdAt: new Date(),
        },
      });
      console.log(`[API] Created new session record for ${sessionId} with event: ${eventName}`);
    } else {
      // Update existing session
      const updateData = {};
      if (eventName === 'page_viewed') {
        updateData.pageViews = { increment: 1 };
      }
      if (eventName === 'checkout_started') {
        updateData.hasInitiatedCheckout = true;
      }

      if (Object.keys(updateData).length > 0) {
        sessionRecord = await prisma.sessionCheckout.update({
          where: { id: sessionRecord.id },
          data: updateData,
        });
        console.log(`[API] Updated existing session record for ${sessionId} with event: ${eventName}`);
      } else {
        console.log(`[API] Received event '${eventName}' for existing session ${sessionId}, but no data to update.`);
      }
    }

    return json(
      { success: true, session: sessionRecord },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[API] Pixel payload tracking error:', error);
    return json({ error: 'Server error', details: error.message }, { status: 500 });
  }
};
