// extensions/pixel/src/index.js
import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, settings }) => {
  const SESSION_COOKIE_NAME = 'my_shop_session_id';
  const COOKIE_LIFETIME_SECONDS = 60 * 60; // 1 hour
  const CHECKOUT_COMPLETED_EXPIRY_SECONDS = 0;

  const TRACK_ENDPOINT = 'https://observa-two.vercel.app/api/pixel-payload';

  console.log('[Web Pixel] Shop:', settings.shop);
  console.log('[Web Pixel] Shop Domain:', settings.shopDomain);

  const reportEventToBackend = async (eventName, expireImmediately = false) => {
    try {
      let sessionId = await browser.cookie.get(SESSION_COOKIE_NAME);

      if (!sessionId) {
        sessionId = crypto.randomUUID();
        console.log('[Web Pixel] New session ID generated:', sessionId);
      } else {
        console.log('[Web Pixel] Existing session ID:', sessionId);
      }

      const expirySeconds = expireImmediately ? CHECKOUT_COMPLETED_EXPIRY_SECONDS : COOKIE_LIFETIME_SECONDS;

      await browser.cookie.set(SESSION_COOKIE_NAME, sessionId, {
        expires: expirySeconds,
        path: '/',
        secure: true,
        sameSite: 'Lax',
      });

      const shopDomain = typeof location !== 'undefined' ? `https://${location.hostname}` : settings.shopDomain;

      console.log(`[Web Pixel] Reporting event '${eventName}' for session ${sessionId} to server.`);

      const response = await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop: shopDomain,
          sessionId: sessionId,
          eventName: eventName,
        }),
      });

      const result = await response.json();
      console.log('[Web Pixel] Backend response:', result);
    } catch (err) {
      console.error('[Web Pixel] Error reporting event:', err);
    }
  };

  analytics.subscribe('page_viewed', () => {
    reportEventToBackend('page_viewed');
  });

  analytics.subscribe('checkout_started', () => {
    reportEventToBackend('checkout_started');
  });

  analytics.subscribe('checkout_completed', () => {
    reportEventToBackend('checkout_completed', true);
  });

  // Example for additional events:
  // analytics.subscribe('product_viewed', () => {
  //   reportEventToBackend('product_viewed');
  // });
});
