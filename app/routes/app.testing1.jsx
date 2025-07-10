import { json } from "@remix-run/node";
import { useLoaderData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  Text,
  BlockStack,
  EmptyState,
  DataTable,
  Pagination,
  Box,
  InlineStack,
  Spinner,
  LegacyCard // Using LegacyCard for a slightly different visual if desired, or stick to Card
} from "@shopify/polaris";
// Removed all icon imports as requested
import React, { useState, useMemo } from 'react';


// Helper function to format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  // Define date ranges for analytics relative to the current moment (UTC milliseconds)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const ordersResponse = await admin.graphql(
    `#graphql
    query getRecentOrders($first: Int!) {
      orders(first: $first, reverse: true) {
        edges {
          node {
            id
            name
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            createdAt
          }
        }
      }
    }`,
    {
      variables: {
        first: 100 // Fetch up to 100 recent orders for analytics calculation
      }
    }
  );

  const ordersData = await ordersResponse.json();
  const orderEdges = ordersData?.data?.orders?.edges ?? [];

  const allOrders = orderEdges.map(edge => ({
    id: edge.node.id,
    name: edge.node.name,
    amount: parseFloat(edge.node.totalPriceSet.shopMoney.amount),
    currencyCode: edge.node.totalPriceSet.shopMoney.currencyCode,
    createdAt: edge.node.createdAt,
    createdAtDate: new Date(edge.node.createdAt)
  }));

  allOrders.sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());

  const totalSales = allOrders.reduce((acc, order) => acc + order.amount, 0);

  let current7DaysSales = 0;
  let previous7DaysSales = 0;
  let current7DaysOrderCount = 0;
  let previous7DaysOrderCount = 0;

  allOrders.forEach(order => {
    if (order.createdAtDate.getTime() >= sevenDaysAgo.getTime() && order.createdAtDate.getTime() <= now.getTime()) {
      current7DaysSales += order.amount;
      current7DaysOrderCount++;
    } else if (order.createdAtDate.getTime() >= fourteenDaysAgo.getTime() && order.createdAtDate.getTime() < sevenDaysAgo.getTime()) {
      previous7DaysSales += order.amount;
      previous7DaysOrderCount++;
    }
  });

  let salesGrowthStatus = 'N/A';
  let salesGrowthPercentage = 0;
  let averageOrderValueGrowthStatus = 'N/A';
  let averageOrderValueGrowthPercentage = 0;

  if (previous7DaysSales > 0) {
    salesGrowthPercentage = ((current7DaysSales - previous7DaysSales) / previous7DaysSales) * 100;
    if (salesGrowthPercentage > 0) {
      salesGrowthStatus = 'Growth Up';
    } else if (salesGrowthPercentage < 0) {
      salesGrowthStatus = 'Growth Down';
    } else {
      salesGrowthStatus = 'No Change';
    }
  } else if (current7DaysSales > 0) {
    salesGrowthStatus = 'New Sales';
  } else {
    salesGrowthStatus = 'No Sales Data';
  }

  const avgCurrent7DaysOrderValue = current7DaysOrderCount > 0 ? current7DaysSales / current7DaysOrderCount : 0;
  const avgPrevious7DaysOrderValue = previous7DaysOrderCount > 0 ? previous7DaysSales / previous7DaysOrderCount : 0;

  if (avgPrevious7DaysOrderValue > 0) {
    averageOrderValueGrowthPercentage = ((avgCurrent7DaysOrderValue - avgPrevious7DaysOrderValue) / avgPrevious7DaysOrderValue) * 100;
    if (averageOrderValueGrowthPercentage > 0) {
      averageOrderValueGrowthStatus = 'Growth Up';
    } else if (averageOrderValueGrowthPercentage < 0) {
      averageOrderValueGrowthStatus = 'Growth Down';
    } else {
      averageOrderValueGrowthStatus = 'No Change';
    }
  } else if (avgCurrent7DaysOrderValue > 0) {
    averageOrderValueGrowthStatus = 'New Data';
  } else {
    averageOrderValueGrowthStatus = 'No AOV Data';
  }

  console.log("--- Loader Data ---");
  console.log("now (UTC ms):", now.getTime(), now.toISOString());
  console.log("sevenDaysAgo (UTC ms):", sevenDaysAgo.getTime(), sevenDaysAgo.toISOString());
  console.log("fourteenDaysAgo (UTC ms):", fourteenDaysAgo.getTime(), fourteenDaysAgo.toISOString());
  console.log("allOrders (first 2):", allOrders.slice(0,2).map(o => ({name: o.name, createdAt: o.createdAt, createdAtDate: o.createdAtDate.toISOString()})));
  console.log("current7DaysSales:", current7DaysSales.toFixed(2), "count:", current7DaysOrderCount);
  console.log("previous7DaysSales:", previous7DaysSales.toFixed(2), "count:", previous7DaysOrderCount);
  console.log("salesGrowthStatus:", salesGrowthStatus);
  console.log("salesGrowthPercentage:", salesGrowthPercentage.toFixed(2));
  console.log("averageOrderValueGrowthStatus:", averageOrderValueGrowthStatus);
  console.log("averageOrderValueGrowthPercentage:", averageOrderValueGrowthPercentage.toFixed(2));
  console.log("-------------------");

  return json({
    orders: allOrders,
    totalSales,
    salesGrowthStatus,
    salesGrowthPercentage,
    averageOrderValueGrowthStatus,
    averageOrderValueGrowthPercentage,
    current7DaysSales,
    previous7DaysSales,
  });
};

