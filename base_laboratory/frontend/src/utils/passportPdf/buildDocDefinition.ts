import QRCode from 'qrcode';
import { BASE_IMAGE_URL, BASE_URL } from '../urls';
import type { JetA1TableRow, BenzinTableRow } from './rowTypes';
import { createPdfFieldHelpers } from './helpers';
import { resolveTemplateKey } from './resolveTemplateKey';
import { TEMPLATE_REGISTRY } from './registry';
import { AI91_RESERVOIR_TABLE_ROWS, AI91_WAGON_TABLE_ROWS } from './registry/benzin/rows';
import {
  buildTableRows,
  buildTableRowsAI92P,
  buildKerosineTableRows,
  buildMazutTableRows,
  buildGazTableRows,
  buildEco3WagonTableRows,
  buildJetA1TableRows,
} from './tableBuilders';

export type { JetA1TableRow };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

export const JET_A1_RESERVOIR_TABLE_ROWS: JetA1TableRow[] = [
  { key: 'j1', no: '1', name: 'Внешний вид:', norm: 'Чистое, прозрачное, не должно содержать воды, осадка и взвешенных частиц при температуре окружающей среды', normOtr: '-', method: 'визуально' },
  { key: 'j2', no: '2', name: 'Цвет, баллы по шкале Сейболта', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 156-23' },
  { key: 'j3a', no: '3', name: 'Массовая доля механических примесей (макрочастиц), mg/dm³, не более', norm: '1,0', normOtr: '-', method: 'ASTMD 5452-23', noRowSpan: 2, methodRowSpan: 1 },
  { key: 'j3d', no: '3', name: 'd) содержание механических примесей и воды', norm: '-', normOtr: 'Отсутствие', method: 'ГОСТ 33196-2014' },
  { key: 'j4', no: '4', name: 'Кислотное число общее, mg KOH/g, не более', norm: '0,015', normOtr: '-', method: "Q'zDSt ASTM D 3242:2024 (ASTM D 3242-23)" },
  { key: 'j5a', no: '5', name: 'Объемная доля ароматических углеводородов, %, в пределах', norm: '8,0-25,0', normOtr: '25', method: 'ASTM D 1319-20a', noRowSpan: 2, methodRowSpan: 1 },
  { key: 'j5b', no: '5', name: 'или объемная доля общих ароматических углеводородов, %, в пределах', norm: '8,4-26,5', normOtr: '-', method: 'ASTM D 6379-21e1' },
  { key: 'j6', no: '6', name: 'Массовая доля меркаптановой серы, %, не более', norm: '0,003', normOtr: '0,003', method: 'ASTM D 3227-24' },
  { key: 'j7', no: '7', name: 'Массовая доля общей серы, %, не более', norm: '0,25', normOtr: '0,25', method: 'ASTM D 4294-2021' },
  { key: 'j8a', no: '8', name: 'Фракционный состав: a) температура начала кипения, °C', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 86-23aᵉ¹', noRowSpan: 7, methodRowSpan: 7 },
  { key: 'j8b', no: '8', name: 'b) 10 % отгона при температуре, °C, не выше', norm: '205', normOtr: '205', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'j8c', no: '8', name: 'c) 50 % отгона при температуре, °C', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'j8d', no: '8', name: 'd) 90 % отгона при температуре, °C', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'j8e', no: '8', name: 'e) температура конца кипения, °C, не выше', norm: '300', normOtr: '300', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'j8f', no: '8', name: 'f) остаток от разгонки, %, не более', norm: '1,5', normOtr: '1,5', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'j8g', no: '8', name: 'g) потери от разгонки, %, не более', norm: '1,5', normOtr: '1,5', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'j9', no: '9', name: 'Температура вспышки, в закрытом тигле, °C, не ниже', norm: '38*', normOtr: '38*', method: 'ASTM D 56-22\nГОСТ 6356-25' },
  { key: 'j10', no: '10', name: 'Плотность при температуре 15 °C, kg/m³, в пределах', norm: '775 – 840', normOtr: '-', method: 'ASTM D 4052-22' },
  { key: 'j11', no: '11', name: 'Кинематическая вязкость при температуре минус 20 °C, mm²/s, не более', norm: '8,0', normOtr: '8,0', method: 'ASTM D 445-21e2' },
  { key: 'j12', no: '12', name: 'Температура замерзания, °C, не выше', norm: 'Минус 47', normOtr: 'Минус 47', method: "Q'zDSt ASTM D 7153:2022\nASTM D 7153-15e1" },
  { key: 'j13', no: '13', name: 'Низшая теплота сгорания, MJ/kg, не менее', norm: '42,8', normOtr: '-', method: 'ASTM D 3338/3338M-20a' },
  { key: 'j14a', no: '14', name: 'Высота не коптящего пламени, mm, не менее или', norm: '25,0', normOtr: '25', method: 'ASTM D 1322-22', noRowSpan: 3, methodRowSpan: 1 },
  { key: 'j14b', no: '14', name: 'высота не коптящего пламени, mm, не менее:\n-при объемной доле нафталиновых углеводородов, %, не более', norm: '19,0', normOtr: '19', method: 'ASTM D 1840-22' },
  { key: 'j14c', no: '14', name: '', norm: '3', normOtr: '3', method: '' },
  { key: 'j15', no: '15', name: 'Коррозия медной пластинки при 100 °C в течение (2 h ± 5 min), класс, не более', norm: '1', normOtr: '-', method: "Q'zDSt ASTM D 130:2021 (ASTM D 130-19)" },
  { key: 'j16a', no: '16', name: 'Термоокислительная стабильность на установке Джефтот (JFTOT) при температуре испытания не ниже 260 °C в течение 2,5 h:\na) перепад давления mm Hg, не более', norm: '25', normOtr: '25', method: "Q'zDSt ASTM D 3241:2024 (ASTM D 3241-24)", noRowSpan: 2, methodRowSpan: 2 },
  { key: 'j16b', no: '16', name: 'b) отложения на трубке (VTR), номер по калориметрической шкале ASTM, менее', norm: '3\nПри отсутствии отложений, необычных по цвету или цвета «павлина» (побежалости)', normOtr: '3', method: "Q'zDSt ASTM D 3241:2024 (ASTM D 3241-24)" },
  { key: 'j17', no: '17', name: 'Концентрация фактических смол, mg/100 cm³, не более', norm: '7', normOtr: '7', method: 'ASTM D 381-22' },
  { key: 'j18a', no: '18', name: 'Взаимодействие с водой:\na) оценка поверхности раздела фаз, баллы, не более', norm: '1b', normOtr: '-', method: 'ASTM D 1094-24', noRowSpan: 3, methodRowSpan: 1 },
  { key: 'j18b1', no: '18', name: 'b) оценка светопропускания топлива микросепаро-метром, не менее:\nс антистатической присадкой', norm: '70', normOtr: '-', method: "Q'zDSt ASTM D 3948:2023 (ASTM D 3948-22)", methodRowSpan: 2 },
  { key: 'j18b2', no: '18', name: 'без антистатической присадки', norm: '85', normOtr: '-', method: "Q'zDSt ASTM D 3948:2023 (ASTM D 3948-22)" },
  { key: 'j19', no: '19', name: 'Удельная электрическая проводимость, pS/m, для топлива:\nс антистатической присадкой, в пределах', norm: '50 – 600', normOtr: '50 – 600', method: "Q'zDSt ASTM D 2624-2024 (ASTM D 2624-22)" },
  { key: 'j20', no: '20', name: 'Смазывающая способность:\n-диаметр пятна износа, mm, не более', norm: '0,85', normOtr: '-', method: 'ASTM D 5001-23' },
];

export const JET_A1_SSF_RESERVOIR_TABLE_ROWS: JetA1TableRow[] = [
  { key: 'js1', no: '1', name: 'Внешний вид:', norm: 'Чистое прозрачное, не должно содержать воды, осадка и взвешенных частиц при температуре окружающей среды', normOtr: '-', method: 'визуально' },
  { key: 'js2', no: '2', name: 'Цвет, баллы по шкале Сейболта', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 156-23' },
  { key: 'js3a', no: '3', name: 'Массовая доля механических примесей (макрочастиц), mg/dm³, не более', norm: '1,0', normOtr: '-', method: 'ASTMD 5452-23', noRowSpan: 2, methodRowSpan: 1 },
  { key: 'js3d', no: '3', name: 'Содержание механических примесей и воды', norm: '-', normOtr: 'Отсутствие', method: 'ГОСТ 33196-2014' },
  { key: 'js4', no: '4', name: 'Кислотное число общее, mg KOH/g, не более', norm: '0,015', normOtr: '-', method: "O\'zDSt ASTM D 3242:2024\n(ASTM D 3242-23)" },
  { key: 'js5a', no: '5', name: 'Объемная доля ароматических углеводородов, %, в пределах', norm: '8,0-25,0', normOtr: '25', method: 'ASTM D 1319-20a', noRowSpan: 2, methodRowSpan: 1 },
  { key: 'js5b', no: '5', name: 'или объемная доля общих ароматических углеводородов, %, в пределах', norm: '8,4-26,5', normOtr: '-', method: 'ASTM D 6379-21e1' },
  { key: 'js6', no: '6', name: 'Массовая доля меркаптановой серы, %, не более', norm: '0,003', normOtr: '0,003', method: 'ASTM D 3227-24' },
  { key: 'js7', no: '7', name: 'Массовая доля общей серы, %, не более', norm: '0,25', normOtr: '0,25', method: 'ASTM D 4294-2021' },
  { key: 'js8a', no: '8', name: 'Фракционный состав: a) температура начала кипения, °C', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 86-23aᵉ¹', noRowSpan: 8, methodRowSpan: 8 },
  { key: 'js8b', no: '8', name: 'b) 10 % отгона при температуре, °C, не выше', norm: '205', normOtr: '205', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'js8c', no: '8', name: 'c) 50 % отгона при температуре, °C', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'js8d', no: '8', name: 'd) 90 % отгона при температуре, °C', norm: 'Не нормируется. Определение обязательно', normOtr: '-', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'js8e', no: '8', name: 'e) температура конца кипения, °C, не выше', norm: '300', normOtr: '300', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'js8f', no: '8', name: 'f) остаток от разгонки, %, не более', norm: '1,5', normOtr: '1,5', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'js8g', no: '8', name: 'g) потери от разгонки, %, не более', norm: '1,5', normOtr: '1,5', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'js8h', no: '8', name: 'h) разница температур, °C, не менее:\n-(T50-T10)\n-(T90-T10)', norm: '15\n40', normOtr: '-\n-', method: 'ASTM D 86-23aᵉ¹' },
  { key: 'js9', no: '9', name: 'Температура вспышки, в закрытом тигле, °C, не ниже', norm: '38*', normOtr: '38*', method: 'ASTM D 56-22\nГОСТ 6356-25' },
  { key: 'js10', no: '10', name: 'Плотность при температуре 15 °C, kg/m³, в пределах', norm: '775 – 840', normOtr: '-', method: 'ASTM D 4052-22' },
  { key: 'js11', no: '11', name: 'Кинематическая вязкость при температуре минус 20 °C, mm²/s, не более', norm: '8,0', normOtr: '-', method: 'ASTM D 445-21e2' },
  { key: 'js12', no: '12', name: 'Температура замерзания, °C, не выше', norm: 'Минус 47', normOtr: 'Минус 47', method: "O\'zDSt ASTM D 7153:2022\nASTM D 7153-15e1" },
  { key: 'js13', no: '13', name: 'Низшая теплота сгорания, MJ/kg, не менее', norm: '42,8', normOtr: '-', method: 'ASTM D 3338/3338M-20a' },
  { key: 'js14a', no: '14', name: 'Высота не коптящего пламени, mm, не менее или\nвысота не коптящего пламени, mm, не менее:', norm: '25,0\n19,0', normOtr: '25\n19', method: 'ASTM D 1322-22', noRowSpan: 2, methodRowSpan: 1 },
  { key: 'js14b', no: '14', name: '-при объемной доле нафталиновых углеводородов, %, не более', norm: '3', normOtr: '3', method: 'ASTM D 1840-22' },
  { key: 'js15', no: '15', name: 'Коррозия медной пластинки при 100 °C в течение (2 h ± 5 min), класс, не более', norm: '1', normOtr: '-', method: 'ASTM D 130-19' },
  { key: 'js16a', no: '16', name: 'Термоокислительная стабильность на установке Джефтот (JFTOT) при температуре испытания не ниже 260 °C в течение 2,5 h:\na) перепад давления, mm Hg, не более', norm: '25', normOtr: '25', method: "O\'zDSt ASTM D 3241:2024\n(ASTM D 3241-24)", noRowSpan: 2, methodRowSpan: 2 },
  { key: 'js16b', no: '16', name: 'b) отложения на трубке (VTR), номер по калориметрической шкале ASTM, менее', norm: '3\nПри отсутствии отложений, необычных по цвету или цвета «павлина» (побежалости)', normOtr: '3', method: "O\'zDSt ASTM D 3241:2024\n(ASTM D 3241-24)" },
  { key: 'js17', no: '17', name: 'Концентрация фактических смол, mg/100 cm³, не более', norm: '7', normOtr: '7', method: 'ASTM D 381-22' },
  { key: 'js18a', no: '18', name: 'Взаимодействие с водой:\na) оценка поверхности раздела фаз, баллы, не более', norm: '1b', normOtr: '-', method: 'ASTM D 1094-07(2019)', noRowSpan: 3, methodRowSpan: 1 },
  { key: 'js18b1', no: '18', name: 'b) оценка светопропускания топлива микросепаро-метром, не менее:\nс антистатической присадкой', norm: '70', normOtr: '-', method: "O\'zDSt ASTM D 3948:2023\n(ASTM D 3948-22)", methodRowSpan: 2 },
  { key: 'js18b2', no: '18', name: 'без антистатической присадки', norm: '85', normOtr: '-', method: "O\'zDSt ASTM D 3948:2023\n(ASTM D 3948-22)" },
  { key: 'js19', no: '19', name: 'Удельная электрическая проводимость, pS/m, для топлива:\nс антистатической присадкой, в пределах', norm: '50 – 600', normOtr: '50 – 600', method: "O\'zDSt ASTM D 2624-24\n(ASTM D 2624-22)" },
  { key: 'js20', no: '20', name: 'Смазывающая способность:\n-диаметр пятна износа, mm, не более', norm: '0,85', normOtr: '-', method: 'ASTM D 5001-23' },
  { key: 'js21a', no: '21', name: 'Компоненты, входящие в состав топлива, % (по объему):', norm: '-', normOtr: '-', method: '-', noRowSpan: 3, methodRowSpan: 3 },
  { key: 'js21b', no: '21', name: '-полученные без гидроочистки', norm: 'Не нормируется', normOtr: '-', method: '-' },
  { key: 'js21c', no: '21', name: '-синтетические компоненты', norm: 'не более 50', normOtr: '-', method: '-' },
];

export const BENZIN_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'r1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '92,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'r1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '83,0', normOtr: '-' },
  { key: 'r2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'r3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 5, gostRowSpan: 5 },
  { key: 'r3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'r3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'r3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'r3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'r4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'r5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'r6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'r7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'r8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'r9_copper', no: '9.', name: 'Испытание на медной пластинке (3 h при 50 °C)', gost: 'ГОСТ 32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'r10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. Определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'r10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'r11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'r12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'r13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'r14_manganese', no: '14.', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'r15_iron', no: '15.', name: 'Массовая концентрация железа, g / dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'r16_mma', no: '16.', name: 'Объемная доля монометиланилина, %, не более', gost: 'ГОСТ 32515', norm: '1,3', normOtr: '1,3' },
  { key: 'r17_methanol', no: '17.', name: 'Объёмная доля оксигенатов, %, не более - метанола', gost: 'ГОСТ 32338', norm: '1,0', normOtr: '-', noRowSpan: 7, gostRowSpan: 7, pageBreakBefore: true },
  { key: 'r17_etanol', no: '17.', name: '- этанола', gost: 'ГОСТ 32338', norm: '5,0', normOtr: '-' },
  { key: 'r17_isopropanol', no: '17.', name: '- изопропанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'r17_terbutanol', no: '17.', name: '- третбутанола', gost: 'ГОСТ 32338', norm: '7,0', normOtr: '-' },
  { key: 'r17_isobutanol', no: '17.', name: '- изобутанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'r17_ethers', no: '17.', name: '- эфиров (C5 и выше)', gost: 'ГОСТ 32338', norm: '15,0', normOtr: '-' },
  { key: 'r17_other', no: '17.', name: '- других оксигенатов (с температурой конца кипения до 210 °C)', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
];

export const BENZIN_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'w1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '92,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'w1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '83,0', normOtr: '-' },
  { key: 'w2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'w3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'w3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'w3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'w3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'w3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'w3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'w3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'w4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'w5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'w6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'w7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'w8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'w9_copper', no: '9.', name: 'Испытание на медной пластинке (3 h при 50 °C)', gost: 'ГОСТ32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'w10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. Определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'w10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'w11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'w12_mechanical', no: '12', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'w13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'w14_manganese', no: '14.', name: 'Массовая концентрация марганца, mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'w15_iron', no: '15.', name: 'Массовая концентрация железа, g / dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'w16_mma', no: '16.', name: 'Объемная доля монометиланилина, %, не более', gost: 'ГОСТ 32515', norm: '1,3', normOtr: '1,3' },
  { key: 'w17_methanol', no: '17.', name: 'Объёмная доля оксигенатов, %, не более - метанола', gost: 'ГОСТ 32338', norm: '1,0', normOtr: '-', noRowSpan: 7, gostRowSpan: 7, pageBreakBefore: true },
  { key: 'w17_etanol', no: '17.', name: '- этанола', gost: 'ГОСТ 32338', norm: '5,0', normOtr: '-' },
  { key: 'w17_isopropanol', no: '17.', name: '- изопропанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'w17_terbutanol', no: '17.', name: '- третбутанола', gost: 'ГОСТ 32338', norm: '7,0', normOtr: '-' },
  { key: 'w17_isobutanol', no: '17.', name: '- изобутанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'w17_ethers', no: '17.', name: '- эфиров (C5 и выше)', gost: 'ГОСТ 32338', norm: '15,0', normOtr: '-' },
  { key: 'w17_other', no: '17.', name: '- других оксигенатов (с температурой конца кипения не выше 210 °C)', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
];

// АИ-92+присадка — same rows as BENZIN_* above, but the test-method column carries the
// ASTM names instead of the ГОСТ ones. Kept as its own pair (rather than editing BENZIN_*)
// because BENZIN_* is still the fallback for every template that matches no product flag.
// Row `key`s are deliberately identical to BENZIN_*: saved passport `actual_values` are
// keyed by them, so renaming would orphan the values of existing АИ-92+присадка passports.
export const AI92P_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'r1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ASTM D 2699', norm: '92,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'r1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ASTM D 2700', norm: '83,0', normOtr: '-' },
  { key: 'r2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'r3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ASTM D 86', norm: '35', normOtr: '-', noRowSpan: 5, gostRowSpan: 5 },
  { key: 'r3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ASTM D 86', norm: '75', normOtr: '-' },
  { key: 'r3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ASTM D 86', norm: '120', normOtr: '-' },
  { key: 'r3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ASTM D 86', norm: '190', normOtr: '-' },
  { key: 'r3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ASTM D 86', norm: '215', normOtr: '-' },
  { key: 'r4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: "O'zDst ASTM D 323", norm: '66,7', normOtr: '35-80' },
  { key: 'r5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ASTM D 6277', norm: '5', normOtr: '5' },
  { key: 'r6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ASTM D 381', norm: '5', normOtr: '5' },
  { key: 'r7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ASTM D 525', norm: '450', normOtr: '-' },
  { key: 'r8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ASTM D 4294', norm: '500', normOtr: '500' },
  { key: 'r9_copper', no: '9.', name: 'Испытание на медной пластинке (3 h при 50 °C)', gost: "O'zDst ASTM D 130", norm: 'Класс 1', normOtr: '-' },
  { key: 'r10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. Определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'r10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'r11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'r12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'r13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'r14_manganese', no: '14.', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'r15_iron', no: '15.', name: 'Массовая концентрация железа, g / dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'r16_mma', no: '16.', name: 'Объемная доля монометиланилина, %, не более', gost: 'ГОСТ 32515', norm: '1,3', normOtr: '1,3' },
  { key: 'r17_methanol', no: '17.', name: 'Объёмная доля оксигенатов, %, не более - метанола', gost: 'ГОСТ 32338', norm: '1,0', normOtr: '-', noRowSpan: 7, gostRowSpan: 7  },
  { key: 'r17_etanol', no: '17.', name: '- этанола', gost: 'ГОСТ 32338', norm: '5,0', normOtr: '-' },
  { key: 'r17_isopropanol', no: '17.', name: '- изопропанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'r17_terbutanol', no: '17.', name: '- третбутанола', gost: 'ГОСТ 32338', norm: '7,0', normOtr: '-' },
  { key: 'r17_isobutanol', no: '17.', name: '- изобутанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'r17_ethers', no: '17.', name: '- эфиров (C5 и выше)', gost: 'ГОСТ 32338', norm: '15,0', normOtr: '-' },
  { key: 'r17_other', no: '17.', name: '- других оксигенатов (с температурой конца кипения до 210 °C)', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
];

export const AI92P_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'w1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ASTM D 2699', norm: '92,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'w1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ASTM D 2700', norm: '83,0', normOtr: '-' },
  { key: 'w2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'w3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ASTM D 86', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'w3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ASTM D 86', norm: '75', normOtr: '-' },
  { key: 'w3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ASTM D 86', norm: '120', normOtr: '-' },
  { key: 'w3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ASTM D 86', norm: '190', normOtr: '-' },
  { key: 'w3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ASTM D 86', norm: '215', normOtr: '-' },
  { key: 'w3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ASTM D 86', norm: '2,0', normOtr: '-' },
  { key: 'w3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ASTM D 86', norm: '4,0', normOtr: '-' },
  { key: 'w4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: "O'zDst ASTM D 323", norm: '66,7', normOtr: '35-80' },
  { key: 'w5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ASTM D 6277', norm: '5', normOtr: '5' },
  { key: 'w6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ASTM D 381', norm: '5', normOtr: '5' },
  { key: 'w7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ASTM D 525', norm: '450', normOtr: '-' },
  { key: 'w8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ASTM D 4294', norm: '500', normOtr: '500' },
  { key: 'w9_copper', no: '9.', name: 'Испытание на медной пластинке (3 h при 50 °C)', gost: "O'zDst ASTM D 130", norm: 'Класс 1', normOtr: '-' },
  { key: 'w10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. Определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'w10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'w11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'w12_mechanical', no: '12', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'w13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'w14_manganese', no: '14.', name: 'Массовая концентрация марганца, mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'w15_iron', no: '15.', name: 'Массовая концентрация железа, g / dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'w16_mma', no: '16.', name: 'Объемная доля монометиланилина, %, не более', gost: 'ГОСТ 32515', norm: '1,3', normOtr: '1,3' },
  { key: 'w17_methanol', no: '17.', name: 'Объёмная доля оксигенатов, %, не более - метанола', gost: 'ГОСТ 32338', norm: '1,0', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'w17_etanol', no: '17.', name: '- этанола', gost: 'ГОСТ 32338', norm: '5,0', normOtr: '-' },
  { key: 'w17_isopropanol', no: '17.', name: '- изопропанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'w17_terbutanol', no: '17.', name: '- третбутанола', gost: 'ГОСТ 32338', norm: '7,0', normOtr: '-' },
  { key: 'w17_isobutanol', no: '17.', name: '- изобутанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'w17_ethers', no: '17.', name: '- эфиров (C5 и выше)', gost: 'ГОСТ 32338', norm: '15,0', normOtr: '-' },
  { key: 'w17_other', no: '17.', name: '- других оксигенатов (с температурой конца кипения не выше 210 °C)', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
];

export const DIESEL_EURO_M_E_K4_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'd1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'd2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'd3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '815,0 - 845,0', normOtr: '-' },
  { key: 'd4_250', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-' , noRowSpan: 3, gostRowSpan: 3},
  { key: 'd4_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'd4_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'd5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'd6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 15', normOtr: 'Не опрд' },
  { key: 'd7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'd8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'd9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '50 (0,005)', normOtr: '50' },
  { key: 'd10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'd11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'd12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'd13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'd14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'd15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'd16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'd17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_M_E_K5_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'd5_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'd5_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'd5_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '815,0 - 845,0', normOtr: '-' },
  { key: 'd5_4_250', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'd5_4_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'd5_4_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'd5_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd5_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'd5_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 15', normOtr: 'Не опрд' },
  { key: 'd5_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'd5_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'd5_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '10 (0,001)', normOtr: '10' },
  { key: 'd5_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'd5_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'd5_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'd5_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '8,0', normOtr: '8,0' },
  { key: 'd5_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'd5_15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd5_15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'd5_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'd5_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_L_A_K3_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dla3_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dla3_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dla3_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dla3_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dla3_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dla3_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dla3_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dla3_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dla3_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: '5', normOtr: 'Не опрд' },
  { key: 'dla3_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dla3_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dla3_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '350 (0,035)', normOtr: '350' },
  { key: 'dla3_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dla3_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dla3_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dla3_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'dla3_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dla3_15_oxid', no: '15.', name: 'Окислительная стабильность:\n- общее количество осадка, g/ m ³, не более\n- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '25\n20', normOtr: '-\n-' },
  { key: 'dla3_16_methyl', no: '16.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dla3_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-' },
];
export const DIESEL_EURO_L_A_K4_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dla4_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dla4_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dla4_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dla4_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dla4_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dla4_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dla4_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dla4_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dla4_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: '5', normOtr: 'Не опрд' },
  { key: 'dla4_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dla4_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dla4_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '50 (0,005)', normOtr: '50' },
  { key: 'dla4_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dla4_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dla4_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dla4_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'dla4_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dla4_15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dla4_15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dla4_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dla4_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_L_A_K5_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dla5_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dla5_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dla5_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dla5_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dla5_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dla5_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dla5_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dla5_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dla5_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: '5', normOtr: 'Не опрд' },
  { key: 'dla5_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dla5_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dla5_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '10 (0,001)', normOtr: '10' },
  { key: 'dla5_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dla5_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dla5_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dla5_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '8,0', normOtr: '8' },
  { key: 'dla5_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dla5_15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dla5_15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dla5_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dla5_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_L_C_K4_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dlc4_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dlc4_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dlc4_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dlc4_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dlc4_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dlc4_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dlc4_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000', norm: '200', normOtr: '200', noRowSpan: 2 },
  { key: 'dlc4_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ГОСТ 2477-2014', norm: '0,020', normOtr: '0,020' },
  { key: 'dlc4_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 5', normOtr: 'Не опрд' },
  { key: 'dlc4_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dlc4_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dlc4_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '50 (0,005)', normOtr: '50' },
  { key: 'dlc4_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dlc4_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dlc4_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dlc4_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'dlc4_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dlc4_15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlc4_15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dlc4_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dlc4_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_L_C_K5_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dlc5_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dlc5_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dlc5_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dlc5_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dlc5_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dlc5_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dlc5_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlc5_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dlc5_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 5', normOtr: 'Не опрд' },
  { key: 'dlc5_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dlc5_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dlc5_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '10 (0,001)', normOtr: '10' },
  { key: 'dlc5_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dlc5_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dlc5_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dlc5_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '8,0', normOtr: '8' },
  { key: 'dlc5_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dlc5_15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlc5_15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dlc5_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dlc5_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_L_C_K6_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dlc6_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dlc6_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dlc6_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dlc6_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dlc6_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dlc6_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dlc6_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlc6_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dlc6_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 5', normOtr: 'Не опрд' },
  { key: 'dlc6_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dlc6_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dlc6_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '5 (0,0005)', normOtr: '5' },
  { key: 'dlc6_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dlc6_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dlc6_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dlc6_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '4,0', normOtr: '4' },
  { key: 'dlc6_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dlc6_15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlc6_15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dlc6_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dlc6_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_L_D_K4_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dld4_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dld4_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dld4_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '815,0 - 845,0', normOtr: '-' },
  { key: 'dld4_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dld4_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dld4_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dld4_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dld4_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dld4_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 10', normOtr: 'Не опрд' },
  { key: 'dld4_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dld4_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dld4_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '50 (0,005)', normOtr: '50' },
  { key: 'dld4_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dld4_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dld4_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dld4_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'dld4_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dld4_15_oxid', no: '15.', name: 'Окислительная стабильность:\n- общее количество осадка, g/ m ³, не более\n- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '25\n20', normOtr: '-' },
  { key: 'dld4_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dld4_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-' },
];

export const DIESEL_EURO_L_D_K6_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dld6_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dld6_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dld6_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '815,0 - 845,0', normOtr: '-' },
  { key: 'dld6_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dld6_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dld6_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dld6_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dld6_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dld6_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 10', normOtr: 'Не опрд' },
  { key: 'dld6_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dld6_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dld6_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '5 (0,0005)', normOtr: '5' },
  { key: 'dld6_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dld6_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dld6_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dld6_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '4,0', normOtr: '4' },
  { key: 'dld6_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dld6_15_oxid', no: '15.', name: 'Окислительная стабильность:\n- общее количество осадка, g/ m ³, не более\n- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '25\n20', normOtr: '-' },
  { key: 'dld6_16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dld6_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-' },
];

export const DIESEL_EURO_L_D_K5_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dld5_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dld5_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dld5_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '815,0 - 845,0', normOtr: '-' },
  { key: 'dld5_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dld5_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dld5_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dld5_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dld5_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dld5_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 10', normOtr: 'Не опрд' },
  { key: 'dld5_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dld5_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dld5_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '10 (0,001)', normOtr: '10' },
  { key: 'dld5_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dld5_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dld5_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dld5_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '8,0', normOtr: '8' },
  { key: 'dld5_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662-2014', norm: '24', normOtr: '-' },
  { key: 'dld5_15_oxid', no: '15.', name: 'Окислительная стабильность:\n- общее количество осадка, g/ m ³, не более\n- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '25\n20', normOtr: '-\n-' },
  { key: 'dld5_16_methyl', no: '16.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dld5_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079-2024", norm: '460', normOtr: '-' },
];

export const DIESEL_EURO_3_O_K4_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'd3o_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '49', normOtr: '49' },
  { key: 'd3o_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768', norm: '46,0', normOtr: '-' },
  { key: 'd3o_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900', norm: '800,0 - 845,0', normOtr: '-' },
  { key: 'd3o_4_180', no: '4.', name: 'Фракционный состав: до 180 °C перегоняется, % (по объёму), не более', gost: 'ГОСТ 2177', norm: '10', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd3o_4_360', no: '4.', name: 'до 360 °C перегоняется, % (по объёму), не менее', gost: 'ГОСТ 2177', norm: '95', normOtr: '-' },
  { key: 'd3o_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd3o_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'd3o_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755', norm: 'минус 20', normOtr: 'Не опрд' },
  { key: 'd3o_7_cloud', no: '7.', name: 'Температура помутнения, °C, не выше', gost: 'EN ISO 3015', norm: 'минус 10', normOtr: '-' },
  { key: 'd3o_8_coke', no: '8.', name: 'Коксуемость 10 % - ного остатка , %  не более', gost: 'ГОСТ 32392', norm: '0,30', normOtr: '-' },
  { key: 'd3o_9_ash', no: '9.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,010', normOtr: '-' },
  { key: 'd3o_10_sulfur', no: '10.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294', norm: '50 (0,005)', normOtr: '50' },
  { key: 'd3o_11_copper', no: '11.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '-' },
  { key: 'd3o_12_viscosity', no: '12.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,5-4,0', normOtr: '-' },
  { key: 'd3o_13_flash', no: '13.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356', norm: '55', normOtr: '55' },
  { key: 'd3o_14_pah', no: '14.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916', norm: '11,0', normOtr: '11' },
  { key: 'd3o_15_pollution', no: '15.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662', norm: '24', normOtr: '-' },
  { key: 'd3o_16_oxid', no: '16.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd3o_16_oxid_hours', no: '16.', name: '- часов, не менее', gost: 'ASTM D 2274', norm: '20', normOtr: '-' },
  { key: 'd3o_17_methyl', no: '17.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078', norm: '7,0', normOtr: '-' },
  { key: 'd3o_18_wsd', no: '18.', name: 'Смазывающая способность: - скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, не более', gost: 'ASTM D 6079', norm: '460', normOtr: '-' },
];

export const DIESEL_EURO_3_O_K5_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'd3ok5_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '49', normOtr: '49' },
  { key: 'd3ok5_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768', norm: '46,0', normOtr: '-' },
  { key: 'd3ok5_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900', norm: '800,0 - 845,0', normOtr: '-' },
  { key: 'd3ok5_4_180', no: '4.', name: 'Фракционный состав: до 180 °C перегоняется, % (по объёму), не более', gost: 'ГОСТ 2177', norm: '10', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd3ok5_4_360', no: '4.', name: 'до 360 °C перегоняется, % (по объёму), не менее', gost: 'ГОСТ 2177', norm: '95', normOtr: '-' },
  { key: 'd3ok5_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd3ok5_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'd3ok5_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755', norm: 'минус 20', normOtr: 'Не опрд' },
  { key: 'd3ok5_7_cloud', no: '7.', name: 'Температура помутнения, °C, не выше', gost: 'EN ISO 3015', norm: 'минус 10', normOtr: '-' },
  { key: 'd3ok5_8_coke', no: '8.', name: 'Коксуемость 10 % - ного остатка , %  не более', gost: 'ГОСТ 32392', norm: '0,30', normOtr: '-' },
  { key: 'd3ok5_9_ash', no: '9.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,010', normOtr: '-' },
  { key: 'd3ok5_10_sulfur', no: '10.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294', norm: '10 (0,001)', normOtr: '10' },
  { key: 'd3ok5_11_copper', no: '11.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '-' },
  { key: 'd3ok5_12_viscosity', no: '12.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,5-4,0', normOtr: '-' },
  { key: 'd3ok5_13_flash', no: '13.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356', norm: '55', normOtr: '55' },
  { key: 'd3ok5_14_pah', no: '14.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916', norm: '8,0', normOtr: '8' },
  { key: 'd3ok5_15_pollution', no: '15.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662', norm: '24', normOtr: '-' },
  { key: 'd3ok5_16_oxid', no: '16.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'd3ok5_16_oxid_hours', no: '16.', name: '- часов, не менее', gost: 'ASTM D 2274', norm: '20', normOtr: '-' },
  { key: 'd3ok5_17_methyl', no: '17.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078', norm: '7,0', normOtr: '-' },
  { key: 'd3ok5_18_wsd', no: '18.', name: 'Смазывающая способность: - скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, не более', gost: 'ASTM D 6079', norm: '460', normOtr: '-' },
];

export const DIESEL_EURO_M_E_K4_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_M_E_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_M_E_K4_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dssdf_w1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dssdf_w2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dssdf_w3_density', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dssdf_w4_250', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dssdf_w4_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dssdf_w4_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dssdf_w5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dssdf_w5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dssdf_w6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: '5', normOtr: 'Не опрд' },
  { key: 'dssdf_w7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dssdf_w8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dssdf_w9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '350 (0,035)', normOtr: '350' },
  { key: 'dssdf_w10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dssdf_w11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dssdf_w12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dssdf_w13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'dssdf_w14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dssdf_w15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dssdf_w15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dssdf_w16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dssdf_w17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

export const DIESEL_EURO_M_E_K5_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_M_E_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_M_E_K5_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dk5ssdf_w1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dk5ssdf_w2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dk5ssdf_w3_density', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '815,0 - 845,0', normOtr: '-' },
  { key: 'dk5ssdf_w4_250', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dk5ssdf_w4_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dk5ssdf_w4_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dk5ssdf_w5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dk5ssdf_w5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dk5ssdf_w6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: 'минус 15', normOtr: 'Не опрд' },
  { key: 'dk5ssdf_w7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dk5ssdf_w8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dk5ssdf_w9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '10 (0,001)', normOtr: '10' },
  { key: 'dk5ssdf_w10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dk5ssdf_w11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm2/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dk5ssdf_w12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dk5ssdf_w13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '8,0', normOtr: '8' },
  { key: 'dk5ssdf_w14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dk5ssdf_w15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dk5ssdf_w15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dk5ssdf_w16_methyl', no: '16.', name: 'Объемная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dk5ssdf_w17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-'  },
];

// Wagon table rows for diesel variants (using same data as reservoirs)
export const DIESEL_EURO_M_E_K4_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_M_E_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_M_E_K5_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_M_E_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_A_K4_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_A_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_A_K4_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_A_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_A_K4_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_A_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_A_K5_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_A_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_C_K4_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_C_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_C_K5_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_C_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_C_K6_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_C_K6_RESERVOIR_TABLE_ROWS;

export const DIESEL_ECO3_0050_40_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'eco40w1', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '50', normOtr: '' },
  { key: 'eco40w2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'eco40w3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше\n95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280\n360', normOtr: '' },
  { key: 'eco40w4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'eco40w5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 15', normOtr: '' },
  { key: 'eco40w6', no: '6.', name: 'Йодное число, g на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'eco40w7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ГОСТ 32392', norm: '0,20', normOtr: '' },
  { key: 'eco40w8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'eco40w9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I\nвида II\nвида III', gost: 'ГОСТ 19121', norm: '0,100\n0,050\n0,035', normOtr: '' },
  { key: 'eco40w10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ГОСТ 32462', norm: '0,01', normOtr: '' },
  { key: 'eco40w11', no: '11.', name: 'Содержание сероводорода', gost: 'ГОСТ 32462', norm: 'отсутствие', normOtr: '' },
  { key: 'eco40w12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '' },
  { key: 'eco40w13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'eco40w14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,8-5,0', normOtr: '' },
  { key: 'eco40w15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'eco40w16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\nдля тепловозных и судовых дизелей и газовых турбин', gost: 'ГОСТ 6356', norm: '40', normOtr: '' },
  { key: 'eco40w17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'eco40w18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'eco40w19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 25', normOtr: '' },
  { key: 'eco40w20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];

export const DIESEL_ECO3_0050_40_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'eco40r1', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '50', normOtr: '' },
  { key: 'eco40r2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'eco40r3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше\n95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280\n360', normOtr: '' },
  { key: 'eco40r4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'eco40r5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 15', normOtr: '' },
  { key: 'eco40r6', no: '6.', name: 'Йодное число, g на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'eco40r7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ГОСТ 32392', norm: '0,20', normOtr: '' },
  { key: 'eco40r8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'eco40r9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I\nвида II\nвида III', gost: 'ГОСТ 19121', norm: '0,100\n0,050\n0,035', normOtr: '' },
  { key: 'eco40r10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ГОСТ 32462', norm: '0,01', normOtr: '' },
  { key: 'eco40r11', no: '11.', name: 'Содержание сероводорода', gost: 'ГОСТ 32462', norm: 'отсутствие', normOtr: '' },
  { key: 'eco40r12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '' },
  { key: 'eco40r13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'eco40r14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,8-5,0', normOtr: '' },
  { key: 'eco40r15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'eco40r16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\nдля тепловозных и судовых дизелей и газовых турбин', gost: 'ГОСТ 6356', norm: '40', normOtr: '' },
  { key: 'eco40r17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'eco40r18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'eco40r19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 25', normOtr: '' },
  { key: 'eco40r20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];

export const DIESEL_ECO3_0050_35_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'eco35w1', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '50', normOtr: '' },
  { key: 'eco35w2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'eco35w3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше\n95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280\n360', normOtr: '' },
  { key: 'eco35w4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'eco35w5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 15', normOtr: '' },
  { key: 'eco35w6', no: '6.', name: 'Йодное число, g на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'eco35w7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ГОСТ 32392', norm: '0,20', normOtr: '' },
  { key: 'eco35w8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'eco35w9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I\nвида II\nвида III', gost: 'ГОСТ 19121', norm: '0,100\n0,050\n0,035', normOtr: '' },
  { key: 'eco35w10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ГОСТ 32462', norm: '0,01', normOtr: '' },
  { key: 'eco35w11', no: '11.', name: 'Содержание сероводорода', gost: 'ГОСТ 32462', norm: 'отсутствие', normOtr: '' },
  { key: 'eco35w12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '' },
  { key: 'eco35w13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'eco35w14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,8-5,0', normOtr: '' },
  { key: 'eco35w15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'eco35w16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\nдля тепловозных и судовых дизелей и газовых турбин', gost: 'ГОСТ 6356', norm: '35', normOtr: '' },
  { key: 'eco35w17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'eco35w18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'eco35w19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 25', normOtr: '' },
  { key: 'eco35w20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];

export const DIESEL_ECO3_0100_35_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'eco100r35_1', no: '1.', name: 'Цетановое число, не менее', gost: 'ASTM D 613', norm: '50', normOtr: '' },
  { key: 'eco100r35_2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'eco100r35_3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше\n95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280\n360', normOtr: '' },
  { key: 'eco100r35_4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100r35_5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 15', normOtr: '' },
  { key: 'eco100r35_6', no: '6.', name: 'Йодное число, g на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'eco100r35_7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ASTM D 4530', norm: '0,20', normOtr: '' },
  { key: 'eco100r35_8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'eco100r35_9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I\nвида II\nвида III', gost: 'ГОСТ 19121', norm: '0,100\n0,050\n0,035', normOtr: '' },
  { key: 'eco100r35_10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ASTM D 3227', norm: '0,01', normOtr: '' },
  { key: 'eco100r35_11', no: '11.', name: 'Содержание сероводорода', gost: 'ASTM D 3227', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100r35_12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ASTM D 130', norm: 'Класс1', normOtr: '' },
  { key: 'eco100r35_13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100r35_14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,8-5,0', normOtr: '' },
  { key: 'eco100r35_15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'eco100r35_16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\n- для дизелей общего назначения', gost: 'ГОСТ 6356', norm: '35', normOtr: '' },
  { key: 'eco100r35_17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'eco100r35_18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'eco100r35_19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 25', normOtr: '' },
  { key: 'eco100r35_20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];

export const DIESEL_ECO3_0100_35_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'eco100w35_1', no: '1.', name: 'Цетановое число, не менее', gost: 'ASTM D 613', norm: '50', normOtr: '' },
  { key: 'eco100w35_2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'eco100w35_3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше\n95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280\n360', normOtr: '' },
  { key: 'eco100w35_4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100w35_5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 15', normOtr: '' },
  { key: 'eco100w35_6', no: '6.', name: 'Йодное число, g на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'eco100w35_7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ASTM D 4530', norm: '0,20', normOtr: '' },
  { key: 'eco100w35_8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'eco100w35_9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I\nвида II\nвида III', gost: 'ГОСТ 19121', norm: '0,100\n0,050\n0,035', normOtr: '' },
  { key: 'eco100w35_10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ASTM D 3227', norm: '0,01', normOtr: '' },
  { key: 'eco100w35_11', no: '11.', name: 'Содержание сероводорода', gost: 'ASTM D 3227', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100w35_12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ASTM D 130', norm: 'Класс1', normOtr: '' },
  { key: 'eco100w35_13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100w35_14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,8-5,0', normOtr: '' },
  { key: 'eco100w35_15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'eco100w35_16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\n- для дизелей общего назначения', gost: 'ГОСТ 6356', norm: '35', normOtr: '' },
  { key: 'eco100w35_17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'eco100w35_18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'eco100w35_19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 25', normOtr: '' },
  { key: 'eco100w35_20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];

export const DIESEL_ECO3_0100_40_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'eco100r40_1', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '50', normOtr: '' },
  { key: 'eco100r40_2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'eco100r40_3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше\n95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280\n360', normOtr: '' },
  { key: 'eco100r40_4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100r40_5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 15', normOtr: '' },
  { key: 'eco100r40_6', no: '6.', name: 'Йодное число, g на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'eco100r40_7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ГОСТ 32392', norm: '0,20', normOtr: '' },
  { key: 'eco100r40_8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'eco100r40_9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I\nвида II\nвида III', gost: 'ГОСТ 19121', norm: '0,100\n0,050\n0,035', normOtr: '' },
  { key: 'eco100r40_10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ГОСТ 32462', norm: '0,01', normOtr: '' },
  { key: 'eco100r40_11', no: '11.', name: 'Содержание сероводорода', gost: 'ГОСТ 32462', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100r40_12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '' },
  { key: 'eco100r40_13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100r40_14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,8-5,0', normOtr: '' },
  { key: 'eco100r40_15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'eco100r40_16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\nдля тепловозных и судовых дизелей и газовых турбин', gost: 'ГОСТ 6356', norm: '40', normOtr: '' },
  { key: 'eco100r40_17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'eco100r40_18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'eco100r40_19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 25', normOtr: '' },
  { key: 'eco100r40_20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];

export const DIESEL_ECO3_0100_40_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'eco100w40_1', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '50', normOtr: '' },
  { key: 'eco100w40_2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'eco100w40_3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше\n95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280\n360', normOtr: '' },
  { key: 'eco100w40_4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100w40_5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 15', normOtr: '' },
  { key: 'eco100w40_6', no: '6.', name: 'Йодное число, g на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'eco100w40_7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ГОСТ 32392', norm: '0,20', normOtr: '' },
  { key: 'eco100w40_8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'eco100w40_9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I\nвида II\nвида III', gost: 'ГОСТ 19121', norm: '0,100\n0,050\n0,035', normOtr: '' },
  { key: 'eco100w40_10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ГОСТ 32462', norm: '0,01', normOtr: '' },
  { key: 'eco100w40_11', no: '11.', name: 'Содержание сероводорода', gost: 'ГОСТ 32462', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100w40_12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '' },
  { key: 'eco100w40_13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'eco100w40_14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '1,8-5,0', normOtr: '' },
  { key: 'eco100w40_15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'eco100w40_16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\nдля тепловозных и судовых дизелей и газовых турбин', gost: 'ГОСТ 6356', norm: '40', normOtr: '' },
  { key: 'eco100w40_17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'eco100w40_18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'eco100w40_19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 25', normOtr: '' },
  { key: 'eco100w40_20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];

export const DIESEL_EURO_L_D_K4_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_D_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_D_K5_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_D_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_D_K6_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_D_K6_RESERVOIR_TABLE_ROWS;

export const DIESEL_EURO_L_B_K3_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dlb3_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dlb3_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dlb3_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dlb3_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dlb3_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dlb3_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dlb3_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlb3_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dlb3_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: '0', normOtr: 'Не опрд' },
  { key: 'dlb3_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dlb3_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dlb3_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '350 (0,035)', normOtr: '350' },
  { key: 'dlb3_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dlb3_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dlb3_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dlb3_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'dlb3_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dlb3_15_oxid', no: '15.', name: 'Окислительная стабильность:\n- общее количество осадка, g/ m ³, не более\n- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '25\n20', normOtr: '-\n-' },
  { key: 'dlb3_16_methyl', no: '16.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dlb3_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-' },
];
export const DIESEL_EURO_L_B_K3_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dlb3w_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '51,0', normOtr: '51' },
  { key: 'dlb3w_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768', norm: '46,0', normOtr: '-' },
  { key: 'dlb3w_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dlb3w_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dlb3w_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177', norm: '85', normOtr: '-' },
  { key: 'dlb3w_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177', norm: '360', normOtr: '360' },
  { key: 'dlb3w_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlb3w_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dlb3w_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755', norm: '0', normOtr: 'Не опрд' },
  { key: 'dlb3w_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392', norm: '0,30', normOtr: '-' },
  { key: 'dlb3w_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,010', normOtr: '-' },
  { key: 'dlb3w_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294', norm: '350 (0,035)', normOtr: '350' },
  { key: 'dlb3w_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '-' },
  { key: 'dlb3w_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dlb3w_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356', norm: '55', normOtr: '55' },
  { key: 'dlb3w_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916', norm: '11,0', normOtr: '11' },
  { key: 'dlb3w_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662', norm: '24', normOtr: '-' },
  { key: 'dlb3w_15_oxid', no: '15.', name: 'Окислительная стабильность:\n- общее количество осадка, g/ m ³, не более\n- часов, не менее', gost: 'ASTM D 2274', norm: '25\n20', normOtr: '-\n-' },
  { key: 'dlb3w_16_methyl', no: '16.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078', norm: '7,0', normOtr: '-' },
  { key: 'dlb3w_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: 'ASTM D 6079', norm: '460', normOtr: '-' },
];
export const DIESEL_EURO_L_B_K4_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dlb4_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dlb4_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dlb4_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dlb4_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dlb4_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dlb4_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dlb4_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000', norm: '200', normOtr: '200', noRowSpan: 2 },
  { key: 'dlb4_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ГОСТ 2477-2014', norm: '0,020', normOtr: '0,020' },
  { key: 'dlb4_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: '0', normOtr: 'Не опрд' },
  { key: 'dlb4_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dlb4_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dlb4_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '50 (0,005)', normOtr: '50' },
  { key: 'dlb4_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dlb4_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dlb4_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dlb4_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '11,0', normOtr: '11' },
  { key: 'dlb4_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dlb4_15_oxid', no: '15.', name: 'Окислительная стабильность: - общее количество осадка, g/m³, не более', gost: 'ASTM D 2274-14(2019)', norm: '25', normOtr: '-', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlb4_15_oxid_hours', no: '15.', name: '- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '20', normOtr: '-' },
  { key: 'dlb4_16_methyl', no: '16.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dlb4_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-' },
];
export const DIESEL_EURO_L_B_K5_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'dlb5_1_cetane', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508-2013', norm: '51,0', normOtr: '51' },
  { key: 'dlb5_2_index', no: '2.', name: 'Цетановый индекс, не менее', gost: 'ГОСТ 27768-88', norm: '46,0', normOtr: '-' },
  { key: 'dlb5_3_density15', no: '3.', name: 'Плотность, при 15 °C, kg/m³, в пределах', gost: 'ГОСТ 3900-2022', norm: '820,0 - 845,0', normOtr: '-' },
  { key: 'dlb5_4_frac', no: '4.', name: 'Фракционный состав: при температуре 250 °C перегоняется, % (по объему), менее', gost: 'ГОСТ 2177-99', norm: '65', normOtr: '-', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'dlb5_4_frac_350', no: '4.', name: 'при температуре 350 °C перегоняется, % (по объему), не менее', gost: 'ГОСТ 2177-99', norm: '85', normOtr: '-' },
  { key: 'dlb5_4_frac_95', no: '4.', name: '95% перегоняется при температуре °C, не выше', gost: 'ГОСТ 2177-99', norm: '360', normOtr: '360' },
  { key: 'dlb5_5_water', no: '5.', name: 'Массовая доля воды, mg/kg, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '200', normOtr: '200', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'dlb5_5_water_pct', no: '5.', name: 'Массовая доля воды, %, не более', gost: 'ISO 12937:2000 (ГОСТ 2477)', norm: '0,020', normOtr: '0,020' },
  { key: 'dlb5_6_filter', no: '6.', name: 'Предельная температура фильтруемости, °C не выше', gost: 'ГОСТ 33755-2016', norm: '0', normOtr: 'Не опрд' },
  { key: 'dlb5_7_coke', no: '7.', name: 'Коксуемость 10 %- ного остатка , %  не более', gost: 'ГОСТ 32392-2013', norm: '0,30', normOtr: '-' },
  { key: 'dlb5_8_ash', no: '8.', name: 'Зольность, % (массовая доля), не более', gost: 'ГОСТ 1461-2023', norm: '0,010', normOtr: '-' },
  { key: 'dlb5_9_sulfur', no: '9.', name: 'Массовая доля серы, mg/kg, (%)  не более', gost: 'ASTM D 4294-21', norm: '10 (0,001)', normOtr: '10' },
  { key: 'dlb5_10_copper', no: '10.', name: 'Коррозия медной пластинки (3 ч при 50 °C), единица по шкале', gost: "O'zDSt ASTM D 130:2021", norm: 'Класс1', normOtr: '-' },
  { key: 'dlb5_11_viscosity', no: '11.', name: 'Вязкость кинематическая при 40 °C, mm²/s, в пределах', gost: 'ГОСТ 33-2016', norm: '2,0-4,5', normOtr: '-' },
  { key: 'dlb5_12_flash', no: '12.', name: 'Температура вспышки, определяемая в закрытом тигле, °C, выше', gost: 'ГОСТ 6356-75', norm: '55', normOtr: '55' },
  { key: 'dlb5_13_pah', no: '13.', name: 'Массовая доля полициклических ароматических углеводородов, %, не более', gost: 'ГОСТ EN 12916-2022', norm: '8,0', normOtr: '8' },
  { key: 'dlb5_14_pollution', no: '14.', name: 'Общее загрязнение mg/kg, не более', gost: 'ГОСТ EN 12662:2014', norm: '24', normOtr: '-' },
  { key: 'dlb5_15_oxid', no: '15.', name: 'Окислительная стабильность:\n- общее количество осадка, g/ m ³, не более\n- часов, не менее', gost: 'ASTM D 2274-14(2019)', norm: '25\n20', normOtr: '-\n-' },
  { key: 'dlb5_16_methyl', no: '16.', name: 'Объёмная доля метиловых эфиров жирных кислот, % не более', gost: 'ГОСТ EN 14078-2016', norm: '7,0', normOtr: '-' },
  { key: 'dlb5_17_wsd', no: '17.', name: 'Смазывающая способность:\n- скорректированный диаметр пятна износа (wsd 1,4) при 60 °C, μm, не более', gost: "O'zDSt ASTM D 6079:2024", norm: '460', normOtr: '-' },
];
export const DIESEL_EURO_3_O_K4_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_3_O_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_3_O_K5_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_3_O_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_3_O_K4_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_3_O_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_3_O_K4_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_3_O_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_3_O_K5_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_3_O_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_3_O_K5_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_3_O_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_B_K4_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_B_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_B_K4_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_B_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_B_K5_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_B_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_B_K5_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_B_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_ECOL_0100_40_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'ecoL40r1', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '50', normOtr: '' },
  { key: 'ecoL40r2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'ecoL40r3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280', normOtr: '', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'ecoL40r3_95', no: '3.', name: '95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '360', normOtr: '' },
  { key: 'ecoL40r4', no: '4.', name: 'Содержание воды', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'ecoL40r5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 5', normOtr: '' },
  { key: 'ecoL40r6', no: '6.', name: 'Йодное число, g J на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'ecoL40r7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ГОСТ 32392', norm: '0,20', normOtr: '' },
  { key: 'ecoL40r8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'ecoL40r9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I', gost: 'ГОСТ 19121', norm: '0,100', normOtr: '', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'ecoL40r9_ii', no: '9.', name: 'вида II', gost: 'ГОСТ 19121', norm: '0,050', normOtr: '' },
  { key: 'ecoL40r9_iii', no: '9.', name: 'вида III', gost: 'ГОСТ 19121', norm: '0,035', normOtr: '' },
  { key: 'ecoL40r10', no: '10.', name: 'Массовая доля меркаптановой серы, %, не более', gost: 'ГОСТ 32462', norm: '0,01', normOtr: '' },
  { key: 'ecoL40r11', no: '11.', name: 'Содержание сероводорода', gost: 'ГОСТ 32462', norm: 'отсутствие', normOtr: '' },
  { key: 'ecoL40r12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '' },
  { key: 'ecoL40r13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'ecoL40r14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '3,0-6,0', normOtr: '' },
  { key: 'ecoL40r15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'ecoL40r16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\nдля дизелей общего назначения', gost: 'ГОСТ 6356', norm: '40', normOtr: '' },
  { key: 'ecoL40r17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'ecoL40r18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'ecoL40r19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 10', normOtr: '' },
  { key: 'ecoL40r20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];
export const DIESEL_ECOL_0100_40_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_ECOL_0100_40_RESERVOIR_TABLE_ROWS;

export const KEROSINE_FRAKTSIYA_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'keroR1', no: '', name: '1. Плотность, kg/m³, не менее, при 20⁰С', gost: 'ГОСТ  3900', norm: '775', normOtr: '' },
  { key: 'keroR2', no: '', name: '2. Фракционный состав:\nТемпература начала перегонки, ⁰С, не выше\n10% отгоняется при температуре ⁰С, не выше\n50% отгоняется при температуре ⁰С, не выше\n90% отгоняется при температуре ⁰С, не выше\n98% отгоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '\n150\n165\n195\n230\n250', normOtr: '' },
  { key: 'keroR3', no: '', name: '3. Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:', gost: 'ГОСТ 6356', norm: '28', normOtr: '' },
  { key: 'keroR4', no: '', name: '4. Цвет,', gost: 'Визуально по 6.3 настоящего стандарта', norm: 'От бесцветного до светло-желтого', normOtr: '' },
  { key: 'keroR5', no: '', name: '5. Содержание механических примесей и воды', gost: 'Визуально по 6.4 настоящего стандарта', norm: 'отсутствие', normOtr: '' },
];

export const MAZUT_M40_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'mazM1',  no: '1',  name: 'Кинематическая вязкость при 80 ⁰С, мм²/с, не более:', gost: '', norm: '59,00', normOtr: '' },
  { key: 'mazM2',  no: '2',  name: 'Зольность, %, не более, для мазута:\nмалозольного\nзольного', gost: '', norm: '\n0,04\n0,12', normOtr: '' },
  { key: 'mazM3',  no: '3',  name: 'Массовая доля механических примесей, % не более', gost: '', norm: '0,5', normOtr: '' },
  { key: 'mazM4',  no: '4',  name: 'Массовая доля воды, % не более,', gost: '', norm: '1,0', normOtr: '' },
  { key: 'mazM5',  no: '5',  name: 'Содержание водорастворимых кислот и щелочей', gost: '', norm: 'отсутствие', normOtr: '' },
  { key: 'mazM6',  no: '6',  name: 'Массовая доля серы %, не более, для мазута видов:', gost: '', norm: '0,50\n1,00\n1,50\n2,00\n2,50\n3,00\n3,50', normOtr: '' },
  { key: 'mazM7',  no: '7',  name: 'Содержание сероводорода, ppm(мг/кг), не более', gost: '', norm: '10', normOtr: '' },
  { key: 'mazM8',  no: '8',  name: 'Температура вспышки, ⁰С не ниже\nв открытом тигле', gost: '', norm: '90', normOtr: '' },
  { key: 'mazM9',  no: '9',  name: 'Температура застывания, ⁰С не выше,\nдля мазута из высокопарафинистых нефтей', gost: '', norm: '10\n25', normOtr: '' },
  { key: 'mazM10', no: '10', name: 'Теплота сгорания, (низшая) в пересчете на сухое топливо (не браковочная), кДж/кг, не менее для мазута содержанием серы,%: 0,5, 1,0, 1,50, 2,00\n2,50, 3,00, 3,50:', gost: '', norm: '40740\n39900', normOtr: '' },
  { key: 'mazM11', no: '11', name: 'Плотность при 15 ⁰С, кг/м³', gost: '', norm: 'Не нормируется.\nОпределение обязательно', normOtr: '' },
];

export const MAZUT_M100_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'mazC1',  no: '1',  name: 'Вязкость при 100 ⁰С, условная, градусы ВУ, не более:', gost: '', norm: '6,80', normOtr: '' },
  { key: 'mazC2',  no: '2',  name: 'Зольность, %, не более, для мазута:\nмалозольного\nзольного', gost: '', norm: '\n0,05\n0,14', normOtr: '' },
  { key: 'mazC3',  no: '3',  name: 'Массовая доля механических примесей, % не более', gost: '', norm: '1,0', normOtr: '' },
  { key: 'mazC4',  no: '4',  name: 'Массовая доля воды, % не более,', gost: '', norm: '1,0', normOtr: '' },
  { key: 'mazC5',  no: '5',  name: 'Содержание водорастворимых кислот и щелочей', gost: '', norm: 'отсутствие', normOtr: '' },
  { key: 'mazC6',  no: '6',  name: 'Массовая доля серы %, не более,', gost: '', norm: '0,5\n1,0\n1,5\n2,0\n2,5\n3,0\n3,5', normOtr: '' },
  { key: 'mazC7',  no: '7',  name: 'Содержание сероводорода, ppm(мг/кг), не более', gost: '', norm: '10', normOtr: '' },
  { key: 'mazC8',  no: '8',  name: 'Температура вспышки, ⁰С не ниже\nв открытом тигле', gost: '', norm: '110', normOtr: '' },
  { key: 'mazC9',  no: '9',  name: 'Температура застывания, ⁰С не выше,\nдля мазута из высокопарафинистых нефтей', gost: '', norm: '25\n42', normOtr: '' },
  { key: 'mazC10', no: '10', name: 'Теплота сгорания, (низшая) в пересчете на сухое топливо (небраковочная), кДж/кг, не менее для мазута с содержанием серы %:\n0,50, 1,00, 1,50, 2,00\n2,50, 3,00, 3,50:', gost: '', norm: '40530\n39900', normOtr: '' },
  { key: 'mazC11', no: '11', name: 'Плотность при 15 ⁰С, кг/м³.', gost: '', norm: 'Не нормируется.\nОпределение обязательно', normOtr: '' },
];

export const RASTVORITEL_S4_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'rasS1',  no: '1',  name: 'Плотность при 20 °С, kg/m³, в пределах', gost: '', norm: '754 - 820', normOtr: '' },
  { key: 'rasS2',  no: '2',  name: 'Фракционный состав:\nтемпература начала перегонки, °С, не ниже\nНе менее 98%  перегоняется при температуре, °С, не выше\nостаток в колбе, %, не более', gost: '', norm: '135\n220\n2,0', normOtr: '' },
  { key: 'rasS3',  no: '3',  name: 'Температура вспышки в закрытом тигле, °С, не ниже', gost: '', norm: '30', normOtr: '' },
  { key: 'rasS4',  no: '4',  name: 'Массовая доля ароматических углеводородов, в пределах', gost: '', norm: '5-25', normOtr: '' },
  { key: 'rasS5',  no: '5',  name: 'Летучесть по ксилолу, в пределах', gost: '', norm: '2,0 - 4,5', normOtr: '' },
  { key: 'rasS6',  no: '6',  name: 'Массовая доля общей серы, %, не более', gost: '', norm: '0,09', normOtr: '' },
  { key: 'rasS7',  no: '7',  name: 'Содержание водорастворимых кислот и щелочей', gost: '', norm: 'Отсутствие', normOtr: '' },
  { key: 'rasS8',  no: '8',  name: 'Содержание механических примесей и воды.', gost: '', norm: 'Отсутствие', normOtr: '' },
  { key: 'rasS9',  no: '9',  name: 'Цвет.', gost: '', norm: 'От бесцветного до светло-жёлтого', normOtr: '' },
  { key: 'rasS10', no: '10', name: 'Испытание на медной пластине', gost: '', norm: 'выдерживает', normOtr: '' },
];

export const SERA_GAZ_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'serS1', no: '1.', name: 'Массовая доля серы, %, не менее', gost: '', norm: '99,98', normOtr: '' },
  { key: 'serS2', no: '2.', name: 'Массовая доля золы, %, не более', gost: '', norm: '0,02', normOtr: '' },
  { key: 'serS3', no: '3.', name: 'Массовая доля органических веществ, %, не более', gost: '', norm: '0,01', normOtr: '' },
  { key: 'serS4', no: '4.', name: 'Массовая доля кислот в пересчете на серную кислоту, %, не более', gost: '', norm: '0,0015', normOtr: '' },
  { key: 'serS5', no: '5.', name: 'Массовая доля воды, %, не более', gost: '', norm: '0,2', normOtr: '' },
  { key: 'serS6', no: '6.', name: 'Механические загрязнения (бумага, дерево, песок и др.)', gost: '', norm: 'Не допускается', normOtr: '' },
];

export const SZHIZHENNY_GAZ_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'sgS1a', no: '1', name: 'Компонентный состав, массовая доля, %\n- сумма метана, этана, этилена', gost: '', norm: 'Не нормируется. Определение обязательно', normOtr: '', noRowSpan: 3 },
  { key: 'sgS1b', no: '1', name: '- сумма пропана и пропилена', gost: '', norm: 'Не нормируется. Определение обязательно', normOtr: '' },
  { key: 'sgS1c', no: '1', name: '- сумма бутанов и бутиленов, не более', gost: '', norm: '60,0', normOtr: '' },
  { key: 'sgS2',  no: '2', name: 'Объемная доля жидкого остатка при температуре плюс 20 ⁰С, %, не более', gost: '', norm: '1,60', normOtr: '' },
  { key: 'sgS3',  no: '3', name: 'Давления насыщенных паров, избыточное, МПа, при температуре:\nплюс 45 ⁰С, не более', gost: '', norm: '1,6', normOtr: '' },
  { key: 'sgS4',  no: '4', name: 'Массовая доля общей серы, %, не более\nили\nсодержание общей серы мг/кг, не более', gost: '', norm: 'Не нормируется. Определение обязательно (0,0050)\nНе нормируется. Определение обязательно (50)', normOtr: '' },
  { key: 'sgS5a', no: '5', name: 'Массовая доля сероводорода и меркаптановой серы, %, не более', gost: '', norm: '0,013', normOtr: '', noRowSpan: 2 },
  { key: 'sgS5b', no: '5', name: 'в т. ч. сероводорода, %, не более', gost: '', norm: '0,0020', normOtr: '' },
  { key: 'sgS6',  no: '6', name: 'Содержание свободной воды и щелочи', gost: '', norm: 'Отсутствие', normOtr: '' },
  { key: 'sgS7',  no: '7', name: 'Интенсивность запаха, баллы, не менее', gost: '', norm: '3', normOtr: '' },
];

export const DIESEL_ECOL_0100_62_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'ecoL62r1', no: '1.', name: 'Цетановое число, не менее', gost: 'ГОСТ 32508', norm: '50', normOtr: '' },
  { key: 'ecoL62r2', no: '2.', name: 'Плотность, kg/m³, не более при 20⁰С', gost: 'ГОСТ 3900', norm: '860', normOtr: '' },
  { key: 'ecoL62r3', no: '3.', name: 'Фракционный состав:\n50% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '280', normOtr: '', noRowSpan: 2, gostRowSpan: 2 },
  { key: 'ecoL62r3_95', no: '3.', name: '95% перегоняется при температуре ⁰С, не выше', gost: 'ГОСТ 2177', norm: '360', normOtr: '' },
  { key: 'ecoL62r4', no: '4.', name: 'Содержание воды, %', gost: 'ГОСТ 2477', norm: 'отсутствие', normOtr: '' },
  { key: 'ecoL62r5', no: '5.', name: 'Предельная температура фильтруемости, ⁰С не выше,', gost: 'ГОСТ 33755', norm: 'минус 5', normOtr: '' },
  { key: 'ecoL62r6', no: '6.', name: 'Йодное число, g J на 100 g топлива, не более', gost: 'ГОСТ 2070', norm: '5', normOtr: '' },
  { key: 'ecoL62r7', no: '7.', name: 'Коксуемость 10 % - ного остатка, % не более', gost: 'ГОСТ 32392', norm: '0,20', normOtr: '' },
  { key: 'ecoL62r8', no: '8.', name: 'Зольность, %(массовая доля), не более', gost: 'ГОСТ 1461', norm: '0,01', normOtr: '' },
  { key: 'ecoL62r9', no: '9.', name: 'Массовая доля серы, %, не более, в топливе\nвида I', gost: 'ГОСТ 19121', norm: '0,100', normOtr: '', noRowSpan: 3, gostRowSpan: 3 },
  { key: 'ecoL62r9_ii', no: '9.', name: 'вида II', gost: 'ГОСТ 19121', norm: '0,050', normOtr: '' },
  { key: 'ecoL62r9_iii', no: '9.', name: 'вида III', gost: 'ГОСТ 19121', norm: '0,035', normOtr: '' },
  { key: 'ecoL62r10', no: '10.', name: 'Массовая доля меркаптановой серы %, не более', gost: 'ГОСТ 32462', norm: '0,01', normOtr: '' },
  { key: 'ecoL62r11', no: '11.', name: 'Содержание сероводорода', gost: 'ГОСТ 32462', norm: 'отсутствие', normOtr: '' },
  { key: 'ecoL62r12', no: '12.', name: 'Испытание на медной пластинке', gost: 'ГОСТ 32329', norm: 'Класс1', normOtr: '' },
  { key: 'ecoL62r13', no: '13.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '' },
  { key: 'ecoL62r14', no: '14.', name: 'Вязкость кинематическая при 20 ⁰С, mm²/s, в пределах', gost: 'ГОСТ 33', norm: '3,0-6,0', normOtr: '' },
  { key: 'ecoL62r15', no: '15.', name: 'Кислотность, mg, КОН на 100 cm³ топлива, не более', gost: 'ГОСТ 5985', norm: '5', normOtr: '' },
  { key: 'ecoL62r16', no: '16.', name: 'Температура вспышки, определяемая в закрытом тигле, ⁰С, не ниже:\n- для тепловозных и судовых дизелей и газовых турбин', gost: 'ГОСТ 6356', norm: '62', normOtr: '' },
  { key: 'ecoL62r17', no: '17.', name: 'Механические примеси, %, не более', gost: 'ГОСТ 6370', norm: '0,0024', normOtr: '' },
  { key: 'ecoL62r18', no: '18.', name: 'Концентрация фактических смол, mg на 100 cm³ топлива, не более', gost: 'ГОСТ 8489', norm: '40', normOtr: '' },
  { key: 'ecoL62r19', no: '19.', name: 'Температура застывания, ⁰С не выше,', gost: 'ГОСТ 20287', norm: 'минус 10', normOtr: '' },
  { key: 'ecoL62r20', no: '20.', name: 'Температура помутнения, ⁰С не выше,', gost: 'ГОСТ 5066', norm: 'минус 5', normOtr: '' },
];
export const DIESEL_ECOL_0100_62_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_ECOL_0100_62_RESERVOIR_TABLE_ROWS;

export const DIESEL_EURO_L_C_K4_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_C_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_C_K4_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_C_K4_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_C_K5_SSDF_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_C_K5_RESERVOIR_TABLE_ROWS;
export const DIESEL_EURO_L_C_K5_SSDF_WAGON_TABLE_ROWS: BenzinTableRow[] = DIESEL_EURO_L_C_K5_RESERVOIR_TABLE_ROWS;


export const AI92_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a92r1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '92,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a92r1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '83,0', normOtr: '-' },
  { key: 'a92r2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a92r3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a92r3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a92r3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a92r3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a92r3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a92r3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a92r3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a92r4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'a92r5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'a92r6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'a92r7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'a92r8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a92r9_copper', no: '9.', name: 'Испытание на медной пластинке (3h при 50 °C)', gost: 'ГОСТ32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'a92r10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. Определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a92r10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³ не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a92r11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a92r12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a92r13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a92r14_manganese', no: '14.', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a92r15_iron', no: '15.', name: 'Массовая концентрация железа. g /dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
];

export const AI95_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a95r1_research', no: '1.', name: 'Детонационная стойкость октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '95,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a95r1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '85,0', normOtr: '-' },
  { key: 'a95r2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a95r3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a95r3_10', no: '3.', name: 'Пределы перегонки, 10%, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a95r3_50', no: '3.', name: 'Пределы перегонки, 50%, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a95r3_90', no: '3.', name: 'Пределы перегонки 90%, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a95r3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a95r3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a95r3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a95r4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'a95r5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'a95r6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32329', norm: '5', normOtr: '5' },
  { key: 'a95r7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'a95r8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a95r9_copper', no: '9.', name: 'Испытание на медной пластинке (3h при 50 °C)', gost: 'ГОСТ32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'a95r10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a95r10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³ не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a95r11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a95r12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a95r13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a95r14_manganese', no: '14', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a95r15_iron', no: '15', name: 'Массовая концентрация железа. g /dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
];

export const AI95QW_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'qwr1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '95,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'qwr1_motor', no: '1.', name: 'октановое число по моторному методу,  не менее', gost: 'ГОСТ 511', norm: '85,0', normOtr: '-' },
  { key: 'qwr2_density20', no: '2.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'не нормируется опр обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'qwr2_density15', no: '2.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'qwr3_resin', no: '3.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'qwr4_sulfur', no: '4.', name: 'Массовая доля серы, mg/kg,  не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'qwr5_induction', no: '5.', name: 'Индукционный период бензина, min., не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'qwr6_lead', no: '6.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'qwr7_benzol', no: '7.', name: 'Объёмная  доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'qwr8_manganese', no: '8.', name: 'Массовая концентрация марганца. mg /dm³ не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'qwr9_copper', no: '9.', name: 'Испытание на медной пластинке ( 3h при 50 °C)', gost: 'ГОСТ 32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'qwr10_appearance', no: '10.', name: 'Внешний вид', gost: 'Визуально 6.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-' },
  { key: 'qwr11_iron', no: '11.', name: 'Массовая концентрация железа. g /dm³ не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'qwr12_pressure', no: '12.', name: 'Давление насыщенных паров бензина,  kPa, не более', gost: 'ГОСТ 31874', norm: '35-80', normOtr: '35-80' },
  { key: 'qwr13_start', no: '13.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'qwr13_10', no: '13.', name: 'Пределы перегонки, 10% , не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'qwr13_50', no: '13.', name: 'Пределы перегонки, 50%, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'qwr13_90', no: '13.', name: 'Пределы перегонки, 90%, не выше ,°C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'qwr13_end', no: '13.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'qwr13_residue_vol', no: '13.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'qwr13_loss', no: '13.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'qwr14_acids', no: '14.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'qwr15_mechanical', no: '15.', name: 'Содержание механических примесей и воды', gost: 'Визуально 6.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
];

export const AI95QW_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'qww1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '95,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'qww1_motor', no: '1.', name: 'октановое число по моторному методу,  не менее', gost: 'ГОСТ 511', norm: '85,0', normOtr: '-' },
  { key: 'qww2_density20', no: '2.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'не нормируется опр обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'qww2_density15', no: '2.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'qww3_resin', no: '3.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'qww4_sulfur', no: '4.', name: 'Массовая доля серы, mg/kg,  не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'qww5_induction', no: '5.', name: 'Индукционный период бензина, min., не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'qww6_lead', no: '6.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'qww7_benzol', no: '7.', name: 'Объёмная  доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'qww8_manganese', no: '8.', name: 'Массовая концентрация марганца. mg /dm³ не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'qww9_copper', no: '9.', name: 'Испытание на медной пластинке ( 3h при 50 °C)', gost: 'ГОСТ 32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'qww10_appearance', no: '10.', name: 'Внешний вид', gost: 'Визуально 6.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-' },
  { key: 'qww11_iron', no: '11.', name: 'Массовая концентрация железа. g /dm³ не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'qww12_pressure', no: '12.', name: 'Давление насыщенных паров бензина,  kPa, не более', gost: 'ГОСТ 31874', norm: '35-80', normOtr: '35-80' },
  { key: 'qww13_start', no: '13.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'qww13_10', no: '13.', name: 'Пределы перегонки, 10% , не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'qww13_50', no: '13.', name: 'Пределы перегонки, 50%, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'qww13_90', no: '13.', name: 'Пределы перегонки, 90%, не выше ,°C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'qww13_end', no: '13.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'qww13_residue_vol', no: '13.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'qww13_loss', no: '13.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'qww14_acids', no: '14.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'qww15_mechanical', no: '15.', name: 'Содержание механических примесей и воды', gost: 'Визуально 6.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
];

export const AI95_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a95w1_research', no: '1.', name: 'Детонационная стойкость -октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '95,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a95w1_motor', no: '1.', name: '-октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '85,0', normOtr: '-' },
  { key: 'a95w2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a95w3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a95w3_10', no: '3.', name: 'Пределы перегонки °C, не выше 10%', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a95w3_50', no: '3.', name: 'Пределы перегонки °C, не выше 50%', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a95w3_90', no: '3.', name: 'Пределы перегонки °C, не выше 90%', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a95w3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a95w3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a95w3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a95w4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'a95w5_benzol', no: '5.', name: 'Объёмная доля бензола %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'a95w6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32329', norm: '5', normOtr: '5' },
  { key: 'a95w7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'a95w8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a95w9_copper', no: '9.', name: 'Испытание на медной пластинке (3h при 50 °C)', gost: 'ГОСТ32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'a95w10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a95w10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³ не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a95w11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a95w12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a95w13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a95w14_manganese', no: '14', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a95w15_iron', no: '15', name: 'Массовая концентрация железа. g /dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
];

export const AI98_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a98r1_research', no: '1.', name: 'Детонационная стойкость октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '98,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a98r1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '88,0', normOtr: '-' },
  { key: 'a98r2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a98r3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a98r3_10', no: '3.', name: 'Пределы перегонки, 10%, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a98r3_50', no: '3.', name: 'Пределы перегонки, 50%, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a98r3_90', no: '3.', name: 'Пределы перегонки 90%, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a98r3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a98r3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a98r3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a98r4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, kPa не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'a98r5_benzol', no: '5.', name: 'Объёмная  доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'a98r6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32329', norm: '5', normOtr: '5' },
  { key: 'a98r7_induction', no: '7.', name: 'Индукционный период бензина min не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'a98r8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a98r9_copper', no: '9.', name: 'Испытание на медной пластинке ( 3h при 50 °C)', gost: 'ГОСТ32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'a98r10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a98r10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³ не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a98r11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a98r12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a98r13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a98r14_manganese', no: '14', name: 'Массовая концентрация марганца. mg /dm³ не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a98r15_iron', no: '15', name: 'Массовая концентрация железа. g /dm³ не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
];

export const AI98_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a98w1_research', no: '1.', name: 'Детонационная стойкость  октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '98,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a98w1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '88,0', normOtr: '-' },
  { key: 'a98w2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a98w3_start', no: '3.', name: 'Фракционный состав:  температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a98w3_10', no: '3.', name: 'Пределы перегонки °C, не выше  10%', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a98w3_50', no: '3.', name: 'Пределы перегонки °C, не выше  50%', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a98w3_90', no: '3.', name: 'Пределы перегонки °C, не выше  90%', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a98w3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a98w3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a98w3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a98w4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, kPa не более', gost: 'ASTM D 323', norm: '66,7', normOtr: '35-80' },
  { key: 'a98w5_benzol', no: '5.', name: 'Объёмная  доля бензола %, не более', gost: 'ASTM D 4053', norm: '5', normOtr: '5' },
  { key: 'a98w6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ASTM D 381', norm: '5', normOtr: '5' },
  { key: 'a98w7_induction', no: '7.', name: 'Индукционный период бензина min не менее', gost: 'ASTM D 525', norm: '450', normOtr: '-' },
  { key: 'a98w8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a98w9_copper', no: '9.', name: 'Испытание на медной пластинке ( 3h при 50 °C)', gost: 'ASTM D 130', norm: 'Класс 1', normOtr: '-' },
  { key: 'a98w10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a98w10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³ не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a98w11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a98w12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a98w13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a98w14_manganese', no: '14', name: 'Массовая концентрация марганца. mg /dm³ не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a98w15_iron', no: '15', name: 'Массовая концентрация железа. g /dm³ не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
];

export const AI92_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a92w1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '92,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a92w1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '83,0', normOtr: '-' },
  { key: 'a92w2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a92w3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a92w3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a92w3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a92w3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a92w3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a92w3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a92w3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a92w4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'a92w5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'a92w6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'a92w7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'a92w8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a92w9_copper', no: '9.', name: 'Испытание на медной пластинке (3h при 50 °C)', gost: 'ГОСТ32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'a92w10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a92w10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³ не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a92w11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a92w12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a92w13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a92w14_manganese', no: '14.', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a92w15_iron', no: '15.', name: 'Массовая концентрация железа. g /dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
];

export const AI91P_WAGON_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a91pw1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '91,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a91pw1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '82,5', normOtr: '-' },
  { key: 'a91pw2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a91pw3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a91pw3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a91pw3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a91pw3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a91pw3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a91pw3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a91pw3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a91pw4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'a91pw5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'a91pw6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'a91pw7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'a91pw8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a91pw9_copper', no: '9.', name: 'Испытание на медной пластинке (3h при 50 °C)', gost: 'ГОСТ32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'a91pw10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. Определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a91pw10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a91pw11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a91pw12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a91pw13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a91pw14_manganese', no: '14.', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a91pw15_iron', no: '15.', name: 'Массовая концентрация железа. g /dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a91pw16_mma', no: '16.', name: 'Объемная доля монометиланилина, %, не более', gost: 'ГОСТ 32515', norm: '1,3', normOtr: '1,3' },
  { key: 'a91pw17_methanol', no: '17.', name: 'Объёмная доля оксигенатов, %, не более - метанола', gost: 'ГОСТ 32338', norm: '1,0', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a91pw17_etanol', no: '17.', name: '- этанола', gost: 'ГОСТ 32338', norm: '5,0', normOtr: '-' },
  { key: 'a91pw17_isopropanol', no: '17.', name: '- изопропанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'a91pw17_terbutanol', no: '17.', name: '- третбутанола', gost: 'ГОСТ 32338', norm: '7,0', normOtr: '-' },
  { key: 'a91pw17_isobutanol', no: '17.', name: '- изобутанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'a91pw17_ethers', no: '17.', name: '- эфиров (C5 и выше)', gost: 'ГОСТ 32338', norm: '15,0', normOtr: '-' },
  { key: 'a91pw17_other', no: '17.', name: '- других оксигенатов (с температурой конца кипения не выше 210 °C)', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
];

export const AI91P_RESERVOIR_TABLE_ROWS: BenzinTableRow[] = [
  { key: 'a91pr1_research', no: '1.', name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', norm: '91,0', normOtr: '-', noRowSpan: 2, gostRowSpan: 1 },
  { key: 'a91pr1_motor', no: '1.', name: 'октановое число по моторному методу, не менее', gost: 'ГОСТ 511', norm: '82,5', normOtr: '-' },
  { key: 'a91pr2_lead', no: '2.', name: 'Массовая концентрация свинца, mg /dm³, не более', gost: 'ГОСТ 28828', norm: '10', normOtr: '10' },
  { key: 'a91pr3_start', no: '3.', name: 'Фракционный состав: температура начала перегонки, °C, не ниже', gost: 'ГОСТ 2177', norm: '35', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a91pr3_10', no: '3.', name: 'Пределы перегонки, 10 %, не выше, °C', gost: 'ГОСТ 2177', norm: '75', normOtr: '-' },
  { key: 'a91pr3_50', no: '3.', name: 'Пределы перегонки, 50 %, не выше, °C', gost: 'ГОСТ 2177', norm: '120', normOtr: '-' },
  { key: 'a91pr3_90', no: '3.', name: 'Пределы перегонки, 90 %, не выше, °C', gost: 'ГОСТ 2177', norm: '190', normOtr: '-' },
  { key: 'a91pr3_end', no: '3.', name: 'Конец кипения, °C, не выше', gost: 'ГОСТ 2177', norm: '215', normOtr: '-' },
  { key: 'a91pr3_residue_vol', no: '3.', name: 'Объемная доля остатка в колбе, %, не более', gost: 'ГОСТ 2177', norm: '2,0', normOtr: '-' },
  { key: 'a91pr3_loss', no: '3.', name: 'Остаток и потери, %, (по объёму) не более', gost: 'ГОСТ 2177', norm: '4,0', normOtr: '-' },
  { key: 'a91pr4_pressure', no: '4.', name: 'Давление насыщенных паров бензина, кРа, не более', gost: 'ГОСТ 31874', norm: '66,7', normOtr: '35-80' },
  { key: 'a91pr5_benzol', no: '5.', name: 'Объёмная доля бензола, %, не более', gost: 'ГОСТ 31871', norm: '5', normOtr: '5' },
  { key: 'a91pr6_resin', no: '6.', name: 'Массовая концентрация смол промытых растворителем, mg / 100 cm³, не более', gost: 'ГОСТ 32404', norm: '5', normOtr: '5' },
  { key: 'a91pr7_induction', no: '7.', name: 'Индукционный период бензина, min, не менее', gost: 'ГОСТ 33903', norm: '450', normOtr: '-' },
  { key: 'a91pr8_sulfur', no: '8.', name: 'Массовая доля серы, mg/kg, не более', gost: 'ГОСТ 19121', norm: '500', normOtr: '500' },
  { key: 'a91pr9_copper', no: '9.', name: 'Испытание на медной пластинке (3 h при 50 °C)', gost: 'ГОСТ 32329', norm: 'Класс 1', normOtr: '-' },
  { key: 'a91pr10_density20', no: '10.', name: 'Плотность при 20 °C, kg/m³', gost: 'ГОСТ 3900', norm: 'Не нормируется. Определение обязательно', normOtr: '-', noRowSpan: 2, gostRowSpan: 2, gostMarginTopOverride: 18 },
  { key: 'a91pr10_density15', no: '10.', name: 'Плотность при 15 °C, kg/m³, не менее', gost: 'ГОСТ 3900', norm: '725,0', normOtr: '-' },
  { key: 'a91pr11_acids', no: '11.', name: 'Содержание водорастворимых кислот и щелочей', gost: 'ГОСТ 6307', norm: 'отсутствие', normOtr: '-' },
  { key: 'a91pr12_mechanical', no: '12.', name: 'Содержание механических примесей и воды', gost: 'Визуально 7.3 нас. ст', norm: 'отсутствие', normOtr: '-' },
  { key: 'a91pr13_appearance', no: '13.', name: 'Внешний вид', gost: 'Визуально 7.3 нас. ст', norm: 'Чистый, прозрачный', normOtr: '-', gostRowSpan: 1 },
  { key: 'a91pr14_manganese', no: '14.', name: 'Массовая концентрация марганца. mg /dm³, не более', gost: 'ASTM D 3831', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a91pr15_iron', no: '15.', name: 'Массовая концентрация железа, g / dm³, не более', gost: 'ГОСТ 32514', norm: 'отсутствие', normOtr: 'отсутствие' },
  { key: 'a91pr16_mma', no: '16.', name: 'Объемная доля монометиланилина, %, не более', gost: 'ГОСТ 32515', norm: '1,3', normOtr: '1,3' },
  { key: 'a91pr17_methanol', no: '17.', name: 'Объёмная доля оксигенатов, %, не более - метанола', gost: 'ГОСТ 32338', norm: '1,0', normOtr: '-', noRowSpan: 7, gostRowSpan: 7 },
  { key: 'a91pr17_etanol', no: '17.', name: '- этанола', gost: 'ГОСТ 32338', norm: '5,0', normOtr: '-' },
  { key: 'a91pr17_isopropanol', no: '17.', name: '- изопропанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'a91pr17_terbutanol', no: '17.', name: '- третбутанола', gost: 'ГОСТ 32338', norm: '7,0', normOtr: '-' },
  { key: 'a91pr17_isobutanol', no: '17.', name: '- изобутанола', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
  { key: 'a91pr17_ethers', no: '17.', name: '- эфиров (C5 и выше)', gost: 'ГОСТ 32338', norm: '15,0', normOtr: '-' },
  { key: 'a91pr17_other', no: '17.', name: '- других оксигенатов (с температурой конца кипения не выше 210 °C)', gost: 'ГОСТ 32338', norm: '10,0', normOtr: '-' },
];

function generateToken(): string {
  return crypto.randomUUID();
}

export async function generateQrCodeBase64(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return '';
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Same as generateQrCodeBase64, but composites `logoDataUrl` centered on top of the QR
// (high error-correction level so the obstructed area stays scannable).
export async function generateQrCodeWithLogoBase64(text: string, logoDataUrl: string | null): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    });
    if (!logoDataUrl) return qrDataUrl;

    const [qrImg, logoImg] = await Promise.all([loadImageElement(qrDataUrl), loadImageElement(logoDataUrl)]);
    const canvas = document.createElement('canvas');
    canvas.width = qrImg.width;
    canvas.height = qrImg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return qrDataUrl;
    ctx.drawImage(qrImg, 0, 0);

    const logoSize = Math.round(qrImg.width * 0.22);
    const logoX = (qrImg.width - logoSize) / 2;
    const logoY = (qrImg.height - logoSize) / 2;
    const pad = Math.round(logoSize * 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2);
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

    return canvas.toDataURL('image/png');
  } catch {
    return await generateQrCodeBase64(text);
  }
}

export type PassportVerificationStep = {
  role: string;
  fullName?: string | null;
  approvedByUsername?: string | null;
  approvedAt?: string | null;
  statusLabel?: string;
};

export type PassportVerificationInfo = {
  passportNumber?: string | null;
  steps: PassportVerificationStep[];
};

function formatQrDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildSignerLines(steps: PassportVerificationStep[]): string[] {
  const lines: string[] = [];
  for (const step of steps) {
    // СТТЛ / ЦЗЛ / Диспетчер are optional signers — an unassigned step is skipped by the
    // approval chain (see resolve_next_status), so it shouldn't show up in the QR text either.
    if (!step.fullName) continue;
    lines.push(`${step.role}: ${step.fullName} — ${step.statusLabel || 'Подписано'} (${formatQrDateTime(step.approvedAt)})`);
  }
  return lines;
}

function buildVerificationQrText(info: PassportVerificationInfo): string {
  return [`ПАСПОРТ № ${info.passportNumber || '-'}`, ...buildSignerLines(info.steps)].join('\n');
}

async function uploadPdfBlob(token: string, blob: Blob): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('pdf', blob, `${token}.pdf`);
    await fetch(`${BASE_URL}/passports/upload-pdf/${token}/`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    // silent — upload failure should not break PDF generation
  }
}

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const resp = await fetch('/images/logo/bnpz.png');
    const blob = await resp.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function fetchBnpzUzLogoBase64(): Promise<string | null> {
  try {
    const resp = await fetch('/images/logo/bnpzuz.png');
    const blob = await resp.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function fetchStzLogoBase64(): Promise<string | null> {
  try {
    const resp = await fetch('/images/logo/stz.png');
    const blob = await resp.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// TEMPORARY: hides both passport stamps — shtamp.svg ("O'ZBEKNEFTEGAZ" A.J. / "BNQIZ"
// M.Ch.J / ZMT) and muvofiq.svg (DAVLAT STANDARTIGA MUVOFIQ). Flip to `false` to print
// them again; nothing else needs changing. Suppressing them at the fetch step is safe
// because both render sites already spread an empty array when the value is null, so
// the surrounding header layout collapses exactly as it does when an asset fails to load.
const HIDE_PASSPORT_STAMPS = true;

// TEMPORARY: hides the oval STZ logo (stz.png). Flip to `false` to print it again.
// Unlike the two stamps above, this one must NOT be suppressed in fetchStzLogoBase64():
// every other `stzLogoBase64` check is a layout switch, not an image draw — a null value
// makes the header widen that slot (40 -> 120) and print the words "Знак соответствия
// стандарта" in place of the logo. Keeping the value truthy and skipping only the single
// draw site below leaves the header exactly as it is, minus the logo.
const HIDE_STZ_LOGO = true;

async function fetchMuvofiqSvg(): Promise<string | null> {
  if (HIDE_PASSPORT_STAMPS) return null;
  try {
    const resp = await fetch('/images/logo/muvofiq.svg');
    return await resp.text();
  } catch {
    return null;
  }
}

// Prints the "Номер соответствия" value onto the blank blue line of the muvofiq.svg stamp
// (line runs x=70..980 at y=450 in the SVG's 1000x500 viewBox).
function withComplianceNumber(svg: string, value: string): string {
  if (!value) return svg;
  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = `<text x="525" y="434" font-size="46" text-anchor="middle" font-family="Arial Narrow, Liberation Sans Narrow, Arial, Helvetica, sans-serif" fill="#1565C8" textLength="700" lengthAdjust="spacingAndGlyphs">${escaped}</text>`;
  return svg.replace('</svg>', `${text}</svg>`);
}

async function fetchShtampSvg(): Promise<string | null> {
  if (HIDE_PASSPORT_STAMPS) return null;
  try {
    const resp = await fetch('/images/logo/shtamp.svg');
    return await resp.text();
  } catch {
    return null;
  }
}

async function loadPdfMake(): Promise<AnyObj> {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = ((pdfMakeModule as AnyObj).default ?? pdfMakeModule) as AnyObj;
  const pdfFonts = ((pdfFontsModule as AnyObj).default ?? pdfFontsModule) as AnyObj;
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts;
  return pdfMake;
}

function buildDocDefinition(
  type: 'reservoir' | 'wagon',
  tplName: string,
  tplStandard: string,
  rv: Record<string, string>,
  av: Record<string, string>,
  logoBase64: string | null,
  qrCodeBase64?: string | null,
  jetNoticeVariant?: 'primary' | 'secondary',
  stzLogoBase64?: string | null,
  muvofiqSvg?: string | null,
  shtampSvg?: string | null,
  verifyQrBase64?: string | null,
): AnyObj {
  const { v, fmtDate, nb, ul, toTitleCase, toAbbreviatedName, ulName, uld } = createPdfFieldHelpers(rv);

  const templateKey = resolveTemplateKey(tplName, undefined, tplStandard);
  const descriptor = templateKey ? TEMPLATE_REGISTRY[templateKey] : null;

  const tplLower = tplName.toLowerCase();
  const tplStandardLower = (tplStandard || '').toLowerCase();
  const isAI91P = (tplLower.includes('аи-91') || tplLower.includes('ai-91')) && tplLower.includes('присадка');
  const isAI91 = (tplLower.includes('аи-91') || tplLower.includes('ai-91')) && !tplLower.includes('присадка');
  const showCzlHead = !!v('czl_head');
  const showShiftHead = !!v('shift_head');
  const showSttlHead = !!v('sttl_head');
  const showDispatcherHead = !!v('dispatcher_head');
  const showPassportIssueDate = !!v('passport_issue_date');
  const isAI92 = (tplLower.includes('аи-92') || tplLower.includes('ai-92')) && !tplLower.includes('присадка');
  const isAI92P = (tplLower.includes('аи-92') || tplLower.includes('ai-92')) && tplLower.includes('присадка');
  const isAI95QW = tplLower.includes('quwatt');
  const isAI95 = (tplLower.includes('аи-95') || tplLower.includes('ai-95')) && !isAI95QW;
  const isAI98 = tplLower.includes('аи-98') || tplLower.includes('ai-98');
  const hasDieselK4Standard = tplStandardLower.includes('610:2025') || tplStandardLower.includes('uztr.931-028:2017') || tplStandardLower.includes("o'zmst 610") || tplStandardLower.includes('ozmst 610');
  const isDieselByStandard = hasDieselK4Standard && (tplLower.includes('дизель') || tplLower.includes('дт') || tplLower.includes('евро'));
  const isDieselEuroMEK4SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-м-(е)-к4') ||
      tplLower.includes('евро-м(е)-к4') ||
      (tplLower.includes('евро') && tplLower.includes('к4') && (tplLower.includes('м') || tplLower.includes('(е)')) && (tplLower.includes('дизель') || tplLower.includes('дт') || hasDieselK4Standard))
    );
  // The "дт"/"дизель"/hasDieselK4Standard fallback below is meant to catch a К4 diesel that
  // isn't spelled with any letter grade at all — it must not swallow a name that already
  // carries a DIFFERENT letter grade (Л(А), Л(Б)/Л(В), Л(С), Л(D)/Л(Д), 3(О)), or every one of
  // those К4 products (SSDF included) gets silently misrouted to this М(Е) branch instead.
  const hasOtherDieselK4Letter = (
    tplLower.includes('(а)') || tplLower.includes('(a)') || tplLower.includes('-а-') || tplLower.includes('-a-') ||
    tplLower.includes('(б)') || tplLower.includes('(в)') || tplLower.includes('-б-') || tplLower.includes('-в-') ||
    tplLower.includes('(с)') || tplLower.includes('(c)') || tplLower.includes('-с-') || tplLower.includes('-c-') ||
    tplLower.includes('(д)') || tplLower.includes('(d)') || tplLower.includes('-д-') || tplLower.includes('-d-') ||
    tplLower.includes('(о)') || tplLower.includes('(0)') || tplLower.includes('-о-') || tplLower.includes('-0-')
  );
  const isDieselEuroMEK4 =
    !isDieselEuroMEK4SSDF && (
      tplLower.includes('евро-м-(е)-к4') ||
      tplLower.includes('евро-м(е)-к4') ||
      (tplLower.includes('евро') && tplLower.includes('к4') && (tplLower.includes('дизель') || tplLower.includes('дт') || hasDieselK4Standard) && !hasOtherDieselK4Letter)
    );
  const isDieselEuroMEK5SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-м-(е)-к5') ||
      tplLower.includes('евро-м(е)-к5') ||
      (tplLower.includes('евро') && tplLower.includes('к5') && (tplLower.includes('м') || tplLower.includes('(е)')) && (tplLower.includes('дизель') || tplLower.includes('дт') || hasDieselK4Standard))
    );
  const isDieselEuroMEK5 =
    !isDieselEuroMEK5SSDF && (
      tplLower.includes('евро-м-(е)-к5') ||
      tplLower.includes('евро-м(е)-к5') ||
      (tplLower.includes('евро') && tplLower.includes('к5') && (tplLower.includes('дизель') || tplLower.includes('дт') || hasDieselK4Standard) && !hasOtherDieselK4Letter)
    );
  const isDieselEuro3OK4SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-3-(о)-к4') ||
      tplLower.includes('евро-3(о)-к4') ||
      tplLower.includes('евро-3-(0)-к4') ||
      tplLower.includes('евро-3(0)-к4') ||
      (tplLower.includes('евро-3') && tplLower.includes('к4') && (tplLower.includes('(о)') || tplLower.includes('(0)') || tplLower.includes('-о-') || tplLower.includes('-0-')))
    );
  const isDieselEuro3OK4 =
    !isDieselEuro3OK4SSDF && (
      tplLower.includes('евро-3-(о)-к4') ||
      tplLower.includes('евро-3(о)-к4') ||
      tplLower.includes('евро-3-(0)-к4') ||
      tplLower.includes('евро-3(0)-к4') ||
      (tplLower.includes('евро-3') && tplLower.includes('к4') && (tplLower.includes('(о)') || tplLower.includes('(0)') || tplLower.includes('-о-') || tplLower.includes('-0-')))
    );
  const isDieselEuro3OK5SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-3-(о)-к5') ||
      tplLower.includes('евро-3(о)-к5') ||
      tplLower.includes('евро-3-(0)-к5') ||
      tplLower.includes('евро-3(0)-к5') ||
      (tplLower.includes('евро-3') && tplLower.includes('к5') && (tplLower.includes('(о)') || tplLower.includes('(0)') || tplLower.includes('-о-') || tplLower.includes('-0-')))
    );
  const isDieselEuro3OK5 =
    !isDieselEuro3OK5SSDF && (
      tplLower.includes('евро-3-(о)-к5') ||
      tplLower.includes('евро-3(о)-к5') ||
      tplLower.includes('евро-3-(0)-к5') ||
      tplLower.includes('евро-3(0)-к5') ||
      (tplLower.includes('евро-3') && tplLower.includes('к5') && (tplLower.includes('(о)') || tplLower.includes('(0)') || tplLower.includes('-о-') || tplLower.includes('-0-')))
    );
  const isDieselEuroLAK3 =
    tplLower.includes('евро-л-(а)-к3') ||
    tplLower.includes('евро-л(а)-к3') ||
    (tplLower.includes('евро-л') && tplLower.includes('(а)') && tplLower.includes('к3'));
  const isDieselEuroLAK4SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-л-(а)-к4') ||
      tplLower.includes('евро-л(а)-к4') ||
      tplLower.includes('евро-л-(a)-к4') ||
      tplLower.includes('евро-л(a)-к4') ||
      (tplLower.includes('евро-л') && tplLower.includes('к4') && (tplLower.includes('(а)') || tplLower.includes('(a)') || tplLower.includes('-а-') || tplLower.includes('-a-')))
    );
  const isDieselEuroLAK4 =
    !isDieselEuroLAK4SSDF && (
      tplLower.includes('евро-л-(а)-к4') ||
      tplLower.includes('евро-л(а)-к4') ||
      tplLower.includes('евро-л-(a)-к4') ||
      tplLower.includes('евро-л(a)-к4') ||
      (tplLower.includes('евро-л') && tplLower.includes('к4') && (tplLower.includes('(а)') || tplLower.includes('(a)') || tplLower.includes('-а-') || tplLower.includes('-a-')))
    );
  const isDieselEuroLAK5 =
    tplLower.includes('евро-л-(а)-к5') ||
    tplLower.includes('евро-л(а)-к5') ||
    tplLower.includes('евро-л-(a)-к5') ||
    tplLower.includes('евро-л(a)-к5') ||
    (tplLower.includes('евро-л') && tplLower.includes('к5') && (tplLower.includes('(а)') || tplLower.includes('(a)') || tplLower.includes('-а-') || tplLower.includes('-a-')));
  const isDieselEuroLCK4SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-л-(с)-к4') ||
      tplLower.includes('евро-л(с)-к4') ||
      tplLower.includes('евро-л-(c)-к4') ||
      tplLower.includes('евро-л(c)-к4') ||
      (tplLower.includes('евро-л') && tplLower.includes('к4') && (tplLower.includes('(с)') || tplLower.includes('(c)') || tplLower.includes('-с-') || tplLower.includes('-c-')))
    );
  const isDieselEuroLCK4 = !isDieselEuroLCK4SSDF && (
    tplLower.includes('евро-л-(с)-к4') ||
    tplLower.includes('евро-л(с)-к4') ||
    tplLower.includes('евро-л-(c)-к4') ||
    tplLower.includes('евро-л(c)-к4') ||
    (tplLower.includes('евро-л') && tplLower.includes('к4') && (tplLower.includes('(с)') || tplLower.includes('(c)') || tplLower.includes('-с-') || tplLower.includes('-c-'))));
  const isDieselEuroLCK5SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-л-(с)-к5') ||
      tplLower.includes('евро-л(с)-к5') ||
      tplLower.includes('евро-л-(c)-к5') ||
      tplLower.includes('евро-л(c)-к5') ||
      (tplLower.includes('евро-л') && tplLower.includes('к5') && (tplLower.includes('(с)') || tplLower.includes('(c)') || tplLower.includes('-с-') || tplLower.includes('-c-')))
    );
  const isDieselEuroLCK5 = !isDieselEuroLCK5SSDF && (
    tplLower.includes('евро-л-(с)-к5') ||
    tplLower.includes('евро-л(с)-к5') ||
    tplLower.includes('евро-л-(c)-к5') ||
    tplLower.includes('евро-л(c)-к5') ||
    (tplLower.includes('евро-л') && tplLower.includes('к5') && (tplLower.includes('(с)') || tplLower.includes('(c)') || tplLower.includes('-с-') || tplLower.includes('-c-'))));
  const isDieselEuroLCK6 =
    tplLower.includes('евро-л-(с)-к6') ||
    tplLower.includes('евро-л(с)-к6') ||
    tplLower.includes('евро-л-(c)-к6') ||
    tplLower.includes('евро-л(c)-к6') ||
    (tplLower.includes('евро-л') && tplLower.includes('к6') && (tplLower.includes('(с)') || tplLower.includes('(c)') || tplLower.includes('-с-') || tplLower.includes('-c-')));
  const isDieselEuroLDK4 =
    tplLower.includes('евро-л-(д)-к4') ||
    tplLower.includes('евро-л(д)-к4') ||
    tplLower.includes('евро-л-(d)-к4') ||
    tplLower.includes('евро-л(d)-к4') ||
    (tplLower.includes('евро-л') && tplLower.includes('к4') && (tplLower.includes('(д)') || tplLower.includes('(d)') || tplLower.includes('-д-') || tplLower.includes('-d-')));
  const isDieselEuroLDK6 =
    tplLower.includes('евро-л-(д)-к6') ||
    tplLower.includes('евро-л(д)-к6') ||
    tplLower.includes('евро-л-(d)-к6') ||
    tplLower.includes('евро-л(d)-к6') ||
    (tplLower.includes('евро-л') && tplLower.includes('к6') && (tplLower.includes('(д)') || tplLower.includes('(d)') || tplLower.includes('-д-') || tplLower.includes('-d-')));
  const isDieselEuroLDK5 =
    tplLower.includes('евро-л-(д)-к5') ||
    tplLower.includes('евро-л(д)-к5') ||
    tplLower.includes('евро-л-(d)-к5') ||
    tplLower.includes('евро-л(d)-к5') ||
    (tplLower.includes('евро-л') && tplLower.includes('к5') && (tplLower.includes('(д)') || tplLower.includes('(d)') || tplLower.includes('-д-') || tplLower.includes('-d-')));
  const isDieselEuroLBK3 =
    tplLower.includes('евро-л-(б)-к3') ||
    tplLower.includes('евро-л(б)-к3') ||
    tplLower.includes('евро-л-(в)-к3') ||
    tplLower.includes('евро-л(в)-к3') ||
    (tplLower.includes('евро-л') && tplLower.includes('к3') && (tplLower.includes('(б)') || tplLower.includes('(в)') || tplLower.includes('-б-') || tplLower.includes('-в-')));
  const isDieselEuroLBK5SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-л-(б)-к5') ||
      tplLower.includes('евро-л(б)-к5') ||
      tplLower.includes('евро-л-(в)-к5') ||
      tplLower.includes('евро-л(в)-к5') ||
      (tplLower.includes('евро-л') && tplLower.includes('к5') && (tplLower.includes('(б)') || tplLower.includes('(в)') || tplLower.includes('-б-') || tplLower.includes('-в-')))
    );
  const isDieselEuroLBK5 = !isDieselEuroLBK5SSDF && (
    tplLower.includes('евро-л-(б)-к5') ||
    tplLower.includes('евро-л(б)-к5') ||
    tplLower.includes('евро-л-(в)-к5') ||
    tplLower.includes('евро-л(в)-к5') ||
    (tplLower.includes('евро-л') && tplLower.includes('к5') && (tplLower.includes('(б)') || tplLower.includes('(в)') || tplLower.includes('-б-') || tplLower.includes('-в-'))));
  const isDieselEuroLBK4SSDF =
    tplLower.includes('ssdf') && (
      tplLower.includes('евро-л-(б)-к4') ||
      tplLower.includes('евро-л(б)-к4') ||
      tplLower.includes('евро-л-(в)-к4') ||
      tplLower.includes('евро-л(в)-к4') ||
      (tplLower.includes('евро-л') && tplLower.includes('к4') && (tplLower.includes('(б)') || tplLower.includes('(в)') || tplLower.includes('-б-') || tplLower.includes('-в-')))
    );
  const isDieselEuroLBK4 = !isDieselEuroLBK4SSDF && (
    tplLower.includes('евро-л-(б)-к4') ||
    tplLower.includes('евро-л(б)-к4') ||
    tplLower.includes('евро-л-(в)-к4') ||
    tplLower.includes('евро-л(в)-к4') ||
    (tplLower.includes('евро-л') && tplLower.includes('к4') && (tplLower.includes('(б)') || tplLower.includes('(в)') || tplLower.includes('-б-') || tplLower.includes('-в-'))));
  const isDieselEco3_0050_35 = tplLower.includes('эко') && (tplLower.includes('0.050-35') || tplLower.includes('0,050-35'));
  const isDieselEco3_0050_40 = tplLower.includes('эко') && (tplLower.includes('0.050-40') || tplLower.includes('0,050-40'));
  const isDieselEco3_0100_35 = tplLower.includes('эко') && (tplLower.includes('0.100-35') || tplLower.includes('0,100-35'));
  const isDieselEcoL_0100_40 = tplLower.includes('эко-л') && (tplLower.includes('0,100-40') || tplLower.includes('0.100-40'));
  const isDieselEcoL_0100_62 = tplLower.includes('эко-л') && (tplLower.includes('0,100-62') || tplLower.includes('0.100-62'));
  const isDieselEco3_0100_40 = !isDieselEcoL_0100_40 && !isDieselEcoL_0100_62 && tplLower.includes('эко') && (tplLower.includes('0.100-40') || tplLower.includes('0,100-40'));
  const isKerosine = tplLower.includes('керосин') || tplLower.includes('kerosine') || tplLower.includes('kerosene');
  const isMazutM100 = tplLower.includes('мазут') && tplLower.includes('100');
  const isMazutM40 = !isMazutM100 && tplLower.includes('мазут') && tplLower.includes('40');
  const isRastvoritelS4 = tplLower.includes('растворитель');
  const isSeraGaz = tplLower.includes('сера');
  const isSzhizhennyyGaz = tplLower.includes('сжижен') || tplLower.includes('пбт') || tplLower.includes('34858');
  const isJetA1Notice = (tplLower.includes('извещ') || tplLower.includes('izv')) && tplLower.includes('jet') && tplLower.includes('a-1');
  const isJetA1SSF = tplLower.includes('jet') && tplLower.includes('a-1') && tplLower.includes('ssf');
  const isJetA1 = tplLower.includes('jet') && tplLower.includes('a-1') && !tplLower.includes('ssf') && !tplLower.includes('извещ') && !tplLower.includes('izv');
  const isJetA1Like = isJetA1 || isJetA1SSF;

  // Per-product header config (cert number + right column)
  const legacyHeaderCfg: { certNo: string; certDates: string; rightWidth: number; rightStack: AnyObj[] } = (isAI91 || isAI91P)
    ? {
        certNo: 'UZ.SMT .01.0080.121925486',
        certDates: 'От 13.12.2024 г. до 13.12.2027 г.',
        rightWidth: 200,
        rightStack: [
          { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right' },
          { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
          {
            columns: [
              { width: '*', text: 'Бензин без добавления\nприсадок пригоден только\nв качестве моторного горючего', fontSize: 7, alignment: 'center', margin: [-35, 5, 10, 0] },
              {
                width: stzLogoBase64 ? 40 : 120,
                ...(stzLogoBase64
                  ? { text: '', fontSize: 1 }
                  : { text: 'Знак\nсоответствия\nстандарта', fontSize: 7, italics: true, alignment: 'center', margin: [0, 2, 0, 0] }),
              },
            ],
          },
        ],
      }
    : isJetA1Notice
      ? {
          certNo: '',
          certDates: '',
          rightWidth: 170,
          rightStack: [
            { text: jetNoticeVariant === 'secondary' ? 'Вторичное' : 'Первичное', fontSize: 10, alignment: 'right', color: '#c62828', decoration: 'underline' },
            // { text: '(ненужное зачеркнуть)', fontSize: 8, alignment: 'right' },
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right', margin: [0, 4, 0, 0] },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
            ...(stzLogoBase64 ? [{ text: '', fontSize: 1 }] : []),
          ],
        }
    : isAI98
      ? {
          certNo: 'UZ.SMT .01.0080.118181866',
          certDates: 'от 30.09.2024 г.  до 30.09.2027 г.',
          rightWidth: 200,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right' },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
            {
              columns: [
                { width: '*', text: 'Бензин без добавления присадок пригоден только в качестве моторного горючего', fontSize: 7, alignment: 'center', margin: [0, 2, 4, 0] },
                {
                  width: 60,
                  ...(stzLogoBase64
                    ? { text: '', fontSize: 1 }
                    : { text: 'Знак\nсоответствия\nстандарта', fontSize: 7, italics: true, alignment: 'center', margin: [0, 2, 0, 0] }),
                },
              ],
            },
          ],
        }
      : isJetA1Like
      ? {
          certNo: 'UZ.SMT -01-0080-73668',
          certDates: 'От 14.08.2025 г.  до 14.08.2028',
          rightWidth: 200,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right' },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
            {
              columns: [
                { width: '*', text: 'Штамп приёмки партии независимой организацией', fontSize: 7, alignment: 'center', margin: [0, 2, 4, 0] },
                {
                  width: 60,
                  ...(stzLogoBase64
                    ? { text: '', fontSize: 1 }
                    : { text: 'Знак\nсоответствия\nстандарта', fontSize: 7, italics: true, alignment: 'center', margin: [0, 2, 0, 0] }),
                },
              ],
            },
          ],
        }
      : isAI95QW
      ? {
          certNo: 'UZ.SMT .01.0079.99785875',
          certDates: 'от 27.09.2023 г.  до 27.09.2026 г',
          rightWidth: 200,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right' },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
            {
              columns: [
                { width: '*', text: 'Бензин с добавлением присадки пригоден только в качестве моторного горючего', fontSize: 7, alignment: 'center', margin: [0, 2, 4, 0] },
                {
                  width: 60,
                  ...(stzLogoBase64
                    ? { text: '', fontSize: 1 }
                    : { text: 'Знак\nсоответствия\nстандарта', fontSize: 7, italics: true, alignment: 'center', margin: [0, 2, 0, 0] }),
                },
              ],
            },
          ],
        }
        : (isDieselEuroLAK3 || isDieselEuroLAK3 || isDieselEuroLAK4SSDF || isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4 || isDieselEuroLCK5SSDF || isDieselEuroLCK5 || isDieselEuroLCK6 || isDieselEuroLDK4)
      ? {
          certNo: 'UZ.SMT-01-0018-75043',
          certDates: 'от 18.08.2025 г до 18.08.2028 г',
          rightWidth: 180,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'center' },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'center' },
            ...(stzLogoBase64
              ? [{ text: '', fontSize: 1 }]
              : [{ text: 'Знак\nсоответствия\nстандарта', fontSize: 8, italics: true, alignment: 'center', margin: [0, 2, 0, 0] }]),
          ],
        }
            : (isDieselEuroLBK4SSDF || isDieselEuroLCK4SSDF)
      ? {
          certNo: 'UZ.SMT-01-0018-85797',
          certDates: 'от 08.09.2025 г до 08.09.2028 г',
          rightWidth: 180,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'center' },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'center' },
            ...(stzLogoBase64
              ? [{ text: '', fontSize: 1 }]
              : [{ text: 'Знак\nсоответствия\nстандарта', fontSize: 8, italics: true, alignment: 'center', margin: [0, 2, 0, 0] }]),
          ],
        }
            : (isDieselEuro3OK4SSDF || isDieselEuro3OK5SSDF || isDieselEuroLBK5SSDF || isDieselEuroMEK4SSDF || isDieselEuroMEK5SSDF || isDieselEuroMEK4 || isDieselEuroMEK5 || isDieselEuro3OK4 || isDieselEuro3OK5 || isDieselEuroLAK3 || isDieselEuroLAK3 || isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4 || isDieselEuroLCK5 || isDieselEuroLCK6 || isDieselEuroLDK5 || isDieselEuroLDK6 || isDieselEuroLBK3 || isDieselEuroLBK4 || isDieselEuroLBK5 || isDieselEco3_0050_35 || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40 || isDieselByStandard)
      ? {
          certNo: 'UZ.SMT.01-0120-116555',
          certDates: 'от 05.11.2025 г до 05.11.2028 г',
          rightWidth: 180,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'center' },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'center' },
            ...(stzLogoBase64
              ? [{ text: '', fontSize: 1 }]
              : [{ text: 'Знак\nсоответствия\nстандарта', fontSize: 8, italics: true, alignment: 'center', margin: [0, 2, 0, 0] }]),
          ],
        }
      : (isDieselEcoL_0100_62 || isDieselEcoL_0100_40)
      ? {
          certNo: 'UZ.SMT.01.0080.197848',
          certDates: 'от 24.04.2026 г до 24.04.2029 г',
          rightWidth: 200,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right', noWrap: true },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
            ...(stzLogoBase64
              ? [{ text: '', fontSize: 1 }]
              : [{ text: 'Знак соответствия стандарта', fontSize: 8, italics: true, alignment: 'right' }]),
          ],
        }
      : isAI92P
      ? {
          certNo: 'UZ.SMT.01.0080.121926660',
          certDates: 'от 13.12.2024 г. до 13.12.2027 г.',
          rightWidth: 200,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right', noWrap: true },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
            ...(stzLogoBase64
              ? [{ text: '', fontSize: 1 }]
              : [{ text: 'Знак соответствия стандарта', fontSize: 8, italics: true, alignment: 'right' }]),
          ],
        }
      : {
          certNo: 'UZ.SMT.01.0080.121926660',
          certDates: 'от 13.12.2024 г. до 13.12.2027 г.',
          rightWidth: 200,
          rightStack: [
            { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right', noWrap: true },
            { text: 'MADE IN UZBEKISTAN', fontSize: 8, alignment: 'right' },
            ...(stzLogoBase64
              ? [{ text: '', fontSize: 1 }]
              : [{ text: 'Знак соответствия стандарта', fontSize: 8, italics: true, alignment: 'right' }]),
          ],
        };

  const headerCfg = descriptor
    ? (typeof descriptor.headerCfg === 'function' ? descriptor.headerCfg({ stzLogoBase64: stzLogoBase64 ?? null }) : descriptor.headerCfg)
    : legacyHeaderCfg;

  const legacyTableRows = isSeraGaz
    ? SERA_GAZ_TABLE_ROWS
    : isSzhizhennyyGaz
    ? SZHIZHENNY_GAZ_TABLE_ROWS
    : isMazutM100
    ? MAZUT_M100_RESERVOIR_TABLE_ROWS
    : isMazutM40
    ? MAZUT_M40_RESERVOIR_TABLE_ROWS
    : isRastvoritelS4
    ? RASTVORITEL_S4_RESERVOIR_TABLE_ROWS
    : isKerosine
    ? KEROSINE_FRAKTSIYA_TABLE_ROWS
    : isAI91
    ? (type === 'wagon' ? AI91_WAGON_TABLE_ROWS : AI91_RESERVOIR_TABLE_ROWS)
    : isAI91P
      ? (type === 'wagon' ? AI91P_WAGON_TABLE_ROWS : AI91P_RESERVOIR_TABLE_ROWS)
      : isAI92
        ? (type === 'wagon' ? AI92_WAGON_TABLE_ROWS : AI92_RESERVOIR_TABLE_ROWS)
        : isDieselEcoL_0100_62
          ? (type === 'wagon' ? DIESEL_ECOL_0100_62_WAGON_TABLE_ROWS : DIESEL_ECOL_0100_62_RESERVOIR_TABLE_ROWS)
        : isDieselEcoL_0100_40
          ? (type === 'wagon' ? DIESEL_ECOL_0100_40_WAGON_TABLE_ROWS : DIESEL_ECOL_0100_40_RESERVOIR_TABLE_ROWS)
        : isDieselEco3_0100_40
          ? (type === 'wagon' ? DIESEL_ECO3_0100_40_WAGON_TABLE_ROWS : DIESEL_ECO3_0100_40_RESERVOIR_TABLE_ROWS)
        : isDieselEco3_0100_35
          ? (type === 'wagon' ? DIESEL_ECO3_0100_35_WAGON_TABLE_ROWS : DIESEL_ECO3_0100_35_RESERVOIR_TABLE_ROWS)
        : isDieselEco3_0050_40
          ? (type === 'wagon' ? DIESEL_ECO3_0050_40_WAGON_TABLE_ROWS : DIESEL_ECO3_0050_40_RESERVOIR_TABLE_ROWS)
        : isDieselEco3_0050_35
          ? DIESEL_EURO_L_C_K5_RESERVOIR_TABLE_ROWS
        : isDieselEuroLAK5
          ? (type === 'wagon' ? DIESEL_EURO_L_A_K5_WAGON_TABLE_ROWS : DIESEL_EURO_L_A_K5_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLCK5SSDF
          ? (type === 'wagon' ? DIESEL_EURO_L_C_K5_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_L_C_K5_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLCK5
          ? (type === 'wagon' ? DIESEL_EURO_L_C_K5_WAGON_TABLE_ROWS : DIESEL_EURO_L_C_K5_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLCK6
          ? (type === 'wagon' ? DIESEL_EURO_L_C_K6_WAGON_TABLE_ROWS : DIESEL_EURO_L_C_K6_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLDK6
          ? (type === 'wagon' ? DIESEL_EURO_L_D_K6_WAGON_TABLE_ROWS : DIESEL_EURO_L_D_K6_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLDK5
          ? (type === 'wagon' ? DIESEL_EURO_L_D_K5_WAGON_TABLE_ROWS : DIESEL_EURO_L_D_K5_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLDK4
          ? (type === 'wagon' ? DIESEL_EURO_L_D_K4_WAGON_TABLE_ROWS : DIESEL_EURO_L_D_K4_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLBK3
          ? (type === 'wagon' ? DIESEL_EURO_L_B_K3_WAGON_TABLE_ROWS : DIESEL_EURO_L_B_K3_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLBK4SSDF
          ? (type === 'wagon' ? DIESEL_EURO_L_B_K4_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_L_B_K4_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLBK4
          ? DIESEL_EURO_L_B_K4_RESERVOIR_TABLE_ROWS
        : isDieselEuroLBK5SSDF
          ? (type === 'wagon' ? DIESEL_EURO_L_B_K5_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_L_B_K5_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLBK5
          ? DIESEL_EURO_L_B_K5_RESERVOIR_TABLE_ROWS
        : isDieselEuroLCK4SSDF
          ? (type === 'wagon' ? DIESEL_EURO_L_C_K4_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_L_C_K4_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLCK4
          ? (type === 'wagon' ? DIESEL_EURO_L_C_K4_WAGON_TABLE_ROWS : DIESEL_EURO_L_C_K4_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLAK3
          ? DIESEL_EURO_L_A_K3_RESERVOIR_TABLE_ROWS
        : isDieselEuroLAK4SSDF
          ? (type === 'wagon' ? DIESEL_EURO_L_A_K4_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_L_A_K4_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuroLAK4
          ? (type === 'wagon' ? DIESEL_EURO_L_A_K4_WAGON_TABLE_ROWS : DIESEL_EURO_L_A_K4_RESERVOIR_TABLE_ROWS)
        : isDieselEuro3OK5
          ? (type === 'wagon' ? DIESEL_EURO_3_O_K5_WAGON_TABLE_ROWS : DIESEL_EURO_3_O_K5_RESERVOIR_TABLE_ROWS)
        : isDieselEuro3OK5SSDF
          ? (type === 'wagon' ? DIESEL_EURO_3_O_K5_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_3_O_K5_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuro3OK4SSDF
          ? (type === 'wagon' ? DIESEL_EURO_3_O_K4_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_3_O_K4_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuro3OK4
          ? (type === 'wagon' ? DIESEL_EURO_3_O_K4_WAGON_TABLE_ROWS : DIESEL_EURO_3_O_K4_RESERVOIR_TABLE_ROWS)
        : isDieselEuroMEK4SSDF
          ? (type === 'wagon' ? DIESEL_EURO_M_E_K4_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_M_E_K4_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuroMEK5SSDF
          ? (type === 'wagon' ? DIESEL_EURO_M_E_K5_SSDF_WAGON_TABLE_ROWS : DIESEL_EURO_M_E_K5_SSDF_RESERVOIR_TABLE_ROWS)
        : isDieselEuroMEK5
          ? (type === 'wagon' ? DIESEL_EURO_M_E_K5_WAGON_TABLE_ROWS : DIESEL_EURO_M_E_K5_RESERVOIR_TABLE_ROWS)
        : isDieselEuroMEK4
          ? (type === 'wagon' ? DIESEL_EURO_M_E_K4_WAGON_TABLE_ROWS : DIESEL_EURO_M_E_K4_RESERVOIR_TABLE_ROWS)
        : isAI95QW
          ? (type === 'wagon' ? AI95QW_WAGON_TABLE_ROWS : AI95QW_RESERVOIR_TABLE_ROWS)
          : isAI95
            ? (type === 'wagon' ? AI95_WAGON_TABLE_ROWS : AI95_RESERVOIR_TABLE_ROWS)
            : isAI98
              ? (type === 'wagon' ? AI98_WAGON_TABLE_ROWS : AI98_RESERVOIR_TABLE_ROWS)
              : isAI92P
              ? (type === 'wagon' ? AI92P_WAGON_TABLE_ROWS : AI92P_RESERVOIR_TABLE_ROWS)
              : type === 'wagon'
              ? BENZIN_WAGON_TABLE_ROWS
              : BENZIN_RESERVOIR_TABLE_ROWS;

  const tableRows = descriptor ? descriptor.rows(type) : legacyTableRows;

  const legacyDataRows = isSeraGaz
    ? buildMazutTableRows(SERA_GAZ_TABLE_ROWS, av)
    : isSzhizhennyyGaz
    ? buildGazTableRows(SZHIZHENNY_GAZ_TABLE_ROWS, av)
    : isMazutM100
    ? buildMazutTableRows(MAZUT_M100_RESERVOIR_TABLE_ROWS, av)
    : isMazutM40
    ? buildMazutTableRows(MAZUT_M40_RESERVOIR_TABLE_ROWS, av)
    : isRastvoritelS4
    ? buildMazutTableRows(RASTVORITEL_S4_RESERVOIR_TABLE_ROWS, av)
    : isKerosine
    ? buildKerosineTableRows(KEROSINE_FRAKTSIYA_TABLE_ROWS, av)
    : isJetA1Like
    ? buildJetA1TableRows(isJetA1SSF ? JET_A1_SSF_RESERVOIR_TABLE_ROWS : JET_A1_RESERVOIR_TABLE_ROWS, av)
    : ((isDieselEco3_0050_35 && type === 'wagon') || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40 || isDieselEcoL_0100_40 || isDieselEcoL_0100_62)
      ? buildEco3WagonTableRows(
          isDieselEcoL_0100_62
            ? (type === 'wagon' ? DIESEL_ECOL_0100_62_WAGON_TABLE_ROWS : DIESEL_ECOL_0100_62_RESERVOIR_TABLE_ROWS)
          : isDieselEcoL_0100_40
            ? (type === 'wagon' ? DIESEL_ECOL_0100_40_WAGON_TABLE_ROWS : DIESEL_ECOL_0100_40_RESERVOIR_TABLE_ROWS)
          : isDieselEco3_0050_40
            ? (type === 'wagon' ? DIESEL_ECO3_0050_40_WAGON_TABLE_ROWS : DIESEL_ECO3_0050_40_RESERVOIR_TABLE_ROWS)
            : isDieselEco3_0100_35
              ? (type === 'wagon' ? DIESEL_ECO3_0100_35_WAGON_TABLE_ROWS : DIESEL_ECO3_0100_35_RESERVOIR_TABLE_ROWS)
            : isDieselEco3_0100_40
              ? (type === 'wagon' ? DIESEL_ECO3_0100_40_WAGON_TABLE_ROWS : DIESEL_ECO3_0100_40_RESERVOIR_TABLE_ROWS)
              : DIESEL_ECO3_0050_35_WAGON_TABLE_ROWS,
          av
        )
      : isAI92P
        ? buildTableRowsAI92P(legacyTableRows, av)
        : buildTableRows(legacyTableRows, av);

  const TABLE_BUILDER_FNS: Record<string, (rows: AnyObj[], av: Record<string, string>) => AnyObj[][]> = {
    default: buildTableRows,
    kerosine: buildKerosineTableRows,
    mazut: buildMazutTableRows,
    gaz: buildGazTableRows,
    eco3Wagon: buildEco3WagonTableRows,
    jetA1: buildJetA1TableRows,
  };

  const dataRows = descriptor
    ? TABLE_BUILDER_FNS[descriptor.tableBuilder](descriptor.rows(type), av)
    : legacyDataRows;

  const legacyHeaderRow: AnyObj[] = isSzhizhennyyGaz
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Норма для марки\nПБТ (Пропан-бутан технический)', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактическое значение', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : isSeraGaz
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Норма по ГОСТ 127.1-93', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактически', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : isRastvoritelS4
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: "Норма\nQ'z DSt 3035 :2015", bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактически', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : isMazutM100
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Значение для марки\nТопочный 100', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактически', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : isMazutM40
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Значение для марки', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактически', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : isKerosine
    ? [
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Метод контроля', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Норма для марки фракция керосиновая ОКП 025129', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактически', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : isJetA1Like
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Значение по стандарту', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Значение по ОТР', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактическое значение', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Метод контроля', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : isAI95QW
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'метод контроля', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Значения по Ts16472899-043:2020', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Значения по ОТР', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактические значения', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : ((isDieselEco3_0050_35 && type === 'wagon') || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40 || isDieselEcoL_0100_40 || isDieselEcoL_0100_62)
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Метод контроля', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: isDieselEcoL_0100_62 ? 'Норма для марки ЭКО-Л-0,100-62' : isDieselEcoL_0100_40 ? 'Норма для марки ЭКО-Л-0,100-40' : isDieselEco3_0050_40 ? 'Норма для марки ЭКО 3-1-0,050-40 (минус 15)' : isDieselEco3_0100_35 ? 'Норма для марки ЭКО-3-1-0,100-35' : isDieselEco3_0100_40 ? 'Норма для марки ЭКО-3-1-0,100-40' : 'Норма для марки ЭКО 3-1-0,050-35 (минус 15)', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактическое значение', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : (isDieselEuro3OK4SSDF || isDieselEuro3OK5SSDF || isDieselEuroLAK4SSDF || isDieselEuroMEK4 || isDieselEuroMEK5 || isDieselEuro3OK4 || isDieselEuro3OK5 || isDieselEuroLAK3 || isDieselEuroLAK3 || isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4SSDF || isDieselEuroLCK4 || isDieselEuroLCK5SSDF || isDieselEuroLCK5 || isDieselEuroLCK6 || isDieselEuroLDK4 || isDieselEuroLDK5 || isDieselEuroLDK6 || isDieselEuroLBK3 || isDieselEuroLBK4 || isDieselEuroLBK5 || isDieselEco3_0050_35)
    ? [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Метод контроля', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: "Значение по O'zMSt 610:2025", bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Значение по ОТР UzTR.931-028:2017', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактическое значение', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ]
    : [
        { text: '№ п/п', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Наименование показателей', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'НД на метод испытания', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: "Норма по O'z DSt летн.", bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Норма по ОТР', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
        { text: 'Фактическое значение', bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' },
      ];

  const headerRow: AnyObj[] = descriptor
    ? descriptor.columnLabels.map((text) => ({ text, bold: true, fontSize: 8, fillColor: '#f0f0f0', alignment: 'center' }))
    : legacyHeaderRow;

  const LINE_W = 520;

  let legacyFormFields: AnyObj[];
  if ((isDieselEuro3OK4 || isDieselEuro3OK5 || isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4 || isDieselEuroLCK5 || isDieselEuroLCK6 || isDieselEuroLDK4 || isDieselEuroLDK6) && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: ', ul('additive', 20), '   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if ((isDieselEuroMEK4 || isDieselEuroMEK5 || isDieselEuro3OK4 || isDieselEuro3OK5 || isDieselEuroLAK3 || isDieselEuroLAK3 || isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4 || isDieselEuroLCK5 || isDieselEuroLCK6 || isDieselEuroLDK4 || isDieselEuroLDK6) && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517   Резервуар № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_count', 8),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 100)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: ', ul('additive', 20), '   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuro3OK4SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________') + '   Партия № ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Уровень наполнения резервуара : ', ul('fill_level', 12), '   Размер партии (масса), тн: ', ul('batch_size', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517   Дата поступления образцов: ', uld('receipt_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuro3OK4SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuro3OK5SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________') + '   Партия № ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Уровень наполнения резервуара : ', ul('fill_level', 12), '   Размер партии (масса), тн: ', ul('batch_size', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517   Дата поступления образцов: ', uld('receipt_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuro3OK5SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if ((isDieselEuro3OK4 || isDieselEuro3OK5) && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________') + '   Партия № ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517   Дата поступления образцов: ', uld('receipt_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: ', ul('additive', 20), '   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLAK3 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLAK3 && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLAK4SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLAK4SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK4SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK4SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK5SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK5SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEcoL_0100_62 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517 Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_numbers', 20),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 3] },
      {
        columns: [
          { text: ['Дата поступления  образцов: ', uld('receipt_date', 12)], fontSize: 10, width: '*' },
          { text: ['Дата проведения   испытаний: ', uld('test_date', 12)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        columns: [
          { text: ['Присадки: ', ul('additive', 20)], fontSize: 10, width: '*' },
          { text: ['Дополнительные сведения: ', ul('additional_info', 18)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEcoL_0100_62) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Резервуар №: ', ul('reservoir', 10), '   Партия № ', ul('batch_no', 10), '   Уровень наполнения резервуара : ', ul('fill_level', 14)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Размер партии (масса), тн ', ul('batch_size', 12), '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ  2517'],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата поступления образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний : ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки ', ul('additive', 20), '   Дополнительные сведения ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEcoL_0100_40 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517 Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_numbers', 20),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 3] },
      {
        columns: [
          { text: ['Дата поступления  образцов: ', uld('receipt_date', 12)], fontSize: 10, width: '*' },
          { text: ['Дата проведения   испытаний: ', uld('test_date', 12)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        columns: [
          { text: ['Присадки: ', ul('additive', 20)], fontSize: 10, width: '*' },
          { text: ['Дополнительные сведения: ', ul('additional_info', 18)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEcoL_0100_40) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Резервуар №: ', ul('reservoir', 10), '   Партия № ', ul('batch_no', 10), '   Уровень наполнения резервуара : ', ul('fill_level', 14)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Размер партии (масса), тн ', ul('batch_size', 12), '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ  2517'],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата поступления образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний : ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки ', ul('additive', 20), '   Дополнительные сведения ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isRastvoritelS4 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ  2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isRastvoritelS4) {
    legacyFormFields = [
      {
        text: ['Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар ', ul('reservoir', 10), '   Замер ', ul('measurement_no', 10)],
        fontSize: 10, margin: [0, 0, 0, 2],
      },
      {
        columns: [
          { text: '', width: '*' },
          { text: ['Партия № ', ul('batch_no', 10)], fontSize: 10, width: 'auto' },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ  2517',
          '   Дата поступления образцов: ', uld('receipt_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isSzhizhennyyGaz) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО Бухарский НПЗ',
          '   Буллит: ', ul('bullit', 8),
          '   Замер : ', ul('measurement_no', 8),
          '   Партия № ', ul('batch_no', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 14921-2018',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isSeraGaz) {
    legacyFormFields = [
      {
        text: [
          'Номер партии: ', ul('batch_no', 20),
          '   Изготовлено: ', ul('manufacture_date', 20),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: 'Знак опасности 4а - вещества, которые в условиях перевозки способны легко воспламеняться от кратковременного воздействия внешнего источника',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: 'Серийный номер ООН 1350',
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isMazutM100 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ  2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isMazutM100) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО Бухарский НПЗ',
          '   Резервуар: ', ul('reservoir', 10),
          '   Замер: ', ul('measurement_no', 10),
          '   Партия № ', ul('batch_no', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ  2517',
          '   Дата поступления образцов: ', uld('receipt_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isMazutM40 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ  2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isMazutM40) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Резервуар: ', ul('reservoir', 10),
          '   Замер: ', ul('measurement_no', 10),
          '   Партия № ', ul('batch_no', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ  2517',
          '   Дата поступления образцов: ', uld('receipt_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isKerosine && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Резервуар: ', ul('reservoir', 10),
          '   Замер: ', ul('measurement_no', 10), '  см',
          '   Партия № ', ul('batch_no', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517',
          '   Дата поступления образцов: ', uld('receipt_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isKerosine) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Резервуар №: ', ul('reservoir', 10), '   Замер: ', ul('measurement_no', 10), '   Дата изготовления: ', uld('manufacture_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517'],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата поступления образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний : ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0100_40 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517 Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_numbers', 20),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 3] },
      {
        columns: [
          { text: ['Дата поступления  образцов: ', uld('receipt_date', 12)], fontSize: 10, width: '*' },
          { text: ['Дата проведения   испытаний: ', uld('test_date', 12)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        columns: [
          { text: 'Присадки: с присадки', fontSize: 10, width: '*' },
          { text: ['Дополнительные сведения: ', ul('additional_info', 18)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0100_40) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар №: ' + (v('reservoir') || '________') + '   Партия №  ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Уровень наполнения резервуара : ', ul('fill_level', 14), '   Размер партии (масса), тн ', ul('batch_size', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ  2517   Дата поступления образцов: ', uld('receipt_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения   испытаний: ', uld('test_date', 12), '   Присадки: с присадки   Дополнительные сведения:'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0100_35 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517 Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_numbers', 20),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 3] },
      {
        columns: [
          { text: ['Дата поступления  образцов: ', uld('receipt_date', 12)], fontSize: 10, width: '*' },
          { text: ['Дата проведения   испытаний: ', uld('test_date', 12)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        columns: [
          { text: 'Присадки: с присадки', fontSize: 10, width: '*' },
          { text: ['Дополнительные сведения: ', ul('additional_info', 18)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0100_35) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар №: ' + (v('reservoir') || '________') + '   Партия №  ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Уровень наполнения резервуара : ', ul('fill_level', 14), '   Размер партии (масса), тн ', ul('batch_size', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ  2517   Дата поступления образцов: ', uld('receipt_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения   испытаний: ', uld('test_date', 12), '   Присадки: с присадки   Дополнительные сведения:'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0050_40 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_numbers', 20),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 3] },
      {
        columns: [
          { text: ['Дата поступления  образцов: ', uld('receipt_date', 12)], fontSize: 10, width: '*' },
          { text: ['Дата проведения   испытаний: ', uld('test_date', 12)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        columns: [
          { text: 'Присадки: с присадки', fontSize: 10, width: '*' },
          { text: ['Дополнительные сведения: ', ul('additional_info', 18)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0050_40) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар №: ' + (v('reservoir') || '________') + '   Партия №  ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Уровень наполнения резервуара : ', ul('fill_level', 14), '   Размер партии (масса), тн ', ul('batch_size', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ  2517   Дата поступления образцов: ', uld('receipt_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения   испытаний: ', uld('test_date', 12), '   Присадки: с присадки   Дополнительные сведения:'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0050_35 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_numbers', 20),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 3] },
      {
        columns: [
          { text: ['Дата поступления  образцов: ', uld('receipt_date', 12)], fontSize: 10, width: '*' },
          { text: ['Дата проведения   испытаний: ', uld('test_date', 12)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        columns: [
          { text: 'Присадки: с присадки', fontSize: 10, width: '*' },
          { text: ['Дополнительные сведения: ', ul('additional_info', 18)], fontSize: 10, width: '*' },
        ],
        margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEco3_0050_35) {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар №: ' + (v('reservoir') || '________') + '   Партия №  ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Уровень наполнения резервуара : ', ul('fill_level', 14), '   Размер партии (масса), тн ', ul('batch_size', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ  2517   Дата поступления образцов: ', uld('receipt_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения   испытаний: ', uld('test_date', 12), '   Присадки: с присадки   Дополнительные сведения:'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLCK5SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLCK5SSDF && type === 'wagon') {
    legacyFormFields = [
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517 Резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLCK4SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLCK4SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: ', ul('wagon_count', 6)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.\nДополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if ((isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4 || isDieselEuroLCK5 || isDieselEuroLCK6) && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 12),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517   Дата изготовления ', uld('manufacture_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: ', ul('additive', 20), '   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLDK5 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLDK5 && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________') + '   Партия № ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK3 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK3 && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK5 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK5 && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK4 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 12),
          '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [ul('wagon_numbers', 110)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroLBK4 && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroMEK5SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroMEK5SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroMEK4SSDF && type === 'wagon') {
    legacyFormFields = [
      { text: 'Изготовитель и заказчик : ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 8), '   количество заявленных вагон цистерн: '],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      { text: [ul('wagon_numbers', 110)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['Дата поступления  образцов: ', uld('receipt_date', 12), '   Дата проведения  испытаний: ', uld('test_date', 12)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isDieselEuroMEK4SSDF && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Партия № ', ul('batch_no', 10),
          '   Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: SHODISAN 20 С для повышения противоизносных свойств.   Дополнительные сведения: добавлена синтетический компонент ', ul('synthetic_component', 8), ' %'],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if ((isDieselEuroMEK4 || isDieselEuroMEK5 || isDieselEuroLDK4 || isDieselEuroLDK6) && type === 'reservoir') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар № ' + (v('reservoir') || '________') + '   Партия № ' + (v('batch_no') || '________'),
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Уровень наполнения резервуара : ', ul('fill_level', 12),
          '   Размер партии (масса), тн: ', ul('batch_size', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 12), '   по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 12),
          '   Дата проведения  испытаний: ', uld('test_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Присадки: ', ul('additive', 20), '   Дополнительные сведения: ', ul('additional_info', 18)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI91 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО  Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов:', uld('sampling_date', 12),
          '  по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 6),
          '  количество заявленных вагон цистерн:', ul('wagon_count', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['номера вагон цистерн: ', ul('wagon_numbers', 50)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '   Дата проведения  испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI91) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО  Бухарский НПЗ   Резервуар:', ul('reservoir', 6),
          '  Замер :', ul('measurement_no', 6), '  Партия №', ul('batch_no', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 14), '  по ГОСТ   2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '   Дата проведения испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI95QW && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик: ООО  Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов:', uld('sampling_date', 12),
          '  по ГОСТ 2517.  Из резервуара № ', ul('reservoir_no', 6),
          '  количество заявленных вагон цистерн ', ul('wagon_count', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['номера вагон цистерн: ', ul('wagon_numbers', 50)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '             Дата проведения  испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: 'Присадки:  В автомобильный бензин добавляется  многофункциональный  пакет присадок BRAVOS PRIME G производства компании Завод присадок и реагентов , в количестве 500 mg/kg*',
        fontSize: 9, margin: [0, 0, 0, 2],
      },
      {
        text: ['Дополнительные сведения ', ul('additional_info', 30)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI95QW) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО  Бухарский НПЗ',
          '             Резервуар:', ul('reservoir', 6),
          '  Уровень наполнения ', ul('fill_level', 8), ' см',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          ' Партия №', ul('batch_no', 8),
          '  Размер партии (масса), тн ', ul('batch_size', 8),
          '  Дата  отбора образцов: ', uld('sampling_date', 12), '  по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '   Дата проведения  испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: 'Присадки:  В автомобильный бензин добавляется  многофункциональный  пакет присадок BRAVOS PRIME G производства компании Завод присадок и реагентов , в количестве 500 mg/kg *',
        fontSize: 9, margin: [0, 0, 0, 2],
      },
      {
        text: ['Дополнительные сведения ', ul('additional_info', 30)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI95 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО  Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов:', uld('sampling_date', 12),
          '  по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 6),
          '  количество заявленных вагон цистерн:', ul('wagon_count', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['номера вагон цистерн: ', ul('wagon_numbers', 50)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '   Дата проведения  испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI95) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО  Бухарский НПЗ   Резервуар:', ul('reservoir', 6),
          '  Замер :', ul('measurement_no', 6), '  Партия №', ul('batch_no', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 14), '  по ГОСТ   2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '   Дата проведения испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isJetA1Notice) {
    legacyFormFields = [
      { text: 'Предприятие изготовитель: ООО Бухарский НПЗ', fontSize: 10, margin: [0, 0, 0, 2] },
      { text: 'Представительство по контроля качества ГСМ', fontSize: 10, margin: [0, 0, 0, 6] },
      {
        text: 'о предъявлении продукции на приёмно-сдаточные испытания и окончательную техническую приёмку.',
        fontSize: 10,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 6],
      },
      { text: ['Настоящим извещением предъявляется ', ul('notice_product_name', 30)], fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['резервуар № ', ul('notice_reservoir', 10), '   высота взлива ', ul('notice_height', 10), ' см.'],
        fontSize: 10,
        margin: [0, 0, 0, 2],
      },
      { text: ['уровень наполнения ', ul('notice_fill_level', 14)], fontSize: 10, margin: [0, 0, 0, 2] },
      { text: 'номер партии стандарта', fontSize: 9, margin: [0, 0, 0, 4] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 4] },
      { text: "Указанная продукция проверена ЦЗЛ, полностью соответствует требованиям действующей НД O'z MSt 609:2025", fontSize: 10, margin: [0, 0, 0, 3] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 4] },
      { text: 'и признан годной для сдачи представительству по контроля качества ГСМ', fontSize: 10, margin: [0, 0, 0, 3] },
      { text: 'Предъявляемая продукция полностью затарена и упакована в соответствии с требованиями', fontSize: 10, margin: [0, 0, 0, 3] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 4] },
      {
        text: ['Договора № ', ul('notice_contract_no', 10), ' от « ', uld('notice_contract_date', 10), ' » 2026 г.'],
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      { text: 'К извещению прилагаются: (ненужное зачеркнуть)', fontSize: 10, margin: [0, 0, 0, 3] },
      {
        text: ['1. Паспорт качества ', uld('notice_passport_date', 10), ' г. № ', ul('notice_passport_no', 10), ' в количестве ', ul('notice_passport_count', 8), ' экз.'],
        fontSize: 10,
        margin: [12, 0, 0, 3],
      },
      { text: '2. Справка о компонентном составе', fontSize: 10, margin: [12, 0, 0, 3] },
      {
        text: ['3. Акт № ', ul('notice_act_no', 8), ' от « ', uld('notice_act_date', 10), ' » 2026 г. об анализе причин продукции возвращенной Представительству по контроля качества ГСМ'],
        fontSize: 10,
        margin: [12, 0, 0, 6],
      },
    ];
  } else if (isJetA1SSF) {
    legacyFormFields = [
      {
        text: ['Дата изготовления ', uld('manufacture_date', 14)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата отбора пробы: ', uld('sampling_date', 14),
          "  проба отбирается по O\'zDSt ASTM D 4057-19:2021 (ASTM D 4057-19)",
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата(период)проведения испытаний: ', uld('test_date', 22),
          '  Резервуар № ', ul('reservoir_no', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Уровень наполнения резервуара: ', ul('fill_level', 14),
          '  Партия № ', ul('batch_no', 10),
          '  Размер партии (масса): ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: 'Присадки: Противоизносная присадка марки NALKO 5403**, Антистатическая присадка Stadis 450***.',
        fontSize: 9, margin: [0, 0, 0, 3],
      },
      {
        text: 'Дополнительные сведения: № сертификата на синтетический компонент: UZ.SMT.01.0032.64157 от 25.07.2025 г до 25.07.2028 г',
        fontSize: 9, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isJetA1) {
    legacyFormFields = [
      {
        text: [
          'Дата отбора пробы: ', uld('sampling_date', 14),
          "  проба отбирается по O'zDSt ASTM D 4057-19:2021(ASTM D 4057-19)",
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата(период)проведения испытаний: ', uld('test_date', 40)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Уровень наполнения резервуара: ', ul('fill_level', 14),
          '  Партия № ', ul('batch_no', 10),
          '  Размер партии (масса): ', ul('batch_size', 10),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: 'Присадки:  Противоизносная присадка марки NALKO 5403**, Антистатическая присадка Stadis 450***.',
        fontSize: 9, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI98 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО  Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов:', uld('sampling_date', 12),
          '  по ГОСТ 2517.  Из резервуара № ', ul('reservoir_no', 6),
          '  количество заявленных вагон цистерн ', ul('wagon_count', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['номера вагон цистерн: ', ul('wagon_numbers', 50)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '             Дата проведения  испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI98) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО  Бухарский НПЗ   Резервуар:', ul('reservoir', 6),
          '  Замер :', ul('measurement_no', 6), '  Партия №', ul('batch_no', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов: ', uld('sampling_date', 14), '  по ГОСТ   2517',
          '             Дата поступления  образцов: ', uld('receipt_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Дата проведения испытаний: ', uld('test_date', 14)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI92 && type === 'wagon') {
    legacyFormFields = [
      {
        text: 'Изготовитель и заказчик : ООО  Бухарский НПЗ',
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата  отбора образцов:', uld('sampling_date', 12),
          '  по ГОСТ 2517.Из резервуара № ', ul('reservoir_no', 6),
          '  количество заявленных вагон цистерн:', ul('wagon_count', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['номера вагон цистерн: ', ul('wagon_numbers', 50)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '   Дата проведения  испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI92) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО  Бухарский НПЗ   Резервуар:', ul('reservoir', 6),
          '  Замер :', ul('measurement_no', 6), '  Партия №', ul('batch_no', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата изготовления ', uld('manufacture_date', 12),
          '   Дата  отбора образцов: ', uld('sampling_date', 14), '  по ГОСТ   2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата поступления  образцов: ', uld('receipt_date', 14),
          '   Дата проведения испытаний: ', uld('test_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isJetA1Notice) {
    legacyFormFields = [
      {
        text: ['Предприятие изготовитель: ООО Бухарский НПЗ'],
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: ['Представительство по контроля качества ГСМ'],
        fontSize: 10,
        margin: [0, 0, 0, 5],
      },
      {
        text: [
          'ИЗВЕЩЕНИЕ № ', ul('notice_no', 8),
          '  от ', uld('notice_date', 12),
          '  г.',
        ],
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 5],
      },
      {
        text: 'о предъявлении продукции на приёмно-сдаточные испытания и окончательную техническую приёмку.',
        fontSize: 10,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 6],
      },
      {
        text: ['Настоящим извещением предъявляется ', ul('notice_product_name', 24)],
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Резервуар № ', ul('notice_reservoir', 8),
          '  высота взлива ', ul('notice_height', 8),
          ' см  уровень наполнения ', ul('notice_fill_level', 8),
        ],
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Договор № ', ul('notice_contract_no', 10),
          '  от ', uld('notice_contract_date', 12),
          '  г.',
        ],
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: 'К извещению прилагаются: (ненужное зачеркнуть)',
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: [
          '1. Паспорт качества ', uld('notice_passport_date', 12),
          ' г. № ', ul('notice_passport_no', 10),
          ' в количестве ', ul('notice_passport_count', 6),
          ' экз.',
        ],
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: '2. Справка о компонентном составе',
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: [
          '3. Акт № ', ul('notice_act_no', 10),
          '  от ', uld('notice_act_date', 12),
          '  г. об анализе причин продукции возвращенной Представительству по контроля качества ГСМ',
        ],
        fontSize: 10,
        margin: [0, 0, 0, 5],
      },
      {
        text: [
          'Поступило представительство по контроля качества ГСМ ', ul('notice_arrival_hour', 8),
          ' час ', uld('notice_arrival_date', 10),
          '  2026 г.',
        ],
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: 'Испытания, приёмку произвести ______________________________',
        fontSize: 10,
        margin: [0, 0, 0, 3],
      },
      {
        text: 'Начальник. Представительство по контроля качества ГСМ',
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 3],
      },
      {
        text: '________________ «___» ______ 2026 г.',
        fontSize: 10,
        alignment: 'center',
        margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI91P && type === 'wagon') {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик: ООО Бухарский НПЗ   Дата отбора образцов: ', uld('sampling_date', 14),
          ' по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_count', 6),
          '   номера вагон цистерн: ', ul('wagon_numbers', 30),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата проведения испытаний: ', uld('test_date', 12),
          '  Партия №: ', ul('batch_no', 6),
          '  Октаноповышающая присадка: ', ul('additive', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Октаноповышающие добавки: ', ul('aromatic_hydrocarbons', 20)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (isAI91P) {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар: ', ul('reservoir', 6),
          '  Замер : ', ul('measurement_no', 8), '  Дата изготовления ', uld('manufacture_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата отбора образцов: ', uld('sampling_date', 14),
          ' по ГОСТ 2517   Дата поступления образцов: ', uld('receipt_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата проведения испытаний: ', uld('test_date', 12),
          '  Партия №: ', ul('batch_no', 6),
          '  Октаноповышающая присадка: ', ul('additive', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Октаноповышающие добавки: ', ul('aromatic_hydrocarbons', 20)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else if (type === 'wagon') {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик: ООО Бухарский НПЗ   Дата отбора образцов: ', uld('sampling_date', 14),
          ' по ГОСТ 2517',
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Из резервуара № ', ul('reservoir_no', 8),
          '   количество заявленных вагон цистерн: ', ul('wagon_count', 6),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['номера вагон цистерн: ', ul('wagon_numbers', 60)],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата проведения испытаний: ', uld('test_date', 12),
          '  Партия №: ', ul('batch_no', 6),
          '  Октаноповышающая присадка: ', ul('additive', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Октаноповышающие добавки: ', ul('aromatic_hydrocarbons', 20)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  } else {
    legacyFormFields = [
      {
        text: [
          'Изготовитель и заказчик : ООО Бухарский НПЗ   Резервуар: ', ul('reservoir', 6),
          '  Замер : ', ul('measurement_no', 8), ' см  Дата изготовления ', uld('manufacture_date', 12),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата отбора образцов: ', uld('sampling_date', 14),
          ' по ГОСТ 2517   Дата поступления образцов: ', uld('receipt_date', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: [
          'Дата проведения испытаний: ', uld('test_date', 12),
          '  Партия №: ', ul('batch_no', 6),
          '  Октаноповышающая присадка: ', ul('additive', 14),
        ],
        fontSize: 10, margin: [0, 0, 0, 3],
      },
      {
        text: ['Октаноповышающие добавки: ', ul('aromatic_hydrocarbons', 20)],
        fontSize: 10, margin: [0, 0, 0, 6],
      },
    ];
  }

  const formFields = descriptor
    ? descriptor.buildFormFields({
        type,
        rv,
        av,
        helpers: { v, fmtDate, nb, ul, uld, ulName, toTitleCase, toAbbreviatedName },
        jetNoticeVariant,
        tplName,
        tplStandard,
      })
    : legacyFormFields;

  return {
    pageSize: 'A4',
    pageMargins: (isAI92P ? [20, 34, 18, 18] : [20, 18, 18, 18]) as [number, number, number, number],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    footer: (currentPage: number, pageCount: number) =>
      ({ text: `Страница ${currentPage} из ${pageCount}`, fontSize: 9, alignment: 'center', margin: [0, -1, 0, 5] }),
    content: [
      {
        columns: [
          {
            width: 200,
            stack: [
              { text: 'ООО Бухарский НПЗ', fontSize: 9 },
              {
                columns: [
                  ...(logoBase64 ? [{ image: logoBase64, width: 60, height: 48, margin: [20, 2, 0, 0] }] : []),
                ],
                columnGap: 0,
                margin: [0, 2, 0, 0],
              },
            ],
          },
          {
            width: '*',
            stack: [
              { text: '№ сертификата на продукцию', fontSize: 8, alignment: 'center' },
              { text: headerCfg.certNo, fontSize: 8, alignment: 'center' },
              { text: headerCfg.certDates, fontSize: 8, alignment: 'center' },
            ],
            margin: [-20, 0, 0, 0],
          },
          {
            width: headerCfg.rightWidth,
            stack: headerCfg.rightStack,
          },
        ],
        columnGap: 5,
        margin: [0, 0, 0, isAI92P ? -10 : -14],
      },
      ...(stzLogoBase64 && !HIDE_STZ_LOGO
        ? [{
            image: stzLogoBase64,
            fit: [80, 52] as [number, number],
            absolutePosition: { x: 490, y: isAI92P ? 60 : (isAI91 || isAI91P || isAI98 || isJetA1Like || isAI95QW) ? 28 : 32 },
          }]
        : []),
      ...(isJetA1Notice
        ? [{
            text: [
              { text: 'ИЗВЕЩЕНИЕ № ', bold: true, fontSize: 16 },
              { text: v('notice_no') ? v('notice_no') + nb.repeat(4) : nb.repeat(14), bold: true, fontSize: 16, decoration: 'underline' },
            ],
            alignment: 'center',
            margin: [0, 0, 0, 4],
          }]
        : [{
            text: isDieselEuroLBK3 && type === 'wagon' ? [
              { text: 'Паспорт  Д№', bold: true, fontSize: 16 },
              { text: v('passport_no') ? v('passport_no') + nb.repeat(4) : nb.repeat(22), bold: true, fontSize: 16 },
            ] : [
              { text: 'ПАСПОРТ № ', bold: true, fontSize: 16 },
              { text: v('passport_no') ? v('passport_no') + nb.repeat(4) : nb.repeat(22), bold: true, fontSize: 16 },
            ],
            alignment: 'center',
            margin: [0, 0, 0, 4],
          }]),
      {
        text: isJetA1Notice
          ? 'от « ' + fmtDate(v('notice_date')) + ' » 2026 г.'
          : (isAI91 || isAI91P)
          ? `Бензин автомобильный марки АИ-91- К2-Л по ${tplStandard || "O'zDSt 3031:2015"}`
          : isAI92
            ? `Бензин автомобильный марки АИ-92- К2-Л по ${tplStandard || "O'zDSt 3031:2015"}`
            : isSzhizhennyyGaz
              ? "Наименование продукции: Сжиженные углеводородные газы, используемые для\nк коммунально-бытового и производственного потребления в качестве топлива марка ПБТ (Пропан-бутан технический) по ГОСТ 34858– 2022"
            : isSeraGaz
              ? "Сера техническая газовая комовая сорт 99,98 ГОСТ-127.1-93"
            : isRastvoritelS4
              ? "НАИМЕНОВАНИЕ ПРОДУКЦИИ: Растворитель углеводородный С4-135/220"
            : isMazutM100
              ? "НАИМЕНОВАНИЕ ПРОДУКЦИИ: Топочный мазут - марка 100  ГОСТ 10585-2013"
            : isMazutM40
              ? "НАИМЕНОВАНИЕ ПРОДУКЦИИ: Топочный мазут - марка 40  ГОСТ 10585-2013"
            : isKerosine
              ? "НАИМЕНОВАНИЕ ПРОДУКЦИИ: ФРАКЦИЯ КЕРОСИНОВАЯ ВЫРАБАТЫВАЕМОГО ПО TS 16472899-040:2018"
            : isDieselEcoL_0100_62
              ? "Наименование продукции: Дизельное топливо для марки ЭКО-Л-0,100-62\nвырабатываемого по O'z DSt 1134:2018"
            : isDieselEcoL_0100_40
              ? "Наименование продукции: Дизельное топливо для марки ЭКО-Л-0,100-40\nвырабатываемого по O'z DSt 1134:2018"
            : isDieselEco3_0100_40
              ? "Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,100-40 (минус 15)\nвырабатываемого по O'z DSt 1134:2018"
            : isDieselEco3_0100_35
              ? "Наименование продукции: Дизельное топливо для марки ЭКО 3 -1 -0,100-35 (минус 15)\nвырабатываемого по O'z DSt 1134:2018"
            : isDieselEco3_0050_40
              ? "Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,050-40 (минус 15)\nвырабатываемого по O'z DSt 1134:2018"
            : isDieselEco3_0050_35
              ? "Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,050-35 (минус 15)\nвырабатываемого по O'z DSt 1134:2018"
            : isDieselEuroLAK5
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(А)–К5 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLCK5SSDF
              ? "Наименование продукции: Топливо дизельное  ДТ- ЕВРО –Л(С)–К5-SSDF O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLCK5
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(С)–К5 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLCK6
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(С)–К6 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLDK6
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(D)–К6 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLDK5
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(D)–К5 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLBK3
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(В)–К3 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLBK4
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(В)–К4 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLBK5
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(В)–К5 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLDK4
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(D)–К4 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLCK4SSDF
              ? "Наименование продукции: Топливо дизельное  ДТ- ЕВРО –Л(С)–К4-SSDF O'zMSt 610:2025\n(ОТР UzTR.931-028:2017)"
            : isDieselEuroLCK4
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(С)–К4 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLAK3
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(А)–К3 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLBK5SSDF
              ? "Наименование продукции: Топливо дизельное  ДТ- ЕВРО –Л(В)–К5-SSDF O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroLBK4SSDF
              ? "Наименование продукции: Топливо дизельное  ДТ- ЕВРО –Л(В)–К4-SSDF O'zMSt 610:2025"
            : isDieselEuroLAK4SSDF
              ? "Наименование продукции: Топливо дизельное  ДТ- ЕВРО –Л(А)–К4-SSDF O'zMSt 610:2025"
            : isDieselEuroLAK4
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –Л(А)–К4 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuro3OK5
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –3(О)–К5 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuro3OK5SSDF
              ? "Наименование продукции: Дизельное топливо для марки ДТ- ЕВРО –3(О)–К5-SSDF вырабатываемого по O'zMSt 610:2025"
            : isDieselEuro3OK4SSDF
              ? "Наименование продукции: Дизельное топливо для марки ДТ- ЕВРО –3(О)–К4-SSDF вырабатываемого по O'zMSt 610:2025"
            : isDieselEuro3OK4
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –3(О)–К4 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroMEK4SSDF
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –М(Е)–К4-SSDF O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroMEK5SSDF
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –М(Е)–К5-SSDF O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroMEK5
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –М(Е)–К5 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isDieselEuroMEK4
              ? "Наименование продукции: Топливо дизельное ДТ- ЕВРО –М(Е)–К4 O'zMSt 610:2025 (ОТР UzTR.931-028:2017)"
            : isAI95QW
              ? 'Наименование продукции: Бензин марки  QuWatt  АИ 95- К2-Л вырабатываемого по Ts16472899-043:2020'
              : isAI95
                ? `Бензин автомобильный марки АИ-95- К2-Л по ${tplStandard || "O'zDSt 3031:2015"}`
                : isAI98
                  ? `Бензин автомобильный марки АИ-98- К2-Л по ${tplStandard || "O'zDSt 3031:2015"}`
                  : isJetA1SSF
                    ? "Наименование продукции: Топливо авиационное для газотурбинных двигателей JET A-1 O\'z MSt 609:2025"
                  : isJetA1
                    ? "Топливо авиационное для  газотурбинных двигателей JET A-1 вырабатываемого по  O'z MSt 609:2025"
                    : `Наименование продукции: ${tplName}${tplStandard ? ` по ${tplStandard}` : ''}`,
        fontSize: 11, bold: true, alignment: 'center', margin: [0, 0, 0, 3],
      },
      {
        text: isJetA1SSF
          ? 'Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул Мустакиллик 1 тел: 365-364-12-27'
          : isJetA1Notice
            ? 'Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул Мустакиллик 1 тел: 365-364-12-27'
          : (isDieselEuroLCK5SSDF && type === 'wagon')
            ? 'Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27, Изготовитель и заказчик: ООО Бухарский НПЗ'
          : isSeraGaz
            ? ''
          : (isSzhizhennyyGaz || isMazutM100 || isMazutM40 || isRastvoritelS4 || isKerosine || isDieselEuro3OK4SSDF || isDieselEuro3OK5SSDF || isDieselEuroLBK4SSDF || isDieselEuroLBK5SSDF || isDieselEuroLCK4SSDF || isDieselEuroLCK5SSDF || isDieselEuroLAK4SSDF || isDieselEuroMEK4SSDF || isDieselEuroMEK5SSDF || isDieselEuroMEK4 || isDieselEuroMEK5 || isDieselEuro3OK4 || isDieselEuro3OK5 || isDieselEuroLAK3 || isDieselEuroLAK3 || isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4 || isDieselEuroLCK5 || isDieselEuroLCK6 || isDieselEuroLDK4 || isDieselEuroLDK5 || isDieselEuroLDK6 || isDieselEuroLBK3 || isDieselEuroLBK4 || isDieselEuroLBK5 || isDieselEco3_0050_35 || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40 || isDieselEcoL_0100_40)
            ? 'Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27'
          : 'Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ г. Кара-уд Базар ул Мустакиллик 1 тел: 365-364-12-27',
        fontSize: 9, alignment: 'center', margin: [0, 0, 0, 5],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 5] },
      ...formFields,
      ...(!isJetA1Notice
        ? [{
            table: {
              headerRows: (isJetA1Like || isAI92P) ? 0 : 1,
              widths: (isSzhizhennyyGaz || isSeraGaz || isMazutM100 || isMazutM40 || isRastvoritelS4) ? [24, '*', 70, 60] : isKerosine ? ['*', 80, 70, 60] : isJetA1Like ? [20, '*', 72, 50, 48, 72] : ((isDieselEco3_0050_35 && type === 'wagon') || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40 || isDieselEcoL_0100_40 || isDieselEcoL_0100_62) ? [24, '*', 68, 68, 60] : isAI92P ? [24, '*', 58, 105, 52, 60] : [24, '*', 58, 58, 52, 60],
              body: dataRows.length > 0
                ? [headerRow, ...dataRows]
                : [headerRow, (isSzhizhennyyGaz || isSeraGaz || isMazutM100 || isMazutM40 || isRastvoritelS4 || isKerosine)
                    ? [{ text: '', colSpan: 4 }, {}, {}, {}]
                    : ((isDieselEco3_0050_35 && type === 'wagon') || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40 || isDieselEcoL_0100_40 || isDieselEcoL_0100_62)
                    ? [{ text: '', colSpan: 5 }, {}, {}, {}, {}]
                    : [{ text: '', colSpan: 6 }, {}, {}, {}, {}, {}]
                  ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#555555',
              vLineColor: () => '#555555',
              paddingLeft: () => 3,
              paddingRight: () => 3,
              paddingTop: () => isAI92P ? 6 : 2,
              paddingBottom: () => isAI92P ? 6 : 2,
            },
            margin: [0, 0, 0, 6],
          }]
        : []),
      ...(isJetA1Notice
        ? [
            { text: 'Руководитель предприятия', bold: true, fontSize: 11, margin: [0, 2, 0, 2] },
            { text: '(Главный инженер) ______________________________', bold: true, fontSize: 11, margin: [0, 0, 0, 3] },
            { text: 'Начальник ЦЗЛ ______________________________', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
            {
              text: ['Поступило представительство по контроля качества ГСМ ', ul('notice_arrival_hour', 6), ' час «___» ', uld('notice_arrival_date', 8), ' 2026 г.'],
              fontSize: 10,
              margin: [0, 0, 0, 3],
            },
            { text: 'Испытания, приёмку произвести ______________________________', fontSize: 10, margin: [0, 0, 0, 3] },
            { text: 'Начальник. Представительство по контроля качества ГСМ', bold: true, fontSize: 11, margin: [0, 0, 0, 3] },
            { text: '________________ «___» ______ 2026 г.', alignment: 'center', fontSize: 10, margin: [0, 0, 0, 6] },
          ]
        : [
            {
              text: isJetA1SSF
                ? "*Согласно п.3 примечания к табл.1 O'zMSt 609:2025 температура вспышки, определяемая методом ASTM D 56 должна быть не ниже 40 °C. Качество продукции соответствует требованиям O'zMSt 609:2025 и OTR UzTR.931-028:2017. Изготовитель гарантирует соответствие качества продукции требованиям стандарта в течение 5 лет со дня изготовления при соблюдении потребителем условий транспортирования и хранения. Перепечатка и копирование без разрешения испытательной лаборатории запрещена. **Присадка улучшает смазывающую способность авиационного топлива. ***Присадка повышает удельную электропроводность топлива."
                : isDieselEcoL_0100_62
                  ? "Примечание: Согласно примечания таб. № 1 O'z DSt 1134:2018 допускается вырабатывать и применять с предельной температурой фильтруемости не выше 0 °C, температурой застывания не выше минус 5 °C, температурой помутнения не выше 0 °C при минимальной температуре воздуха на месте применения топлива 0 °C и выше. Согласно изменение №1 O'z DSt 1134:2018 для дизельных топлив ЭКО-Л, изготовленных с вовлечением в производство газойля каталитического крекинга и коксования, плотность при 20 °C: не более 890 kg/m3. Гарантийный срок хранение топлива – 5 лет со дня изготовления. Дополнения, отклонения или исключения от метода-отсутствует. Перепечатка и копирование без разрешения испытательной лаборатории запрещена."
                : isDieselEuroLBK4SSDF
                  ? "Примечания: Согласно по примечания табл. № 1 O'zMSt 610:2025 пункт 7 показатель 15 определяют только при введении в топливо метиловых эфиров жирных кислот. Таб. № 2, пункт 2: при вовлечении в производство дизельного топлива легких фракций или синтетического продукта, допускается вырабатывать летнее и межсезонное топливо с плотностью при 15 °C не менее 800 kg/m3. Гарантийный срок хранения топлива - 6 месяц со дня изготовления при соблюдении потребителем условий транспортирования и хранения. Перепечатка и копирование без разрешения испытательной лаборатории запрещена."
                : isDieselEuroLCK4SSDF
                  ? "Примечания: Согласно по примечания табл. № 1 O'zMSt 610:2025 пункт 7 показатель 15 определяют только при введении в топливо метиловых эфиров жирных кислот. Таб. № 2, пункт 2: при вовлечении в производство дизельного топлива легких фракций или синтетического продукта, допускается вырабатывать летнее и межсезонное топливо с плотностью при 15 °C не менее 800 kg/m3. Гарантийный срок хранения топлива - 1 год со дня изготовления при соблюдении потребителем условий транспортирования и хранения. Перепечатка и копирование без разрешения испытательной лаборатории запрещена."
                : isDieselEcoL_0100_40
                  ? "Примечание: Согласно примечания таб. № 1 O'z DSt 1134:2018 допускается вырабатывать и применять с предельной температурой фильтруемости не выше 0 °C, температурой застывания не выше минус 5 °C, температурой помутнения не выше 0 °C при минимальной температуре воздуха на месте применения топлива 0 °C и выше. Согласно изменение №1 O'z DSt 1134:2018 для дизельных топлив ЭКО-Л и ЭКО-З, изготовленных с вовлечением в производство газойля каталитического крекинга и коксования, плотность при 20 °C не более 890 kg/m3. Гарантийный срок хранение топлива – 5 лет со дня изготовления. Дополнения, отклонения или исключения от метода-отсутствует. Перепечатка и копирование без разрешения испытательной лаборатории запрещена."
                : (isDieselEuro3OK4SSDF || isDieselEuro3OK5SSDF || isDieselEuroLBK5SSDF || isDieselEuroLCK5SSDF || isDieselEuroLAK4SSDF || isDieselEuroMEK4 || isDieselEuroMEK5 || isDieselEuro3OK4 || isDieselEuro3OK5 || isDieselEuroLAK3 || isDieselEuroLAK3 || isDieselEuroLAK4 || isDieselEuroLAK5 || isDieselEuroLCK4 || isDieselEuroLCK5 || isDieselEuroLCK6 || isDieselEuroLDK4 || isDieselEuroLDK5 || isDieselEuroLDK6 || isDieselEuroLBK3 || isDieselEuroLBK4 || isDieselEuroLBK5 || isDieselEco3_0050_35 || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40)
                  ? "Примечания: Согласно примечанию табл. № 1 O'zMSt 610:2025 пункт 7 показатель 15 определяют только при введении в топливо метиловых эфиров жирных кислот. Допускается производство межсезонного топлива с предельной температурой фильтруемости не выше минус 5 °C. Гарантийный срок хранения топлива - 6 месяц со дня изготовления при соблюдении потребителем условий транспортирования и хранения. Перепечатка и копирование без разрешения испытательной лаборатории запрещена."
                : 'Гарантийный срок хранения бензина - один год со дня изготовления. Примечание: изменение № 2 пункт 8. Значение плотности при 15 °C определяется для экспортируемого и импортируемого бензина, или по требованию потребителя. Дополнения, отклонения или исключения от метода-отсутствует. Перепечатка и копирование без разрешения испытательной лаборатории запрещена.',
              fontSize: 8.5, alignment: 'justify', margin: [0, 0, 0, 10],
            },
            ...(isJetA1SSF
              ? [{
                  text: ['Представитель руководства предприятия ', { text: nb.repeat(60), decoration: 'underline' }],
                  fontSize: 11,
                  margin: [0, 0, 0, 8],
                }]
              : []),
            {
              columns: [
                {
                  width: '30%',
                  stack: [
                    ...(shtampSvg ? [{ svg: shtampSvg, width: 160, margin: [0, 5, 0, 8] }] : []),
                  ],
                },
                {
                  width: '35%',
                  stack: [
                    ...(showShiftHead ? [{ text: ['Начальник смены: ', ulName('shift_head')], fontSize: 10, margin: [0, 14, 0, 5] }] : []),
                    ...(showSttlHead ? [{ text: ['Начальник СТТЛ: ', ulName('sttl_head')], fontSize: 10, margin: [0, 0, 0, 5] }] : []),
                    ...(showCzlHead ? [{ text: ['Начальник ЦЗЛ: ', ulName('czl_head')], fontSize: 10, margin: [0, 0, 0, 5] }] : []),
                    ...(showDispatcherHead ? [{ text: ['Диспетчер: ', ulName('dispatcher_head')], fontSize: 10, margin: [0, 0, 0, 5] }] : []),
                    ...(showPassportIssueDate ? [{ text: ['Дата выдачи паспорта ', uld('passport_issue_date')], fontSize: 10 }] : []),
                  ],
                },
                {
                  width: '35%',
                  stack: [
                    // { text: 'Штамп соответствия НД', fontSize: 10, alignment: 'right', margin: [0, 20, 0, 0] },
                    ...(muvofiqSvg ? [{ svg: withComplianceNumber(muvofiqSvg, v('compliance_number')), width: 200, alignment: 'right', margin: [0, -28, 0, 0] }] : []),
                    // pdfmake pushes an image that doesn't fit in the remaining page space onto
                    // the next page whole, rather than letting the rest of the document flow
                    // around it — kept small and flush against the stamp above so the whole
                    // signature block (and this QR) stays on the same page as the data table.
                    ...(verifyQrBase64 ? [{ image: verifyQrBase64, width: 70, height: 70, alignment: 'right', margin: [0, 0, 0, 0] }] : []),
                  ],
                },
              ],
              // Keeps the stamp/signer-names/QR columns together as one unit — without this,
              // pdfmake can split the signer-name stack mid-list across a page break (e.g.
              // Начальник смены/СТТЛ on page 1, ЦЗЛ/dispatcher on page 2).
              unbreakable: true,
            },
          ]),
      ...(isAI95QW && qrCodeBase64
        ? [{
            columns: [
              {
                width: 80,
                stack: [
                  { image: qrCodeBase64, width: 75, height: 75 }
                  
                ],
              },
              { width: '*', text: '' },
            ],
            margin: [0, 8, 0, 0] as [number, number, number, number],
          }]
        : []),
    ],
  };
}

export async function getPdfBlobUrl(
  type: 'reservoir' | 'wagon',
  tplName: string,
  tplStandard: string,
  rv: Record<string, string>,
  av: Record<string, string>,
  jetNoticeVariant?: 'primary' | 'secondary',
  approvalStatus?: string | null,
  verificationInfo?: PassportVerificationInfo | null,
): Promise<string> {
  const isAI95QW = (tplName || '').toLowerCase().includes('quwatt');
  let qrCodeBase64: string | null = null;
  let qrToken: string | null = null;

  if (isAI95QW) {
    qrToken = generateToken();
    const qrUrl = `${BASE_IMAGE_URL}/media/passport_pdfs/${qrToken}.pdf`;
    qrCodeBase64 = await generateQrCodeBase64(qrUrl);
  }

  let verifyQrBase64: string | null = null;
  if (approvalStatus === 'approved' && verificationInfo && verificationInfo.steps.length) {
    const bnpzUzLogoBase64 = await fetchBnpzUzLogoBase64();
    verifyQrBase64 = await generateQrCodeWithLogoBase64(buildVerificationQrText(verificationInfo), bnpzUzLogoBase64);
  }

  const [pdfMake, logoBase64, stzLogoBase64, muvofiqSvg, shtampSvg] = await Promise.all([loadPdfMake(), fetchLogoBase64(), fetchStzLogoBase64(), fetchMuvofiqSvg(), fetchShtampSvg()]);
  const docDefinition = buildDocDefinition(type, tplName, tplStandard, rv, av, logoBase64, qrCodeBase64, jetNoticeVariant, stzLogoBase64, muvofiqSvg, shtampSvg, verifyQrBase64);
  return new Promise<string>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
        if (qrToken) uploadPdfBlob(qrToken, blob);
        resolve(URL.createObjectURL(blob));
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function downloadPdf(
  type: 'reservoir' | 'wagon',
  tplName: string,
  tplStandard: string,
  rv: Record<string, string>,
  av: Record<string, string>,
  jetNoticeVariant?: 'primary' | 'secondary',
  approvalStatus?: string | null,
  verificationInfo?: PassportVerificationInfo | null,
): Promise<void> {
  const isAI95QW = (tplName || '').toLowerCase().includes('quwatt');
  let qrCodeBase64: string | null = null;
  let qrToken: string | null = null;

  if (isAI95QW) {
    qrToken = generateToken();
    const qrUrl = `${BASE_IMAGE_URL}/media/passport_pdfs/${qrToken}.pdf`;
    qrCodeBase64 = await generateQrCodeBase64(qrUrl);
  }

  let verifyQrBase64: string | null = null;
  if (approvalStatus === 'approved' && verificationInfo && verificationInfo.steps.length) {
    const bnpzUzLogoBase64 = await fetchBnpzUzLogoBase64();
    verifyQrBase64 = await generateQrCodeWithLogoBase64(buildVerificationQrText(verificationInfo), bnpzUzLogoBase64);
  }

  const [pdfMake, logoBase64, stzLogoBase64, muvofiqSvg, shtampSvg] = await Promise.all([loadPdfMake(), fetchLogoBase64(), fetchStzLogoBase64(), fetchMuvofiqSvg(), fetchShtampSvg()]);
  const docDefinition = buildDocDefinition(type, tplName, tplStandard, rv, av, logoBase64, qrCodeBase64, jetNoticeVariant, stzLogoBase64, muvofiqSvg, shtampSvg, verifyQrBase64);
  const passportNo = rv.passport_no || '';
  const prefix = type === 'wagon' ? 'wagon_passport' : 'passport';
  const filename = `${prefix}_${passportNo || tplName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  if (qrToken) {
    return new Promise<void>((resolve) => {
      pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
        uploadPdfBlob(qrToken!, blob);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        resolve();
      });
    });
  }

  pdfMake.createPdf(docDefinition).download(filename);
}

// ─── Этикетка (product label) ──────────────────────────────────────────────

function fmtEtiketkaDate(raw?: string): string {
  if (!raw) return '';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
}

function buildEtiketkaLabelStack(productName: string, productStandard: string, rv: Record<string, string>, type: 'reservoir' | 'wagon'): AnyObj[] {
  const v = (key: string) => rv[key] || '';
  const label = { fontSize: 9 };
  const value = { fontSize: 9, alignment: 'left' as const };
  const reservoirNo = type === 'wagon' ? v('reservoir_no') : v('reservoir');
  const nameLower = productName.toLowerCase();
  const isDieselEcoL_0100_62 = nameLower.includes('эко-л') && (nameLower.includes('0,100-62') || nameLower.includes('0.100-62'));
  const heightValue = (isDieselEcoL_0100_62 && type !== 'wagon')
    ? v('fill_level')
    : type === 'wagon' ? v('wagon_count') : v('measurement_no');
  const heightUnit = type === 'wagon' ? 'в-ц' : 'sm';

  return [
    { text: 'YORLIQ', bold: true, fontSize: 13, alignment: 'center', margin: [0, 0, 0, 8] },
    {
      table: {
        widths: ['42%', '19%', '20%', '19%'],
        body: [
          [{ text: '1. Arbitraj namuna №:', ...label }, { text: '', colSpan: 3, ...value }, {}, {}],
          [{ text: '2. Neft mahsuloti nomi, markasi:', ...label }, { text: productName, colSpan: 3, ...value }, {}, {}],
          [{ text: '3. Yetkazib beruvchi tashkilot nomi:', ...label }, { text: 'Buxoro NQIZ', colSpan: 3, ...value }, {}, {}],
          [{ text: '4. Rezervuar №:', ...label }, { text: reservoirNo, colSpan: 3, ...value }, {}, {}],
          [{ text: '5. Mahsulot balandligi:', ...label }, { text: heightValue, colSpan: 2, ...value }, {}, { text: heightUnit, ...value }],
          [{ text: "6. To'p (partiya) №:", ...label }, { text: v('batch_no'), colSpan: 3, ...value }, {}, {}],
          [{ text: '7. Sisternalar №:', ...label }, { text: v('wagon_numbers') || '-', colSpan: 3, ...value, margin: [0, 0, 0, 12] }, {}, {}],
          [{ text: '8. Sana:', ...label }, { text: fmtEtiketkaDate(v('sampling_date')), ...value, noWrap: true }, { text: 'Namuna olish vaqti:', ...label }, { text: '', ...value }],
          [{ text: '9. Saqlash muddati:', ...label }, { text: '', ...value }, { text: 'kun', ...label }, { text: '', ...value }],
          [{ text: '10. Mahsulotning texnik sharti:', ...label }, { text: productStandard, colSpan: 3, ...value }, {}, {}],
          [{ text: '11. Namuna oluvchi:', ...label }, { text: '', colSpan: 3, ...value }, {}, {}],
          [{ text: "12. Smena boshlig'i:", ...label }, { text: v('shift_head'), colSpan: 3, ...value }, {}, {}],
        ],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
      },
    },
  ];
}

function buildEtiketkaDocDefinition(productName: string, productStandard: string, rv: Record<string, string>, type: 'reservoir' | 'wagon'): AnyObj {
  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [10, 24, 10, 24] as [number, number, number, number],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    content: [
      {
        columns: [
          { width: '48%', stack: buildEtiketkaLabelStack(productName, productStandard, rv, type) },
          {
            width: '4%',
            stack: [
              {
                canvas: [
                  { type: 'line', x1: 12, y1: 0, x2: 12, y2: 320, lineWidth: 1, dash: { length: 4, space: 3 }, lineColor: '#000000' },
                ],
              },
            ],
          },
          { width: '48%', stack: buildEtiketkaLabelStack(productName, productStandard, rv, type) },
        ],
      },
    ],
  };
}

export async function getEtiketkaBlobUrl(productName: string, productStandard: string, rv: Record<string, string>, type: 'reservoir' | 'wagon'): Promise<string> {
  const pdfMake = await loadPdfMake();
  const docDefinition = buildEtiketkaDocDefinition(productName, productStandard, rv, type);
  return new Promise<string>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
        resolve(URL.createObjectURL(blob));
      });
    } catch (e) {
      reject(e);
    }
  });
}
