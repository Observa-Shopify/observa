import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import { Page, Text, Card, DataTable, LegacyStack, Pagination, BlockStack, InlineGrid, TextField } from '@shopify/polaris';
import { useState, useMemo } from 'react';

// --- Helper: Fetch orders for a specific date ---
export async function fetchOrdersForDate({ admin, date }) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const query = `
    query OrdersCount($query: String) {
      ordersCount(query: $query) {
        count
        precision
      }
    }
  `;
  const variables = {
    query: `created_at:>=${startStr} created_at:<${endStr}`,
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

// --- Loader Function ---
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const rawShop = url.searchParams.get('shop');

  if (!rawShop) {
    console.error("Loader Error: Missing shop parameter in request URL.");
    throw new Response('Missing shop parameter', { status: 400 });
  }

  const cleanedShop = rawShop.replace(/^https?:\/\//, '').toLowerCase();
  console.log(`Loader: Processing data for shop: ${cleanedShop}`);

  const allSessions = await prisma.sessionCheckout.findMany({
    where: { shop: cleanedShop },
    select: { createdAt: true, pageViews: true, hasInitiatedCheckout: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Loader: Fetched ${allSessions.length} session records from database.`);

  const dailyAggregates = allSessions.reduce((acc, session) => {
    const date = session.createdAt.toISOString().split('T')[0];

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
        conversionRate,
        bouncedSessions,
        initiatedCheckouts,
        bounceRate,
        checkoutInitiationRate,
      };
    })
  );

  dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date));

  const MAX_DAYS_TO_RETAIN = 50;
  if (dailyStats.length > MAX_DAYS_TO_RETAIN) {
    const datesToKeep = dailyStats.slice(0, MAX_DAYS_TO_RETAIN).map(stat => stat.date);
    const oldestDateToKeep = new Date(datesToKeep[datesToKeep.length - 1]);
    oldestDateToKeep.setHours(0, 0, 0, 0);

    console.log(`Loader: Deleting session records older than ${oldestDateToKeep.toISOString()}`);
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
    overallConversionRate,
    totalBouncedSessions,
    totalInitiatedCheckouts,
    overallBounceRate,
    overallCheckoutInitiationRate,
  });
};

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
  } = useLoaderData();

  console.log("UI Component: Data received from loader:", {
    dailyStatsLength: dailyStats.length,
    totalSessionCount,
    totalOrderCount,
    overallConversionRate,
    overallBounceRate,
    overallCheckoutInitiationRate
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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
      stat.conversionRate.toLowerCase().includes(lowerCaseQuery) ||
      stat.bounceRate.toLowerCase().includes(lowerCaseQuery) ||
      stat.checkoutInitiationRate.toLowerCase().includes(lowerCaseQuery)
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
    `${stat.conversionRate}%`,
    `${stat.bounceRate}%`,
    `${stat.checkoutInitiationRate}%`,
  ]);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <Page title="Daily Conversion & Engagement Stats" fullWidth>
      <BlockStack gap="200">
        <Text variant="bodyMd" as="h1">Analytics Dashboard</Text>

        <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap="200">
          <Card sectioned>
            <Text variant="headingMd" as="h2">Total Sessions (Last 50 Days)</Text>
            <Text variant="headingXl" as="p" alignment="start">{totalSessionCount}</Text>
          </Card>
          <Card sectioned>
            <Text variant="headingMd" as="h2">Total Orders (Last 50 Days)</Text>
            <Text variant="headingXl" as="p" alignment="start">{totalOrderCount}</Text>
          </Card>
          <Card sectioned>
            <Text variant="headingMd" as="h2">Overall Conversion Rate</Text>
            <Text variant="headingXl" as="p" alignment="start">{overallConversionRate}%</Text>
          </Card>
          <Card sectioned>
            <Text variant="headingMd" as="h2">Total Initiated Checkouts</Text>
            <Text variant="headingXl" as="p" alignment="start">{totalInitiatedCheckouts}</Text>
          </Card>
          <Card sectioned>
            <Text variant="headingMd" as="h2">Overall Checkout Initiation Rate</Text>
            <Text variant="headingXl" as="p" alignment="start">{overallCheckoutInitiationRate}%</Text>
          </Card>
          <Card sectioned>
            <Text variant="headingMd" as="h2">Total Bounced Sessions</Text>
            <Text variant="headingXl" as="p" alignment="start">{totalBouncedSessions}</Text>
          </Card>
          <Card sectioned>
            <Text variant="headingMd" as="h2">Overall Bounce Rate</Text>
            <Text variant="headingXl" as="p" alignment="start">{overallBounceRate}%</Text>
          </Card>
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
