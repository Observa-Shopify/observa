// Server-only helper for creating a Web Pixel via the Admin GraphQL API

// Mutation: accepts JSON settings, e.g., { accountID: "123" }
const WEB_PIXEL_CREATE_MUTATION = `
  mutation webPixelCreate($settings: JSON!) {
    webPixelCreate(webPixel: { settings: $settings }) {
      userErrors {
        code
        field
        message
      }
      webPixel {
        id
        settings
      }
    }
  }
`;

export async function createWebPixel(admin, accountID = "123") {
  const response = await admin.graphql(WEB_PIXEL_CREATE_MUTATION, {
    variables: {
      settings: { accountID },
    },
  });

  return await response.json();
}


