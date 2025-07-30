import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import {
  Card,
  Text,
  Page,
  Banner,
  InlineStack,
  Badge,
  Layout,
  BlockStack,
  Divider,
  Link,
  Box,
  Tooltip,
  InlineGrid,
} from "@shopify/polaris";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
// import { SparkLineChart as Spark } from "@shopify/polaris-viz";
import "@shopify/polaris-viz/build/esm/styles.css";

export const loader = async ({ request }) => {
  const {
    session: { shop },
  } = await authenticate.admin(request);

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
    const day = new Date(startOfToday);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const count = await prisma.trafficEvent.count({
      where: {
        shopDomain: shop,
        eventDate: { gte: day, lt: nextDay },
      },
    });

    last30DaysTraffic.unshift({
      date: day.toISOString().split("T")[0],
      trafficCount: count,
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
        ? currentWeekCount === 0
          ? 0
          : 100
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
  } = useLoaderData();

  const [Spark, setSpark] = useState(null);

  const isTrafficHealthy = percentChange >= 0;
  const trafficStatusColor = isTrafficHealthy ? "success" : "critical";
  const trafficStatusLabel = isTrafficHealthy ? "Healthy" : "Dropped";
  const trafficChangeIndicator =
    percentChange > 0 ? "increase" : "decrease";
  const changeArrow =
    percentChange > 0 ? "▲" : percentChange < 0 ? "▼" : "▬";

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Load ESM-only chart component and its styles dynamically on the client
    (async () => {
      const mod = await import('@shopify/polaris-viz');
      await import('@shopify/polaris-viz/build/esm/styles.css');
      setSpark(() => mod.SparkLineChart);
    })();
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (
      appEmbedEnabled &&
      previousWeekCount > 0 &&
      currentWeekCount < previousWeekCount
    ) {
      console.log("⚠️ Traffic has dropped compared to last week!");
    }
  }, [previousWeekCount, currentWeekCount, appEmbedEnabled]);

  const weeklyGoal = 1000;

  if (!Spark) return null;

  return (
    <Page
      title="Store Traffic Overview"
      subtitle="Get insights into your store's visitor activity and trends."
      narrowWidth
    >
      <BlockStack gap="600">
        {!appEmbedEnabled && (
          <Card sectioned>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                App Embed is Disabled
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Please enable App Embed in your Shopify theme to begin
                collecting data.
              </Text>
              <Banner status="critical">
                <BlockStack gap="200">
                  <Text fontWeight="medium">
                    Your traffic data will appear here once the App Embed is
                    active.
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
          <Layout>
            <Layout.Section>
              <Card background="bg-surface-neutral" padding="500">
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingLg" as="h2">
                      Current Week's Visits
                    </Text>
                    <Badge tone={trafficStatusColor} size="large">
                      {trafficStatusLabel}
                    </Badge>
                  </InlineStack>

                  <div style={{ marginTop: "2px" }}>
                    <InlineGrid gap={500} columns={2}>
                      <Text
                        variant="heading2xl"
                        fontWeight=""
                        tone={trafficStatusColor}
                      >
                        {currentWeekCount.toLocaleString()}
                      </Text>
                      <div
                        style={{ marginTop: "8px", marginLeft: "100px" }}
                      >
                        <Text
                          tone={trafficStatusColor}
                          fontWeight="medium"
                          variant="headingLg"
                        >
                          <strong style={{ fontSize: "30px" }}>
                            {Math.abs(percentChange)}%
                          </strong>{" "}
                          {trafficChangeIndicator}
                        </Text>
                      </div>
                    </InlineGrid>
                  </div>

                  <InlineStack gap="200" blockAlign="center">
                    <Text tone={trafficStatusColor}>{changeArrow}</Text>
                    <Tooltip
                      content={`Compared to last week's ${previousWeekCount.toLocaleString()} visits.`}
                    >
                      <Text tone="subdued">(vs. last week)</Text>
                    </Tooltip>
                  </InlineStack>

                  <Divider />

                  <BlockStack gap="300">
                    <Text variant="headingMd">Last 30 Days Trend</Text>

                    <Box
                      background="bg-surface"
                      padding="400"
                      borderRadius="300"
                      display="flex"
                      flexDirection="column"
                      alignItems="stretch"
                      minHeight="100px"
                    >
                      <Box height="60px">
                        <div style={{ paddingBottom: "20px" }}>
                          {isClient && (
                            <Spark
                              data={[
                                {
                                  name: "Visits",
                                  color: "#96cdf1ff",
                                  data: last30DaysTraffic.map(
                                    ({ date, trafficCount }) => ({
                                      key: date,
                                      value: trafficCount,
                                    })
                                  ),
                                },
                              ]}
                              accessibilityLabel="Total Visits"
                              theme="light"
                            />
                          )}
                        </div>
                      </Box>
                    </Box>

                    <Text
                      variant="bodySm"
                      tone="subdued"
                      alignment="center"
                    >
                      Daily visits over the past month.
                    </Text>
                  </BlockStack>

                  <Text variant="bodySm" tone="subdued">
                    Data covers{" "}
                    {new Date(
                      new Date().setDate(new Date().getDate() - 7)
                    ).toLocaleDateString()}{" "}
                    to {new Date().toLocaleDateString()}.
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section secondary>
              <BlockStack gap="400">
                <Card sectioned background="bg-surface-neutral">
                  <InlineGrid gap={500} columns={2}>
                    <BlockStack gap={200}>
                      <Text variant="headingMd">Last Week's Visits</Text>
                      <Text
                        variant="heading3xl"
                        fontWeight="bold"
                        tone="subdued"
                      >
                        {previousWeekCount.toLocaleString()}
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        From{" "}
                        {new Date(
                          new Date().setDate(
                            new Date().getDate() - 14
                          )
                        ).toLocaleDateString("en-US")}{" "}
                        to{" "}
                        {new Date(
                          new Date().setDate(
                            new Date().getDate() - 7
                          )
                        ).toLocaleDateString("en-US")}
                        .
                        {weeklyGoal > 0 &&
                          ` Goal: ${weeklyGoal.toLocaleString()}`}
                      </Text>
                    </BlockStack>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "end",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "110px",
                          height: "110px",
                        }}
                      >
                        <svg
                          width="110"
                          height="110"
                          viewBox="0 0 36 36"
                          style={{ transform: "rotate(-90deg)" }}
                        >
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke="#888181ff"
                            strokeWidth="3"
                          ></circle>
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke={
                              weeklyGoal > 0 &&
                              (previousWeekCount / weeklyGoal) * 100 >= 100
                                ? "#45dab4ff"
                                : weeklyGoal > 0 &&
                                  (previousWeekCount / weeklyGoal) * 100 > 50
                                ? "#a6f5e1ff"
                                : weeklyGoal > 0 &&
                                  (previousWeekCount / weeklyGoal) * 100 > 25
                                ? "#f5c66d"
                                : "#bf0711"
                            }
                            strokeWidth="2"
                            strokeDasharray={2 * Math.PI * 16}
                            strokeDashoffset={
                              weeklyGoal > 0
                                ? 2 * Math.PI * 16 -
                                  (previousWeekCount / weeklyGoal) *
                                    (2 * Math.PI * 16)
                                : 2 * Math.PI * 16
                            }
                            strokeLinecap="round"
                          ></circle>
                        </svg>

                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            fontSize: "18px",
                            fontWeight: "bold",
                            color: "#454f5b",
                            textAlign: "center",
                          }}
                        >
                          {weeklyGoal > 0
                            ? `${Math.round(
                                (previousWeekCount / weeklyGoal) * 100
                              )}%`
                            : "0%"}
                        </div>
                      </div>
                    </div>
                  </InlineGrid>
                </Card>

                <Card sectioned background="bg-surface-neutral">
                  <BlockStack gap="200">
                    <Text variant="headingMd">Daily Average</Text>
                    <Text
                      variant="heading3xl"
                      fontWeight="bold"
                      tone="subdued"
                    >
                      {monthlyAverageCount.toLocaleString()}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Avg. daily visitors (last 30 days)
                    </Text>
                  </BlockStack>
                </Card>

                <Card sectioned background="bg-surface-neutral-subdued">
                  <BlockStack gap="200">
                    <Text variant="headingMd">
                      Conversion Rate (Coming Soon)
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      Soon you'll see how many visits convert into sales.
                    </Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Box>
                        <svg width="50" height="50">
                          <circle
                            cx="25"
                            cy="25"
                            r="22"
                            stroke="#E1E3E5"
                            strokeWidth="5"
                            fill="none"
                          />
                          <circle
                            cx="25"
                            cy="25"
                            r="22"
                            stroke="#F5C026"
                            strokeWidth="5"
                            fill="none"
                            strokeDasharray="138"
                            strokeDashoffset="34"
                            strokeLinecap="round"
                            transform="rotate(-90 25 25)"
                          />
                        </svg>
                      </Box>
                      <BlockStack>
                        <Text
                          variant="headingLg"
                          tone="warning"
                          fontWeight="semibold"
                        >
                          ~X.X%
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          (Industry Avg.)
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
