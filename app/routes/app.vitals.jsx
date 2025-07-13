import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import Vitals_view from "../components/Vitals_view";

// Load data from the resource route
export const loader = async ({ request }) => {
    await authenticate.admin(request);

    const baseUrl = `${process.env.APP_URL}`;

    try {
        const response = await fetch(`${baseUrl}/api/vitals`);
        const data = await response.json();

        return json({ metrics: typeof data === 'object' && data?.metrics ? data.metrics : {} });

    } catch (error) {
        console.error("Error loading metrics:", error);
        return json({ metrics: null });
    }
};


export default function VitalsPage() {
    const { metrics } = useLoaderData();

    return (
        <>
            <BlockStack gap={300}>
                <Vitals_view metrics={metrics} />
            </BlockStack>
        </>
    );
}