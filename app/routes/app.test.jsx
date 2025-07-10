import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Page, Card, Text, BlockStack, EmptyState } from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const ordersResponse = await admin.graphql(`
    {
      orders(first: 50, reverse: true) {
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
    }
  `);

  const orderEdges = ordersResponse?.body?.data?.orders?.edges ?? [];
  const orders = orderEdges.map(edge => edge.node);
    console.log("orders",orders)


  const totalSales = orders.reduce((acc, order) => {
    return acc + parseFloat(order.totalPriceSet.shopMoney.amount);
  }, 0);
    console.log("totalSales",totalSales)


  return json({ orders, totalSales });
};

export default function Dashboard() {
  const { orders, totalSales } = useLoaderData();
  console.log("orders",orders)
  console.log("totalSales",totalSales)

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
  );
}
