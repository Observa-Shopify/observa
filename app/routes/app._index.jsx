import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import {
  Page,
  BlockStack,
} from '@shopify/polaris';
import { SetupGuideExample } from '../components/SetupGuide.jsx';
import { useMemo } from 'react';
import {
  MetricCard,
  StatsGrid,
  ProgressCircle,
  EnhancedDataTable,
  SparkChart,
  LineChart,
  BarChart,
  LoadingState
} from '../components/shared';
import {
  usePagination,
  useSearch,
  useClientOnly,
  APP_CONSTANTS,
  formatNumber,
  formatDate
} from '../utils';
import { createWebPixel } from '../helpers/webPixel.server';
import { checkAllAlerts } from '../helpers/alertService.server';

// --- Loader Function ---
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  // Use shop from session

  const pixelActivation = await createWebPixel(admin); // Example account ID
  console.log("pixelActivation", pixelActivation);

  const cleanedShop = session.shop;
  const shop = cleanedShop
  const shopSlug = shop?.replace?.('.myshopify.com', '') || shop;

  const settings = await prisma.alertSettings.findUnique({
    where: { shop },
    select: {
      conversionRateLow: true,
      conversionRateThreshold: true, // 👈 include threshold
      sendConversionAlert: true,
      slackWebhookUrl: true,
      slackEnabled: true,
    },
  });

  if (!settings) {
    return json({ 
      conversionRateLow: false,
      shop: cleanedShop,
      shopSlug,
      settings: null,
      dailyStats: [],
      totalSessionCount: 0,
      totalOrderCount: 0,
      overallConversionRate: 0,
      totalBouncedSessions: 0,
      totalInitiatedCheckouts: 0,
      overallBounceRate: 0,
      overallCheckoutInitiationRate: 0,
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      conversionRateThreshold: 0
    });
  }

  const { conversionRateLow, conversionRateThreshold, sendConversionAlert } = settings;


  const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;

  try {
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

    // Check alerts automatically when dashboard loads
    console.log('Checking alerts for shop:', cleanedShop);
    try {
      const alertResults = await checkAllAlerts(cleanedShop, admin);
      console.log('Alert check results:', alertResults);
    } catch (error) {
      console.error('Error checking alerts:', error);
    }

    return json({
      shop: cleanedShop,
      shopSlug,
      settings,
      dailyStats,
      totalSessionCount,
      totalOrderCount,
      overallConversionRate: parseFloat(overallConversionRate),
      totalBouncedSessions,
      totalInitiatedCheckouts,
      overallBounceRate: parseFloat(overallBounceRate),
      overallCheckoutInitiationRate: parseFloat(overallCheckoutInitiationRate),
      SHOPIFY_APP_URL,
      conversionRateLow,
      conversionRateThreshold,
      sendConversionAlert
    });
  } catch (error) {
    console.error('Error in loader:', error);
    // Return safe defaults on error
    return json({
      shop: cleanedShop,
      shopSlug,
      settings: null,
      dailyStats: [],
      totalSessionCount: 0,
      totalOrderCount: 0,
      overallConversionRate: 0,
      totalBouncedSessions: 0,
      totalInitiatedCheckouts: 0,
      overallBounceRate: 0,
      overallCheckoutInitiationRate: 0,
      SHOPIFY_APP_URL,
      conversionRateLow,
      conversionRateThreshold: conversionRateThreshold || 0,
      sendConversionAlert: false,
    });
  }
}

