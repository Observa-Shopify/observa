import { json } from "@remix-run/node";
import shopify, { authenticate } from "../shopify.server";


export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const mutation = `
    mutation {
      webPixelCreate(webPixel: { settings: "{\\"accountID\\":\\"123\\"}" }) {
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

  const client = new shopify.api.clients.Graphql({ session });
  const response = await client.query({ data: mutation });

  return json(response.body);
};
