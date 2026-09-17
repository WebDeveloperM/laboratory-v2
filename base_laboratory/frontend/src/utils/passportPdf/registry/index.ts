import type { PassportTemplateDescriptor } from '../types';
import type { TemplateKey } from '../resolveTemplateKey';
import { BENZIN_DESCRIPTORS } from './benzin';

/**
 * TEMPLATE_REGISTRY: Record<TemplateKey, PassportTemplateDescriptor>.
 * Populated batch-by-batch (Бензин, Jet A-1, Kerosine/Mazut/Rastvoritel/Gaz,
 * then the Diesel families) — see
 * C:\Users\shabonov.m\.claude\plans\stateful-dancing-nebula.md for the
 * rollout order. Each per-category folder (benzin/, diesel/, ...) exports
 * its own descriptors, merged here.
 */
export const TEMPLATE_REGISTRY: Record<TemplateKey, PassportTemplateDescriptor> = {
  ...BENZIN_DESCRIPTORS,
};
