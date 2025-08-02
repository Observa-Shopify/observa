import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, EmptyState } from "@shopify/polaris";
import { useEffect, useState } from "react";

export async function loader({ request }) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const pixelEventsApiUrl = `${baseUrl}/webhooks/pixel-events`;

  try {
    const response = await fetch(pixelEventsApiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    const data = await response.json();
    return json({ events: data.events || [] });
  } catch (error) {
    console.error("Error fetching pixel events for display:", error);
    return json({ events: [], error: error.message });
  }
}

export default function PixelEventsPage() {
  const { events, error } = useLoaderData();
  const [displayedEvents, setDisplayedEvents] = useState(events);

  useEffect(() => {
    setDisplayedEvents(events);
  }, [events]);

  return (
    <Page title="Storefront Events">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Received Storefront Events
            </Text>
            <Text as="p" variant="bodyMd">
              This page displays events captured by your Web Pixel Extension.
              Trigger events on your storefront (e.g., view a page, add to cart)
              to see them appear here.
            </Text>
            {error && (
              <Text as="p" tone="critical">
                Error loading events: {error}
              </Text>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          {displayedEvents.length === 0 ? (
            <EmptyState
              heading="No events received yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Browse your storefront or interact with products to trigger pixel events.
              </p>
            </EmptyState>
          ) : (
            <Card>
              {displayedEvents.map((event, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <Text as="h3" variant="headingSm">
                    Event Type: {event.eventType}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Timestamp: {new Date(event.timestamp).toLocaleString()}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Visitor IP: {event.visitor?.ip || "N/A"} | User Agent:{" "}
                    {event.visitor?.userAgent || "N/A"}
                  </Text>
                  <Text as="p" variant="bodySm">
                    Storefront Payload:
                  </Text>
                  <div style={{
                    backgroundColor: "#f6f6f7",
                    padding: "1rem",
                    borderRadius: "6px",
                    border: "1px solid #e1e3e5",
                    marginTop: "0.5rem"
                  }}>
                    <pre style={{
                      fontFamily: "Monaco, Consolas, 'Lucida Console', monospace",
                      fontSize: "12px",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}>
                      {JSON.stringify(event.storefrontEvent, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
