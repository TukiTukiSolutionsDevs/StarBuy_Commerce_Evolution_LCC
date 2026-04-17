#!/usr/bin/env npx tsx
/**
 * Brand Image Generator — StarBuyBaby
 *
 * Generates hero and collection images using Google's best image models.
 * Priority: Imagen 4 Ultra > Imagen 4 > Gemini 3 Pro Image > Gemini Flash Image
 *
 * Usage:
 *   npx tsx scripts/generate-brand-images.mts
 *   npx tsx scripts/generate-brand-images.mts --only hero
 *   npx tsx scripts/generate-brand-images.mts --only collections
 *   npx tsx scripts/generate-brand-images.mts --force
 *   npx tsx scripts/generate-brand-images.mts --model imagen-4.0-fast-generate-001
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ── Config ──────────────────────────────────────────────────────────────────────

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'images', 'brand');
const KEYS_PATH = join(PROJECT_ROOT, '.admin-ai-keys.json');

mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Get API Key ─────────────────────────────────────────────────────────────────

function getGeminiKey(): string {
  if (existsSync(KEYS_PATH)) {
    try {
      const keys = JSON.parse(readFileSync(KEYS_PATH, 'utf-8'));
      if (keys.gemini && keys.gemini.length > 5) {
        console.log('  Using API key from .admin-ai-keys.json');
        return keys.gemini;
      }
    } catch {
      /* ignore */
    }
  }

  const envKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (envKey && envKey.length > 5) {
    console.log('  Using API key from env var');
    return envKey;
  }

  throw new Error('No Gemini API key found.');
}

// ── Image Prompts ───────────────────────────────────────────────────────────────

const BRAND_STYLE = `
Premium baby store brand aesthetic. Warm gold and soft cream color palette.
Soft ambient lighting, clean minimalist composition, gentle and nurturing feel.
Professional baby product photography style with celestial ethereal atmosphere.
No text, no logos, no watermarks. No people, no hands, no faces.
`.trim();

type ImageSpec = {
  name: string;
  prompt: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
};

const HERO_IMAGES: ImageSpec[] = [
  {
    name: 'hero-main',
    prompt: `${BRAND_STYLE}
Wide cinematic flat-lay of premium baby essentials on a warm cream knitted blanket.
Items arranged beautifully: a soft plush teddy bear with a gold ribbon bow, a wooden baby rattle,
tiny knitted booties in cream, a small stack of cloth diapers, and a glass baby bottle with gold cap.
Soft golden hour light from the left. Scattered small golden star confetti.
Dreamy, warm, nurturing atmosphere. Premium nursery aesthetic.`,
    aspectRatio: '16:9',
  },
  {
    name: 'hero-mobile',
    prompt: `${BRAND_STYLE}
Vertical portrait shot of a curated baby gift arrangement on soft cream muslin fabric.
A plush bunny toy, tiny knitted baby socks, a wooden teething ring, and a small jar of baby balm
with a gold lid. Eucalyptus sprigs accent. Soft overhead lighting with dreamy bokeh.
Warm, inviting, celestial nursery atmosphere.`,
    aspectRatio: '9:16',
  },
];

const COLLECTION_IMAGES: ImageSpec[] = [
  {
    name: 'collection-lifestyle',
    prompt: `${BRAND_STYLE}
Elegant baby feeding essentials arranged on a marble countertop.
Silicone bibs in pastel colors, BPA-free baby bottles, a bamboo baby plate set with gold spoon,
and a premium insulated bottle bag. Soft cream and gold tones.
Editorial magazine style baby product photography. Warm, aspirational.`,
    aspectRatio: '4:3',
  },
  {
    name: 'collection-tech',
    prompt: `${BRAND_STYLE}
Modern baby gear and travel essentials on a light wood surface.
A premium baby monitor with gold accents, a portable white noise machine, a sleek diaper bag
in cream leather, and a compact baby carrier folded neatly.
Clean composition. Warm gold accent lighting. Premium baby tech aesthetic.`,
    aspectRatio: '4:3',
  },
  {
    name: 'collection-home',
    prompt: `${BRAND_STYLE}
Beautiful nursery corner vignette. A cream crib with gold star mobile hanging above,
soft organic cotton blankets folded on a wooden shelf, a small plush lamb toy,
and a warm night light glowing softly. Dried pampas grass in a cream vase.
Natural light from window. Warm, cozy, dreamy nursery aesthetic.`,
    aspectRatio: '4:3',
  },
  {
    name: 'collection-promo',
    prompt: `${BRAND_STYLE}
Wide shot of a premium baby gift set arrangement. Beautifully wrapped boxes in cream and gold paper
with satin ribbon bows. A plush star toy, tiny booties, and a wooden rattle peeking from gift tissue.
Scattered golden star confetti. Clean cream background with soft shadows.
Premium baby gifting atmosphere. Elegant and celebratory.`,
    aspectRatio: '16:9',
  },
];

// ── Model definitions ───────────────────────────────────────────────────────────

