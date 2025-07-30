    (function () {
    const shop = window.ShopifyTraffic && window.ShopifyTraffic.shop;

    console.log("📊 Traffic tracking started:", shop);

    if (!shop) return console.error("❌ No shop domain provided!");

    fetch(`https://alert-until-metro-drove.trycloudflare.com/api/track-traffic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            shop: shop,
            timestamp: Date.now(),
            url: window.location.href,
        }),
    })
        .then(response => console.log("✅ Traffic logged", response.status))
        .catch(error => console.error("❌ Traffic error", error));
})();