import { IMAGE_FRAGMENT, MONEY_FRAGMENT } from '../fragments';

export const PREDICTIVE_SEARCH_QUERY = `
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
  query PredictiveSearch($query: String!, $limit: Int = 10) {
    predictiveSearch(query: $query, limit: $limit, limitScope: EACH) {
      products {
        id
        title
        handle
        availableForSale
        priceRange {
          minVariantPrice {
            ...MoneyFields
          }
        }
        featuredImage {
          ...ImageFields
        }
      }
      collections {
        id
        title
        handle
        image {
          ...ImageFields
        }
      }
      queries {
        text
        styledText
      }
    }
  }
`;
