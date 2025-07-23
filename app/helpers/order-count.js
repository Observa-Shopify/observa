export async function fetchOrderCount({ admin }) {
  const QUERY = `
    query fetchOrderIds($cursor: String) {
      orders(first: 250, after: $cursor) {
        edges {
          cursor
          node {
            id
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `;

  let hasNextPage = true;
  let cursor = null;
  let totalCount = 0;

  try {
    while (hasNextPage) {
      const response = await admin.graphql(QUERY, {
        variables: { cursor },
      });

      const json = await response.json();

      if (json.errors) {
        console.error("Shopify GraphQL errors:", json.errors);
        throw new Error("GraphQL error while paginating orders.");
      }

      const edges = json.data.orders.edges;
      totalCount += edges.length;

      hasNextPage = json.data.orders.pageInfo.hasNextPage;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
    }

    return totalCount;
  } catch (error) {
    console.error("GraphQL fetch error:", error);
    throw new Error("GraphQL query failed.");
  }
}
