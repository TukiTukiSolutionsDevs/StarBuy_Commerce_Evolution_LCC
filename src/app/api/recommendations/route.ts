import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) ?? [];

    const products = await getProducts({ first: 12, sortKey: 'BEST_SELLING' });

    // Filter out products already in cart
    const filtered = products.filter((p) => !excludeIds.includes(p.id)).slice(0, 4);

    return NextResponse.json({ products: filtered });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
