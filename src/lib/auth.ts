import { shopifyFetch } from './shopify/client';
import {
  CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION,
  CUSTOMER_CREATE_MUTATION,
  CUSTOMER_RECOVER_MUTATION,
  CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION,
} from './shopify/mutations/customer';
import { CUSTOMER_QUERY } from './shopify/queries/customer';
import type { ShopifyCustomer, ShopifyUserError } from './shopify/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerCreateResult = {
  customerCreate: {
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
    customerUserErrors: ShopifyUserError[];
  };
};

type CustomerAccessTokenCreateResult = {
  customerAccessTokenCreate: {
    customerAccessToken: {
      accessToken: string;
      expiresAt: string;
    } | null;
    customerUserErrors: ShopifyUserError[];
  };
};

type CustomerRecoverResult = {
  customerRecover: {
    customerUserErrors: ShopifyUserError[];
  };
};

type CustomerAccessTokenDeleteResult = {
  customerAccessTokenDelete: {
    deletedAccessToken: string | null;
    deletedCustomerAccessTokenId: string | null;
    userErrors: { field: string[]; message: string }[];
  };
};

type CustomerQueryResult = {
  customer: ShopifyCustomer | null;
};

// ─── Auth Functions ────────────────────────────────────────────────────────────

export async function createCustomer(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; errors: ShopifyUserError[] }> {
  try {
    const data = await shopifyFetch<CustomerCreateResult>({
      query: CUSTOMER_CREATE_MUTATION,
      variables: {
        input: { email, password, firstName, lastName },
      },
      revalidate: 0,
    });

    const errors = data.customerCreate?.customerUserErrors ?? [];
    const success = errors.length === 0 && !!data.customerCreate?.customer;

    return { success, errors };
  } catch (err) {
    console.error('[auth] createCustomer error:', err);
    return {
      success: false,
      errors: [{ field: null, message: 'An unexpected error occurred. Please try again.' }],
    };
  }
}

export async function loginCustomer(
  email: string,
  password: string
): Promise<{ accessToken: string | null; expiresAt: string | null; errors: ShopifyUserError[] }> {
  try {
    const data = await shopifyFetch<CustomerAccessTokenCreateResult>({
      query: CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION,
      variables: {
        input: { email, password },
      },
      revalidate: 0,
    });

    const errors = data.customerAccessTokenCreate?.customerUserErrors ?? [];
    const token = data.customerAccessTokenCreate?.customerAccessToken;

    return {
      accessToken: token?.accessToken ?? null,
      expiresAt: token?.expiresAt ?? null,
      errors,
    };
  } catch (err) {
    console.error('[auth] loginCustomer error:', err);
    return {
      accessToken: null,
      expiresAt: null,
      errors: [{ field: null, message: 'An unexpected error occurred. Please try again.' }],
    };
  }
}

export async function recoverPassword(
  email: string
): Promise<{ success: boolean; errors: ShopifyUserError[] }> {
  try {
    const data = await shopifyFetch<CustomerRecoverResult>({
      query: CUSTOMER_RECOVER_MUTATION,
      variables: { email },
      revalidate: 0,
    });

    const errors = data.customerRecover?.customerUserErrors ?? [];
    return { success: errors.length === 0, errors };
  } catch (err) {
    console.error('[auth] recoverPassword error:', err);
    return {
      success: false,
      errors: [{ field: null, message: 'An unexpected error occurred. Please try again.' }],
    };
  }
}

export async function getCustomerData(
  accessToken: string
): Promise<ShopifyCustomer | null> {
  try {
    const data = await shopifyFetch<CustomerQueryResult>({
      query: CUSTOMER_QUERY,
      variables: { customerAccessToken: accessToken },
      revalidate: 0,
    });
    return data.customer;
  } catch (err) {
    console.error('[auth] getCustomerData error:', err);
    return null;
  }
}

export async function deleteCustomerToken(
  accessToken: string
): Promise<void> {
  try {
    await shopifyFetch<CustomerAccessTokenDeleteResult>({
      query: CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION,
      variables: { customerAccessToken: accessToken },
      revalidate: 0,
    });
  } catch (err) {
    console.error('[auth] deleteCustomerToken error:', err);
  }
}
