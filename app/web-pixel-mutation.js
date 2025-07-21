import shopify from './shopify.server';

const WEB_PIXEL_CREATE_MUTATION = `
  mutation webPixelCreate($webPixel: WebPixelInput!) {
    webPixelCreate(webPixel: $webPixel) {
      userErrors {
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

export async function createWebPixelForShop(shop, accessToken) {
  const client = new shopify.api.clients.Graphql({ shop, accessToken });

  const result = await client.query({
    data: {
      query: WEB_PIXEL_CREATE_MUTATION,
      variables: {
        webPixel: {
          settings: {
            accountID: "1234567890", // or pass from settings
          },
          extensionPointName: "web_pixel_initialize",
          providerId: "observa-pixel",
          accessMode: "ALL",
        },
      },
    },
  });

  if (result.body?.data?.webPixelCreate?.userErrors?.length) {
    console.error("Web Pixel creation failed:", result.body.data.webPixelCreate.userErrors);
  } else {
    console.log("Web Pixel created successfully:", result.body.data.webPixelCreate.webPixel.id);
  }
}
