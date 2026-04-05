import { NextRequest, NextResponse } from 'next/server';
import { predictiveSearch } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { products: [], collections: [], queries: [] },
      { status: 200 }
    );
  }

  try {
    const results = await predictiveSearch(query.trim());
    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Search API] Failed to fetch predictive search:', error);
    return NextResponse.json(
      { error: 'Search temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }
}
