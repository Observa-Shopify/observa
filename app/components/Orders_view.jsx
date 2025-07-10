import React from 'react'
import { Page, Card, Text, BlockStack, EmptyState } from "@shopify/polaris";


const Orders_view = ({ orders, totalSales }) => {
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
            <BlockStack gap="200">
              {orders.map(order => (
                <Text key={order.id}>
                  {order.name} - ${parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)} -{" "}
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
              ))}
            </BlockStack>
          )}
        </Card>
      </BlockStack>
    </Page>
  )
}

export default Orders_view
