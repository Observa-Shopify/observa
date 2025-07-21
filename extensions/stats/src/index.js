export function entryPoints() {
  return {
    web_pixel_initialize: async ({ settings }) => {
      const accountID = settings.accountID;
      console.log("Web Pixel initialized with account ID:", accountID);

      return {
        page_viewed: async ({ payload }) => {
          console.log(`Page viewed at ${payload.location.href}`);
        },
      };
    },
  };
}