export default function SessionCountPage() {
  const {
    shop,
    shopSlug,
    settings,
    dailyStats = [],
    totalSessionCount = 0,
    totalOrderCount = 0,
    overallConversionRate = 0,
    totalBouncedSessions = 0,
    totalInitiatedCheckouts = 0,
    overallBounceRate = 0,
    overallCheckoutInitiationRate = 0,
    SHOPIFY_APP_URL,
    conversionRateLow = false,
    conversionRateThreshold = 0,
    sendConversionAlert
  } = useLoaderData();

  const isClient = useClientOnly();

  // Search and pagination for daily stats table
  const searchableFields = [
    'date',
    'sessionCount',
    'orderCount',
    'conversionRate',
    'bounceRate',
    'checkoutInitiationRate'
  ];

  const { searchQuery, setSearchQuery, filteredItems, clearSearch } = useSearch(
    dailyStats,
    searchableFields
  );

  const {
    currentPage,
    totalPages,
    paginatedItems,
    handleNextPage,
    handlePreviousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination(filteredItems, APP_CONSTANTS.DEFAULT_ITEMS_PER_PAGE);

  // Prepare chart data
  const chartData = useMemo(() => {
    return [...(dailyStats || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dailyStats]);

  // Prepare table data
  const tableRows = paginatedItems.map(stat => [
    formatDate(stat.date, { month: 'short', day: 'numeric', year: 'numeric' }),
    stat.sessionCount.toString(),
    stat.orderCount.toString(),
    `${formatNumber(stat.conversionRate)}%`,
    `${formatNumber(stat.bounceRate)}%`,
    `${formatNumber(stat.checkoutInitiationRate)}%`,
  ]);

  const tableColumns = [
    'Date',
    'Sessions',
    'Orders',
    'Conversion Rate',
    'Bounce Rate',
    'Checkout Rate',
  ];

  if (!isClient) {
    return (
      <Page title="Performance Analytics" fullWidth>
        <LoadingState message="Loading dashboard..." />
      </Page>
    );
  }

  return (
    <Page 
      title="Performance Analytics" 
      fullWidth
      secondaryActions={[
        {
          content: "Settings",
          url: "/app/settings",
          accessibilityLabel: "Go to app settings"
        }
      ]}
    >
      <BlockStack gap="400">
        {/* Setup Guide – hidden automatically when complete or dismissed */}
        <SetupGuideExample settings={settings || {}} shopSlug={shopSlug} />
        {/* Key Metrics Grid */}
        <StatsGrid columns={{ xs: 2, sm: 3, md: 4, lg: 6 }}>
          {/* Total Sessions */}
          <MetricCard
            title="Total Sessions"
            value={totalSessionCount}
            formatValue={false}
            chart={
              <SparkChart
                data={chartData.map(({ date, sessionCount }) => ({
                  key: date,
                  value: sessionCount,
                }))}
                color={APP_CONSTANTS.COLORS.PRIMARY}
                accessibilityLabel="Sessions trend"
              />
            }
          />

          {/* Total Orders */}
          <MetricCard
            title="Total Orders"
            value={totalOrderCount}
            formatValue={false}
            chart={
              <SparkChart
                data={chartData.map(({ date, orderCount }) => ({
                  key: date,
                  value: orderCount,
                }))}
                color={APP_CONSTANTS.COLORS.PRIMARY}
                accessibilityLabel="Orders trend"
              />
            }
          />

          {/* Conversion Rate */}
          <MetricCard
            title="Conversion Rate"
            value={`${formatNumber(overallConversionRate)}%`}
            formatValue={false}
            icon={
              <ProgressCircle
                percentage={overallConversionRate}
                color={APP_CONSTANTS.COLORS.CONVERSION}
                size={40}
              />
            }
          />

          {/* Bounce Rate */}
          <MetricCard
            title="Bounce Rate"
            value={`${formatNumber(overallBounceRate)}%`}
            formatValue={false}
            icon={
              <ProgressCircle
                percentage={overallBounceRate}
                color={overallBounceRate < 50 ? APP_CONSTANTS.COLORS.SUCCESS : APP_CONSTANTS.COLORS.CRITICAL}
                size={40}
              />
            }
          />

          {/* Checkout Initiation Rate */}
          <MetricCard
            title="Checkout Rate"
            value={`${formatNumber(overallCheckoutInitiationRate)}%`}
            formatValue={false}
            icon={
              <ProgressCircle
                percentage={overallCheckoutInitiationRate}
                color={APP_CONSTANTS.COLORS.CHECKOUT}
                size={40}
              />
            }
          />

          {/* Bounced Sessions */}
          <MetricCard
            title="Bounced Sessions"
            value={totalBouncedSessions}
            formatValue={false}
            chart={
              <SparkChart
                data={chartData.map(({ date, bouncedSessions }) => ({
                  key: date,
                  value: bouncedSessions || 0,
                }))}
                color={APP_CONSTANTS.COLORS.CRITICAL}
                accessibilityLabel="Bounced sessions trend"
              />
            }
          />
        </StatsGrid>

        {/* Charts Grid */}
        <StatsGrid columns={{ xs: 1, md: 2, lg: 3 }}>
          <MetricCard
            title="Sessions & Orders Over Time"
            chart={
              <LineChart
                data={[
                  {
                    name: 'Sessions',
                    color: APP_CONSTANTS.COLORS.PRIMARY,
                    data: chartData.map(({ date, sessionCount }) => ({
                      key: date,
                      value: sessionCount,
                    })),
                  },
                  {
                    name: 'Orders',
                    color: APP_CONSTANTS.COLORS.CRITICAL,
                    data: chartData.map(({ date, orderCount }) => ({
                      key: date,
                      value: orderCount,
                    })),
                  },
                ]}
                xAxisOptions={{ labelFormatter: (value) => value }}
                accessibilityLabel="Sessions and orders over time"
              />
            }
          />

          <MetricCard
            title="Sessions vs Orders"
            chart={
              <BarChart
                data={[
                  {
                    name: 'Totals',
                    color: APP_CONSTANTS.COLORS.PRIMARY,
                    data: [
                      { key: 'Sessions', value: totalSessionCount || 0 },
                      { key: 'Orders', value: totalOrderCount || 0 },
                    ],
                  },
                ]}
                accessibilityLabel="Total sessions vs orders comparison"
              />
            }
          />

          <MetricCard
            title="Performance Rates"
            chart={
              <BarChart
                data={[
                  {
                    name: 'Rates',
                    color: APP_CONSTANTS.COLORS.CONVERSION,
                    data: [
                      { key: 'Conversion', value: overallConversionRate || 0 },
                      { key: 'Checkout', value: overallCheckoutInitiationRate || 0 },
                      { key: 'Bounce', value: overallBounceRate || 0 },
                    ],
                  },
                ]}
                layout="horizontal"
                xAxisOptions={{
                  labelFormatter: (value) => `${value}%`,
                }}
                accessibilityLabel="Performance rates comparison"
              />
            }
          />
        </StatsGrid>

        {/* Data Table */}
        <EnhancedDataTable
          title="Daily Performance Breakdown"
          data={tableRows}
          columns={tableColumns}
          columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric']}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={clearSearch}
          searchPlaceholder="Search by date, sessions, orders, rates..."
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
        />
      </BlockStack>
    </Page>
  );
}
