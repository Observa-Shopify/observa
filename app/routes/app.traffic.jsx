import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect } from "react";
import {
    Card,
    Text,
    Page,
    Banner,
    InlineStack,
    Badge,
    Layout,
    BlockStack,
    Divider, // Added for visual separation
    Button, // Added for potential call to action
    Link, // Added for potential external link
} from "@shopify/polaris";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { session: { shop }, admin } = await authenticate.admin(request);

    let currentWeekCount = 0;
    let previousWeekCount = 0;
    let percentChange = 0;
    let monthlyAverageCount = 0;
    let appEmbedEnabled = true;

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);

    currentWeekCount = await prisma.trafficEvent.count({
        where: {
            shopDomain: shop,
            eventDate: { gte: oneWeekAgo, lt: now },
        },
    });

    previousWeekCount = await prisma.trafficEvent.count({
        where: {
            shopDomain: shop,
            eventDate: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
    });

    const monthlyCount = await prisma.trafficEvent.count({
        where: {
            shopDomain: shop,
            eventDate: { gte: oneMonthAgo, lt: now },
        },
    });

    // Determine if app embed is enabled based on any traffic data
    // Consider if you have a more direct way to check embed status
    if (currentWeekCount === 0 && previousWeekCount === 0 && monthlyCount === 0) {
        // This logic might need refinement if there are other ways to determine appEmbedEnabled
        // For example, if you store the embed status in your DB or theme settings
        appEmbedEnabled = false;
    }

    if (appEmbedEnabled) {
        percentChange = previousWeekCount === 0
            ? (currentWeekCount === 0 ? 0 : 100) // If no previous data, show 100% increase if current data exists
            : ((currentWeekCount - previousWeekCount) / previousWeekCount) * 100;

        monthlyAverageCount = monthlyCount > 0 ? Math.round(monthlyCount / 30) : 0;
    }

    return json({
        currentWeekCount,
        previousWeekCount,
        percentChange: Math.round(percentChange),
        monthlyAverageCount,
        appEmbedEnabled
    });
};

export default function TrafficDashboard() {
    const { currentWeekCount, previousWeekCount, percentChange, monthlyAverageCount, appEmbedEnabled } = useLoaderData();

    const isTrafficHealthy = percentChange >= 0;
    const trafficStatusColor = isTrafficHealthy ? 'success' : 'critical';
    const trafficStatusLabel = isTrafficHealthy ? 'Healthy' : 'Dropped';
    const trafficChangeIndicator = percentChange > 0 ? 'increase' : 'decrease';

    // Traffic drop detection function
    useEffect(() => {
        if (appEmbedEnabled && previousWeekCount > 0 && currentWeekCount < previousWeekCount) {
            // You might want to add more sophisticated logic here, e.g.,
            // sending a notification, logging to an analytics service, etc.
            console.log("⚠️ Traffic has dropped compared to last week!");
            // Potentially show a more prominent warning in the UI here if needed
        }
    }, [previousWeekCount, currentWeekCount, appEmbedEnabled]);

    return (
        <Page title="Store Traffic Overview" subtitle="Get insights into your store's visitor activity.">

            {!appEmbedEnabled && (
                <Card sectioned>
                    <BlockStack gap="300">
                        <Text variant="headingMd" as="h2">App Embed is Disabled</Text>
                        <Text variant="bodyMd" as="p" tone="subdued">
                            To start tracking traffic and view your dashboard data, you need to enable the App Embed in your Shopify theme settings. This allows the app to collect visitor information.
                        </Text>
                        <Banner status="critical">
                            <BlockStack gap="200">
                                <Text variant="bodyLg" as="p" fontWeight="medium">
                                    Your traffic data will appear here once the App Embed is active and collecting data.
                                </Text>
                                <InlineStack>
                                    <Link url="https://shopify.dev/docs/apps/tools/app-bridge/getting-started/app-embeds" target="_blank" external>
                                        Learn more about App Embeds
                                    </Link>
                                    {/* You could add a button here if you have a direct link to the theme editor section */}
                                    {/* <Button primary onClick={() => console.log('Navigate to theme editor')}>Go to Theme Editor</Button> */}
                                </InlineStack>
                            </BlockStack>
                        </Banner>
                    </BlockStack>
                </Card>
            )}

            {appEmbedEnabled && (
                <Layout>
                    <Layout.Section>
                        <Card sectioned>
                            <BlockStack gap="300">
                                <InlineStack align="space-between" blockAlign="center">
                                    <Text variant="headingMd" as="h2">This Week's Visits</Text>
                                    <Badge tone={trafficStatusColor}>
                                        {trafficStatusLabel}
                                    </Badge>
                                </InlineStack>
                                <Text
                                    variant="heading3xl"
                                    as="p"
                                    fontWeight="bold"
                                    tone={isTrafficHealthy ? 'success' : 'critical'}
                                >
                                    {currentWeekCount.toLocaleString()}
                                </Text>
                                <Text variant="bodyMd" as="p" tone={isTrafficHealthy ? 'success' : 'critical'}>
                                    <span style={{ fontWeight: 'bold' }}>{Math.abs(percentChange)}%</span> {trafficChangeIndicator} compared to last week
                                </Text>
                                <Divider />
                                <Text variant="bodySm" as="p" tone="subdued">
                                    Total visitors to your store from {new Date(new Date().setDate(new Date().getDate() - 7)).toLocaleDateString()} to {new Date().toLocaleDateString()}.
                                </Text>
                            </BlockStack>
                        </Card>
                    </Layout.Section>

                    <Layout.Section secondary>
                        <BlockStack gap="400"> {/* Increased gap for better separation */}
                            <Card sectioned>
                                <BlockStack gap="300">
                                    <Text variant="headingMd" as="h2">Last Week's Visits</Text>
                                    <Text variant="headingXl" as="p" fontWeight="bold" tone="subdued">
                                        {previousWeekCount.toLocaleString()}
                                    </Text>
                                    <Text variant="bodySm" as="p" tone="subdued">
                                        Total visitors from {new Date(new Date().setDate(new Date().getDate() - 14)).toLocaleDateString()} to {new Date(new Date().setDate(new Date().getDate() - 7)).toLocaleDateString()}.
                                    </Text>
                                </BlockStack>
                            </Card>

                            <Card sectioned>
                                <BlockStack gap="300">
                                    <Text variant="headingMd" as="h2">Daily Average (Last 30 Days)</Text>
                                    <Text variant="headingXl" as="p" fontWeight="bold" tone="subdued">
                                        {monthlyAverageCount.toLocaleString()}
                                    </Text>
                                    <Text variant="bodySm" as="p" tone="subdued">
                                        Average visitors per day over the past month.
                                    </Text>
                                </BlockStack>
                            </Card>
                        </BlockStack>
                    </Layout.Section>
                </Layout>
            )}
        </Page>
    );
}