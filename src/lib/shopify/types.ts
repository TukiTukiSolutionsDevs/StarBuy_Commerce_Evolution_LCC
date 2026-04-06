// ─── Money ────────────────────────────────────────────────────────────────────

export type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

// ─── Image ────────────────────────────────────────────────────────────────────

export type ShopifyImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export type ShopifyPageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
};

export type ShopifyEdge<T> = {
  cursor: string;
  node: T;
};

export type ShopifyConnection<T> = {
  edges: ShopifyEdge<T>[];
  pageInfo: ShopifyPageInfo;
};

// ─── Product ──────────────────────────────────────────────────────────────────

export type ShopifyProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type ShopifySelectedOption = {
  name: string;
  value: string;
};

export type ShopifyProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
  selectedOptions: ShopifySelectedOption[];
  price: ShopifyMoney;
  compareAtPrice: ShopifyMoney | null;
  image: ShopifyImage | null;
};

export type ShopifySEO = {
  title: string | null;
  description: string | null;
};

/** Minimal product shape used for cards/listings */
export type ShopifyProductCard = {
  id: string;
  title: string;
  handle: string;
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: ShopifyMoney;
  };
  compareAtPriceRange: {
    minVariantPrice: ShopifyMoney;
  };
  featuredImage: ShopifyImage | null;
  tags: string[];
  vendor: string;
  /** First variant — used for quick Add to Cart from listing cards */
  variants: {
    edges: Array<{
      node: {
        id: string;
        availableForSale: boolean;
      };
    }>;
  };
};

/** Full product with all details */
export type ShopifyProduct = Omit<ShopifyProductCard, 'variants' | 'priceRange'> & {
  description: string;
  descriptionHtml: string;
  productType: string;
  publishedAt: string;
  priceRange: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
  };
  images: ShopifyConnection<ShopifyImage>;
  options: ShopifyProductOption[];
  variants: ShopifyConnection<ShopifyProductVariant>;
  seo: ShopifySEO;
};

// ─── Collection ───────────────────────────────────────────────────────────────

export type ShopifyCollectionFilter = {
  id: string;
  label: string;
  type: string;
  values: Array<{
    id: string;
    label: string;
    count: number;
    input: string;
  }>;
};

export type ShopifyCollection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml?: string;
  image: ShopifyImage | null;
  seo: ShopifySEO;
  products?: {
    edges: ShopifyEdge<ShopifyProductCard>[];
    filters?: ShopifyCollectionFilter[];
    pageInfo: ShopifyPageInfo;
  };
};

// ─── Cart ─────────────────────────────────────────────────────────────────────

export type ShopifyCartLineItem = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    selectedOptions: ShopifySelectedOption[];
    price: ShopifyMoney;
    compareAtPrice: ShopifyMoney | null;
    image: ShopifyImage | null;
    product: {
      id: string;
      title: string;
      handle: string;
      featuredImage: ShopifyImage | null;
    };
  };
  cost: {
    totalAmount: ShopifyMoney;
    subtotalAmount: ShopifyMoney;
  };
};

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: {
    edges: Array<{ node: ShopifyCartLineItem }>;
  };
  cost: {
    subtotalAmount: ShopifyMoney;
    totalAmount: ShopifyMoney;
    totalTaxAmount: ShopifyMoney | null;
    totalDutyAmount: ShopifyMoney | null;
  };
  note: string | null;
  attributes: Array<{ key: string; value: string }>;
};

// ─── Customer ─────────────────────────────────────────────────────────────────

export type ShopifyAddress = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  formatted: string[];
};

export type ShopifyOrderLineItem = {
  title: string;
  quantity: number;
  variant: {
    image: ShopifyImage | null;
    price: ShopifyMoney;
  } | null;
};

export type ShopifyOrder = {
  id: string;
  orderNumber: number;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  currentTotalPrice: ShopifyMoney;
  lineItems: {
    edges: Array<{ node: ShopifyOrderLineItem }>;
  };
};

export type ShopifyCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  acceptsMarketing: boolean;
  createdAt: string;
  defaultAddress: ShopifyAddress | null;
  addresses: {
    edges: Array<{ node: ShopifyAddress }>;
  };
  orders: {
    edges: Array<{ node: ShopifyOrder }>;
    pageInfo: ShopifyPageInfo;
  };
};

// ─── Shop ─────────────────────────────────────────────────────────────────────

export type ShopifyMenuItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  resourceId: string | null;
  tags: string[];
  items: ShopifyMenuItem[];
};

export type ShopifyMenu = {
  id: string;
  handle: string;
  title: string;
  items: ShopifyMenuItem[];
};

export type ShopifyPolicy = {
  id: string;
  title: string;
  handle: string;
  body: string;
  url: string;
};

export type ShopifyPage = {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary: string;
  createdAt: string;
  updatedAt: string;
  seo: ShopifySEO;
};

// ─── Search ───────────────────────────────────────────────────────────────────

export type PredictiveSearchResult = {
  products: Array<{
    id: string;
    title: string;
    handle: string;
    availableForSale: boolean;
    priceRange: {
      minVariantPrice: ShopifyMoney;
    };
    featuredImage: ShopifyImage | null;
  }>;
  collections: Array<{
    id: string;
    title: string;
    handle: string;
    image: ShopifyImage | null;
  }>;
  queries: Array<{
    text: string;
    styledText: string;
  }>;
};

// ─── User errors ──────────────────────────────────────────────────────────────

export type ShopifyUserError = {
  field: string[] | null;
  message: string;
  code?: string;
};
