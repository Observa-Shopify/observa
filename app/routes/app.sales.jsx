import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  BlockStack,
  EmptyState,
  Spinner,
} from "@shopify/polaris";
import React, { useEffect, useMemo, useState } from 'react';
import {
  MetricCard,
  StatsGrid,
  EnhancedDataTable,
  LoadingState
} from '../components/shared';
import {
  usePagination,
  APP_CONSTANTS,
  formatDate,
  formatCurrency,
  calculatePercentageChange,
  getBadgeTone
} from '../utils';
import prisma from '../db.server';


// Helper function to format date for display
const formatDateDisplay = (dateString) => {
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
  const shop = session.shop

  const settings = await prisma.alertSettings.findUnique({
    where: { shop },
    select: {
      orderGrowthLow: true,
    },
  });

  const { orderGrowthLow } = settings;

  // console.log("settt", settings)

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
  console.log("allOrders (first 2):", allOrders.slice(0, 2).map(o => ({ name: o.name, createdAt: o.createdAt, createdAtDate: o.createdAtDate.toISOString() })));
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
    orderGrowthLow
  });
};

export default function SalesDashboard() {
  const {
    orders,
    totalSales,
    salesGrowthStatus,
    salesGrowthPercentage,
    averageOrderValueGrowthStatus,
    averageOrderValueGrowthPercentage,
    current7DaysSales,
    previous7DaysSales,
    orderGrowthLow
  } = useLoaderData();
    const triggerFetcher = useFetcher();
      const [alert, setAlert] = useState("");
    
  

  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading' || navigation.state === 'submitting';

  // Pagination for orders table
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedOrders,
    handleNextPage,
    handlePreviousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination(orders, APP_CONSTANTS.DEFAULT_ITEMS_PER_PAGE);

  // Prepare table data
  const tableRows = paginatedOrders.map(order => [
    order.name,
    formatCurrency(order.amount, order.currencyCode),
    formatDate(order.createdAt),
  ]);

  const tableColumns = ['Order Name', 'Total Price', 'Created At'];

  // Calculate average order value
  const currentAOV = current7DaysSales / (orders.filter(o =>
    new Date(o.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length || 1);

  const previousAOV = previous7DaysSales / (orders.filter(o => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const orderDate = new Date(o.createdAt);
    return orderDate >= twoWeeksAgo && orderDate < weekAgo;
  }).length || 1);

  // Get badge tones for growth indicators
  const salesGrowthTone = getBadgeTone('growth', salesGrowthPercentage, {
    GOOD: 5,
    AVERAGE: 0
  });

  const aovGrowthTone = getBadgeTone('growth', averageOrderValueGrowthPercentage, {
    GOOD: 5,
    AVERAGE: 0
  });

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
    // console.log("orderGrowthLow", orderGrowthLow)
    // console.log("orderGrowthLow", orderGrowthLow)
    if (orderGrowthLow === true && current7DaysSales < previous7DaysSales) {
      // console.log("orderGrowthLow rate is low")
      triggerDummyAlert('orderGrowthLow')
    }
  }, [current7DaysSales])  

  if (isLoading) {
    return (
      <Page title="Sales Dashboard" fullWidth>
        <LoadingState message="Loading sales data..." />
      </Page>
    );
  }

  return (
    <Page title="Sales Dashboard" fullWidth>
      <BlockStack gap="500">
        {/* Key Sales Metrics */}
        <StatsGrid columns={{ xs: 1, sm: 2, lg: 3 }}>
          <MetricCard
            title="Total Sales"
            value={formatCurrency(totalSales)}
            formatValue={false}
            subtitle="Overall sales volume"
            badge={{ text: 'Total', tone: 'info' }}
          />

          <MetricCard
            title="Sales Growth (7 days)"
            value={salesGrowthStatus === 'N/A' || salesGrowthStatus === 'No Sales Data'
              ? salesGrowthStatus
              : `${salesGrowthPercentage.toFixed(2)}%`}
            formatValue={false}
            subtitle={`Current: ${formatCurrency(current7DaysSales)} | Previous: ${formatCurrency(previous7DaysSales)}`}
            badge={{ text: salesGrowthStatus, tone: salesGrowthTone }}
          />

          <MetricCard
            title="Avg. Order Value Growth"
            value={averageOrderValueGrowthStatus === 'N/A' || averageOrderValueGrowthStatus === 'No AOV Data'
              ? averageOrderValueGrowthStatus
              : `${averageOrderValueGrowthPercentage.toFixed(2)}%`}
            formatValue={false}
            subtitle={`Current AOV: ${formatCurrency(currentAOV)} | Previous: ${formatCurrency(previousAOV)}`}
            badge={{ text: averageOrderValueGrowthStatus, tone: aovGrowthTone }}
          />
        </StatsGrid>

        {/* Orders Table */}
        {orders.length === 0 ? (
          <EmptyState
            heading="No orders found"
            action={{
              content: 'Go to Shopify admin',
              url: 'https://admin.shopify.com',
              external: true
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Your store doesn't have any orders yet.</p>
          </EmptyState>
        ) : (
          <EnhancedDataTable
            title="Recent Orders"
            data={tableRows}
            columns={tableColumns}
            columnContentTypes={['text', 'text', 'text']}
            searchable={false}
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onNextPage={handleNextPage}
            onPreviousPage={handlePreviousPage}
          />
        )}
      </BlockStack>
    </Page>
  );
}
