import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Page } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import VitalsView from "../components/VitalsView";
import { simulateStoreVisit } from "../helpers/simulateStoreVisit";
import { saveMetricsToDB, getAggregatedMetrics } from "../helpers/metrics.server";

let visitTriggered = false;
export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    // const baseUrl = process.env.PUBLIC_APP_URL;

    // const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL

    let apiCallSucceeded = false;

    try {
        const response = await fetch(`https://observa-two.vercel.app/api/vitals`);
        const data = await response.json();
        const metrics = data?.metrics;

        console.log("metricccc", metrics)

        if (metrics) {
            apiCallSucceeded = true;
            await saveMetricsToDB(shop, metrics);
        } else if (!visitTriggered) {
            visitTriggered = true;
            simulateStoreVisit(shop); // fire-and-forget
        }
    } catch (error) {
        console.error("Vitals API call failed:", error);
        // Continue to fetch from DB anyway
    }

    const aggregatedMetrics = await getAggregatedMetrics(shop);

    return json({
        metrics: aggregatedMetrics || null,
        embedStatus: apiCallSucceeded, // could be used to detect if JS inject worked
    });
};


export default function VitalsPage() {
    const { metrics } = useLoaderData();

    return (
        <Page title="Core Web Vitals" fullWidth>
            <BlockStack gap="400">
                <VitalsView metrics={metrics} />
            </BlockStack>
        </Page>
    );
}