type ModelDef = {
  name: string;
  type: 'imagen' | 'gemini';
  label: string;
};

// Priority order: best quality first
const MODELS: ModelDef[] = [
  { name: 'imagen-4.0-ultra-generate-001', type: 'imagen', label: 'Imagen 4 Ultra' },
  { name: 'imagen-4.0-generate-001', type: 'imagen', label: 'Imagen 4' },
  { name: 'imagen-4.0-fast-generate-001', type: 'imagen', label: 'Imagen 4 Fast' },
  { name: 'gemini-3-pro-image-preview', type: 'gemini', label: 'Gemini 3 Pro Image' },
  { name: 'gemini-3.1-flash-image-preview', type: 'gemini', label: 'Gemini 3.1 Flash Image' },
  { name: 'gemini-2.5-flash-image', type: 'gemini', label: 'Gemini 2.5 Flash Image' },
];

// ── Generate with Imagen (predict endpoint) ─────────────────────────────────────

async function generateWithImagen(spec: ImageSpec, apiKey: string, model: string): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

  const body = {
    instances: [{ prompt: spec.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: spec.aspectRatio,
      personGeneration: 'dont_allow',
      safetySetting: 'block_low_and_above',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Imagen error (${res.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await res.json();

  if (!data.predictions?.[0]?.bytesBase64Encoded) {
    throw new Error(`No image in response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
}

// ── Generate with Gemini (generateContent with IMAGE modality) ──────────────────

async function generateWithGemini(spec: ImageSpec, apiKey: string, model: string): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Generate an image with ${spec.aspectRatio} aspect ratio.\n\n${spec.prompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 1,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini error (${res.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;

  if (!parts?.length) {
    throw new Error(`No parts in response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) =>
    p.inlineData?.mimeType?.startsWith('image/'),
  );

  if (!imagePart?.inlineData?.data) {
    const partTypes = parts.map((p: Record<string, unknown>) => Object.keys(p).join(','));
    throw new Error(`No image data. Part types: [${partTypes.join('; ')}]`);
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

// ── Discover best available model ───────────────────────────────────────────────

async function discoverModel(apiKey: string, forceModel?: string): Promise<ModelDef> {
  if (forceModel) {
    const found = MODELS.find((m) => m.name === forceModel);
    if (found) return found;
    // Guess type from name
    const type = forceModel.startsWith('imagen') ? 'imagen' : 'gemini';
    return { name: forceModel, type, label: forceModel };
  }

  console.log('  Discovering best available model...');

  for (const model of MODELS) {
    process.stdout.write(`    ${model.label} (${model.name})...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}?key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        console.log(' ✅');
        return model;
      }
      console.log(' ❌');
    } catch {
      console.log(' ❌');
    }
  }

  throw new Error('No image generation models available with this API key.');
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const onlyFlag = args.indexOf('--only');
  const filter = onlyFlag !== -1 ? args[onlyFlag + 1] : null;
  const force = args.includes('--force');
  const modelFlag = args.indexOf('--model');
  const forceModel = modelFlag !== -1 ? args[modelFlag + 1] : undefined;

  console.log('\n  StarBuyBaby — Brand Image Generator');
  console.log('  ════════════════════════════════════\n');

  const apiKey = getGeminiKey();
  console.log('  API key loaded.\n');

  // Select specs
  let specs: ImageSpec[] = [];
  if (!filter || filter === 'hero') specs.push(...HERO_IMAGES);
  if (!filter || filter === 'collections') specs.push(...COLLECTION_IMAGES);

  // Discover model
  const model = await discoverModel(apiKey, forceModel);
  console.log(`\n  Using: ${model.label} (${model.type})`);
  console.log(`  Generating ${specs.length} images...\n`);

  const generate = model.type === 'imagen' ? generateWithImagen : generateWithGemini;
  let successCount = 0;

  for (const spec of specs) {
    const outPath = join(OUTPUT_DIR, `${spec.name}.png`);

    if (existsSync(outPath) && !force) {
      console.log(`  ⏭  ${spec.name} — exists (--force to regen)`);
      continue;
    }

    process.stdout.write(`  ⏳ ${spec.name} (${spec.aspectRatio})...`);

    try {
      const buffer = await generate(spec, apiKey, model.name);
      writeFileSync(outPath, buffer);
      const sizeKB = Math.round(buffer.length / 1024);
      console.log(` ✅ ${sizeKB}KB`);
      successCount++;
    } catch (err) {
      console.log(` ❌`);
      console.error(`     ${err instanceof Error ? err.message : String(err)}`);
    }

    // Rate limit: 8s between requests
    await new Promise((r) => setTimeout(r, 8000));
  }

  console.log(`\n  ════════════════════════════════════`);
  console.log(`  ✅ Generated: ${successCount}/${specs.length}`);
  if (successCount > 0) {
    console.log(`  📁 Output: public/images/brand/`);
    console.log(`  🚀 Run \`pnpm dev\` to see results`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message ?? err);
  process.exit(1);
});
