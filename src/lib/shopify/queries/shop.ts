export const SHOP_QUERY = `
  query Shop {
    shop {
      id
      name
      description
      primaryDomain {
        url
        host
      }
      brand {
        logo {
          image {
            url
            altText
            width
            height
          }
        }
        squareLogo {
          image {
            url
            altText
            width
            height
          }
        }
        colors {
          primary {
            foreground
            background
          }
          secondary {
            foreground
            background
          }
        }
      }
      paymentSettings {
        acceptedCardBrands
        countryCode
        currencyCode
        enabledPresentmentCurrencies
      }
    }
  }
`;

export const MENU_QUERY = `
  query Menu($handle: String!) {
    menu(handle: $handle) {
      id
      handle
      title
      items {
        id
        title
        type
        url
        resourceId
        tags
        items {
          id
          title
          type
          url
          resourceId
          tags
        }
      }
    }
  }
`;

export const POLICIES_QUERY = `
  query Policies {
    shop {
      privacyPolicy {
        id
        title
        handle
        body
        url
      }
      refundPolicy {
        id
        title
        handle
        body
        url
      }
      shippingPolicy {
        id
        title
        handle
        body
        url
      }
      termsOfService {
        id
        title
        handle
        body
        url
      }
    }
  }
`;

export const PAGES_QUERY = `
  query Pages($first: Int = 20) {
    pages(first: $first) {
      edges {
        node {
          id
          title
          handle
          body
          bodySummary
          createdAt
          updatedAt
          seo {
            title
            description
          }
        }
      }
    }
  }
`;

export const PAGE_BY_HANDLE_QUERY = `
  query PageByHandle($handle: String!) {
    page(handle: $handle) {
      id
      title
      handle
      body
      bodySummary
      createdAt
      updatedAt
      seo {
        title
        description
      }
    }
  }
`;
