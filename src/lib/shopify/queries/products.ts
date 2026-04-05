import { PRODUCT_CARD_FRAGMENT, PRODUCT_DETAIL_FRAGMENT } from '../fragments';

export const PRODUCTS_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query Products(
    $first: Int = 20
    $sortKey: ProductSortKeys = RELEVANCE
    $reverse: Boolean = false
    $query: String
  ) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse, query: $query) {
      edges {
        cursor
        node {
          ...ProductCardFields
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  ${PRODUCT_DETAIL_FRAGMENT}
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductDetailFields
    }
  }
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      ...ProductCardFields
    }
  }
`;
