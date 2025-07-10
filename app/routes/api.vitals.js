import { json } from "@remix-run/node";
import { cors } from "remix-utils/cors";

// Temporary store (Replace with DB later)
let storedMetrics = null;

export const loader = async ({ request }) => {
  const response = json({ metrics: storedMetrics || null });
  return cors(request, response, {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    headers: ["Content-Type"],
  });
};

export const action = async ({ request }) => {
  const method = request.method;

  if (method === "OPTIONS") {
    return cors(request, new Response(null, { status: 204 }), {
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      headers: ["Content-Type"],
    });
  }

  if (method === "POST") {
    try {
      const data = await request.json();
      // console.log("Received Metrics:", data);
      storedMetrics = data;

      return cors(request, json({ success: true }), {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        headers: ["Content-Type"],
      });
    } catch (error) {
      console.error("Invalid JSON:", error);
      return cors(request, new Response("Invalid data", { status: 400 }), {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        headers: ["Content-Type"],
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};