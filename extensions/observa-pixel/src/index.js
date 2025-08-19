// extensions/pixel/src/index.js
import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, settings }) => {
  const SESSION_COOKIE_NAME = 'my_shop_session_id';
  const SESSION_EXPIRY_NAME = 'my_shop_session_expiry';
  const COOKIE_LIFETIME_SECONDS = 30 * 60; // 30 minutes
  const CHECKOUT_COMPLETED_EXPIRY_SECONDS = 0;

  console.log("Pixel started with expiry tracking");

  const APP_URL = 'https://mon-cap-salmon-mitchell.trycloudflare.com';
  const TRACK_ENDPOINT = `${APP_URL}/api/pixel-payload`;

  const reportEventToBackend = async (eventName, expireImmediately = false) => {
    try {
      let sessionId = await browser.cookie.get(SESSION_COOKIE_NAME);
      let expiry = await browser.cookie.get(SESSION_EXPIRY_NAME);
      const now = Math.floor(Date.now() / 1000);

      // If expired or missing, reset session
      if (!sessionId || !expiry || now >= parseInt(expiry, 10)) {
        sessionId = crypto.randomUUID();
        console.log('[Web Pixel] New session ID generated:', sessionId);

        const expirySeconds = expireImmediately
          ? CHECKOUT_COMPLETED_EXPIRY_SECONDS
          : COOKIE_LIFETIME_SECONDS;

        const expiryTimestamp =
          expirySeconds > 0 ? now + expirySeconds : now;

        await browser.cookie.set(SESSION_COOKIE_NAME, sessionId, {
          path: '/',
          secure: true,
          sameSite: 'Lax',
        });

        await browser.cookie.set(SESSION_EXPIRY_NAME, expiryTimestamp, {
          path: '/',
          secure: true,
          sameSite: 'Lax',
        });

        console.log(
          `[Web Pixel] Session set with expiry in ${expirySeconds} seconds (Unix: ${expiryTimestamp})`
        );
      } else {
        console.log('[Web Pixel] Existing session ID still valid:', sessionId);
      }

      const shopDomain =
        typeof location !== 'undefined'
          ? `https://${location.hostname}`
          : settings.shopDomain;

      console.log(
        `[Web Pixel] Reporting event '${eventName}' for session ${sessionId} to server.`
      );

      const response = await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop: shopDomain,
          sessionId,
          eventName,
        }),
      });

      const result = await response.json();
      console.log('[Web Pixel] Backend response:', result);
    } catch (err) {
      console.error('[Web Pixel] Error reporting event:', err);
    }
  };

  analytics.subscribe('page_viewed', () => reportEventToBackend('page_viewed'));
  analytics.subscribe('checkout_started', () => reportEventToBackend('checkout_started'));
  analytics.subscribe('checkout_completed', () =>
    reportEventToBackend('checkout_completed', true)
  );

  // 👀 Watcher: Check every 15s if session expired
  setInterval(async () => {
    const expiry = await browser.cookie.get(SESSION_EXPIRY_NAME);
    const session = await browser.cookie.get(SESSION_COOKIE_NAME);
    const now = Math.floor(Date.now() / 1000);

    if (!expiry || now >= parseInt(expiry, 10)) {
      console.log('[Web Pixel] Session cookie has expired or been deleted.');
    } else {
      console.log('[Web Pixel] Session cookie still present:', session, 'expires at', expiry);
    }
  }, 15000);
});
