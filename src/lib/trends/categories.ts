/**
 * Trend Engine — Category Tree
 *
 * 8 top-level categories with subcategories and seed keywords.
 * Used by providers to translate category IDs into search queries.
 */

import type { Category, CategoryTree, Subcategory } from './types';

// ─── Category Tree ────────────────────────────────────────────────────────────

export const CATEGORY_TREE: CategoryTree = [
  {
    id: 'electronics',
    label: 'Electronics & Tech',
    icon: 'devices',
    subcategories: [
      {
        id: 'smart-home',
        label: 'Smart Home',
        keywords: [
          { keyword: 'smart speaker', weight: 0.9 },
          { keyword: 'smart thermostat', weight: 0.85 },
          { keyword: 'smart bulb', weight: 0.8 },
          { keyword: 'home hub', weight: 0.75 },
          { keyword: 'security camera', weight: 0.85 },
        ],
      },
      {
        id: 'wearables',
        label: 'Wearables',
        keywords: [
          { keyword: 'smartwatch', weight: 0.95 },
          { keyword: 'fitness tracker', weight: 0.9 },
          { keyword: 'wireless earbuds', weight: 0.9 },
          { keyword: 'sleep tracker', weight: 0.7 },
        ],
      },
      {
        id: 'mobile',
        label: 'Mobile Accessories',
        keywords: [
          { keyword: 'phone case', weight: 0.85 },
          { keyword: 'wireless charger', weight: 0.9 },
          { keyword: 'power bank', weight: 0.85 },
          { keyword: 'screen protector', weight: 0.8 },
          { keyword: 'phone stand', weight: 0.75 },
        ],
      },
      {
        id: 'gaming',
        label: 'Gaming',
        keywords: [
          { keyword: 'gaming headset', weight: 0.9 },
          { keyword: 'gaming controller', weight: 0.85 },
          { keyword: 'gaming chair', weight: 0.8 },
          { keyword: 'gaming mouse', weight: 0.85 },
        ],
      },
    ],
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    icon: 'favorite',
    subcategories: [
      {
        id: 'fitness',
        label: 'Fitness',
        keywords: [
          { keyword: 'resistance bands', weight: 0.9 },
          { keyword: 'yoga mat', weight: 0.85 },
          { keyword: 'foam roller', weight: 0.8 },
          { keyword: 'jump rope', weight: 0.75 },
          { keyword: 'pull-up bar', weight: 0.8 },
        ],
      },
      {
        id: 'supplements',
        label: 'Supplements',
        keywords: [
          { keyword: 'protein powder', weight: 0.95 },
          { keyword: 'creatine', weight: 0.85 },
          { keyword: 'multivitamins', weight: 0.8 },
          { keyword: 'omega 3', weight: 0.8 },
          { keyword: 'pre workout', weight: 0.85 },
        ],
      },
      {
        id: 'wellness-devices',
        label: 'Wellness Devices',
        keywords: [
          { keyword: 'massage gun', weight: 0.9 },
          { keyword: 'red light therapy', weight: 0.8 },
          { keyword: 'TENS unit', weight: 0.7 },
          { keyword: 'blood pressure monitor', weight: 0.75 },
        ],
      },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty & Personal Care',
    icon: 'face',
    subcategories: [
      {
        id: 'skincare',
        label: 'Skincare',
        keywords: [
          { keyword: 'retinol serum', weight: 0.9 },
          { keyword: 'vitamin c serum', weight: 0.9 },
          { keyword: 'hyaluronic acid', weight: 0.85 },
          { keyword: 'sunscreen SPF', weight: 0.85 },
          { keyword: 'moisturizer', weight: 0.8 },
        ],
      },
      {
        id: 'haircare',
        label: 'Hair Care',
        keywords: [
          { keyword: 'scalp massager', weight: 0.85 },
          { keyword: 'hair growth oil', weight: 0.85 },
          { keyword: 'silk pillowcase', weight: 0.8 },
          { keyword: 'hair mask', weight: 0.8 },
        ],
      },
      {
        id: 'beauty-tools',
        label: 'Beauty Tools',
        keywords: [
          { keyword: 'gua sha', weight: 0.85 },
          { keyword: 'jade roller', weight: 0.8 },
          { keyword: 'LED face mask', weight: 0.85 },
          { keyword: 'facial steamer', weight: 0.75 },
          { keyword: 'microneedling roller', weight: 0.7 },
        ],
      },
    ],
  },
  {
    id: 'home',
    label: 'Home & Kitchen',
    icon: 'home',
    subcategories: [
      {
        id: 'organization',
        label: 'Organization',
        keywords: [
          { keyword: 'drawer organizer', weight: 0.85 },
          { keyword: 'storage bins', weight: 0.8 },
          { keyword: 'closet organizer', weight: 0.85 },
          { keyword: 'shelf dividers', weight: 0.75 },
        ],
      },
      {
        id: 'kitchen-gadgets',
        label: 'Kitchen Gadgets',
        keywords: [
          { keyword: 'air fryer', weight: 0.95 },
          { keyword: 'instant pot', weight: 0.9 },
          { keyword: 'spiralizer', weight: 0.75 },
          { keyword: 'mandoline slicer', weight: 0.75 },
          { keyword: 'coffee maker', weight: 0.85 },
        ],
      },
      {
        id: 'cleaning',
        label: 'Cleaning',
        keywords: [
          { keyword: 'robot vacuum', weight: 0.9 },
          { keyword: 'steam mop', weight: 0.8 },
          { keyword: 'microfiber cloths', weight: 0.75 },
          { keyword: 'cleaning tablets', weight: 0.7 },
        ],
      },
      {
        id: 'decor',
        label: 'Home Decor',
        keywords: [
          { keyword: 'LED strip lights', weight: 0.85 },
          { keyword: 'scented candles', weight: 0.8 },
          { keyword: 'plant pots', weight: 0.75 },
          { keyword: 'wall art prints', weight: 0.75 },
        ],
      },
    ],
  },
  {
    id: 'pets',
    label: 'Pets',
    icon: 'pets',
    subcategories: [
      {
        id: 'dog',
        label: 'Dog',
        keywords: [
          { keyword: 'dog harness', weight: 0.9 },
          { keyword: 'dog bed', weight: 0.85 },
          { keyword: 'dog treats', weight: 0.85 },
          { keyword: 'chew toys', weight: 0.8 },
          { keyword: 'dog water bottle', weight: 0.75 },
        ],
      },
      {
        id: 'cat',
        label: 'Cat',
        keywords: [
          { keyword: 'cat tree', weight: 0.9 },
          { keyword: 'cat litter', weight: 0.85 },
          { keyword: 'cat toys', weight: 0.8 },
          { keyword: 'interactive feeder', weight: 0.75 },
        ],
      },
      {
        id: 'pet-supplies',
        label: 'Pet Supplies',
        keywords: [
          { keyword: 'pet carrier', weight: 0.85 },
          { keyword: 'grooming brush', weight: 0.8 },
          { keyword: 'pet camera', weight: 0.8 },
          { keyword: 'pet stroller', weight: 0.7 },
        ],
      },
    ],
  },
  {
    id: 'outdoor',
    label: 'Outdoor & Sports',
    icon: 'park',
    subcategories: [
      {
        id: 'camping',
        label: 'Camping',
        keywords: [
          { keyword: 'camping tent', weight: 0.9 },
          { keyword: 'sleeping bag', weight: 0.85 },
          { keyword: 'camping stove', weight: 0.85 },
          { keyword: 'headlamp', weight: 0.8 },
          { keyword: 'trekking poles', weight: 0.75 },
        ],
      },
      {
        id: 'sports',
        label: 'Sports',
        keywords: [
          { keyword: 'gym gloves', weight: 0.8 },
          { keyword: 'sports water bottle', weight: 0.85 },
          { keyword: 'compression socks', weight: 0.8 },
          { keyword: 'knee sleeve', weight: 0.75 },
          { keyword: 'weightlifting belt', weight: 0.8 },
        ],
      },
      {
        id: 'travel',
        label: 'Travel',
        keywords: [
          { keyword: 'packing cubes', weight: 0.9 },
          { keyword: 'travel pillow', weight: 0.85 },
          { keyword: 'luggage scale', weight: 0.75 },
          { keyword: 'passport holder', weight: 0.75 },
        ],
      },
    ],
  },
  {
    id: 'baby',
    label: 'Baby & Kids',
    icon: 'child_care',
    subcategories: [
      {
        id: 'feeding',
        label: 'Feeding',
        keywords: [
          { keyword: 'baby bottle', weight: 0.9 },
          { keyword: 'formula dispenser', weight: 0.85 },
          { keyword: 'high chair', weight: 0.85 },
          { keyword: 'baby spoon set', weight: 0.75 },
        ],
      },
      {
        id: 'sleep',
        label: 'Sleep',
        keywords: [
          { keyword: 'white noise machine', weight: 0.9 },
          { keyword: 'baby monitor', weight: 0.9 },
          { keyword: 'swaddle blanket', weight: 0.85 },
          { keyword: 'sleep sack', weight: 0.85 },
        ],
      },
      {
        id: 'toys',
        label: 'Toys',
        keywords: [
          { keyword: 'activity gym', weight: 0.85 },
          { keyword: 'teething toys', weight: 0.85 },
          { keyword: 'wooden blocks', weight: 0.8 },
          { keyword: 'sensory toys', weight: 0.8 },
          { keyword: 'bath toys', weight: 0.75 },
        ],
      },
    ],
  },
  {
    id: 'fashion',
    label: 'Fashion & Accessories',
    icon: 'checkroom',
    subcategories: [
      {
        id: 'accessories',
        label: 'Accessories',
        keywords: [
          { keyword: 'tote bag', weight: 0.85 },
          { keyword: 'crossbody bag', weight: 0.85 },
          { keyword: 'hair clips', weight: 0.8 },
          { keyword: 'sunglasses', weight: 0.85 },
        ],
      },
      {
        id: 'jewelry',
        label: 'Jewelry',
        keywords: [
          { keyword: 'stacking rings', weight: 0.85 },
          { keyword: 'gold necklace', weight: 0.85 },
          { keyword: 'pearl earrings', weight: 0.8 },
          { keyword: 'charm bracelet', weight: 0.8 },
          { keyword: 'anklet', weight: 0.75 },
        ],
      },
      {
        id: 'clothing',
        label: 'Clothing',
        keywords: [
          { keyword: 'oversized hoodie', weight: 0.9 },
          { keyword: 'wide leg pants', weight: 0.85 },
          { keyword: 'bodysuit', weight: 0.8 },
          { keyword: 'mini skirt', weight: 0.8 },
          { keyword: 'cargo pants', weight: 0.85 },
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get a top-level category by its id.
 */
export function getCategoryById(id: string): Category | undefined {
  return CATEGORY_TREE.find((c) => c.id === id);
}

/**
 * Get a subcategory by its id (searches across all categories).
 */
export function getSubcategoryById(id: string): Subcategory | undefined {
  for (const category of CATEGORY_TREE) {
    const sub = category.subcategories.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}

/**
 * Get all keywords across all categories and subcategories — flat, deduplicated.
 */
export function getAllKeywords(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const category of CATEGORY_TREE) {
    for (const sub of category.subcategories) {
      for (const kw of sub.keywords) {
        if (!seen.has(kw.keyword)) {
          seen.add(kw.keyword);
          result.push(kw.keyword);
        }
      }
    }
  }

  return result;
}
