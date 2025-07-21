export const CREATE_PIXEL_MUTATION = `
mutation webPixelCreate($webPixel: WebPixelInput!) {
  webPixelCreate(webPixel: $webPixel) {
    userErrors {
      field
      message
    }
    webPixel {
      id
      settings
      status
    }
  }
}
`;
