'use client';

import { useEffect } from 'react';
import { addRecentlyViewed } from '@/lib/recently-viewed';

type TrackProductViewProps = {
  id: string;
  handle: string;
  title: string;
  price: string;
  currencyCode: string;
  image: string;
};

export function TrackProductView({
  id,
  handle,
  title,
  price,
  currencyCode,
  image,
}: TrackProductViewProps) {
  useEffect(() => {
    addRecentlyViewed({ id, handle, title, price, currencyCode, image });
  }, [id, handle, title, price, currencyCode, image]);

  return null;
}
