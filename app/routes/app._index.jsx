
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import {
  Page, Text, Card, DataTable, LegacyStack, Pagination,
  BlockStack, InlineGrid, TextField, Box
} from '@shopify/polaris';
import { useState, useMemo, useEffect } from 'react';

// --- Loader Function ---
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  // Use shop from session
  const cleanedShop = session.shop;

  const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL;

  const allSessions = await prisma.sessionCheckout.findMany({
    where: { shop: cleanedShop },
    select: { createdAt: true, pageViews: true, hasInitiatedCheckout: true },
    orderBy: { createdAt: 'desc' },
  });

  const dailyAggregates = allSessions.reduce((acc, session) => {
    const date = new Date(session.createdAt).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        sessionCount: 0,
        bouncedSessions: 0,
        initiatedCheckouts: 0,
      };
    }
    acc[date].sessionCount += 1;
    if (session.pageViews === 1 && !session.hasInitiatedCheckout) {
      acc[date].bouncedSessions += 1;
    }
    if (session.hasInitiatedCheckout) {
      acc[date].initiatedCheckouts += 1;
    }
    return acc;
  }, {});

  async function fetchOrdersForDate({ admin, date }) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    const query = `
      query OrdersCount($query: String) {
        ordersCount(query: $query) {
          count
          precision
        }
      }
    `;
    const variables = {
      query: `created_at:>=${start.toISOString()} created_at:<=${end.toISOString()}`
    };
    try {
      const response = await admin.graphql(query, { variables });
      const jsonData = await response.json();
      const count = jsonData?.data?.ordersCount?.count;
      return typeof count === 'number' ? count : 0;
    } catch (error) {
      return 0;
    }
  }

  let dailyStats = await Promise.all(
    Object.entries(dailyAggregates).map(async ([date, { sessionCount, bouncedSessions, initiatedCheckouts }]) => {
      const orderCount = await fetchOrdersForDate({ admin, date });
      const conversionRate = sessionCount > 0
        ? Math.min((orderCount / sessionCount) * 100, 100).toFixed(2)
        : '0.00';
      const bounceRate = sessionCount > 0
        ? Math.min((bouncedSessions / sessionCount) * 100, 100).toFixed(2)
        : '0.00';
      const checkoutInitiationRate = sessionCount > 0
        ? Math.min((initiatedCheckouts / sessionCount) * 100, 100).toFixed(2)
        : '0.00';
      return {
        date,
        sessionCount,
        orderCount,
        conversionRate: parseFloat(conversionRate),
        bouncedSessions,
        initiatedCheckouts,
        bounceRate: parseFloat(bounceRate),
        checkoutInitiationRate: parseFloat(checkoutInitiationRate),
      };
    })
  );

  dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date));
  const MAX_DAYS_TO_RETAIN = 50;
  if (dailyStats.length > MAX_DAYS_TO_RETAIN) {
    const datesToKeep = dailyStats.slice(0, MAX_DAYS_TO_RETAIN).map(stat => stat.date);
    const oldestDateToKeep = new Date(datesToKeep[datesToKeep.length - 1]);
    oldestDateToKeep.setHours(0, 0, 0, 0);
    await prisma.sessionCheckout.deleteMany({
      where: {
        shop: cleanedShop,
        createdAt: {
          lt: oldestDateToKeep,
        },
      },
    });
    dailyStats = dailyStats.slice(0, MAX_DAYS_TO_RETAIN);
  }

  const totalSessionCount = dailyStats.reduce((sum, stat) => sum + stat.sessionCount, 0);
  const totalOrderCount = dailyStats.reduce((sum, stat) => sum + stat.orderCount, 0);
  const totalBouncedSessions = dailyStats.reduce((sum, stat) => sum + stat.bouncedSessions, 0);
  const totalInitiatedCheckouts = dailyStats.reduce((sum, stat) => sum + stat.initiatedCheckouts, 0);

  const overallConversionRate = totalSessionCount > 0
    ? Math.min((totalOrderCount / totalSessionCount) * 100, 100).toFixed(2)
    : '0.00';
  const overallBounceRate = totalSessionCount > 0
    ? Math.min((totalBouncedSessions / totalSessionCount) * 100, 100).toFixed(2)
    : '0.00';
  const overallCheckoutInitiationRate = totalSessionCount > 0
    ? Math.min((totalInitiatedCheckouts / totalSessionCount) * 100, 100).toFixed(2)
    : '0.00';

  return json({
    shop: cleanedShop,
    dailyStats,
    totalSessionCount,
    totalOrderCount,
    overallConversionRate: parseFloat(overallConversionRate),
    totalBouncedSessions,
    totalInitiatedCheckouts,
    overallBounceRate: parseFloat(overallBounceRate),
    overallCheckoutInitiationRate: parseFloat(overallCheckoutInitiationRate),
    PUBLIC_APP_URL
  });
};

