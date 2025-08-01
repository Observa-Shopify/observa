import { authenticate } from '../shopify.server';

export const action = async ({ request }) => {
  const { topic, shop, session } = await authenticate.webhook(request);

  console.log(topic, shop);

  const text = [`New webhook!`, `Topic: ${topic}`, `Shop: ${shop}`];

  switch (topic) {
    case 'APP_UNINSTALLED':
      //
      console.log('do something');
      break;
    case 'CUSTOMERS_DATA_REQUEST':
    case 'CUSTOMERS_REDACT':
    case 'SHOP_REDACT':
      break;
    default:
  }

  throw new Response();
};
