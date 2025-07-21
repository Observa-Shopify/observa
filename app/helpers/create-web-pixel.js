import gql from "graphql-tag";

export const CREATE_PIXEL_MUTATION = gql`
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
