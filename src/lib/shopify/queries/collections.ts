import { IMAGE_FRAGMENT, PRODUCT_CARD_FRAGMENT } from '../fragments';

export const COLLECTIONS_QUERY = `
  ${IMAGE_FRAGMENT}
  query Collections($first: Int = 20) {
    collections(first: $first, sortKey: UPDATED_AT) {
      edges {
        cursor
        node {
          id
          title
          handle
          description
          image {
            ...ImageFields
          }
          seo {
            title
            description
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const COLLECTION_BY_HANDLE_QUERY = `
  ${IMAGE_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionByHandle(
    $handle: String!
    $first: Int = 24
    $after: String
    $sortKey: ProductCollectionSortKeys = MANUAL
    $reverse: Boolean = false
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      image {
        ...ImageFields
      }
      seo {
        title
        description
      }
      products(
        first: $first
        after: $after
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        edges {
          cursor
          node {
            ...ProductCardFields
          }
        }
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
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
  }
`;
