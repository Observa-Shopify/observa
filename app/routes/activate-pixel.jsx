import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// ✅ Correct mutation (settings is JSON, not String)
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
      settings: { accountID }, // ✅ pass as JSON, no stringify
    },
  });

  return await response.json();
}