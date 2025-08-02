import React from 'react'
import { Page, Card, Text, BlockStack, EmptyState } from "@shopify/polaris";


const OrdersView = ({ orders, totalSales }) => {
  return (
    <Page title="Dashboard">
      <BlockStack gap="400">
        <Card title="Total Sales" sectioned>
          <Text as="h2" variant="headingLg">
            ${totalSales.toFixed(2)}
          </Text>
        </Card>

        <Card title="Recent Orders" sectioned>
          {orders.length === 0 ? (
            <EmptyState
              heading="No orders found"
              action={{ content: 'Go to Shopify admin', url: 'https://admin.shopify.com' }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Your store doesn't have any orders yet.</p>
            </EmptyState>
          ) : (
            <BlockStack gap="300">
              {orders.map((order) => (
                <Card key={order.id} sectioned>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      {order.name}
                    </Text>
                    <Text variant="bodyMd">
                      Total: ${parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Created: {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          )}
        </Card>
      </BlockStack>
    </Page>
  )
}

export default OrdersView;
