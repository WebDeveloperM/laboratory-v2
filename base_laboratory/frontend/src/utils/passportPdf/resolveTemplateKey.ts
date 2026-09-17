export type TemplateKey = string;

/**
 * The single place any passport-template name/category/product_standard
 * string-matching happens. Returns null for any template not yet migrated
 * into the registry (see registry/index.ts) — batches land incrementally
 * per C:\Users\shabonov.m\.claude\plans\stateful-dancing-nebula.md. While
 * this returns null for a given template, buildDocDefinition.ts and
 * PassportTemplateDetailPage.tsx fall back to their legacy detection logic
 * for it — each match added here must mirror that legacy boolean exactly
 * (see the corresponding `isXxx` flag in buildDocDefinition.ts) so the two
 * paths never disagree about which template a name refers to.
 */
export function resolveTemplateKey(
  name?: string | null,
  category?: string | null,
  _productStandard?: string | null,
): TemplateKey | null {
  const nameLower = (name || '').toLowerCase();
  const categoryLower = (category || '').toLowerCase();
  // buildDocDefinition.ts doesn't have `category` available, so it always
  // calls this with category omitted — only apply the extra category check
  // when a caller (e.g. the detail page) actually provides one.
  const isBenzinCategory = !category || categoryLower.includes('бензин');

  // Бензин АИ-91 — mirrors `isAI91` in buildDocDefinition.ts / PassportTemplateDetailPage.tsx
  if (isBenzinCategory && (nameLower.includes('аи-91') || nameLower.includes('ai-91')) && !nameLower.includes('присадка')) {
    return 'benzin-ai-91';
  }

  return null;
}
