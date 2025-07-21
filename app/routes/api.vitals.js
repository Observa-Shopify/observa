import { json } from "@remix-run/node";

// Temporary store (Replace with DB later)
let storedMetrics = null;

const withCors = (request, response) => {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
};

export const loader = async ({ request }) => {
  const response = json({ metrics: storedMetrics || null });
  return withCors(request, response);
};

export const action = async ({ request }) => {
  const method = request.method;

  if (method === "OPTIONS") {
    return withCors(request, new Response(null, { status: 204 }));
  }

  if (method === "POST") {
    try {
      const data = await request.json();
      storedMetrics = data;
      return withCors(request, json({ success: true }));
    } catch (error) {
      console.error("Invalid JSON:", error);
      return withCors(request, new Response("Invalid data", { status: 400 }));
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};
