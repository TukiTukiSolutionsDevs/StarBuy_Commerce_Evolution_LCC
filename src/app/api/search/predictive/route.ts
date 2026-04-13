import { NextRequest, NextResponse } from 'next/server';
import { predictiveSearch } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { products: [], collections: [], queries: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  }

  try {
    const results = await predictiveSearch(query.trim());
    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[Predictive Search API] Failed:', error);
    return NextResponse.json({ error: 'Search temporarily unavailable.' }, { status: 503 });
  }
}
