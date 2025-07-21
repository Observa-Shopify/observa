import { json } from "@remix-run/node";

// In-memory store for demonstration purposes
const receivedEvents = [];

/**
 * Handles incoming POST requests from the Shopify Web Pixel Extension.
 */
export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ message: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const eventPayload = await request.json();
    console.log("Received Pixel Event:", JSON.stringify(eventPayload, null, 2));

    // Store in-memory (demo only)
    receivedEvents.push(eventPayload);

    return json({ message: "Event received successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Error processing pixel event:", error);
    return json({ message: "Error processing event" }, { status: 400 });
  }
}

/**
 * Optional: Loader to fetch stored events.
 */
export async function loader() {
  return json({ events: receivedEvents });
}
