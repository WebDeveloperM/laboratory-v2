import type { PassportTemplateDescriptor, TemplateFieldsProps, TemplateTableProps } from '../../types';
import { AI91_RESERVOIR_TABLE_ROWS, AI91_WAGON_TABLE_ROWS } from './rows';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

const thCls = 'border border-stroke px-3 py-2 text-center text-xs font-semibold text-black dark:border-strokedark dark:text-white bg-gray-2 dark:bg-meta-4';
const tdCls = 'border border-stroke px-3 py-2 text-xs text-black dark:border-strokedark dark:text-white';

function AI91HeaderFields({ type, renderReservoirInput, renderReservoirTextarea }: TemplateFieldsProps) {
  if (type === 'wagon') {
    return (
      <div className="px-5 pb-4 pt-4">
        <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
          <div className="space-y-3 font-serif text-lg text-black dark:text-white">
            <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
              <span>ПАСПОРТ №</span>
              {renderReservoirInput('passport_no', '', true)}
            </div>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
              <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
              <span>Дата отбора образцов:</span>
              {renderReservoirInput('sampling_date', '', true)}
              <span>по ГОСТ 2517. Из резервуара №</span>
              {renderReservoirInput('reservoir_no', '', true)}
              <span>количество заявленных вагон цистерн:</span>
              {renderReservoirInput('wagon_count', '', true)}
            </div>
            <div className="flex flex-col gap-y-1 text-xl">
              <span>номера вагон цистерн:</span>
              {renderReservoirTextarea('wagon_numbers', true)}
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
              <span>Дата поступления образцов:</span>
              {renderReservoirInput('receipt_date', '', true)}
              <span>Дата проведения испытаний:</span>
              {renderReservoirInput('test_date', '', true)}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="px-5 pb-4 pt-4">
      <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
        <div className="space-y-3 font-serif text-lg text-black dark:text-white">
          <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
            <span>ПАСПОРТ №</span>
            {renderReservoirInput('passport_no', '', true)}
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
            <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
            <span>Резервуар:</span>
            {renderReservoirInput('reservoir', '', true)}
            <span>Замер :</span>
            {renderReservoirInput('measurement_no', '', true)}
            <span>Партия №</span>
            {renderReservoirInput('batch_no', '', true)}
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
            <span>Дата изготовления</span>
            {renderReservoirInput('manufacture_date', '', true)}
            <span>Дата отбора образцов:</span>
            {renderReservoirInput('sampling_date', '', true)}
            <span>по ГОСТ 2517</span>
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
            <span>Дата поступления образцов:</span>
            {renderReservoirInput('receipt_date', '', true)}
            <span>Дата проведения испытаний:</span>
            {renderReservoirInput('test_date', '', true)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AI91ResultsTable({ type, renderActualValueCell, trackedKey, renderEmployeeSelect, renderReservoirInput }: TemplateTableProps) {
  const rows = type === 'wagon' ? AI91_WAGON_TABLE_ROWS : AI91_RESERVOIR_TABLE_ROWS;
  return (
    <div className="mx-5 mb-4 overflow-x-auto text-center">
      <table className="w-full table-auto border-collapse text-center">
        <thead>
          <tr>
            <th className={thCls}>№</th>
            <th className={thCls}>Наименование показателей</th>
            <th className={thCls}>НД на метод испытания</th>
            <th className={thCls}>Норма по O`z DSt летн.</th>
            <th className={thCls}>Норма по ОТР</th>
            <th className={thCls}>Фактическое значение</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={trackedKey(row.key)}>
              {(index === 0 || rows[index - 1].no !== row.no) && (
                <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
              )}
              <td className={tdCls}>{row.name}</td>
              {(index === 0 || rows[index - 1].gost !== row.gost || row.gostRowSpan) && (
                <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
              )}
              <td className={tdCls}>{row.norm}</td>
              <td className={tdCls}>{row.normOtr}</td>
              <td className={tdCls}>{renderActualValueCell(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-start justify-between gap-6 text-xl text-black dark:text-white">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <span className="whitespace-nowrap">Начальник смены</span>
            {renderEmployeeSelect('shift_head', true)}
          </div>
          <div className="flex items-end gap-3">
            <span className="whitespace-nowrap">Начальник СТТЛ</span>
            {renderEmployeeSelect('sttl_head', true)}
          </div>
          <div className="flex items-end gap-3">
            <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
            {renderEmployeeSelect('czl_head', true)}
          </div>
          <div className="flex items-end gap-3">
            <span className="whitespace-nowrap">Диспетчер</span>
            {renderEmployeeSelect('dispatcher_head', true)}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <span className="whitespace-nowrap">Дата выдачи паспорта</span>
            {renderReservoirInput('passport_issue_date', '', true)}
          </div>
          <div className="flex items-end gap-3">
            <span className="whitespace-nowrap">Номер соответствия</span>
            {renderReservoirInput('compliance_number', '', true)}
          </div>
        </div>
      </div>
    </div>
  );
}

function headerCfg({ stzLogoBase64 }: { stzLogoBase64: string | null }) {
  return {
    certNo: 'UZ.SMT .01.0080.121925486',
    certDates: 'От 13.12.2024 г. до 13.12.2027 г.',
    rightWidth: 200,
    rightStack: [
      { text: "O'ZBEKISTONDA ISHLAB CHIQARILGAN", fontSize: 8, alignment: 'right' },
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
  } as AnyObj;
}

function buildFormFields({ type, helpers }: { type: 'reservoir' | 'wagon'; helpers: AnyObj }): AnyObj[] {
  const { ul, uld } = helpers;
  if (type === 'wagon') {
    return [
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
  }
  return [
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
}

const COLUMN_LABELS = ['№ п/п', 'Наименование показателей', 'НД на метод испытания', "Норма по O'z DSt летн.", 'Норма по ОТР', 'Фактическое значение'];

// Only Начальник смены is mandatory among the signer selects — the approval chain skips any
// step left unassigned (see resolve_next_status), so СТТЛ / ЦЗЛ / Диспетчер stay optional.
const REQUIRED_SIGNATURE_FIELDS = ['shift_head', 'passport_issue_date', 'compliance_number'];

function makeDescriptor(templateKey: string): PassportTemplateDescriptor {
  return {
    templateKey,
    rows: (type) => (type === 'wagon' ? AI91_WAGON_TABLE_ROWS : AI91_RESERVOIR_TABLE_ROWS),
    tableBuilder: 'default',
    columnLabels: COLUMN_LABELS,
    headerCfg,
    productNameLine: ({ tplStandard }) => `Бензин автомобильный марки АИ-91- К2-Л по ${tplStandard || "O'zDSt 3031:2015"}`,
    addressFootnote: 'Гарантийный срок хранения бензина - один год со дня изготовления. Примечание: изменение № 2 пункт 8. Значение плотности при 15 °C определяется для экспортируемого и импортируемого бензина, или по требованию потребителя. Дополнения, отклонения или исключения от метода-отсутствует. Перепечатка и копирование без разрешения испытательной лаборатории запрещена.',
    buildFormFields,
    extras: { showStzLogoStamp: true },
    requiredFieldKeys: (type) => type === 'wagon'
      ? [...REQUIRED_SIGNATURE_FIELDS, 'passport_no', 'sampling_date', 'reservoir_no', 'wagon_count', 'wagon_numbers', 'receipt_date', 'test_date']
      : [...REQUIRED_SIGNATURE_FIELDS, 'passport_no', 'reservoir', 'measurement_no', 'batch_no', 'manufacture_date', 'sampling_date', 'receipt_date', 'test_date'],
    HeaderFields: AI91HeaderFields,
    ResultsTable: AI91ResultsTable,
    wagonVariant: 'standard',
    displayName: 'Бензин АИ-91',
    category: 'Бензин',
    productStandard: "O'zDSt 3031:2015",
  };
}

export const AI91_DESCRIPTOR: PassportTemplateDescriptor = makeDescriptor('benzin-ai-91');
