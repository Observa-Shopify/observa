import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { MantleClient } from "@heymantle/client";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  afterAuth: async ({ session, admin }) => {
    shopify.registerWebhooks({ session });

    // fetch current shop and identify to Mantle
    const response = await admin.graphql(
      `#graphql
        query getShop {
          shop {
            id
          }
        }`,
    );
    const responseJson = await response.json();
    const shop = responseJson.data?.shop;
    const mantleClient = new MantleClient({
      appId: process.env.MANTLE_APP_ID,
      apiKey: process.env.MANTLE_API_KEY,
    });
    const identifyResponse = await mantleClient.identify({
      platform: "shopify",
      platformId: shop.id,
      myshopifyDomain: session.shop,
      accessToken: session.accessToken,
    });
    const mantleApiToken = identifyResponse?.apiToken;
    await prisma.session.update({
      where: { id: session.id },
      data: { mantleApiToken },
    });
  },
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;