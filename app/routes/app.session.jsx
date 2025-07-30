import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import {
  Page, Text, Card, DataTable, LegacyStack, Pagination,
  BlockStack, InlineGrid, TextField, Box // Import Box for padding
} from '@shopify/polaris';
import { useState, useMemo, useEffect } from 'react';
// import {
//   LineChart,
//   BarChart as PolarisBarChart,
//   SparkLineChart as Spark,
// } from '@shopify/polaris-viz';
// import '@shopify/polaris-viz/build/esm/styles.css';

// --- Loader Function ---
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const rawShop = url.searchParams.get('shop');

  const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL
  console.log("URL", PUBLIC_APP_URL)

  if (!rawShop) {
    console.error("Loader Error: Missing shop parameter in request URL.");
    throw new Response('Missing shop parameter', { status: 400 });
  }

  const cleanedShop = rawShop.replace(/^https?:\/\//, '').toLowerCase();
  // console.log(Loader: Processing data for shop: ${ cleanedShop });

  const allSessions = await prisma.sessionCheckout.findMany({
    where: { shop: cleanedShop },
    select: { createdAt: true, pageViews: true, hasInitiatedCheckout: true },
    orderBy: { createdAt: 'desc' },
  });

  // console.log(Loader: Fetched ${ allSessions.length } session records from database.);

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

  console.log(`Loader: Aggregated data for ${Object.keys(dailyAggregates).length} days.`);

  let dailyStats = await Promise.all(
    Object.entries(dailyAggregates).map(async ([date, { sessionCount, bouncedSessions, initiatedCheckouts }]) => {
      const orderCount = await fetchOrdersForDate({ admin, date });

      console.log(`Loader: Date ${date} - Sessions: ${sessionCount}, Orders: ${orderCount}`);

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


  dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort descending by date

  // --- Data Retention Logic (Keep only the latest 50 days) ---
  const MAX_DAYS_TO_RETAIN = 50;
  if (dailyStats.length > MAX_DAYS_TO_RETAIN) {
    const datesToKeep = dailyStats.slice(0, MAX_DAYS_TO_RETAIN).map(stat => stat.date);
    const oldestDateToKeep = new Date(datesToKeep[datesToKeep.length - 1]);
    oldestDateToKeep.setHours(0, 0, 0, 0);

    // console.log(Loader: Deleting session records older than ${ oldestDateToKeep.toISOString() });
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

  console.log("Loader: Returning final data to UI.");
  return json({
    shop: cleanedShop,
    dailyStats,
    totalSessionCount,
    totalOrderCount,
    overallConversionRate: parseFloat(overallConversionRate), // Pass as number
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

// A simple icon component that changes based on props
const MetricIcon = ({ type, value }) => {
  let backgroundColor = "#E1E3E5"; // Default grey
  let shapeStyle = {
    height: "50px",
    width: '50px',
    margin: "0 0 0 80px", // Adjust margin as needed
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  };
  let iconContent = ''; // Default empty

  switch (type) {
    case 'sessions':
      backgroundColor = value > 0 ? "#92FCAC" : "#FED9DF"; // Green for positive, red for zero/negative
      shapeStyle.borderRadius = "50%"; // Circle
      iconContent = value > 0 ? '📈' : '📉'; // Up arrow or down arrow emoji
      break;
    case 'orders':
      backgroundColor = value > 0 ? "#92FCAC" : "#FED9DF";
      shapeStyle.borderRadius = "8px"; // Square
      iconContent = value > 0 ? '🛍️' : '🚫'; // Shopping bag or no entry emoji
      break;
    case 'checkout':
      backgroundColor = value > 0 ? "#ADD8E6" : "#E1E3E5"; // Light blue for checkouts
      shapeStyle.borderRadius = "8px";
      iconContent = '🛒'; // Shopping cart emoji
      break;
    case 'bounce':
      backgroundColor = parseFloat(value) < 50 ? "#92FCAC" : "#FED9DF";
      shapeStyle.borderRadius = "50%";
      iconContent = parseFloat(value) < 50 ? '📈' : '📈'; // Checkmark or cross emoji
      break;
    default:
      break;
  }

  return (
    <div style={{ backgroundColor, ...shapeStyle }}>
      {iconContent}
    </div>
  );
};

// --- Helper: Fetch orders for a specific date ---
export async function fetchOrdersForDate({ admin, date }) {
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
    console.error("Error fetching orders for date:", date, error);
    return 0;
  }
}


// --- UI Component ---
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

  // Debugging: Log the data received by the UI component
  // console.log("UI Component: Data received from loader:", {
  //     dailyStatsLength: dailyStats.length,
  //     totalSessionCount,
  //     totalOrderCount,
  //     overallConversionRate,
  //     overallBounceRate,
  //     overallCheckoutInitiationRate
  // });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isClient, setIsClient] = useState(false);

  const [Charts, setCharts] = useState(null);


  useEffect(() => {
    (async () => {
      // Dynamically load ESM-only Polaris Viz and its styles
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
    `${stat.conversionRate.toFixed(2)} %`,       // now a proper string
    `${stat.bounceRate.toFixed(2)} %`,
    `${stat.checkoutInitiationRate.toFixed(2)} %`,
  ]);


  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Prepare data for Recharts (e.g., Sales Over Time)
  // Sort dailyStats ascending by date for chart display in line/bar charts
  const chartData = useMemo(() => {
    return [...dailyStats].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dailyStats]);

  // Data for the new RadialBarChart for Overall Sessions vs. Orders
  const overallSessionOrderData = [
    { name: 'Total Sessions', value: totalSessionCount, fill: '#8884d8' }, // Example color
    { name: 'Total Orders', value: totalOrderCount, fill: '#82ca9d' }, // Example color
  ];

  if (!Charts) return null;

  const { LineChart, BarChart, Spark } = Charts;


  return (
    <Page title="Daily Conversion & Engagement Stats" fullWidth>
      <BlockStack gap="200"> {/* Increased gap for better spacing */}
        <Text variant="headingLg" as="h1">Analytics Dashboard</Text> {/* Made main title larger */}

        {/* KPI Cards with Visual Graphics (unchanged from previous response) */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap="200">
          <Card sectioned>
            <BlockStack gap="100"> {/* Consistent vertical spacing for text */}
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
                  {/* <MetricIcon type="sessions" value={totalSessionCount} /> */}

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
                {/* <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <MetricIcon type="orders" value={totalOrderCount} />
                                </div> */}
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
                {/* <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <MetricIcon type="checkout" value={totalInitiatedCheckouts} />
                                </div> */}
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
                {/* <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <MetricIcon type="bounce" value={overallBounceRate} />
                                </div> */}
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

        {/* Charts Section */}
        <InlineGrid columns={{ xs: 1, sm: 1, md: 1, lg: 3, xl: 3 }} gap="200">

          {/* 📊 1. Sessions & Orders Over Time */}
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

          {/* 📊 2. Total Sessions vs. Orders: Bar Chart */}
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

          {/* 📊 3. Rate Breakdown: Horizontal Bar Chart */}
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

        {/* Daily Performance Breakdown Table (unchanged) */}
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