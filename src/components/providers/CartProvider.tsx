'use client';

import { CartProvider as HydrogenCartProvider } from '@shopify/hydrogen-react';

type CartProviderProps = {
  children: React.ReactNode;
};

export function CartProvider({ children }: CartProviderProps) {
  return (
    <HydrogenCartProvider
      cartFragment={`
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  image {
                    url
                    altText
                    width
                    height
                  }
                  product {
                    id
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      `}
    >
      {children}
    </HydrogenCartProvider>
  );
}
