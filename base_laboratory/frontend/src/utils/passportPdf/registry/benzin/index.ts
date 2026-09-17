import type { PassportTemplateDescriptor } from '../../types';
import { AI91_DESCRIPTOR } from './ai-91';

export const BENZIN_DESCRIPTORS: Record<string, PassportTemplateDescriptor> = {
  [AI91_DESCRIPTOR.templateKey]: AI91_DESCRIPTOR,
};