const ProgressBarCircle = ({ percentage, color = '#47C1BF', size = 50, strokeWidth = 5, showText = true }) => {
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        stroke="#E1E3E5"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {showText && (
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={size * 0.3}
          fill="#333"
        >
          {percentage}%
        </text>
      )}
    </svg>
  );
};

export default function SessionCountPage() {
  const {
    shop,
    dailyStats,
    totalSessionCount,
    totalOrderCount,
    overallConversionRate,
    totalBouncedSessions,
    totalInitiatedCheckouts,
    overallBounceRate,
    overallCheckoutInitiationRate,
    PUBLIC_APP_URL
  } = useLoaderData();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [Charts, setCharts] = useState(null);
  useEffect(() => {
    (async () => {
      const mod = await import('@shopify/polaris-viz');
      await import('@shopify/polaris-viz/build/esm/styles.css');
      setCharts({
        LineChart: mod.LineChart,
        BarChart: mod.BarChart,
        Spark: mod.SparkLineChart,
      });
    })();
  }, []);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const itemsPerPage = 10;
  const filteredStats = useMemo(() => {
    if (!searchQuery) {
      return dailyStats;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return dailyStats.filter(stat =>
      stat.date.includes(lowerCaseQuery) ||
      stat.sessionCount.toString().includes(lowerCaseQuery) ||
      stat.orderCount.toString().includes(lowerCaseQuery) ||
      stat.conversionRate.toString().toLowerCase().includes(lowerCaseQuery) ||
      stat.bounceRate.toString().toLowerCase().includes(lowerCaseQuery) ||
      stat.checkoutInitiationRate.toString().toLowerCase().includes(lowerCaseQuery)
    );
  }, [dailyStats, searchQuery]);
  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredStats.slice(indexOfFirstItem, indexOfLastItem);
  }, [currentPage, filteredStats, itemsPerPage]);
  const rows = currentItems.map(stat => [
    stat.date,
    stat.sessionCount,
    stat.orderCount,
    `${stat.conversionRate.toFixed(2)} %`,
    `${stat.bounceRate.toFixed(2)} %`,
    `${stat.checkoutInitiationRate.toFixed(2)} %`,
  ]);
  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };
  const chartData = useMemo(() => {
    return [...dailyStats].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dailyStats]);
  if (!Charts) return null;
  const { LineChart, BarChart, Spark } = Charts;
  return (
    <Page title="Daily Conversion & Engagement Stats" fullWidth>
      <BlockStack gap="200">
        <Text variant="headingLg" as="h1">Analytics Dashboard</Text>
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap="200">
          <Card sectioned>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">Total Sessions</Text>
              {isClient &&
                <Spark
                  data={[
                    {
                      name: 'Session Count',
                      color: '#007ACE',
                      data: chartData.map(({ date, sessionCount }) => ({
                        key: date,
                        value: sessionCount,
                      })),
                    },
                  ]}
                  accessibilityLabel="Total sessions trend"
                  theme="Default"
                />
              }
              <InlineGrid columns={2} alignItems="center">
                <Text variant="headingXl" as="p" alignment="start">
                  {totalSessionCount}
                </Text>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                </div>
              </InlineGrid>
            </BlockStack>
          </Card>
          <Card sectioned>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">Total Orders</Text>
              {isClient &&
                <Spark
                  data={[
                    {
                      name: "Order Count",
                      color: '#007ACE',
                      data: chartData.map(({ date, orderCount }) => {
                        return {
                          key: date,
                          value: orderCount,
                        };
                      })
                    }
                  ]}
                  accessibilityLabel='Total Orders'
                  theme='default'
                />
              }
              <InlineGrid columns={2} alignItems="center">
                <Text variant="headingXl" as="p" alignment="start">{totalOrderCount}</Text>
              </InlineGrid>
            </BlockStack>
          </Card>
          <Card sectioned>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">Overall Conversion Rate</Text>
              <InlineGrid columns={2} alignItems="center">
                <Text variant="headingXl" as="p" alignment="start">{overallConversionRate}%</Text>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '11px' }}>
                  <ProgressBarCircle percentage={overallConversionRate} color="#47C1BF" />
                </div>
              </InlineGrid>
            </BlockStack>
          </Card>
          <Card sectioned>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">Total Initiated Checkouts</Text>
              {isClient &&
                <Spark
                  data={[
                    {
                      name: "Order Count",
                      color: '#007ACE',
                      data: chartData.map(({ date, initiatedCheckouts }) => {
                        return {
                          key: date,
                          value: initiatedCheckouts,
                        };
                      })
                    }
                  ]}
                  accessibilityLabel='Total Orders'
                  theme='default'
                />
              }
              <InlineGrid columns={2} alignItems="center">
                <Text variant="headingXl" as="p" alignment="start">{totalInitiatedCheckouts}</Text>
              </InlineGrid>
            </BlockStack>
          </Card>
          <Card sectioned>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">Overall Checkout Initiation Rate</Text>
              <InlineGrid columns={2} alignItems="center">
                <Text variant="headingXl" as="p" alignment="start">{overallCheckoutInitiationRate}%</Text>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '11px' }}>
                  <ProgressBarCircle percentage={overallCheckoutInitiationRate} color="#ADD8E6" />
                </div>
              </InlineGrid>
            </BlockStack>
          </Card>
          <Card sectioned>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">Total Bounced Sessions</Text>
              {isClient &&
                <Spark
                  data={[
                    {
                      name: "Order Count",
                      color: '#007ACE',
                      data: chartData.map(({ date, bouncedSessions }) => {
                        return {
                          key: date,
                          value: bouncedSessions,
                        };
                      })
                    }
                  ]}
                  accessibilityLabel='Total Orders'
                  theme='default'
                />
              }
              <InlineGrid columns={2} alignItems="center">
                <Text variant="headingXl" as="p" alignment="start">{totalBouncedSessions}</Text>
              </InlineGrid>
            </BlockStack>
          </Card>
          <Card sectioned>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">Overall Bounce Rate</Text>
              <InlineGrid columns={2} alignItems="center">
                <Text variant="headingXl" as="p" alignment="start">{overallBounceRate}%</Text>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '11px' }}>
                  <ProgressBarCircle
                    percentage={overallBounceRate}
                    color={overallBounceRate < 50 ? "#92FCAC" : "#FED9DF"}
                  />
                </div>
              </InlineGrid>
            </BlockStack>
          </Card>
        </InlineGrid>
        <InlineGrid columns={{ xs: 1, sm: 1, md: 1, lg: 3, xl: 3 }} gap="200">
          {isClient && (
            <Card title="Sessions & Orders Over Time" sectioned>
              <LineChart
                data={[
                  {
                    name: 'Sessions',
                    color: '#007ACE',
                    data: chartData.map(({ date, sessionCount }) => ({
                      key: date,
                      value: sessionCount,
                    })),
                  },
                  {
                    name: 'Orders',
                    color: '#D42A2A',
                    data: chartData.map(({ date, orderCount }) => ({
                      key: date,
                      value: orderCount,
                    })),
                  },
                ]}
                xAxisOptions={{ labelFormatter: (value) => value }}
                showLegend
                theme="Default"
                isAnimated
              />
            </Card>
          )}
          {isClient && (
            <Card title="Total Sessions vs. Orders" sectioned>
              <BarChart
                data={[
                  {
                    name: 'Sessions vs Orders',
                    color: '#8884d8',
                    data: [
                      { key: 'Total Sessions', value: totalSessionCount || 0 },
                      { key: 'Total Orders', value: totalOrderCount || 0 },
                    ],
                  },
                ]}
                theme="Default"
                isAnimated
                xAxisOptions={{ labelFormatter: (value) => value }}
              />
            </Card>
          )}
          {isClient && (
            <Card title="Conversion, Checkout & Bounce Rates" sectioned>
              <BarChart
                data={[
                  {
                    name: 'Rates',
                    color: '#47C1BF',
                    data: [
                      { key: 'Conversion Rate', value: overallConversionRate || 0 },
                      { key: 'Checkout Rate', value: overallCheckoutInitiationRate || 0 },
                      { key: 'Bounce Rate', value: overallBounceRate || 0 },
                    ],
                  },
                ]}
                theme="Default"
                isAnimated
                layout="horizontal"
                xAxisOptions={{
                  labelFormatter: (value) => `${value}%`,
                }}
              />
            </Card>
          )}
        </InlineGrid>
        <Card sectioned title="Daily Performance Breakdown">
          <BlockStack gap="400">
            <TextField
              label="Search daily stats"
              value={searchQuery}
              onChange={setSearchQuery}
              clearButton
              onClearButtonClick={() => setSearchQuery('')}
              placeholder="Search by date, session, orders, conversion, bounce, or checkout initiation"
              autoComplete="off"
            />
            {filteredStats.length === 0 && searchQuery !== '' ? (
              <Text alignment="center" tone="subdued" as="p">No results found for your search query.</Text>
            ) : filteredStats.length === 0 && searchQuery === '' ? (
              <Text alignment="center" tone="subdued" as="p">No daily performance data available.</Text>
            ) : (
              <>
                <DataTable
                  columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric']}
                  headings={[
                    <b>Date</b>,
                    <b>Sessions</b>,
                    <b>Orders</b>,
                    <b>Conversion Rate</b>,
                    <b>Bounce Rate</b>,
                    <b>Checkout Init. Rate</b>,
                  ]}
                  rows={rows}
                />
                <div style={{ display: 'flex', justifyContent: 'start', marginTop: '20px' }}>
                  <Pagination
                    hasPrevious={currentPage > 1}
                    onPrevious={handlePrevious}
                    hasNext={currentPage < totalPages}
                    onNext={handleNext}
                    accessibilityLabel={`Page ${currentPage} of ${totalPages}`}
                    label={`${currentPage} / ${totalPages}`}
                  />
                </div>
              </>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
