import type { SpravkaTemplate } from './shared/types';
import GazoylSintetikTemplate from './GazoylSintetik';
import GazoylTemplate from './Gazoyl';
import SauTemplate from './Sau';
import KerosinSintetikTemplate from './KerosinSintetik';
import KerosinTemplate from './Kerosin';
import MmaTemplate from './Mma';
import MtbeTemplate from './Mtbe';
import Ob111Template from './Ob111';
import PryamojBenzinTemplate from './PryamojBenzin';

const templates: SpravkaTemplate[] = [
  GazoylSintetikTemplate,
  GazoylTemplate,
  SauTemplate,
  KerosinSintetikTemplate,
  KerosinTemplate,
  MmaTemplate,
  MtbeTemplate,
  Ob111Template,
  PryamojBenzinTemplate,
];

export const spravkaTemplates: Record<string, SpravkaTemplate> = Object.fromEntries(
  templates.map((t) => [t.name, t]),
);
