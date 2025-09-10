import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Card,
  Text,
  Page,
  Banner,
  Badge,
  BlockStack,
  Link,
} from "@shopify/polaris";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import {
  MetricCard,
  StatsGrid,
  SparkChart,
  LoadingState
} from "../components/shared";
import { APP_CONSTANTS, formatNumber, useClientOnly } from "../utils";
import { useEffect, useState } from "react";

export const loader = async ({ request }) => {
  const {
    session: { shop },
  } = await authenticate.admin(request);

  const settings = await prisma.alertSettings.findUnique({
    where: { shop },
    select: {
      trafficRateLow: true,
      sendTrafficAlert: true,
    },
  });

  if (!settings) {
    return json({ trafficRateLow: false, sendTrafficAlert: false });
  }

  const { trafficRateLow, sendTrafficAlert } = settings;

  // console.log("settt", settings)

  let currentWeekCount = 0;
  let previousWeekCount = 0;
  let percentChange = 0;
  let monthlyAverageCount = 0;
  let appEmbedEnabled = true;
  let last30DaysTraffic = [];

  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const endOfToday = new Date(now.setHours(23, 59, 59, 999));
  const oneWeekAgo = new Date(startOfToday);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(startOfToday);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const oneMonthAgo = new Date(startOfToday);
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  currentWeekCount = await prisma.trafficEvent.count({
    where: {
      shopDomain: shop,
      eventDate: { gte: oneWeekAgo, lt: endOfToday },
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
      eventDate: { gte: oneMonthAgo, lt: endOfToday },
    },
  });

  for (let i = 0; i < 30; i++) {
    const date = new Date(oneMonthAgo);
    date.setDate(date.getDate() + i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const count = await prisma.trafficEvent.count({
      where: {
        shopDomain: shop,
        eventDate: { gte: dayStart, lt: dayEnd },
      },
    });

    last30DaysTraffic.push({
      date: date.toISOString().split('T')[0],
      count,
    });
  }

  if (
    currentWeekCount === 0 &&
    previousWeekCount === 0 &&
    monthlyCount === 0
  ) {
    appEmbedEnabled = false;
  }

  if (appEmbedEnabled) {
    percentChange =
      previousWeekCount === 0
        ? currentWeekCount > 0
          ? 100
          : 0
        : ((currentWeekCount - previousWeekCount) / previousWeekCount) * 100;
    monthlyAverageCount =
      monthlyCount > 0 ? Math.round(monthlyCount / 30) : 0;
  }

  return json({
    currentWeekCount,
    previousWeekCount,
    percentChange: Math.round(percentChange),
    monthlyAverageCount,
    appEmbedEnabled,
    last30DaysTraffic,
    trafficRateLow,
    sendTrafficAlert
  });
};

export default function TrafficDashboard() {
  const {
    currentWeekCount,
    previousWeekCount,
    percentChange,
    monthlyAverageCount,
    appEmbedEnabled,
    last30DaysTraffic,
    trafficRateLow,
    sendTrafficAlert
  } = useLoaderData();

  const isClient = useClientOnly();
  const triggerFetcher = useFetcher();
  const [alert, setAlert] = useState("");
  const isTrafficHealthy = percentChange >= 0;
  const trafficStatusColor = isTrafficHealthy ? "success" : "critical";
  const trafficStatusLabel = isTrafficHealthy ? "Healthy" : "Dropped";

  const triggerDummyAlert = (type) => {
    // console.log("ddddddddddddddddddddddd")
    triggerFetcher.submit({ type }, {
      method: "post",
      action: "/app/settings/trigger",
      encType: "application/json"
    });
    setAlert(type);
    setTimeout(() => setAlert(""), 3000);
  };

  useEffect(() => {
    console.log("trafficRateLow", trafficRateLow)
    console.log("sendTrafficAlert", sendTrafficAlert)
    console.log("currentWeekCount", currentWeekCount)
    console.log("previousWeekCount", previousWeekCount)
    
    // Send alert only when traffic is down AND flag is false
    if (trafficRateLow === true && currentWeekCount < previousWeekCount && sendTrafficAlert === false) {
      console.log("traffic rate is low, sending alert")
      triggerDummyAlert('trafficRateLow')
      
      // Set the flag to true to prevent repeated alerts
      triggerFetcher.submit({ type: 'setSendTrafficAlert', value: true }, {
        method: "post",
        action: "/app/settings/update",
        encType: "application/json"
      });
    }
    
    // Reset the flag when traffic returns to safe zone
    if (currentWeekCount >= previousWeekCount && sendTrafficAlert === true) {
      console.log("traffic rate is back to safe zone, resetting alert flag")
      triggerFetcher.submit({ type: 'setSendTrafficAlert', value: false }, {
        method: "post",
        action: "/app/settings/update",
        encType: "application/json"
      });
    }
  }, [currentWeekCount, previousWeekCount, trafficRateLow, sendTrafficAlert])

  // Prepare chart data
  const chartData = last30DaysTraffic.map(({ date, count }) => ({
    key: date,
    value: count,
  }));

  if (!isClient) {
    return (
      <Page title="Store Traffic Overview" fullWidth>
        <LoadingState message="Loading traffic data..." />
      </Page>
    );
  }

  return (
    <Page
      title="Store Traffic Overview"
      subtitle="Get insights into your store's visitor activity and trends."
      fullWidth
    >
      <BlockStack gap="500">
        {!appEmbedEnabled && (
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                App Embed is Disabled
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Please enable App Embed in your Shopify theme to begin collecting data.
              </Text>
              <Banner status="critical">
                <BlockStack gap="200">
                  <Text fontWeight="medium">
                    Your traffic data will appear here once the App Embed is active.
                  </Text>
                  <Link
                    url="https://shopify.dev/docs/apps/tools/app-bridge/getting-started/app-embeds"
                    external
                    target="_blank"
                  >
                    Learn more about App Embeds
                  </Link>
                </BlockStack>
              </Banner>
            </BlockStack>
          </Card>
        )}

        {appEmbedEnabled && (
          <>
            {/* Traffic Metrics */}
            <StatsGrid columns={{ xs: 2, md: 4 }}>
              <MetricCard
                title="Current Week Visits"
                value={currentWeekCount}
                formatValue={false}
                badge={{ text: trafficStatusLabel, tone: trafficStatusColor }}
                chart={
                  <SparkChart
                    data={chartData}
                    color={APP_CONSTANTS.COLORS.PRIMARY}
                    accessibilityLabel="Traffic trend"
                  />
                }
              />

              <MetricCard
                title="Previous Week Visits"
                value={previousWeekCount}
                formatValue={false}
              />

              <MetricCard
                title="Weekly Change"
                value={`${formatNumber(percentChange)}%`}
                formatValue={false}
                badge={{
                  text: percentChange >= 0 ? 'Up' : 'Down',
                  tone: percentChange >= 0 ? 'success' : 'critical'
                }}
              />

              <MetricCard
                title="Daily Average (30d)"
                value={monthlyAverageCount}
                formatValue={false}
                subtitle="Based on monthly data"
              />
            </StatsGrid>

            {/* Traffic Chart */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Last 30 Days Traffic</Text>
                <SparkChart
                  data={chartData}
                  color={APP_CONSTANTS.COLORS.PRIMARY}
                  accessibilityLabel="30-day traffic trend"
                />
              </BlockStack>
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  );
}