export default function Dashboard() {
  const {
    orders,
    totalSales,
    salesGrowthStatus,
    salesGrowthPercentage,
    averageOrderValueGrowthStatus,
    averageOrderValueGrowthPercentage,
    current7DaysSales,
    previous7DaysSales,
  } = useLoaderData();

  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading' || navigation.state === 'submitting';

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(orders.length / itemsPerPage);

  const paginatedOrders = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return orders.slice(startIndex, endIndex);
  }, [orders, currentPage, itemsPerPage]);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const rows = paginatedOrders.map(order => [
    order.name,
    `${order.currencyCode} ${order.amount.toFixed(2)}`,
    formatDate(order.createdAt),
  ]);

  // Determine color for sales growth status (no icons)
  const getGrowthTone = (status) => {
    switch (status) {
      case 'Growth Up':
        return 'success';
      case 'Growth Down':
        return 'critical';
      case 'No Change':
        return 'warning';
      case 'New Sales':
      case 'New Data':
        return 'success'; // Treat new sales as positive growth
      default: // N/A, No Sales Data, No AOV Data
        return 'subdued';
    }
  };

  const salesGrowthTone = getGrowthTone(salesGrowthStatus);
  const aovGrowthTone = getGrowthTone(averageOrderValueGrowthStatus);

  return (
    <Page title="Sales Dashboard" fullWidth>
      <BlockStack gap="500">
        {isLoading ? (
          <Box padding="500" alignment="center">
            <Spinner accessibilityLabel="Loading orders" size="large" />
            <Text as="p" alignment="center" variant="bodyLg" tone="subdued">Loading dashboard data...</Text>
          </Box>
        ) : (
          <>
            {/* Sales and Analytics Cards */}
            <InlineStack gap="400" wrap={true} align="stretch">
              {/* Total Sales Card - Enhanced */}
              <Card background="bg-surface-active" sectioned flexGrow={1}>
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd" tone="subdued">TOTAL SALES</Text>
                  {/* Removed Icon */}
                </InlineStack>
                <Box paddingBlockStart="200">
                  <Text as="p" variant="heading2xl" tone="success">
                    ${totalSales.toFixed(2)}
                  </Text>
                </Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Overall sales volume.
                </Text>
              </Card>

              {/* Sales Growth Card - Enhanced */}
              <Card background="bg-surface-active" sectioned flexGrow={1}>
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd" tone="subdued">SALES GROWTH</Text>
                  {/* Removed Icon */}
                </InlineStack>
                <Box paddingBlockStart="200">
                  <Text as="p" variant="heading2xl" tone={salesGrowthTone}>
                    {salesGrowthStatus === 'N/A' || salesGrowthStatus === 'No Sales Data' ? salesGrowthStatus : `${salesGrowthPercentage.toFixed(2)}%`}
                  </Text>
                </Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Last 7 Days: ${current7DaysSales.toFixed(2)} | Prior 7 Days: ${previous7DaysSales.toFixed(2)}
                </Text>
              </Card>

              {/* Avg. Order Value Growth Card - Enhanced */}
              <Card background="bg-surface-active" sectioned flexGrow={1}>
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd" tone="subdued">AVG. ORDER VALUE GROWTH</Text>
                  {/* Removed Icon */}
                </InlineStack>
                <Box paddingBlockStart="200">
                  <Text as="p" variant="heading2xl" tone={aovGrowthTone}>
                    {averageOrderValueGrowthStatus === 'N/A' || averageOrderValueGrowthStatus === 'No AOV Data' ? averageOrderValueGrowthStatus : `${averageOrderValueGrowthPercentage.toFixed(2)}%`}
                  </Text>
                </Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Compares average order value over time.
                </Text>
              </Card>
            </InlineStack>

            {/* Recent Orders Table */}
            <Card sectioned>
              <Text as="h2" variant="headingLg">Recent Orders</Text>
              {orders.length === 0 ? (
                <EmptyState
                  heading="No orders found"
                  action={{ content: 'Go to Shopify admin', url: 'https://admin.shopify.com' }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Your store doesn't have any orders yet.</p>
                </EmptyState>
              ) : (
                <BlockStack gap="400">
                  <DataTable
                    columnContentTypes={['text', 'numeric', 'text']}
                    headings={['Order Name', 'Total Price', 'Created At']}
                    rows={rows}
                  />
                  <Box paddingBlockStart="400">
                    <Pagination
                      hasPrevious={currentPage > 0}
                      onPrevious={handlePreviousPage}
                      hasNext={currentPage < totalPages - 1}
                      onNext={handleNextPage}
                      label={`Page ${currentPage + 1} of ${totalPages}`}
                    />
                  </Box>
                </BlockStack>
              )}
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  );
}
