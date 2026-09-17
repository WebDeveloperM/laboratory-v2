import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaRegFileAlt, FaSpinner } from 'react-icons/fa';
import { Button, Modal } from 'flowbite-react';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { isActualValueInvalid, ACTUAL_VALUE_INVALID_CLS, parseNormNumber } from '../../utils/passportValidation';
import { buildApprovalSteps } from '../../utils/passportApproval';
import { normalizeRole } from '../../utils/pageAccess';
import PassportApprovalStepsTable from '../../components/Passport/PassportApprovalStepsTable';
import { downloadPdf, getPdfBlobUrl, PassportVerificationInfo, resolveTemplateKey, TEMPLATE_REGISTRY, BENZIN_RESERVOIR_TABLE_ROWS as RES_ROWS, BENZIN_WAGON_TABLE_ROWS as WAG_ROWS, AI91_RESERVOIR_TABLE_ROWS as AI91_RES_ROWS, AI91_WAGON_TABLE_ROWS as AI91_WAG_ROWS, AI91P_RESERVOIR_TABLE_ROWS as AI91P_RES_ROWS, AI91P_WAGON_TABLE_ROWS as AI91P_WAG_ROWS, AI92P_RESERVOIR_TABLE_ROWS as AI92P_RES_ROWS, AI92P_WAGON_TABLE_ROWS as AI92P_WAG_ROWS, AI92_RESERVOIR_TABLE_ROWS as AI92_RES_ROWS, AI92_WAGON_TABLE_ROWS as AI92_WAG_ROWS, AI95_RESERVOIR_TABLE_ROWS as AI95_RES_ROWS, AI95_WAGON_TABLE_ROWS as AI95_WAG_ROWS, AI95QW_RESERVOIR_TABLE_ROWS as AI95QW_RES_ROWS, AI95QW_WAGON_TABLE_ROWS as AI95QW_WAG_ROWS, AI98_RESERVOIR_TABLE_ROWS as AI98_RES_ROWS, AI98_WAGON_TABLE_ROWS as AI98_WAG_ROWS, JET_A1_RESERVOIR_TABLE_ROWS as JET_A1_RES_ROWS, JET_A1_SSF_RESERVOIR_TABLE_ROWS as JET_A1_SSF_RES_ROWS, DIESEL_EURO_M_E_K4_RESERVOIR_TABLE_ROWS as DIESEL_K4_RES_ROWS, DIESEL_EURO_M_E_K4_WAGON_TABLE_ROWS as DIESEL_K4_WAG_ROWS, DIESEL_EURO_M_E_K5_RESERVOIR_TABLE_ROWS as DIESEL_K5_RES_ROWS, DIESEL_EURO_M_E_K5_WAGON_TABLE_ROWS as DIESEL_K5_WAG_ROWS, DIESEL_EURO_3_O_K4_RESERVOIR_TABLE_ROWS as DIESEL_3O_K4_RES_ROWS, DIESEL_EURO_3_O_K4_WAGON_TABLE_ROWS as DIESEL_3O_K4_WAG_ROWS, DIESEL_EURO_3_O_K5_RESERVOIR_TABLE_ROWS as DIESEL_3O_K5_RES_ROWS, DIESEL_EURO_3_O_K5_WAGON_TABLE_ROWS as DIESEL_3O_K5_WAG_ROWS, DIESEL_EURO_L_A_K4_RESERVOIR_TABLE_ROWS as DIESEL_LA_K4_RES_ROWS, DIESEL_EURO_L_A_K4_WAGON_TABLE_ROWS as DIESEL_LA_K4_WAG_ROWS, DIESEL_EURO_L_A_K5_RESERVOIR_TABLE_ROWS as DIESEL_LA_K5_RES_ROWS, DIESEL_EURO_L_A_K5_WAGON_TABLE_ROWS as DIESEL_LA_K5_WAG_ROWS, DIESEL_EURO_L_C_K4_RESERVOIR_TABLE_ROWS as DIESEL_LC_K4_RES_ROWS, DIESEL_EURO_L_C_K4_WAGON_TABLE_ROWS as DIESEL_LC_K4_WAG_ROWS, DIESEL_EURO_L_C_K5_RESERVOIR_TABLE_ROWS as DIESEL_LC_K5_RES_ROWS, DIESEL_EURO_L_C_K5_WAGON_TABLE_ROWS as DIESEL_LC_K5_WAG_ROWS, DIESEL_EURO_L_C_K6_RESERVOIR_TABLE_ROWS as DIESEL_LC_K6_RES_ROWS, DIESEL_EURO_L_C_K6_WAGON_TABLE_ROWS as DIESEL_LC_K6_WAG_ROWS, DIESEL_EURO_L_D_K4_RESERVOIR_TABLE_ROWS as DIESEL_LD_K4_RES_ROWS, DIESEL_EURO_L_D_K4_WAGON_TABLE_ROWS as DIESEL_LD_K4_WAG_ROWS, DIESEL_EURO_L_D_K5_RESERVOIR_TABLE_ROWS as DIESEL_LD_K5_RES_ROWS, DIESEL_EURO_L_D_K5_WAGON_TABLE_ROWS as DIESEL_LD_K5_WAG_ROWS, DIESEL_EURO_L_D_K6_RESERVOIR_TABLE_ROWS as DIESEL_LD_K6_RES_ROWS, DIESEL_EURO_L_D_K6_WAGON_TABLE_ROWS as DIESEL_LD_K6_WAG_ROWS, DIESEL_EURO_L_B_K3_RESERVOIR_TABLE_ROWS as DIESEL_LB_K3_RES_ROWS, DIESEL_EURO_L_B_K3_WAGON_TABLE_ROWS as DIESEL_LB_K3_WAG_ROWS, DIESEL_EURO_L_B_K4_RESERVOIR_TABLE_ROWS as DIESEL_LB_K4_RES_ROWS, DIESEL_EURO_L_B_K5_RESERVOIR_TABLE_ROWS as DIESEL_LB_K5_RES_ROWS, DIESEL_EURO_L_A_K3_RESERVOIR_TABLE_ROWS as DIESEL_LA_K3_RES_ROWS, DIESEL_EURO_M_E_K4_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_MEK4_SSDF_RES_ROWS, DIESEL_EURO_M_E_K4_SSDF_WAGON_TABLE_ROWS as DIESEL_MEK4_SSDF_WAG_ROWS, DIESEL_EURO_M_E_K5_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_MEK5_SSDF_RES_ROWS, DIESEL_EURO_M_E_K5_SSDF_WAGON_TABLE_ROWS as DIESEL_MEK5_SSDF_WAG_ROWS, DIESEL_EURO_3_O_K4_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_3OK4_SSDF_RES_ROWS, DIESEL_EURO_3_O_K4_SSDF_WAGON_TABLE_ROWS as DIESEL_3OK4_SSDF_WAG_ROWS, DIESEL_EURO_3_O_K5_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_3OK5_SSDF_RES_ROWS, DIESEL_EURO_3_O_K5_SSDF_WAGON_TABLE_ROWS as DIESEL_3OK5_SSDF_WAG_ROWS, DIESEL_EURO_L_A_K4_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_LAK4_SSDF_RES_ROWS, DIESEL_EURO_L_A_K4_SSDF_WAGON_TABLE_ROWS as DIESEL_LAK4_SSDF_WAG_ROWS, DIESEL_EURO_L_B_K4_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_LBK4_SSDF_RES_ROWS, DIESEL_EURO_L_B_K4_SSDF_WAGON_TABLE_ROWS as DIESEL_LBK4_SSDF_WAG_ROWS, DIESEL_EURO_L_B_K5_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_LBK5_SSDF_RES_ROWS, DIESEL_EURO_L_B_K5_SSDF_WAGON_TABLE_ROWS as DIESEL_LBK5_SSDF_WAG_ROWS, DIESEL_EURO_L_C_K4_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_LCK4_SSDF_RES_ROWS, DIESEL_EURO_L_C_K4_SSDF_WAGON_TABLE_ROWS as DIESEL_LCK4_SSDF_WAG_ROWS, DIESEL_EURO_L_C_K5_SSDF_RESERVOIR_TABLE_ROWS as DIESEL_LCK5_SSDF_RES_ROWS, DIESEL_EURO_L_C_K5_SSDF_WAGON_TABLE_ROWS as DIESEL_LCK5_SSDF_WAG_ROWS, DIESEL_ECO3_0050_35_WAGON_TABLE_ROWS as DIESEL_ECO3_WAG_ROWS, DIESEL_ECO3_0050_40_RESERVOIR_TABLE_ROWS as DIESEL_ECO3_40_RES_ROWS, DIESEL_ECO3_0050_40_WAGON_TABLE_ROWS as DIESEL_ECO3_40_WAG_ROWS, DIESEL_ECO3_0100_35_RESERVOIR_TABLE_ROWS as DIESEL_ECO3_100_35_RES_ROWS, DIESEL_ECO3_0100_35_WAGON_TABLE_ROWS as DIESEL_ECO3_100_35_WAG_ROWS, DIESEL_ECO3_0100_40_RESERVOIR_TABLE_ROWS as DIESEL_ECO3_100_40_RES_ROWS, DIESEL_ECO3_0100_40_WAGON_TABLE_ROWS as DIESEL_ECO3_100_40_WAG_ROWS, DIESEL_ECOL_0100_40_RESERVOIR_TABLE_ROWS as DIESEL_ECOL_100_40_RES_ROWS, DIESEL_ECOL_0100_62_RESERVOIR_TABLE_ROWS as DIESEL_ECOL_100_62_RES_ROWS, KEROSINE_FRAKTSIYA_TABLE_ROWS as KERO_ROWS, MAZUT_M40_RESERVOIR_TABLE_ROWS as MAZUT_M40_RES_ROWS, MAZUT_M100_RESERVOIR_TABLE_ROWS as MAZUT_M100_RES_ROWS, RASTVORITEL_S4_RESERVOIR_TABLE_ROWS as RAS_S4_RES_ROWS, SERA_GAZ_TABLE_ROWS as SERA_GAZ_RES_ROWS, SZHIZHENNY_GAZ_TABLE_ROWS as SZH_GAZ_ROWS } from '../../utils/passportPdf';
type ResponsiblePerson = {
  id: number;
  full_name: string;
  position: string;
  // Links the directory entry to a login — the same slug UserRole stores, which is how the
  // signed-in Начальник смены is matched to their own entry.
  employee_slug?: string | null;
};

type TRow = {
  id?: number;
  order: number;
  name: string;
  gost: string;
  standard_value: string;
  standard_value_2: string;
  unit: string;
  is_section: boolean;
};

type TemplateDetail = {
  id: number;
  name: string;
  category: string;
  product_standard: string;
  reservoir_type: string;
  header_html: string;
  footer_html: string;
  rows: TRow[];
};

type BenzinReservoirField = {
  key:
    | 'passport_no'
    | 'reservoir'
    | 'measurement_no'
    | 'manufacture_date'
    | 'sampling_date'
    | 'receipt_date'
    | 'test_date'
    | 'batch_no'
    | 'bullit'
    | 'additive'
    | 'aromatic_hydrocarbons'
    | 'czl_head'
    | 'shift_head'
    | 'passport_issue_date'
    | 'sttl_head'
    | 'dispatcher_head'
    | 'compliance_number'
    | 'reservoir_no'
    | 'wagon_count'
    | 'wagon_numbers'
    | 'fill_level'
    | 'batch_size'
    | 'additional_info'
    | 'notice_no'
    | 'notice_date'
    | 'notice_product_name'
    | 'notice_reservoir'
    | 'notice_fill_level'
    | 'notice_height'
    | 'notice_contract_no'
    | 'notice_contract_date'
    | 'notice_passport_date'
    | 'notice_passport_no'
    | 'notice_passport_count'
    | 'notice_act_no'
    | 'notice_act_date'
    | 'notice_arrival_hour'
    | 'notice_arrival_date'
    | 'synthetic_component'
  ;
  label: string;
  type: 'text' | 'date' | 'textarea';
};

const BENZIN_RESERVOIR_FIELDS: BenzinReservoirField[] = [
  { key: 'passport_no', label: 'Паспорт №', type: 'text' },
  { key: 'reservoir', label: 'Резервуар', type: 'text' },
  { key: 'measurement_no', label: 'Замер', type: 'text' },
  { key: 'manufacture_date', label: 'Дата изготовления', type: 'date' },
  { key: 'sampling_date', label: 'Дата отбора образцов', type: 'date' },
  { key: 'receipt_date', label: 'Дата поступления образцов', type: 'date' },
  { key: 'test_date', label: 'Дата проведения испытаний', type: 'date' },
  { key: 'batch_no', label: 'Партия №', type: 'text' },
  { key: 'bullit', label: 'Буллит', type: 'text' },
  { key: 'additive', label: 'Октаноповышающая добавка', type: 'text' },
  { key: 'aromatic_hydrocarbons', label: 'Смесь ароматических углеводородов, %', type: 'text' },
  { key: 'fill_level', label: 'Уровень наполнения (см)', type: 'text' },
  { key: 'batch_size', label: 'Размер партии (масса), тн', type: 'text' },
  { key: 'additional_info', label: 'Дополнительные сведения', type: 'text' },
  { key: 'notice_no', label: 'Извещение №', type: 'text' },
  { key: 'notice_date', label: 'Дата извещения', type: 'date' },
  { key: 'notice_product_name', label: 'Наименование продукции', type: 'text' },
  { key: 'notice_reservoir', label: 'Резервуар №', type: 'text' },
  { key: 'notice_fill_level', label: 'Заголовок/метка', type: 'text' },
  { key: 'notice_height', label: 'Высота взлива', type: 'text' },
  { key: 'notice_contract_no', label: 'Договор №', type: 'text' },
  { key: 'notice_contract_date', label: 'Дата договора', type: 'date' },
  { key: 'notice_passport_date', label: 'Паспорт качества дата', type: 'date' },
  { key: 'notice_passport_no', label: 'Паспорт качества №', type: 'text' },
  { key: 'notice_passport_count', label: 'Паспорт качества экз.', type: 'text' },
  { key: 'notice_act_no', label: 'Акт №', type: 'text' },
  { key: 'notice_act_date', label: 'Дата акта', type: 'date' },
  { key: 'notice_arrival_hour', label: 'Час прибытия', type: 'text' },
  { key: 'notice_arrival_date', label: 'Дата прибытия', type: 'date' },
  { key: 'synthetic_component', label: 'Синтетический компонент, %', type: 'text' },
  { key: 'czl_head', label: 'Начальник ЦЗЛ', type: 'text' },
  { key: 'shift_head', label: 'Начальник смены', type: 'text' },
  { key: 'passport_issue_date', label: 'Дата выдачи паспорта', type: 'date' },
  { key: 'sttl_head', label: 'Начальник СТТЛ', type: 'text' },
  { key: 'dispatcher_head', label: 'Диспетчер', type: 'text' },
  { key: 'compliance_number', label: 'Номер соответствия', type: 'text' },
];

// Rendered only under isBenzinReservoir / isBenzinWagon, and both of those are derived
// solely from isAI92P — so despite the generic name these two are the АИ-92+присадка
// tables, which carry ASTM test-method names rather than the ГОСТ ones in BENZIN_*.
const BENZIN_RESERVOIR_TABLE_ROWS = AI92P_RES_ROWS;
const BENZIN_WAGON_TABLE_ROWS = AI92P_WAG_ROWS;

// Every product's table rows, merged, so a row definition can be looked up by key alone —
// used to validate actual values without re-deriving "which product/type is active".
const ALL_TABLE_ROWS: { key: string; name: string; norm: string }[] = [
  ...RES_ROWS, ...WAG_ROWS, ...AI91_RES_ROWS, ...AI91_WAG_ROWS, ...AI91P_RES_ROWS, ...AI91P_WAG_ROWS,
  ...AI92_RES_ROWS, ...AI92_WAG_ROWS, ...AI95_RES_ROWS, ...AI95_WAG_ROWS, ...AI95QW_RES_ROWS, ...AI95QW_WAG_ROWS,
  ...AI98_RES_ROWS, ...AI98_WAG_ROWS, ...JET_A1_RES_ROWS, ...JET_A1_SSF_RES_ROWS,
  ...DIESEL_K4_RES_ROWS, ...DIESEL_K4_WAG_ROWS, ...DIESEL_K5_RES_ROWS, ...DIESEL_K5_WAG_ROWS,
  ...DIESEL_3O_K4_RES_ROWS, ...DIESEL_3O_K4_WAG_ROWS, ...DIESEL_3O_K5_RES_ROWS, ...DIESEL_3O_K5_WAG_ROWS,
  ...DIESEL_LA_K4_RES_ROWS, ...DIESEL_LA_K4_WAG_ROWS, ...DIESEL_LA_K5_RES_ROWS, ...DIESEL_LA_K5_WAG_ROWS,
  ...DIESEL_LC_K4_RES_ROWS, ...DIESEL_LC_K4_WAG_ROWS, ...DIESEL_LC_K5_RES_ROWS, ...DIESEL_LC_K5_WAG_ROWS,
  ...DIESEL_LC_K6_RES_ROWS, ...DIESEL_LC_K6_WAG_ROWS, ...DIESEL_LD_K4_RES_ROWS, ...DIESEL_LD_K4_WAG_ROWS,
  ...DIESEL_LD_K5_RES_ROWS, ...DIESEL_LD_K5_WAG_ROWS, ...DIESEL_LD_K6_RES_ROWS, ...DIESEL_LD_K6_WAG_ROWS,
  ...DIESEL_LB_K3_RES_ROWS, ...DIESEL_LB_K3_WAG_ROWS, ...DIESEL_LB_K4_RES_ROWS, ...DIESEL_LB_K5_RES_ROWS,
  ...DIESEL_LA_K3_RES_ROWS, ...DIESEL_MEK4_SSDF_RES_ROWS, ...DIESEL_MEK4_SSDF_WAG_ROWS,
  ...DIESEL_MEK5_SSDF_RES_ROWS, ...DIESEL_MEK5_SSDF_WAG_ROWS, ...DIESEL_3OK4_SSDF_RES_ROWS, ...DIESEL_3OK4_SSDF_WAG_ROWS,
  ...DIESEL_3OK5_SSDF_RES_ROWS, ...DIESEL_3OK5_SSDF_WAG_ROWS, ...DIESEL_LAK4_SSDF_RES_ROWS, ...DIESEL_LAK4_SSDF_WAG_ROWS,
  ...DIESEL_LBK4_SSDF_RES_ROWS, ...DIESEL_LBK4_SSDF_WAG_ROWS, ...DIESEL_LBK5_SSDF_RES_ROWS, ...DIESEL_LBK5_SSDF_WAG_ROWS,
  ...DIESEL_LCK4_SSDF_RES_ROWS, ...DIESEL_LCK4_SSDF_WAG_ROWS, ...DIESEL_LCK5_SSDF_RES_ROWS, ...DIESEL_LCK5_SSDF_WAG_ROWS,
  ...DIESEL_ECO3_WAG_ROWS, ...DIESEL_ECO3_40_RES_ROWS, ...DIESEL_ECO3_40_WAG_ROWS,
  ...DIESEL_ECO3_100_35_RES_ROWS, ...DIESEL_ECO3_100_35_WAG_ROWS, ...DIESEL_ECO3_100_40_RES_ROWS, ...DIESEL_ECO3_100_40_WAG_ROWS,
  ...DIESEL_ECOL_100_40_RES_ROWS, ...DIESEL_ECOL_100_62_RES_ROWS,
  ...KERO_ROWS, ...MAZUT_M40_RES_ROWS, ...MAZUT_M100_RES_ROWS, ...RAS_S4_RES_ROWS, ...SERA_GAZ_RES_ROWS, ...SZH_GAZ_ROWS,
];

const ROWS_BY_KEY: Record<string, { key: string; name: string; norm: string }> = {};
ALL_TABLE_ROWS.forEach((row) => { ROWS_BY_KEY[row.key] = row; });

const thCls = 'border border-stroke px-3 py-2 text-center text-xs font-semibold text-black dark:border-strokedark dark:text-white bg-gray-2 dark:bg-meta-4';
const tdCls = 'border border-stroke px-3 py-2 text-xs text-black dark:border-strokedark dark:text-white';
const inlineInputCls = 'h-8 min-w-[120px] border-0 border-b border-red-400 bg-transparent px-1 text-sm text-black outline-none focus:border-primary dark:text-white';
const actualValueInputCls = 'w-full min-w-[140px] border-0 bg-transparent px-2 py-1 text-sm text-black outline-none focus:bg-blue-50 dark:text-white dark:focus:bg-meta-4';
const actualValueInvalidCls = ACTUAL_VALUE_INVALID_CLS;

export default function PassportTemplateDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();

  // This page is mounted under two paths: /pasporta/template/:id for the passport-creation
  // flow, and /nastroyka/passport-templates/detail/:id for template editing in Настройки.
  // The two carry different route guards, so every self-redirect below has to stay in the
  // section the user arrived from — otherwise someone who may create passports but has no
  // Настройки access gets bounced to the dashboard mid-flow.
  const detailBase = pathname.startsWith('/pasporta/')
    ? '/pasporta/template'
    : '/nastroyka/passport-templates/detail';

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [selectedType, setSelectedType] = useState<'reservoir' | 'wagon'>('reservoir');
  const [reservoirValues, setReservoirValues] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<ResponsiblePerson[]>([]);
  const [actualRowValues, setActualRowValues] = useState<Record<string, string>>({});
  // "свой вариант" chosen in a COMBO_TEXT_ROW_KEYS dropdown (see below) before any value is
  // typed — kept separate from actualRowValues so the custom-input box stays open even while
  // its value is still ''; otherwise it would look identical to no selection having been made.
  const [comboCustomMode, setComboCustomMode] = useState<Record<string, boolean>>({});
  const activeRowKeysRef = useRef<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [approvalInfo, setApprovalInfo] = useState<{
    status: string;
    statusDisplay: string;
    currentStep: string | null;
    rejectedStep: string | null;
    rejectionComment: string;
    rejectedByUsername: string | null;
    rejectedAt: string | null;
    submittedByUsername: string | null;
    submittedAt: string | null;
    sttlApprovedByUsername: string | null;
    sttlApprovedAt: string | null;
    czlApprovedByUsername: string | null;
    czlApprovedAt: string | null;
    dispatcherApprovedByUsername: string | null;
    dispatcherApprovedAt: string | null;
    canSubmit: boolean;
    canApproveCurrentStep: boolean;
  } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);

  const from = (searchParams.get('from') || '').toLowerCase();
  const item = (searchParams.get('item') || '').toLowerCase();
  const editPassportId = searchParams.get('editPassportId') || '';
  const typeParam = searchParams.get('type') as 'reservoir' | 'wagon' | null;
  const isEdit = Boolean(editPassportId);
  const backCat = from === 'diesel' ? 'Дизель' : from === 'diesel-eco' ? 'Дизель ЭКО' : from === 'benzin' ? 'Бензин' : '';
  const selectBack = backCat ? `/pasporta/select?cat=${encodeURIComponent(backCat)}` : '/pasporta/select';
  const backPath = isEdit ? '/pasporta' : (from === 'benzin' || from === 'jet' || from === 'diesel' || from === 'diesel-eco') ? selectBack : '/nastroyka/passport-templates';
  const staticBackPath =
    from === 'kerosine' ? `/pasporta/select?cat=${encodeURIComponent('Керосиновая фракция')}`
    : from === 'mazut' ? `/pasporta/select?cat=${encodeURIComponent('Мазут')}`
    : from === 'rastvoritel' ? `/pasporta/select?cat=${encodeURIComponent('Растворитель углеводородный')}`
    : from === 'sera' ? `/pasporta/select?cat=${encodeURIComponent('Техническая сера')}`
    : from === 'gaz' ? `/pasporta/select?cat=${encodeURIComponent('Сжиженный газ')}`
    : null;
  const handleBack = () => (!isEdit && staticBackPath) ? navigate(staticBackPath) : navigate(backPath);

  useEffect(() => {
    axioss.get('/settings/responsible-persons/')
      .then((r: any) => setEmployees(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => {});
  }, []);

  // A Начальник смены signs as themselves: their own directory entry is selected for them and
  // the field is locked, so a passport cannot be filed under a different shift head. Matched on
  // employee_slug rather than the displayed name, which is not unique or stable.
  const currentEmployeeSlug = (localStorage.getItem('employee_slug') || '').trim();
  const isShiftHeadUser = normalizeRole(localStorage.getItem('role')) === 'shift_head';
  const ownShiftHeadEntry = isShiftHeadUser && currentEmployeeSlug
    ? employees.find((emp) => (emp.employee_slug || '').trim() === currentEmployeeSlug)
    : undefined;
  const lockShiftHead = Boolean(ownShiftHeadEntry);

  useEffect(() => {
    // Only fill in on a new passport — editing an existing one keeps whoever was recorded.
    if (!ownShiftHeadEntry || isEdit) return;
    setReservoirValues((prev) =>
      prev.shift_head === ownShiftHeadEntry.full_name
        ? prev
        : { ...prev, shift_head: ownShiftHeadEntry.full_name },
    );
  }, [ownShiftHeadEntry, isEdit]);

  useEffect(() => {
    if (!id) return;

    const createFromItem = async () => {
      const normalizeTemplateName = (name: string) => (name || '')
        .toLowerCase()
        .trim()
        .replace(/^топливо\s+дизельное\s+дт-\s*/i, '')
        .replace(/[–—−-]/g, '')
        .replace(/[()]/g, '')
        .replace(/[аa]/g, 'a')
        .replace(/[сc]/g, 'c')
        .replace(/[дd]/g, 'd')
        .replace(/[оo]/g, 'o')
        .replace(/[еe]/g, 'e')
        .replace(/\s+/g, '');

      const itemMap: Record<string, { name: string; category: string; standard: string }> = {
        'benzin-ai-91': { name: 'Бензин АИ-91', category: 'Бензин', standard: "O'zDSt 3031:2015" },
        'benzin-ai-91-prisadka': { name: 'Бензин АИ-91+присадка', category: 'Бензин', standard: "O'zDSt 3031:2015" },
        'benzin-ai-92': { name: 'Бензин АИ-92', category: 'Бензин', standard: "O'zDSt 3031:2015" },
        'benzin-ai-92-prisadka': { name: 'Бензин АИ-92+присадка', category: 'Бензин', standard: "O'zDSt 3031:2015" },
        'benzin-ai-95': { name: 'Бензин АИ-95', category: 'Бензин', standard: "O'zDSt 3031:2015" },
        'benzin-ai-95-quwatt': { name: 'Бензин АИ-95 QuWatt', category: 'Бензин', standard: "O'zDSt 3031:2015" },
        'benzin-ai-98': { name: 'Бензин АИ-98', category: 'Бензин', standard: "O'zDSt 3031:2015" },
        'jet-a1':      { name: 'Jet A-1',               category: 'Jet A-1', standard: 'DEF STAN 91-091' },
        'jet-a1-ssf':  { name: 'Jet A-1-SSF',           category: 'Jet A-1', standard: 'DEF STAN 91-091' },
        'jet-a1-izv':  { name: 'Извещение для Jet А-1', category: 'Jet A-1', standard: '' },
        'diesel-evro-m-e-k4': { name: 'Топливо дизельное ДТ- ЕВРО –М(Е)–К4', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-m-e-k5': { name: 'Топливо дизельное ДТ- ЕВРО –М(Е)–К5', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-3-o-k4': { name: 'Топливо дизельное ДТ- ЕВРО –3(О)–К4', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-3-o-k5': { name: 'Топливо дизельное ДТ- ЕВРО –3(О)–К5', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-a-k3': { name: 'ЕВРО-Л-(А)-К3', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-a-k4': { name: 'Топливо дизельное ДТ- ЕВРО –Л(А)–К4', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-a-k5': { name: 'Топливо дизельное ДТ- ЕВРО –Л(А)–К5', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-c-k4': { name: 'ЕВРО-Л-(С)-К4', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-c-k5': { name: 'ЕВРО-Л-(С)-К5', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-c-k6': { name: 'ЕВРО-Л-(С)-К6', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-d-k4': { name: 'ЕВРО-Л-(D)-К4', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-d-k5': { name: 'ЕВРО-Л-(D)-К5', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-d-k6': { name: 'ЕВРО-Л-(D)-К6', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-b-k3': { name: 'ЕВРО-Л-(В)-К3', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-b-k4': { name: 'ЕВРО-Л-(В)-К4', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-b-k5': { name: 'ЕВРО-Л-(В)-К5', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-m-e-k4-ssdf': { name: 'ЕВРО-М-(Е)-К4 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-m-e-k5-ssdf': { name: 'ЕВРО-М-(Е)-К5 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-3-o-k4-ssdf': { name: 'ЕВРО-3-(О)-К4 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-3-o-k5-ssdf': { name: 'ЕВРО-3-(О)-К5 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-a-k4-ssdf': { name: 'ЕВРО-Л-(А)-К4 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-b-k4-ssdf': { name: 'ЕВРО-Л-(В)-К4 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-b-k5-ssdf': { name: 'ЕВРО-Л-(В)-К5 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-c-k4-ssdf': { name: 'ЕВРО-Л-(С)-К4 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-evro-l-c-k5-ssdf': { name: 'ЕВРО-Л-(С)-К5 SSDF', category: 'Дизель', standard: "O'zMSt 610:2025 (ОТР UzTR.931-028:2017)" },
        'diesel-eco-3-0050-35': { name: 'Диз. топ ЭКО-3-0.050-35', category: 'Дизель ЭКО', standard: "O'z DSt 1134:2018" },
        'diesel-eco-3-0050-40': { name: 'Диз. топ ЭКО-3-0.050-40', category: 'Дизель ЭКО', standard: "O'z DSt 1134:2018" },
        'diesel-eco-3-0100-35': { name: 'Диз. топ ЭКО-3-0.100-35', category: 'Дизель ЭКО', standard: "O'z DSt 1134:2018" },
        'diesel-eco-3-0100-40': { name: 'Диз. топ ЭКО-3-0.100-40', category: 'Дизель ЭКО', standard: "O'z DSt 1134:2018" },
        'diesel-eco-l-0100-40': { name: 'Диз. топ ЭКО-Л-0,100-40', category: 'Дизель ЭКО', standard: "O'z DSt 1134:2018" },
        'diesel-eco-l-0100-62': { name: 'Диз. топ ЭКО-Л-0,100-62', category: 'Дизель ЭКО', standard: "O'z DSt 1134:2018" },
        'kerosine-fraktsiya': { name: 'Керосиновая фракция', category: 'Керосиновая фракция', standard: 'TS 16472899-040:2018' },
        'mazut-m-40': { name: 'Мазут-М-40', category: 'Мазут М-40', standard: 'ГОСТ 10585-2013' },
        'mazut-m-100': { name: 'Мазут-М-100', category: 'Мазут М-100', standard: 'ГОСТ 10585-2013' },
        'rastvoritel-uglevodorodnyy': { name: 'Растворитель углеводородный С4-135/220', category: 'Растворитель С4-135/220', standard: "Q'z DSt 3035:2015" },
        'tekhnicheskaya-sera': { name: 'Техническая сера', category: 'Техническая сера', standard: 'ГОСТ 127.1-93' },
        'szhizhennyy-gaz': { name: 'Сжиженный газ', category: 'Сжиженный газ', standard: 'ГОСТ 34858-2022' },
      };

      const cfg = itemMap[item];
      if (!cfg) {
        toast.error('Неизвестный тип шаблона');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Guard against duplicate creation when route is /detail/new for an already existing static template.
        const listResponse = await axioss.get('/passport-templates/?limit=10000');
        const listData = listResponse?.data;
        const allTemplates: any[] = Array.isArray(listData) ? listData : (listData?.results ?? []);
        const targetNorm = normalizeTemplateName(cfg.name);
        const existing = allTemplates.find((t: any) => normalizeTemplateName(t?.name || '') === targetNorm);

        if (existing?.id) {
          navigate(`${detailBase}/${existing.id}?from=${from || 'benzin'}`, { replace: true });
          return;
        }

        // For diesel items: use virtual mode (id=0) without creating a DB entry.
        // Benzin/Jet items still create a template as before.
        if (item.startsWith('diesel-') || item.startsWith('kerosine-') || item.startsWith('mazut-') || item.startsWith('rastvoritel-') || item === 'tekhnicheskaya-sera' || item === 'szhizhennyy-gaz') {
          setDetail({
            id: 0,
            name: cfg.name,
            category: cfg.category,
            product_standard: cfg.standard,
            reservoir_type: 'reservoir',
            header_html: '',
            footer_html: '',
            rows: [],
          });
          setLoading(false);
          return;
        }

        const createPayload = {
          name: cfg.name,
          category: cfg.category,
          product_standard: cfg.standard,
          reservoir_type: 'reservoir',
          header_html: '',
          footer_html: '',
        };

        const createResponse = await axioss.post('/passport-templates/', createPayload);
        const createdId = createResponse?.data?.id;
        if (!createdId) throw new Error('Template id not returned');

        navigate(`${detailBase}/${createdId}?from=${from || 'benzin'}`, { replace: true });
      } catch {
        toast.error('Не удалось загрузить шаблоны');
        setLoading(false);
      }
    };

    if (id === 'new') {
      void createFromItem();
      return;
    }

    setLoading(true);
    axioss.get(`/passport-templates/${id}/`)
      .then((r: any) => setDetail(r.data))
      .catch(() => toast.error('Не удалось загрузить детальную информацию шаблона'))
      .finally(() => setLoading(false));
  }, [id, item, from, navigate]);

  useEffect(() => {
    if (!detail) return;
    if (isEdit && typeParam) {
      setSelectedType(typeParam);
    } else {
      setSelectedType(detail.reservoir_type === 'wagon' ? 'wagon' : 'reservoir');
    }
  }, [detail]);

  // Pre-fill form when editing an existing passport
  useEffect(() => {
    if (!editPassportId || !detail) return;
    axioss.get(`/passports/${editPassportId}/`)
      .then((r: any) => {
        const passport = r.data;
        if (passport.field_values) setReservoirValues(passport.field_values);
        if (passport.actual_values) setActualRowValues(passport.actual_values);
        setApprovalInfo({
          status: passport.approval_status || 'draft',
          statusDisplay: passport.approval_status_display || '',
          currentStep: passport.current_step || null,
          rejectedStep: passport.rejected_step || null,
          rejectionComment: passport.rejection_comment || '',
          rejectedByUsername: passport.rejected_by_username || null,
          rejectedAt: passport.rejected_at || null,
          submittedByUsername: passport.submitted_by_username || null,
          submittedAt: passport.submitted_at || null,
          sttlApprovedByUsername: passport.sttl_approved_by_username || null,
          sttlApprovedAt: passport.sttl_approved_at || null,
          czlApprovedByUsername: passport.czl_approved_by_username || null,
          czlApprovedAt: passport.czl_approved_at || null,
          dispatcherApprovedByUsername: passport.dispatcher_approved_by_username || null,
          dispatcherApprovedAt: passport.dispatcher_approved_at || null,
          canSubmit: Boolean(passport.can_submit),
          canApproveCurrentStep: Boolean(passport.can_approve_current_step),
        });
      })
      .catch(() => toast.error('Паспорт маълумотларини юклаб бўлмади'));
  }, [editPassportId, detail]);

  // Auto-generate passport_no for new passports (counter per template, shared across
  // reservoir/wagon types). Certain Бензин templates additionally share one continuous
  // counter across a pair of names (e.g. АИ-91 and АИ-91+присадка number consecutively);
  // everything not listed here just gets its own independent counter, same as before.
  const PASSPORT_NUMBER_GROUPS: string[][] = [
    ['Бензин АИ-91', 'Бензин АИ-91+присадка'],
    ['Бензин Аи-92-К2-Л', 'Бензин АИ-92+присадка'],
  ];
  useEffect(() => {
    if (isEdit || !detail) return;
    if (detail.id === 0) {
      setReservoirValue('passport_no', '1');
      return;
    }
    axioss.get('/passports/?limit=10000')
      .then((r: any) => {
        const data = r.data;
        const all: any[] = Array.isArray(data) ? data : (data?.results ?? []);
        const group = PASSPORT_NUMBER_GROUPS.find((g) => g.includes(detail.name)) || [detail.name];
        const forTemplate = all.filter((p: any) => group.includes(p.template_name));
        setReservoirValue('passport_no', String(forTemplate.length + 1));
      })
      .catch(() => {});
  }, [detail, isEdit]);

  // Auto-fill "Номер соответствия" with the template's standard designation for new passports.
  // The trailing "(ОТР ...)" reference is dropped here only — detail.product_standard itself
  // stays intact for the PDF header line, resolveTemplateKey, and the saved passport record.
  useEffect(() => {
    if (isEdit || !detail) return;
    const complianceNumber = (detail.product_standard || '').replace(/\s*\([^)]*\)\s*$/, '');
    setReservoirValue('compliance_number', complianceNumber);
  }, [detail, isEdit]);

  const setReservoirValue = (key: string, value: string) => {
    setReservoirValues((prev) => ({ ...prev, [key]: value }));
  };

  const setActualRowValue = (key: string, value: string) => {
    setActualRowValues((prev) => ({ ...prev, [key]: value }));
  };

  // Rows whose "Фактическое значение" is a qualitative choice (not a number) — rendered as a
  // <select> instead of a numeric input, with the option list taken from the row's own
  // "Норма по O`z DSt летн." value.
  const QUALITATIVE_SELECT_ROW_KEYS = new Set([
    'a91r9_copper', 'a91r11_acids', 'a91r12_mechanical', 'a91r13_appearance', 'a91r14_manganese', 'a91r15_iron',
    'a91w9_copper', 'a91w11_acids', 'a91w12_mechanical', 'a91w13_appearance', 'a91w14_manganese', 'a91w15_iron',
    'r9_copper', 'r11_acids', 'r12_mechanical', 'r13_appearance', 'r14_manganese', 'r15_iron',
    'w9_copper', 'w11_acids', 'w12_mechanical', 'w13_appearance', 'w14_manganese', 'w15_iron',
    'ecoL62r4', 'ecoL62r11', 'ecoL62r13', 'ecoL40r4', 'ecoL40r11', 'ecoL40r13',
  ]);

  // Rows whose "Фактическое значение" may be either a number or free text (e.g. "отсутствие"),
  // so the input isn't restricted to type="number".
  const TEXT_OR_NUMBER_ROW_KEYS = new Set([
    'a91r2_lead', 'a91w2_lead', 'dlc4_5_water', 'dlb4_5_water', 'r10_density15', 'w10_density15',
    'r16_mma', 'r17_methanol', 'r17_etanol', 'r17_isopropanol', 'r17_terbutanol', 'r17_isobutanol', 'r17_ethers', 'r17_other',
    'w16_mma', 'w17_methanol', 'w17_etanol', 'w17_isopropanol', 'w17_terbutanol', 'w17_isobutanol', 'w17_ethers', 'w17_other',
  ]);

  // Rows that need a number most of the time but occasionally "отсутствует" — a dropdown offering
  // the fixed option(s) plus "свой вариант"; picking "свой вариант" reveals a text box next to it
  // for typing the number in, so отсутствует is always chosen rather than typed by hand.
  // r2_lead/w2_lead is shared by BENZIN_* and AI92P_* (АИ-92+присадка) on purpose — see the
  // comment above AI92P_RESERVOIR_TABLE_ROWS in buildDocDefinition.ts — so this applies to both.
  const COMBO_TEXT_ROW_KEYS = new Set(['r2_lead', 'w2_lead']);
  const COMBO_TEXT_OPTIONS: Record<string, string[]> = {
    r2_lead: ['отсутствует'],
    w2_lead: ['отсутствует'],
  };

  // Copper-plate corrosion rows report a class, so they offer Класс 1a / Класс 1b instead of
  // the single row.norm value ("Класс 1") used as the default option for other qualitative rows.
  // Matched on the key suffix rather than an explicit list: every `*_copper` row in the benzin
  // and diesel tables is the same test on the same scale, and each one's norm is "Класс 1".
  // The method name is not usable as the marker — it reads ГОСТ 32329 on some templates and
  // O'zDSt ASTM D 130:2021 on others.
  // ecoL62r12/ecoL40r12 are the same test too, but predate the `_copper` naming convention —
  // renaming them would orphan any actual_values already saved under that key, so they're
  // listed explicitly instead.
  const COPPER_PLATE_EXTRA_KEYS = new Set(['ecoL62r12', 'ecoL40r12']);
  const isCopperPlateRow = (key: string) => key.endsWith('_copper') || COPPER_PLATE_EXTRA_KEYS.has(key);
  const COPPER_PLATE_OPTIONS = ['Класс 1a', 'Класс 1b'];

  // ДТ-ЕВРО-Л(С)-К4-SSDF's "Массовая доля воды, %, не более" is reported as detected/not
  // detected rather than measured, so it offers "отсутствует" instead of the numeric norm
  // (0,020) that QUALITATIVE_SELECT_ROW_KEYS would otherwise derive.
  const WATER_ABSENT_ROW_KEYS = new Set(['dlc4_5_water_pct', 'dlb4_5_water_pct']);
  const WATER_ABSENT_OPTIONS = ['отсутствует'];

  // These rows' displayed norm is negative, but the actual measurement can land on zero too, so
  // the lab picks минус/0 from a dropdown and types the magnitude only for минус — separating the
  // sign from the number keeps them from typing "-8" as "8-" or forgetting the sign altogether.
  const SIGNED_ACTUAL_VALUE_ROW_KEYS = new Set(['dlc4_6_filter', 'ecoL62r5', 'ecoL62r20', 'ecoL40r5', 'ecoL40r20']);

  // Rows whose norm is always negative with no плюс/0 case (unlike SIGNED_ACTUAL_VALUE_ROW_KEYS'
  // rows) — "минус" is shown as a fixed label rather than a select, and the lab only types the
  // magnitude.
  const FIXED_MINUS_ROW_KEYS = new Set(['ecoL62r19', 'ecoL40r19']);

  // ДТ-ЕВРО-Л(В)-К4-SSDF's cold filter plugging point is always reported as плюс — "плюс" is
  // shown as a fixed label rather than a select, and the lab only types the magnitude.
  const FIXED_PLUS_ROW_KEYS = new Set(['dlb4_6_filter']);

  // ЭКО-Л-0,100-62's sulphur-by-fuel-type row (item 9) is only ever tested for вида I — вида II
  // and вида III always report "-" rather than a measured value.
  const FIXED_DASH_ROW_KEYS = new Set(['ecoL62r9_ii', 'ecoL62r9_iii']);

  // ДТ-ЕВРО-Л(С)-К4(-SSDF) and ДТ-ЕВРО-Л(В)-К4(-SSDF)'s density rows display the O'zMSt range
  // "820,0 - 845,0" as their norm, but the lab's actual accepted range for this field is wider
  // (800,0 - 845,0) — override the bounds isActualValueInvalid would otherwise parse straight
  // out of that displayed norm text.
  const CUSTOM_RANGE_OVERRIDES: Record<string, { min?: number; max?: number }> = {
    dlc4_3_density15: { min: 800, max: 845 },
    dlb4_3_density15: { min: 800, max: 845 },
    // Displayed "Значение по O'zMSt" norm stays "860" (the O'z DSt 1134:2018 figure) — the lab's
    // actual accepted ceiling for this field is higher, so only the upper bound is overridden.
    ecoL62r2: { max: 890 },
    ecoL40r2: { max: 890 },
    // Displayed norm stays "0" — the lab's actual accepted ceiling for плюс values here is 6.
    dlb4_6_filter: { max: 6 },
  };

  const checkActualValueInvalid = (row: { key: string; name: string; norm: string }, value: string) => {
    const override = CUSTOM_RANGE_OVERRIDES[row.key];
    if (override) {
      const num = parseNormNumber(value);
      return num !== null && ((override.min !== undefined && num < override.min) || (override.max !== undefined && num > override.max));
    }
    return isActualValueInvalid(row, value);
  };

  // "Норма" describes the requirement ("отсутствие" — a noun, "absence"); the actual-value
  // option describes the observed result, so it needs the verb form ("отсутствует" — "is absent").
  const normToActualOption = (norm: string) => {
    const trimmed = norm.trim();
    return trimmed === 'отсутствие' ? 'отсутствует' : trimmed;
  };

  const renderActualValueCell = (row: { key: string; name: string; norm: string }) => {
    activeRowKeysRef.current.push(row.key);
    const value = actualRowValues[row.key] || '';
    if (QUALITATIVE_SELECT_ROW_KEYS.has(row.key) || isCopperPlateRow(row.key) || WATER_ABSENT_ROW_KEYS.has(row.key)) {
      const options = isCopperPlateRow(row.key)
        ? COPPER_PLATE_OPTIONS
        : WATER_ABSENT_ROW_KEYS.has(row.key)
        ? WATER_ABSENT_OPTIONS
        : [normToActualOption(row.norm)];
      const invalid = value !== '' && !options.includes(value);
      return (
        <select
          value={value}
          onChange={(event) => setActualRowValue(row.key, event.target.value)}
          className={`${actualValueInputCls} cursor-pointer ${invalid ? actualValueInvalidCls : ''}`}
        >
          <option value="">— Выберите —</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
    if (SIGNED_ACTUAL_VALUE_ROW_KEYS.has(row.key)) {
      const isZero = value === '0';
      const magnitude = isZero ? '' : value.replace(/^-/, '');
      return (
        <div className="flex items-center gap-1">
          <select
            value={isZero ? '0' : 'минус'}
            onChange={(event) => setActualRowValue(row.key, event.target.value === '0' ? '0' : (magnitude === '' ? '' : `-${magnitude}`))}
            className="cursor-pointer border-0 bg-transparent text-sm outline-none dark:text-white"
          >
            <option value="минус">минус</option>
            <option value="0">0</option>
          </select>
          {!isZero && (
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={magnitude}
              onChange={(event) => {
                const raw = event.target.value.replace(/^-/, '');
                setActualRowValue(row.key, raw === '' ? '' : `-${raw}`);
              }}
              className={`${actualValueInputCls} ${checkActualValueInvalid(row, value) ? actualValueInvalidCls : ''}`}
            />
          )}
        </div>
      );
    }
    if (FIXED_DASH_ROW_KEYS.has(row.key)) {
      return <span className="select-none">-</span>;
    }
    if (FIXED_MINUS_ROW_KEYS.has(row.key)) {
      const magnitude = value.startsWith('-') ? value.slice(1) : value;
      return (
        <div className="flex items-center gap-1">
          <span className="select-none">минус</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={magnitude}
            onChange={(event) => {
              const raw = event.target.value.replace(/^-/, '');
              setActualRowValue(row.key, raw === '' ? '' : `-${raw}`);
            }}
            className={`${actualValueInputCls} ${checkActualValueInvalid(row, value) ? actualValueInvalidCls : ''}`}
          />
        </div>
      );
    }
    if (FIXED_PLUS_ROW_KEYS.has(row.key)) {
      const magnitude = value.startsWith('+') ? value.slice(1) : value;
      return (
        <div className="flex items-center gap-1">
          <span className="select-none">плюс</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={magnitude}
            onChange={(event) => {
              const raw = event.target.value.replace(/^-/, '');
              setActualRowValue(row.key, raw === '' ? '' : `+${raw}`);
            }}
            className={`${actualValueInputCls} ${checkActualValueInvalid(row, value) ? actualValueInvalidCls : ''}`}
          />
        </div>
      );
    }
    if (COMBO_TEXT_ROW_KEYS.has(row.key)) {
      const fixedOptions = COMBO_TEXT_OPTIONS[row.key] || [];
      const isFixedValue = fixedOptions.includes(value);
      // A row already saved with a typed-in number (before this UI existed, or on an existing
      // passport being edited) has neither pendingComboMode nor a fixed-option value — treat
      // that as "свой вариант" too so its box shows up with the number already in it.
      const showCustomInput = comboCustomMode[row.key] || (!isFixedValue && value !== '');
      const selectValue = isFixedValue ? value : showCustomInput ? 'свой вариант' : '';
      // actualValueInputCls carries `min-w-[140px]`, which is fine for a single element filling
      // the whole cell but forces the row's combined min-width past 280px once the select and
      // the custom-value input render side by side — widening the whole table column along with
      // it. Overridden here: a narrower, non-shrinking select, and an input that fills whatever
      // space is left (min-w-0 lets it actually shrink instead of demanding its own 140px floor).
      return (
        <div className="flex items-center gap-1">
          <select
            value={selectValue}
            onChange={(event) => {
              const next = event.target.value;
              if (next === 'свой вариант') {
                setComboCustomMode((prev) => ({ ...prev, [row.key]: true }));
                setActualRowValue(row.key, '');
              } else {
                setComboCustomMode((prev) => ({ ...prev, [row.key]: false }));
                setActualRowValue(row.key, next);
              }
            }}
            className={`${actualValueInputCls.replace('w-full min-w-[140px]', 'w-24 min-w-0 shrink-0')} cursor-pointer`}
          >
            <option value="">— Выберите —</option>
            {fixedOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value="свой вариант">свой вариант</option>
          </select>
          {showCustomInput && (
            <input
              type="text"
              value={value}
              onChange={(event) => setActualRowValue(row.key, event.target.value)}
              className={`${actualValueInputCls.replace('w-full min-w-[140px]', 'flex-1 min-w-0')} ${checkActualValueInvalid(row, value) ? actualValueInvalidCls : ''}`}
            />
          )}
        </div>
      );
    }
    const isTextOrNumber = TEXT_OR_NUMBER_ROW_KEYS.has(row.key);
    return (
      <input type={isTextOrNumber ? 'text' : 'number'} inputMode={isTextOrNumber ? 'text' : 'decimal'} step={isTextOrNumber ? undefined : 'any'}
        value={value}
        onChange={(event) => setActualRowValue(row.key, event.target.value)}
        className={`${actualValueInputCls} ${checkActualValueInvalid(row, value) ? actualValueInvalidCls : ''}`}
      />
    );
  };

  // Rows whose "Фактическое значение" is exempt from the "fill everything before
  // saving" check — density at 15°C is not mandatory here, unlike density at 20°C.
  const OPTIONAL_ACTUAL_VALUE_ROW_KEYS = new Set(['r10_density15', 'w10_density15', 'a91r10_density15', 'a91w10_density15', 'ecoL62r9_ii', 'ecoL62r9_iii']);

  const hasEmptyActualValue = () =>
    activeRowKeysRef.current.some((key) => !OPTIONAL_ACTUAL_VALUE_ROW_KEYS.has(key) && !actualRowValues[key]);

  const trackedKey = (key: string) => {
    activeRowKeysRef.current.push(key);
    return key;
  };

  const hasInvalidActualValue = () =>
    Object.entries(actualRowValues).some(([key, value]: [string, string]) => {
      if (!value) return false;
      const row = ROWS_BY_KEY[key];
      if (!row) return false;
      if (QUALITATIVE_SELECT_ROW_KEYS.has(key) || isCopperPlateRow(key) || WATER_ABSENT_ROW_KEYS.has(key)) {
        const options = isCopperPlateRow(key)
          ? COPPER_PLATE_OPTIONS
          : WATER_ABSENT_ROW_KEYS.has(key)
          ? WATER_ABSENT_OPTIONS
          : [normToActualOption(row.norm)];
        return !options.includes(value);
      }
      return checkActualValueInvalid(row, value);
    });

  const renderReservoirInput = (key: BenzinReservoirField['key'], placeholder = '', req = false) => {
    const field = BENZIN_RESERVOIR_FIELDS.find((item) => item.key === key);
    const hasError = req && showErrors && !reservoirValues[key];
    // Wagon count is always a count of railcars, never free text — restrict it to digits
    // everywhere it's rendered, regardless of which product/type block uses it.
    const isNumeric = key === 'wagon_count';
    return (
      <input
        type={isNumeric ? 'number' : field?.type === 'date' ? 'date' : 'text'}
        inputMode={isNumeric ? 'numeric' : undefined}
        min={isNumeric ? 0 : undefined}
        value={reservoirValues[key] || ''}
        onChange={(event) => setReservoirValue(key, event.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder={placeholder}
        className={`${inlineInputCls} ${hasError ? '!border-red-600 !border-b-2' : ''}`}
      />
    );
  };

  const renderReservoirTextarea = (key: BenzinReservoirField['key'], req = false) => {
    const hasError = req && showErrors && !reservoirValues[key];
    return (
      <textarea
        value={reservoirValues[key] || ''}
        onChange={(e) => setReservoirValue(key, e.target.value)}
        rows={3}
        className={`w-full border border-stroke rounded px-2 py-1 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white resize-none ${hasError ? '!border-red-600' : ''}`}
      />
    );
  };

  const EMPLOYEE_FIELD_POSITION: Record<string, string> = {
    shift_head: 'Начальник смены',
    sttl_head: 'Начальник СТТЛ',
    czl_head: 'Начальник ЦЗЛ',
    dispatcher_head: 'Диспетчер',
  };

  const renderEmployeeSelect = (key: BenzinReservoirField['key'], req = false) => {
    const hasError = req && showErrors && !reservoirValues[key];
    const expectedPosition = EMPLOYEE_FIELD_POSITION[key];
    const options = expectedPosition ? employees.filter(emp => emp.position === expectedPosition) : employees;
    const locked = key === 'shift_head' && lockShiftHead;
    return (
      <select
        value={reservoirValues[key] || ''}
        disabled={locked}
        title={locked ? 'Вы подписываете как начальник смены' : undefined}
        onChange={(e) => setReservoirValue(key, e.target.value)}
        className={`${inlineInputCls.replace('h-8', 'h-11')} ${locked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${hasError ? '!border-red-600 !border-b-2' : ''}`}
      >
        <option value="">— Выберите —</option>
        {options.map(emp => (
          <option key={emp.id} value={emp.full_name}>
            {emp.full_name}{emp.position ? ` (${emp.position})` : ''}
          </option>
        ))}
      </select>
    );
  };

  const productNameLower = (detail?.name || '').toLowerCase();
  const normalizedProductName = productNameLower
    .replace(/а/g, 'a')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '');
  const isBenzinCategory = (detail?.category || '').toLowerCase().includes('бензин');

  const templateKey = resolveTemplateKey(detail?.name, detail?.category, detail?.product_standard);
  const descriptor = templateKey ? TEMPLATE_REGISTRY[templateKey] : null;

  // АИ-92+присадка — mavjud shablon (o'zgartirilmaydi)
  const isAI92P = isBenzinCategory && productNameLower.includes('аи-92') && productNameLower.includes('присадка');
  // АИ-91+присадка — alohida mustaqil shablon
  const isAI91P = isBenzinCategory && (productNameLower.includes('аи-91') || productNameLower.includes('ai-91')) && productNameLower.includes('присадка');
  // АИ-91 (sof, присадкasiz)
  const isAI91 = isBenzinCategory && (productNameLower.includes('аи-91') || productNameLower.includes('ai-91')) && !productNameLower.includes('присадка');
  // АИ-92 (sof, присадкasiz) — kategoriyadan emas, faqat nomdan aniqlanadi
  const isAI92 = (productNameLower.includes('аи-92') || productNameLower.includes('ai-92')) && !productNameLower.includes('присадка');
  const isAI92Reservoir = isAI92 && selectedType === 'reservoir';
  const isAI92Wagon = isAI92 && selectedType === 'wagon';
  const isAI95QW = productNameLower.includes('quwatt');
  const isAI95P = (productNameLower.includes('аи-95') || productNameLower.includes('ai-95')) && !isAI95QW && productNameLower.includes('присадка');
  const isAI95 = (productNameLower.includes('аи-95') || productNameLower.includes('ai-95')) && !isAI95QW && !productNameLower.includes('присадка');
  const isAI98 = productNameLower.includes('аи-98') || productNameLower.includes('ai-98');
  const isAI98Reservoir = isAI98 && selectedType === 'reservoir';
  const isAI98Wagon = isAI98 && selectedType === 'wagon';
  const isJetA1SSF = normalizedProductName.includes('jet') && normalizedProductName.includes('a-1') && normalizedProductName.includes('ssf');
  const isJetA1Notice = normalizedProductName.includes('извещ') && normalizedProductName.includes('jet') && normalizedProductName.includes('a-1');
  const isJetA1 = normalizedProductName.includes('jet') && normalizedProductName.includes('a-1') && !normalizedProductName.includes('ssf') && !normalizedProductName.includes('извещ');
  const isJetA1Reservoir = (isJetA1 || isJetA1SSF || isJetA1Notice) && selectedType === 'reservoir';
  const isJetA1Wagon = isJetA1Notice && selectedType === 'wagon';
  const jetNoticeVariant = isJetA1Notice ? (selectedType === 'reservoir' ? 'primary' : 'secondary') : undefined;
  const jetA1Rows = isJetA1SSF ? JET_A1_SSF_RES_ROWS : JET_A1_RES_ROWS;
  const isDieselEuro3OK4SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро-3') && (productNameLower.includes('(о)') || productNameLower.includes('(0)') || productNameLower.includes('-о-') || productNameLower.includes('-0-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuro3OK4 = !isDieselEuro3OK4SSDF && productNameLower.includes('евро-3') && (productNameLower.includes('(о)') || productNameLower.includes('(0)') || productNameLower.includes('-о-') || productNameLower.includes('-0-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuro3OK5SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро-3') && (productNameLower.includes('(о)') || productNameLower.includes('(0)') || productNameLower.includes('-о-') || productNameLower.includes('-0-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuro3OK5 = !isDieselEuro3OK5SSDF && productNameLower.includes('евро-3') && (productNameLower.includes('(о)') || productNameLower.includes('(0)') || productNameLower.includes('-о-') || productNameLower.includes('-0-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLAK3 = productNameLower.includes('евро-л') && (productNameLower.includes('(а)') || productNameLower.includes('(a)') || productNameLower.includes('-а-') || productNameLower.includes('-a-')) && productNameLower.includes('к3') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLAK4SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро-л') && (productNameLower.includes('(а)') || productNameLower.includes('(a)') || productNameLower.includes('-а-') || productNameLower.includes('-a-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLAK4 = !isDieselEuroLAK4SSDF && productNameLower.includes('евро-л') && (productNameLower.includes('(а)') || productNameLower.includes('(a)') || productNameLower.includes('-а-') || productNameLower.includes('-a-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLAK5 = productNameLower.includes('евро-л') && (productNameLower.includes('(а)') || productNameLower.includes('(a)') || productNameLower.includes('-а-') || productNameLower.includes('-a-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLCK4SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро-л') && (productNameLower.includes('(с)') || productNameLower.includes('(c)') || productNameLower.includes('-с-') || productNameLower.includes('-c-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLCK4 = !isDieselEuroLCK4SSDF && productNameLower.includes('евро-л') && (productNameLower.includes('(с)') || productNameLower.includes('(c)') || productNameLower.includes('-с-') || productNameLower.includes('-c-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLCK5SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро-л') && (productNameLower.includes('(с)') || productNameLower.includes('(c)') || productNameLower.includes('-с-') || productNameLower.includes('-c-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLCK5 = !isDieselEuroLCK5SSDF && productNameLower.includes('евро-л') && (productNameLower.includes('(с)') || productNameLower.includes('(c)') || productNameLower.includes('-с-') || productNameLower.includes('-c-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLCK6 = productNameLower.includes('евро-л') && (productNameLower.includes('(с)') || productNameLower.includes('(c)') || productNameLower.includes('-с-') || productNameLower.includes('-c-')) && productNameLower.includes('к6') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLDK4 = productNameLower.includes('евро-л') && (productNameLower.includes('(д)') || productNameLower.includes('(d)') || productNameLower.includes('-д-') || productNameLower.includes('-d-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLDK5 = productNameLower.includes('евро-л') && (productNameLower.includes('(д)') || productNameLower.includes('(d)') || productNameLower.includes('-д-') || productNameLower.includes('-d-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLDK6 = productNameLower.includes('евро-л') && (productNameLower.includes('(д)') || productNameLower.includes('(d)') || productNameLower.includes('-д-') || productNameLower.includes('-d-')) && productNameLower.includes('к6') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLBK3 = productNameLower.includes('евро-л') && (productNameLower.includes('(б)') || productNameLower.includes('(в)') || productNameLower.includes('-б-') || productNameLower.includes('-в-')) && productNameLower.includes('к3') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLBK5SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро-л') && (productNameLower.includes('(б)') || productNameLower.includes('(в)') || productNameLower.includes('-б-') || productNameLower.includes('-в-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLBK5 = !isDieselEuroLBK5SSDF && productNameLower.includes('евро-л') && (productNameLower.includes('(б)') || productNameLower.includes('(в)') || productNameLower.includes('-б-') || productNameLower.includes('-в-')) && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLBK4SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро-л') && (productNameLower.includes('(б)') || productNameLower.includes('(в)') || productNameLower.includes('-б-') || productNameLower.includes('-в-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroLBK4 = !isDieselEuroLBK4SSDF && productNameLower.includes('евро-л') && (productNameLower.includes('(б)') || productNameLower.includes('(в)') || productNameLower.includes('-б-') || productNameLower.includes('-в-')) && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroMEK4SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро') && productNameLower.includes('м') && productNameLower.includes('е') && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroMEK5SSDF = productNameLower.includes('ssdf') && productNameLower.includes('евро') && productNameLower.includes('м') && productNameLower.includes('е') && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroMEK4 = !isDieselEuroMEK4SSDF && productNameLower.includes('евро') && productNameLower.includes('м') && productNameLower.includes('е') && productNameLower.includes('к4') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEuroMEK5 = !isDieselEuroMEK5SSDF && productNameLower.includes('евро') && productNameLower.includes('м') && productNameLower.includes('е') && productNameLower.includes('к5') && (detail?.category || '').toLowerCase().includes('дизель');
  const isDiesel3OK4SSDFReservoir = isDieselEuro3OK4SSDF && selectedType === 'reservoir';
  const isDiesel3OK4SSDFWagon = isDieselEuro3OK4SSDF && selectedType === 'wagon';
  const isDiesel3OK5SSDFReservoir = isDieselEuro3OK5SSDF && selectedType === 'reservoir';
  const isDiesel3OK5SSDFWagon = isDieselEuro3OK5SSDF && selectedType === 'wagon';
  const isDiesel3OK4Reservoir = isDieselEuro3OK4 && selectedType === 'reservoir';
  const isDiesel3OK5Reservoir = isDieselEuro3OK5 && selectedType === 'reservoir';
  const isDieselLAK4SSDFReservoir = isDieselEuroLAK4SSDF && selectedType === 'reservoir';
  const isDieselLAK4SSDFWagon = isDieselEuroLAK4SSDF && selectedType === 'wagon';
  const isDieselLBK4SSDFReservoir = isDieselEuroLBK4SSDF && selectedType === 'reservoir';
  const isDieselLBK4SSDFWagon = isDieselEuroLBK4SSDF && selectedType === 'wagon';
  const isDieselLBK5SSDFReservoir = isDieselEuroLBK5SSDF && selectedType === 'reservoir';
  const isDieselLBK5SSDFWagon = isDieselEuroLBK5SSDF && selectedType === 'wagon';
  const isDieselLCK4SSDFReservoir = isDieselEuroLCK4SSDF && selectedType === 'reservoir';
  const isDieselLCK4SSDFWagon = isDieselEuroLCK4SSDF && selectedType === 'wagon';
  const isDieselLCK5SSDFReservoir = isDieselEuroLCK5SSDF && selectedType === 'reservoir';
  const isDieselLCK5SSDFWagon = isDieselEuroLCK5SSDF && selectedType === 'wagon';
  const isDieselLAK4Reservoir = isDieselEuroLAK4 && selectedType === 'reservoir';
  const isDieselLAK5Reservoir = isDieselEuroLAK5 && selectedType === 'reservoir';
  const isDieselLCK4Reservoir = isDieselEuroLCK4 && selectedType === 'reservoir';
  const isDieselLCK5Reservoir = isDieselEuroLCK5 && selectedType === 'reservoir';
  const isDieselLCK6Reservoir = isDieselEuroLCK6 && selectedType === 'reservoir';
  const isDieselLDK4Reservoir = isDieselEuroLDK4 && selectedType === 'reservoir';
  const isDieselLDK5Reservoir = isDieselEuroLDK5 && selectedType === 'reservoir';
  const isDieselLDK6Reservoir = isDieselEuroLDK6 && selectedType === 'reservoir';
  const isDieselLBK3Reservoir = isDieselEuroLBK3 && selectedType === 'reservoir';
  const isDieselLBK3Wagon = isDieselEuroLBK3 && selectedType === 'wagon';
  const isDieselLBK4Reservoir = isDieselEuroLBK4 && selectedType === 'reservoir';
  const isDieselLBK4Wagon = isDieselEuroLBK4 && selectedType === 'wagon';
  const isDieselLBK5Reservoir = isDieselEuroLBK5 && selectedType === 'reservoir';
  const isDieselLBK5Wagon = isDieselEuroLBK5 && selectedType === 'wagon';
  const isDieselLAK3Reservoir = isDieselEuroLAK3 && selectedType === 'reservoir';
  const isDieselLAK3Wagon = isDieselEuroLAK3 && selectedType === 'wagon';
  const isDiesel3OK4Wagon = isDieselEuro3OK4 && selectedType === 'wagon';
  const isDiesel3OK5Wagon = isDieselEuro3OK5 && selectedType === 'wagon';
  const isDieselLAK4Wagon = isDieselEuroLAK4 && selectedType === 'wagon';
  const isDieselLAK5Wagon = isDieselEuroLAK5 && selectedType === 'wagon';
  const isDieselLCK4Wagon = isDieselEuroLCK4 && selectedType === 'wagon';
  const isDieselLCK5Wagon = isDieselEuroLCK5 && selectedType === 'wagon';
  const isDieselLCK6Wagon = isDieselEuroLCK6 && selectedType === 'wagon';
  const isDieselLDK4Wagon = isDieselEuroLDK4 && selectedType === 'wagon';
  const isDieselLDK5Wagon = isDieselEuroLDK5 && selectedType === 'wagon';
  const isDieselLDK6Wagon = isDieselEuroLDK6 && selectedType === 'wagon';
  const isDieselEco3_0050_35 = (productNameLower.includes('эко') && (productNameLower.includes('0.050-35') || productNameLower.includes('0,050-35'))) && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEco3_0050_35Reservoir = isDieselEco3_0050_35 && selectedType === 'reservoir';
  const isDieselEco3_0050_35Wagon = isDieselEco3_0050_35 && selectedType === 'wagon';
  const isDieselEco3_0050_40 = (productNameLower.includes('эко') && (productNameLower.includes('0.050-40') || productNameLower.includes('0,050-40'))) && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEco3_0050_40Reservoir = isDieselEco3_0050_40 && selectedType === 'reservoir';
  const isDieselEco3_0050_40Wagon = isDieselEco3_0050_40 && selectedType === 'wagon';
  const isDieselEco3_0100_35 = (productNameLower.includes('эко') && (productNameLower.includes('0.100-35') || productNameLower.includes('0,100-35'))) && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEco3_0100_35Reservoir = isDieselEco3_0100_35 && selectedType === 'reservoir';
  const isDieselEco3_0100_35Wagon = isDieselEco3_0100_35 && selectedType === 'wagon';
  const isDieselEcoL_0100_40 = (productNameLower.includes('эко-л') && (productNameLower.includes('0.100-40') || productNameLower.includes('0,100-40'))) && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEcoL_0100_40Reservoir = isDieselEcoL_0100_40 && selectedType === 'reservoir';
  const isDieselEcoL_0100_40Wagon = isDieselEcoL_0100_40 && selectedType === 'wagon';
  const isDieselEcoL_0100_62 = (productNameLower.includes('эко-л') && (productNameLower.includes('0.100-62') || productNameLower.includes('0,100-62'))) && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEcoL_0100_62Reservoir = isDieselEcoL_0100_62 && selectedType === 'reservoir';
  const isDieselEcoL_0100_62Wagon = isDieselEcoL_0100_62 && selectedType === 'wagon';
  const isDieselEco3_0100_40 = (!isDieselEcoL_0100_40 && !isDieselEcoL_0100_62 && productNameLower.includes('эко') && (productNameLower.includes('0.100-40') || productNameLower.includes('0,100-40'))) && (detail?.category || '').toLowerCase().includes('дизель');
  const isDieselEco3_0100_40Reservoir = isDieselEco3_0100_40 && selectedType === 'reservoir';
  const isDieselEco3_0100_40Wagon = isDieselEco3_0100_40 && selectedType === 'wagon';
  // ЭКО diesel grades are certified to O'z DSt 1134:2018, which has no ОТР UzTR.931-028:2017
  // counterpart — every row's normOtr is '' for these products, so the column is dropped rather
  // than shown permanently empty.
  const hideDieselOtrColumn = isDieselEco3_0050_35 || isDieselEco3_0050_40 || isDieselEco3_0100_35 || isDieselEco3_0100_40 || isDieselEcoL_0100_40 || isDieselEcoL_0100_62;
  const isKerosine = (detail?.category || '').toLowerCase().includes('керосин');
  const isKerosineReservoir = isKerosine && selectedType === 'reservoir';
  const isKerosineWagon = isKerosine && selectedType === 'wagon';
  const isMazutM40 = (detail?.category || '').toLowerCase().includes('мазут м-40');
  const isMazutM40Reservoir = isMazutM40 && selectedType === 'reservoir';
  const isMazutM40Wagon = isMazutM40 && selectedType === 'wagon';
  const isMazutM100 = (detail?.category || '').toLowerCase().includes('мазут м-100');
  const isMazutM100Reservoir = isMazutM100 && selectedType === 'reservoir';
  const isMazutM100Wagon = isMazutM100 && selectedType === 'wagon';
  const isRastvoritelS4 = (detail?.category || '').toLowerCase().includes('растворитель с4');
  const isRastvoritelS4Reservoir = isRastvoritelS4 && selectedType === 'reservoir';
  const isRastvoritelS4Wagon = isRastvoritelS4 && selectedType === 'wagon';
  const isSeraGaz = (detail?.category || '').toLowerCase().includes('техническая сера');
  const isSzhizhennyyGaz = (detail?.category || '').toLowerCase().includes('сжиженный');
  const isDieselMEK4SSDFReservoir = isDieselEuroMEK4SSDF && selectedType === 'reservoir';
  const isDieselMEK4SSDFWagon = isDieselEuroMEK4SSDF && selectedType === 'wagon';
  const isDieselMEK5SSDFReservoir = isDieselEuroMEK5SSDF && selectedType === 'reservoir';
  const isDieselMEK5SSDFWagon = isDieselEuroMEK5SSDF && selectedType === 'wagon';
  const isDieselK4Reservoir = isDieselEuroMEK4 && selectedType === 'reservoir';
  const isDieselK5Reservoir = isDieselEuroMEK5 && selectedType === 'reservoir';
  const isDieselK4Wagon = isDieselEuroMEK4 && selectedType === 'wagon';
  const isDieselK5Wagon = isDieselEuroMEK5 && selectedType === 'wagon';
  const isAI95Reservoir = isAI95 && selectedType === 'reservoir';
  const isAI95Wagon = isAI95 && selectedType === 'wagon';
  const isAI95PReservoir = isAI95P && selectedType === 'reservoir';
  const isAI95PWagon = isAI95P && selectedType === 'wagon';
  const isAI95QWReservoir = isAI95QW && selectedType === 'reservoir';
  const isAI95QWWagon = isAI95QW && selectedType === 'wagon';

  const isBenzinReservoir = isAI92P && selectedType === 'reservoir';
  const isBenzinWagon = isAI92P && selectedType === 'wagon';
  const isAI91Reservoir = isAI91 && selectedType === 'reservoir';
  const isAI91Wagon = isAI91 && selectedType === 'wagon';
  const isAI91PReservoir = isAI91P && selectedType === 'reservoir';
  const isAI91PWagon = isAI91P && selectedType === 'wagon';
  const displayTemplateName = detail?.name === 'Топливо дизельное ДТ- ЕВРО –Л(С)–К4' ? 'ЕВРО-Л-(С)-К4' : detail?.name;
  const isLocked = isEdit && !!approvalInfo && !['draft', 'rejected'].includes(approvalInfo.status);
  const canSignCurrentStep = Boolean(approvalInfo?.canApproveCurrentStep);
  const verificationInfo: PassportVerificationInfo | null = approvalInfo && approvalInfo.status === 'approved'
    ? {
        passportNumber: reservoirValues.passport_no || '',
        steps: [
          { role: 'Начальник смены', fullName: reservoirValues.shift_head, approvedByUsername: approvalInfo.submittedByUsername, approvedAt: approvalInfo.submittedAt, statusLabel: 'Отправлено' },
          { role: 'Начальник СТТЛ', fullName: reservoirValues.sttl_head, approvedByUsername: approvalInfo.sttlApprovedByUsername, approvedAt: approvalInfo.sttlApprovedAt, statusLabel: 'Подписано' },
          { role: 'Начальник ЦЗЛ', fullName: reservoirValues.czl_head, approvedByUsername: approvalInfo.czlApprovedByUsername, approvedAt: approvalInfo.czlApprovedAt, statusLabel: 'Подписано' },
          { role: 'Диспетчер', fullName: reservoirValues.dispatcher_head, approvedByUsername: approvalInfo.dispatcherApprovedByUsername, approvedAt: approvalInfo.dispatcherApprovedAt, statusLabel: 'Подписано' },
        ],
      }
    : null;
  const approvalSteps = approvalInfo
    ? buildApprovalSteps({
        status: approvalInfo.status,
        currentStep: approvalInfo.currentStep,
        rejectedStep: approvalInfo.rejectedStep,
        rejectedAt: approvalInfo.rejectedAt,
        rejectionComment: approvalInfo.rejectionComment,
        submittedByUsername: approvalInfo.submittedByUsername,
        submittedAt: approvalInfo.submittedAt,
        sttlApprovedByUsername: approvalInfo.sttlApprovedByUsername,
        sttlApprovedAt: approvalInfo.sttlApprovedAt,
        czlApprovedByUsername: approvalInfo.czlApprovedByUsername,
        czlApprovedAt: approvalInfo.czlApprovedAt,
        dispatcherApprovedByUsername: approvalInfo.dispatcherApprovedByUsername,
        dispatcherApprovedAt: approvalInfo.dispatcherApprovedAt,
        fieldValues: reservoirValues,
      })
    : [];
  const canUseDocumentActions = isDiesel3OK4SSDFReservoir || isDiesel3OK4SSDFWagon || isDiesel3OK5SSDFReservoir || isDiesel3OK5SSDFWagon || isDieselLAK4SSDFReservoir || isDieselLAK4SSDFWagon || isDieselLBK4SSDFReservoir || isDieselLBK4SSDFWagon || isDieselLBK5SSDFReservoir || isDieselLBK5SSDFWagon || isDieselLCK4SSDFReservoir || isDieselLCK4SSDFWagon || isDieselLCK5SSDFReservoir || isDieselLCK5SSDFWagon || isDieselMEK4SSDFReservoir || isDieselMEK4SSDFWagon || isDieselMEK5SSDFReservoir || isDieselMEK5SSDFWagon || isDiesel3OK4Reservoir || isDiesel3OK5Reservoir || isDieselLAK4Reservoir || isDieselLAK5Reservoir || isDieselLCK4Reservoir || isDieselLCK5Reservoir || isDieselLCK6Reservoir || isDieselLDK4Reservoir || isDieselLDK5Reservoir || isDieselLDK6Reservoir || isDiesel3OK4Wagon || isDiesel3OK5Wagon || isDieselLAK4Wagon || isDieselLAK5Wagon || isDieselLCK4Wagon || isDieselLCK5Wagon || isDieselLCK6Wagon || isDieselLDK4Wagon || isDieselLDK5Wagon || isDieselLDK6Wagon || isDieselLBK3Reservoir || isDieselLBK3Wagon || isDieselLBK4Reservoir || isDieselLBK4Wagon || isDieselLBK5Reservoir || isDieselLBK5Wagon || isDieselLAK3Reservoir || isDieselLAK3Wagon || isDieselK4Reservoir || isDieselK5Reservoir || isDieselK4Wagon || isDieselK5Wagon || isDieselEco3_0050_35Reservoir || isDieselEco3_0050_35Wagon || isDieselEco3_0050_40Reservoir || isDieselEco3_0050_40Wagon || isDieselEco3_0100_35Reservoir || isDieselEco3_0100_35Wagon || isDieselEco3_0100_40Reservoir || isDieselEco3_0100_40Wagon || isDieselEcoL_0100_40Reservoir || isDieselEcoL_0100_40Wagon || isDieselEcoL_0100_62Reservoir || isDieselEcoL_0100_62Wagon || isKerosineReservoir || isKerosineWagon || isMazutM40Reservoir || isMazutM40Wagon || isMazutM100Reservoir || isMazutM100Wagon || isRastvoritelS4Reservoir || isRastvoritelS4Wagon || isSeraGaz || isSzhizhennyyGaz || isBenzinReservoir || isBenzinWagon || isAI91Reservoir || isAI91Wagon || isAI91PReservoir || isAI91PWagon || isAI92Reservoir || isAI92Wagon || isAI95Reservoir || isAI95Wagon || isAI95QWReservoir || isAI95QWWagon || isAI98Reservoir || isAI98Wagon || isJetA1Reservoir || isJetA1Wagon;

  activeRowKeysRef.current = [];

  return (
    <>
      <Breadcrumb pageName="Детали шаблона" />

      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
        >
          <FaArrowLeft size={12} /> {isEdit ? 'Паспорта рўйхати' : 'Назад шаблоны'}
        </button>
      </div>

      {isEdit && approvalInfo && approvalInfo.status === 'rejected' && (
        <div className="mb-6 rounded-sm border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <div className="font-medium">Паспорт отклонён ({approvalInfo.rejectedStep || '—'})</div>
          {approvalInfo.rejectionComment && <div className="mt-1">Комментарий: {approvalInfo.rejectionComment}</div>}
        </div>
      )}
      {isEdit && approvalInfo && ['pending_sttl', 'pending_czl', 'pending_dispatcher'].includes(approvalInfo.status) && (
        <div className="mb-6 rounded-sm border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Паспорт на согласовании: {approvalInfo.statusDisplay}. Редактирование недоступно, пока согласование не завершено или паспорт не отклонён.
        </div>
      )}
      {isEdit && approvalInfo && approvalInfo.status === 'approved' && (
        <div className="mb-6 rounded-sm border border-green-300 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          Паспорт утверждён.
        </div>
      )}
      {isEdit && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setParticipantsModalOpen(true)}
            className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
          >
            Участники согласования
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-sm border border-stroke bg-white p-10 text-center text-sm text-bodydark2 shadow-default dark:border-strokedark dark:bg-boxdark">
          Загрузка...
        </div>
      ) : !detail ? (
        <div className="rounded-sm border border-stroke bg-white p-10 text-center text-sm text-bodydark2 shadow-default dark:border-strokedark dark:bg-boxdark">
          Шаблон не найден
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">{displayTemplateName}</h2>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="text-bodydark2">Категория: <span className="text-black dark:text-white">{detail.category || '—'}</span></div>
              
            </div>
          </div>

          {!isSeraGaz && !isSzhizhennyyGaz && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedType('reservoir')}
              className={`rounded-sm border p-5 text-left shadow-default ${selectedType === 'reservoir' ? 'border-primary bg-primary/5' : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark'}`}
            >
              <div className="text-base font-semibold text-black dark:text-white">{isJetA1Notice ? 'Первичное' : 'Резервуар'}</div>
              <div className="mt-1 text-sm text-bodydark2">
                {isJetA1Notice ? 'Первичное извещение для Jet A-1' : 'Шаблон для резервуарного паспорта'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('wagon')}
              className={`rounded-sm border p-5 text-left shadow-default transition ${
                (detail.category || '').toLowerCase().includes('jet') && !isJetA1Notice
                  ? 'cursor-not-allowed border-stroke bg-gray-50 opacity-40 dark:border-strokedark dark:bg-boxdark'
                  : selectedType === 'wagon'
                  ? 'border-primary bg-primary/5'
                  : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark'
              }`}
            >
              <div className="text-base font-semibold text-black dark:text-white">{isJetA1Notice ? 'Вторичное' : 'Вогон'}</div>
              <div className="mt-1 text-sm text-bodydark2">
                {isJetA1Notice
                  ? 'Вторичное извещение для Jet A-1'
                  : (detail.category || '').toLowerCase().includes('jet')
                  ? 'Jet A-1 uchun вагон шаблoni мавжуд эмас'
                  : 'Шаблон для вагонного паспорта'}
              </div>
            </button>
          </div>
          )}

          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            {/* <div className="flex items-center border-b border-stroke px-5 py-3 dark:border-strokedark">
              <div className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white">
                {selectedType === 'reservoir' ? 'Резервуар меню' : 'Вогон меню'}
              </div>
            </div> */}

            <div className="overflow-x-auto">
              <fieldset disabled={isLocked} className="contents">
                {(isDiesel3OK4Reservoir || isDiesel3OK5Reservoir) && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">{isDiesel3OK5Reservoir ? 'Топливо дизельное ДТ- ЕВРО –3(О)–К5' : 'Топливо дизельное ДТ- ЕВРО –3(О)–К4'}</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Размер партии (масса), тн:</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки:</span>
                          {renderReservoirInput('additive')}
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {descriptor && (
                  <descriptor.HeaderFields
                    type={selectedType}
                    reservoirValues={reservoirValues}
                    renderReservoirInput={renderReservoirInput}
                    renderReservoirTextarea={renderReservoirTextarea}
                    renderEmployeeSelect={renderEmployeeSelect}
                  />
                )}

                {isDiesel3OK4SSDFReservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Дизельное топливо для марки ДТ- ЕВРО –3(О)–К4-SSDF</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;zMSt 610:2025</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Размер партии (масса), тн:</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDiesel3OK4SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Дизельное топливо для марки ДТ- ЕВРО –3(О)–К4-SSDF</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;zMSt 610:2025</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDiesel3OK5SSDFReservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Дизельное топливо для марки ДТ- ЕВРО –3(О)–К5-SSDF</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;zMSt 610:2025</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Размер партии (масса), тн:</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDiesel3OK5SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Дизельное топливо для марки ДТ- ЕВРО –3(О)–К5-SSDF</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;zMSt 610:2025</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLBK3Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(В)–К3</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level')}
                          <span>Размер партии (масса), тн:</span>
                          {renderReservoirInput('batch_size')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата изготовления</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselMEK5SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –М(Е)–К5-SSDF</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselMEK4SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –М(Е)–К4-SSDF</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLAK3Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(А)–К3</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLAK3Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(А)–К3</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level')}
                          <span>Размер партии (масса), тн:</span>
                          {renderReservoirInput('batch_size')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата изготовления</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isDieselLBK5Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(В)–К5</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level')}
                          <span>Размер партии (масса), тн:</span>
                          {renderReservoirInput('batch_size')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата изготовления</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isDieselLBK4Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(В)–К4</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level')}
                          <span>Размер партии (масса), тн:</span>
                          {renderReservoirInput('batch_size')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата изготовления</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isDieselEco3_0050_35Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,050-35 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар №:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара :</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Размер партии (масса), тн</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Присадки: с присадки</span>
                          <span>Дополнительные сведения:</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEco3_0050_35Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,050-35 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <hr className="border-stroke dark:border-strokedark" />
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата поступления образцов:</span>
                            {renderReservoirInput('receipt_date', '', true)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата проведения испытаний:</span>
                            {renderReservoirInput('test_date', '', true)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span>Присадки: с присадки</span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дополнительные сведения:</span>
                            {renderReservoirInput('additional_info', '', true)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEco3_0050_40Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,050-40 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар №:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара :</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Размер партии (масса), тн</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Присадки: с присадки</span>
                          <span>Дополнительные сведения:</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEco3_0050_40Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,050-40 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <hr className="border-stroke dark:border-strokedark" />
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата поступления образцов:</span>
                            {renderReservoirInput('receipt_date', '', true)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата проведения испытаний:</span>
                            {renderReservoirInput('test_date', '', true)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span>Присадки: с присадки</span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дополнительные сведения:</span>
                            {renderReservoirInput('additional_info', '', true)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEco3_0100_40Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,100-40 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар №:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара :</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Размер партии (масса), тн</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Присадки: с присадки</span>
                          <span>Дополнительные сведения:</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEco3_0100_40Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3-1-0,100-40 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517 Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <hr className="border-stroke dark:border-strokedark" />
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата поступления образцов:</span>
                            {renderReservoirInput('receipt_date', '', true)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата проведения испытаний:</span>
                            {renderReservoirInput('test_date', '', true)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span>Присадки: с присадки</span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дополнительные сведения:</span>
                            {renderReservoirInput('additional_info', '', true)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {isDieselEcoL_0100_40Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО-Л-0,100-40</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Резервуар №:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Уровень наполнения резервуара :</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>см</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Размер партии (масса), тн</span>
                          {renderReservoirInput('batch_size', '', true)}
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки</span>
                          {renderReservoirInput('additive', '', false)}
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info', '', false)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEcoL_0100_40Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО-Л-0,100-40</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517 Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <hr className="border-stroke dark:border-strokedark" />
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата поступления образцов:</span>
                            {renderReservoirInput('receipt_date', '', true)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата проведения испытаний:</span>
                            {renderReservoirInput('test_date', '', true)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Присадки</span>
                            {renderReservoirInput('additive', '', false)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дополнительные сведения:</span>
                            {renderReservoirInput('additional_info', '', false)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEcoL_0100_62Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО-Л-0,100-62</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Резервуар №:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Уровень наполнения резервуара :</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>см</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Размер партии (масса), тн</span>
                          {renderReservoirInput('batch_size', '', true)}
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки</span>
                          {renderReservoirInput('additive', '', false)}
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info', '', false)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEcoL_0100_62Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО-Л-0,100-62</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517 Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <hr className="border-stroke dark:border-strokedark" />
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата поступления образцов:</span>
                            {renderReservoirInput('receipt_date', '', true)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата проведения испытаний:</span>
                            {renderReservoirInput('test_date', '', true)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Присадки</span>
                            {renderReservoirInput('additive', '', false)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дополнительные сведения:</span>
                            {renderReservoirInput('additional_info', '', false)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isMazutM40Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: Топочный мазут - марка 40 ГОСТ 10585-2013</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Замер:</span>
                          {renderReservoirInput('measurement_no', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isMazutM40Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: Топочный мазут - марка 40 ГОСТ 10585-2013</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517. Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>
                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
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
                )}

                {isMazutM100Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: Топочный мазут - марка 100 ГОСТ 10585-2013</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Замер:</span>
                          {renderReservoirInput('measurement_no', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isMazutM100Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: Топочный мазут - марка 100 ГОСТ 10585-2013</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517. Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>
                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
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
                )}

                {isRastvoritelS4Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: Растворитель углеводородный С4-135/220</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Замер</span>
                          {renderReservoirInput('measurement_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end justify-end gap-x-4 gap-y-2 text-xl">
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isRastvoritelS4Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: Растворитель углеводородный С4-135/220</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517. Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>
                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
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
                )}

                {isSeraGaz && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Сера техническая газовая комовая сорт 99,98 ГОСТ-127.1-93</div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Номер партии:</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Изготовлено:</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                        </div>
                        <div className="text-xl">
                          Знак опасности 4а - вещества, которые в условиях перевозки способны легко воспламеняться от кратковременного воздействия внешнего источника
                        </div>
                        <div className="text-xl">Серийный номер ООН 1350</div>
                      </div>
                    </div>
                  </div>
                )}

                {isSzhizhennyyGaz && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-xl font-semibold">
                          Наименование продукции: <span className="underline">Сжиженные углеводородные газы</span>, используемые для
                          к коммунально-бытового и производственного <span className="underline">потребления</span> в качестве топлива марка ПБТ (Пропан-бутан технический) по <span className="font-bold">ГОСТ 34858– 2022</span>
                        </div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Буллит:</span>
                          {renderReservoirInput('bullit', '', false)}
                          <span>Замер :</span>
                          {renderReservoirInput('measurement_no', '', false)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', false)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 14921-2018</span>
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
                )}

                {isKerosineReservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: ФРАКЦИЯ КЕРОСИНОВАЯ ВЫРАБАТЫВАЕМОГО ПО TS 16472899-040:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Резервуар №:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Замер:</span>
                          {renderReservoirInput('measurement_no', '', true)}
                          <span>Дата изготовления:</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
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
                )}

                {isKerosineWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">НАИМЕНОВАНИЕ ПРОДУКЦИИ: ФРАКЦИЯ КЕРОСИНОВАЯ ВЫРАБАТЫВАЕМОГО ПО TS 16472899-040:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Замер:</span>
                          {renderReservoirInput('measurement_no', '', true)}
                          <span>см</span>
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEco3_0100_35Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3 -1 -0,100-35 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                          <span>Резервуар №:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара :</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Размер партии (масса), тн</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Присадки: с присадки</span>
                          <span>Дополнительные сведения:</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselEco3_0100_35Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="text-center text-2xl font-semibold">Наименование продукции: Дизельное топливо для марки ЭКО 3 -1-0,100-35 (минус 15)</div>
                        <div className="text-center text-2xl font-semibold">вырабатываемого по O&apos;z DSt 1134:2018</div>
                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Карауд Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517 Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <hr className="border-stroke dark:border-strokedark" />
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата поступления образцов:</span>
                            {renderReservoirInput('receipt_date', '', true)}
                          </span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дата проведения испытаний:</span>
                            {renderReservoirInput('test_date', '', true)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-xl">
                          <span>Присадки: с присадки</span>
                          <span className="flex flex-wrap items-end gap-x-2">
                            <span>Дополнительные сведения:</span>
                            {renderReservoirInput('additional_info', '', true)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(isDieselLBK5SSDFReservoir || isDieselLBK4SSDFReservoir || isDieselLCK4SSDFReservoir || isDieselLCK5SSDFReservoir || isDieselLAK4SSDFReservoir || isDieselMEK4SSDFReservoir || isDieselMEK5SSDFReservoir || isDieselK4Reservoir || isDieselK5Reservoir || isDieselLAK4Reservoir || isDieselLAK5Reservoir || isDieselLCK4Reservoir || isDieselLCK5Reservoir || isDieselLCK6Reservoir || isDieselLDK4Reservoir || isDieselLDK5Reservoir || isDieselLDK6Reservoir) && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">
                          {isDieselLBK5SSDFReservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(В)–К5-SSDF' : isDieselLBK4SSDFReservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(В)–К4-SSDF' : isDieselLCK4SSDFReservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(С)–К4-SSDF' : isDieselLCK5SSDFReservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(С)–К5-SSDF' : isDieselLAK4SSDFReservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(А)–К4-SSDF' : isDieselMEK4SSDFReservoir ? 'Топливо дизельное  ДТ- ЕВРО –М(Е)–К4-SSDF' : isDieselMEK5SSDFReservoir ? 'Топливо дизельное  ДТ- ЕВРО –М(Е)–К5-SSDF' : (isDieselLAK3Reservoir || isDieselLAK4Reservoir || isDieselLAK5Reservoir || isDieselLCK4Reservoir || isDieselLCK5Reservoir || isDieselLCK6Reservoir || isDieselLDK4Reservoir || isDieselLDK5Reservoir || isDieselLDK6Reservoir || isDieselLBK3Reservoir || isDieselLBK4Reservoir || isDieselLBK5Reservoir) ? (isDieselLAK3Reservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(А)–К3' : (isDieselLBK5Reservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(В)–К5' : (isDieselLBK4Reservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(В)–К4' : (isDieselLDK6Reservoir ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –Л(D)–К6' : (isDieselLDK5Reservoir ? 'Топливо дизельное  ДТ- ЕВРО –Л(D)–К5' : (isDieselLDK4Reservoir ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –Л(D)–К4' : (isDieselLCK6Reservoir ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –Л(С)–К6' : (isDieselLCK5Reservoir ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –Л(С)–К5' : (isDieselLCK4Reservoir ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –Л(С)–К4' : (isDieselLAK5Reservoir ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –Л(А)–К5' : 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –Л(А)–К4')))))))))) : (isDieselK5Reservoir ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –М(Е)–К5' : 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –М(Е)–К4')}
                        </div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir', '', true)}
                          {!(isDieselLBK5SSDFReservoir || isDieselLBK4SSDFReservoir || isDieselLCK4SSDFReservoir || isDieselLCK5SSDFReservoir || isDieselLAK4SSDFReservoir || isDieselMEK4SSDFReservoir || isDieselMEK5SSDFReservoir) && <><span>Партия №</span>{renderReservoirInput('batch_no', '', true)}</>}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          {(isDieselLBK5SSDFReservoir || isDieselLBK4SSDFReservoir || isDieselLCK4SSDFReservoir || isDieselLCK5SSDFReservoir || isDieselLAK4SSDFReservoir || isDieselMEK4SSDFReservoir || isDieselMEK5SSDFReservoir) ? (
                            <>
                              <span>Партия №</span>
                              {renderReservoirInput('batch_no', '', true)}
                              <span>Уровень наполнения резервуара:</span>
                              {renderReservoirInput('fill_level', '', true)}
                              <span>см</span>
                              <span>Размер партии (масса), тн:</span>
                              {renderReservoirInput('batch_size', '', true)}
                            </>
                          ) : (
                            <>
                              <span>Уровень наполнения резервуара:</span>
                              {renderReservoirInput('fill_level', '', true)}
                              <span>Размер партии (масса), тн:</span>
                              {renderReservoirInput('batch_size', '', true)}
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          {(isDieselLAK4Reservoir || isDieselLAK5Reservoir || isDieselLCK4Reservoir) ? (
                            <>
                              <span>Дата отбора образцов:</span>
                              {renderReservoirInput('sampling_date', '', true)}
                              <span>по ГОСТ 2517</span>
                              <span>Дата изготовления</span>
                              {renderReservoirInput('manufacture_date', '', true)}
                            </>
                          ) : (
                            <>
                              <span>Дата изготовления</span>
                              {renderReservoirInput('manufacture_date', '', true)}
                              <span>Дата отбора образцов:</span>
                              {renderReservoirInput('sampling_date', '', true)}
                              <span>по ГОСТ 2517</span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          {(isDieselLBK5SSDFReservoir || isDieselLBK4SSDFReservoir || isDieselLCK4SSDFReservoir || isDieselLCK5SSDFReservoir || isDieselLAK4SSDFReservoir || isDieselMEK4SSDFReservoir || isDieselMEK5SSDFReservoir) ? (
                            <>
                              <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                              {renderReservoirInput('synthetic_component')}
                              <span>%</span>
                            </>
                          ) : isDieselLDK5Reservoir ? (
                            <>
                              <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                              <span>Дополнительные сведения:</span>
                              {renderReservoirInput('additional_info')}
                            </>
                          ) : (
                            <>
                              <span>Присадки:</span>
                              {renderReservoirInput('additive')}
                              <span>Дополнительные сведения:</span>
                              {renderReservoirInput('additional_info')}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLAK4SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(А)–К4-SSDF</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLBK4SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(В)–К4-SSDF</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirInput('wagon_count', '', true)}
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLBK5SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(В)–К5-SSDF</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLCK4SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(С)–К4-SSDF</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirInput('wagon_count', '', true)}
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLCK5SSDFWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(С)–К5-SSDF</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27, Изготовитель и заказчик: ООО Бухарский НПЗ
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517 Резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств. Дополнительные сведения: добавлена синтетический компонент</span>
                          {renderReservoirInput('synthetic_component')}
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLDK5Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное ДТ- ЕВРО –Л(D)–К5</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLBK3Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>Паспорт №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное ДТ- ЕВРО –Л(В)–К3</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDieselLBK5Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(В)–К5</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isDieselLBK4Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">Топливо дизельное  ДТ- ЕВРО –Л(В)–К4</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки: SHODISAN 20 С для повышения противоизносных свойств.</span>
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {(isDiesel3OK4Wagon || isDiesel3OK5Wagon || isDieselLAK4Wagon || isDieselLAK5Wagon || isDieselLCK4Wagon || isDieselLCK5Wagon || isDieselLCK6Wagon || isDieselLDK4Wagon || isDieselLDK6Wagon) && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">{(isDieselLAK4Wagon || isDieselLAK5Wagon || isDieselLCK4Wagon || isDieselLCK5Wagon || isDieselLCK6Wagon || isDieselLDK4Wagon || isDieselLDK5Wagon || isDieselLDK6Wagon) ? (isDieselLDK6Wagon ? 'Топливо дизельное ДТ- ЕВРО –Л(D)–К6' : (isDieselLDK5Wagon ? 'Топливо дизельное ДТ- ЕВРО –Л(D)–К5' : (isDieselLDK4Wagon ? 'Топливо дизельное ДТ- ЕВРО –Л(D)–К4' : (isDieselLCK6Wagon ? 'Топливо дизельное ДТ- ЕВРО –Л(С)–К6' : (isDieselLCK5Wagon ? 'Топливо дизельное ДТ- ЕВРО –Л(С)–К5' : (isDieselLCK4Wagon ? 'Топливо дизельное ДТ- ЕВРО –Л(С)–К4' : (isDieselLAK5Wagon ? 'Топливо дизельное ДТ- ЕВРО –Л(А)–К5' : 'Топливо дизельное ДТ- ЕВРО –Л(А)–К4'))))))) : (isDiesel3OK5Wagon ? 'Топливо дизельное ДТ- ЕВРО –3(О)–К5' : 'Топливо дизельное ДТ- ЕВРО –3(О)–К4')}</div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl text-center">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="text-xl">Изготовитель и заказчик: ООО Бухарский НПЗ</div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки:</span>
                          {renderReservoirInput('additive')}
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(isDieselK4Wagon || isDieselK5Wagon) && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="text-center text-2xl font-semibold">
                          {isDieselK5Wagon ? 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –М(Е)–К5' : 'Топливо дизельное\u00a0\u00a0ДТ- ЕВРО –М(Е)–К4'}
                        </div>
                        <div className="text-center text-2xl font-semibold">O&apos;zMSt 610:2025 (ОТР UzTR.931-028:2017)</div>

                        <div className="text-xl">
                          Адрес и место осуществления испытаний: Лаборатория ООО Бухарский НПЗ, г. Караул Базар ул. Мустакиллик 1 тел: 365-364-12-27
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Резервуар №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                        </div>

                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Присадки:</span>
                          {renderReservoirInput('additive')}
                          <span>Дополнительные сведения:</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isBenzinReservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span >ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик :</span>
                          <span>ООО Бухарский НПЗ</span>
                          <span >Резервуар:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span >Замер :</span>
                          {renderReservoirInput('measurement_no', '', true)} см
                        </div>

                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата изготовления</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ</span>
                          <span>2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span >Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span >Партия №:</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span >Октаноповышающая присадка:</span>
                          {renderReservoirInput('additive')}
                        </div>

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2 text-xl">
                          <span>Октаноповышающие добавки:</span>
                          {renderReservoirInput('aromatic_hydrocarbons')}
                        </div>

                       
                      </div>
                    </div>
                  </div>
                )}
                {!descriptor && isAI91Reservoir && (
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
                )}

                {!descriptor && isAI91Wagon && (
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
                )}

                {isAI95Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
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
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI95Reservoir && (
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
                )}

                {isAI95PWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirInput('wagon_count', '', true)}
                          <span>номера вагон цистерн:</span>
                        </div>
                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Партия №:</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Октаноповышающая присадка:</span>
                          {renderReservoirInput('additive')}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2 text-xl">
                          <span>Октаноповышающие добавки:</span>
                          {renderReservoirInput('aromatic_hydrocarbons')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI95PReservoir && (
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
                          <span>Дата изготовления</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Партия №:</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Октаноповышающая присадка:</span>
                          {renderReservoirInput('additive')}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2 text-xl">
                          <span>Октаноповышающие добавки:</span>
                          {renderReservoirInput('aromatic_hydrocarbons')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI95QWWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО  Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата  отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517.  Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн</span>
                          {renderReservoirInput('wagon_count', '', true)}
                        </div>
                        <div className="flex flex-col gap-y-1 text-xl">
                          <span>номера вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата поступления  образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения  испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                        <div className="text-base leading-snug">
                          Присадки: В автомобильный бензин добавляется  многофункциональный  пакет присадок BRAVOS PRIME G производства компании Завод присадок и реагентов , в количестве 500 mg/kg*
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дополнительные сведения</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI98Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО  Бухарский НПЗ</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата  отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517. Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн</span>
                          {renderReservoirInput('wagon_count', '', true)}
                        </div>
                        <div className="flex flex-col gap-y-1 text-xl">
                          <span>номера вагон цистерн:</span>
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата поступления  образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isJetA1Notice && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-2 font-serif text-[18px] leading-snug text-black dark:text-white">
                        <div className="flex justify-end text-sm text-red-600">
                          <span className="underline">{selectedType === 'reservoir' ? 'Первичное' : 'Вторичное'}</span>
                          
                        </div>
                        <div>Предприятие изготовитель: ООО Бухарский НПЗ</div>
                        <div>Представительство по контроля качества ГСМ</div>
                        <div className="flex items-end justify-center gap-2 text-center text-2xl font-bold">
                          <span>ИЗВЕЩЕНИЕ №</span>
                          {renderReservoirInput('notice_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                          <span className="text-red-600 font-semibold">от</span>
                          <span>«</span>
                          {renderReservoirInput('notice_date', '', true)}
                          <span>»</span>
                          <span className="text-red-600 font-semibold">2026 г.</span>
                        </div>
                        <div className="text-center font-bold">
                          о предъявлении продукции на приёмно-сдаточные испытания и окончательную техническую приёмку.
                        </div>
                        <div className="pt-2">
                          Настоящим извещением предъявляется {renderReservoirInput('notice_product_name', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                          <span>резервуар №</span>
                          {renderReservoirInput('notice_reservoir', '', true)}
                          <span>высота взлива</span>
                          {renderReservoirInput('notice_height', '', true)}
                          <span>см.</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                          <span>уровень наполнения</span>
                          {renderReservoirInput('notice_fill_level', '', true)}
                        </div>
                        <div className="text-sm">номер партии стандарта</div>
                        <div className="border-t border-black pt-2">
                          Указанная продукция проверена ЦЗЛ, полностью соответствует требованиям действующей НД O'z MSt 609:2025
                        </div>
                        <div className="border-t border-black pt-2">
                          и признан годной для сдачи представительство по контроля качества ГСМ
                        </div>
                        <div className="pt-1">
                          Предъявляемая продукция полностью затарена и упакована в соответствии с требованиями
                        </div>
                        <div className="border-t border-black pt-2">
                          Договора № {renderReservoirInput('notice_contract_no', '', true)} от « {renderReservoirInput('notice_contract_date', '', true)} » 2026 г.
                        </div>
                        <div className="pt-1">К извещению прилагаются: (ненужное зачеркнуть)</div>
                        <div className="pl-6 space-y-2 text-[17px]">
                          <div>1. Паспорт качества {renderReservoirInput('notice_passport_date', '', true)} г. № {renderReservoirInput('notice_passport_no', '', true)} в количестве {renderReservoirInput('notice_passport_count', '', true)} экз.</div>
                          <div>2. Справка о компонентном составе</div>
                          <div>3. Акт № {renderReservoirInput('notice_act_no', '', true)} от « {renderReservoirInput('notice_act_date', '', true)} » 2026 г. об анализе причин продукции возвращенной Представительству по контроля качества ГСМ</div>
                        </div>
                        <div className="pt-2 font-bold">Руководитель предприятия</div>
                        <div className="font-bold">(Главный инженер) ______________________________</div>
                        <div className="pt-2 font-bold">Начальник ЦЗЛ ______________________________</div>
                        <div className="pt-4">Поступило представительство по контроля качества ГСМ ___ час «___» ______ 2026 г.</div>
                        <div>Испытания, приёмку произвести ______________________________</div>
                        <div className="font-bold">Начальник. Представительство по контроля качества ГСМ</div>
                        <div className="pt-2 text-center">________________ «___» ______ 2026 г.</div>
                      </div>
                    </div>
                  </div>
                )}

                {isJetA1Reservoir && !isJetA1Notice && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        {isJetA1SSF && (
                          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                            <span>Дата изготовления</span>
                            {renderReservoirInput('manufacture_date', '', true)}
                          </div>
                        )}
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата отбора пробы:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>проба отбирается по O'zDSt ASTM D 4057-19:2021(ASTM D 4057-19)</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата(период)проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          {isJetA1SSF && (
                            <>
                              <span>Резервуар №</span>
                              {renderReservoirInput('reservoir_no', '', true)}
                            </>
                          )}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Уровень наполнения резервуара:</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Размер партии (масса):</span>
                          {renderReservoirInput('batch_size', '', true)}
                        </div>
                        <div className="text-base leading-snug">
                          Присадки: Противоизносная присадка марки NALKO 5403**, Антистатическая присадка Stadis 450***.
                        </div>
                        {isJetA1SSF && (
                          <div className="text-base leading-snug">
                            Дополнительные сведения: № сертификата на синтетический компонент: UZ.SMT.01.0032.64157 от 25.07.2025 г до 25.07.2028 г
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isAI98Reservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО  Бухарский НПЗ</span>
                          <span>Резервуар:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Замер :</span>
                          {renderReservoirInput('measurement_no', '', true)}
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата  отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ  2517</span>
                          <span>Дата поступления  образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI95QWReservoir && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО  Бухарский НПЗ</span>
                          <span>Резервуар:</span>
                          {renderReservoirInput('reservoir', '', true)}
                          <span>Уровень наполнения</span>
                          {renderReservoirInput('fill_level', '', true)}
                          <span>см</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Партия №</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Размер партии (масса), тн</span>
                          {renderReservoirInput('batch_size', '', true)}
                          <span>Дата  отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата поступления  образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения  испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                        <div className="text-base leading-snug">
                          Присадки: В автомобильный бензин добавляется  многофункциональный  пакет присадок BRAVOS PRIME G производства компании Завод присадок и реагентов , в количестве 500 mg/kg *
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дополнительные сведения</span>
                          {renderReservoirInput('additional_info')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI92Wagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик : ООО Бухарский НПЗ</span>
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
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI92Reservoir && (
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
                )}

                {isAI91PWagon && (
                  <div className="px-5 pb-4 pt-4">
                    <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                      <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                        <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                          <span>ПАСПОРТ №</span>
                          {renderReservoirInput('passport_no', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Изготовитель и заказчик: ООО Бухарский НПЗ</span>
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Из резервуара №</span>
                          {renderReservoirInput('reservoir_no', '', true)}
                          <span>количество заявленных вагон цистерн:</span>
                          {renderReservoirInput('wagon_count', '', true)}
                          <span>номера вагон цистерн:</span>
                        </div>
                        <div className="flex flex-col gap-y-1 text-xl">
                          {renderReservoirTextarea('wagon_numbers', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Партия №:</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Октаноповышающая присадка:</span>
                          {renderReservoirInput('additive')}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2 text-xl">
                          <span>Октаноповышающие добавки:</span>
                          {renderReservoirInput('aromatic_hydrocarbons')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAI91PReservoir && (
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
                          <span>Дата изготовления</span>
                          {renderReservoirInput('manufacture_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xl">
                          <span>Дата отбора образцов:</span>
                          {renderReservoirInput('sampling_date', '', true)}
                          <span>по ГОСТ 2517</span>
                          <span>Дата поступления образцов:</span>
                          {renderReservoirInput('receipt_date', '', true)}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                          <span>Дата проведения испытаний:</span>
                          {renderReservoirInput('test_date', '', true)}
                          <span>Партия №:</span>
                          {renderReservoirInput('batch_no', '', true)}
                          <span>Октаноповышающая присадка:</span>
                          {renderReservoirInput('additive')}
                        </div>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2 text-xl">
                          <span>Октаноповышающие добавки:</span>
                          {renderReservoirInput('aromatic_hydrocarbons')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {descriptor ? (
                  <descriptor.ResultsTable
                    type={selectedType}
                    actualRowValues={actualRowValues}
                    setActualRowValue={setActualRowValue}
                    renderActualValueCell={renderActualValueCell}
                    trackedKey={trackedKey}
                    renderEmployeeSelect={renderEmployeeSelect}
                    renderReservoirInput={renderReservoirInput}
                  />
                ) : (isDiesel3OK4SSDFReservoir || isDiesel3OK4SSDFWagon || isDiesel3OK5SSDFReservoir || isDiesel3OK5SSDFWagon || isDieselLAK4SSDFReservoir || isDieselLAK4SSDFWagon || isDieselLBK4SSDFReservoir || isDieselLBK4SSDFWagon || isDieselLBK5SSDFReservoir || isDieselLBK5SSDFWagon || isDieselLCK4SSDFReservoir || isDieselLCK4SSDFWagon || isDieselLCK5SSDFReservoir || isDieselLCK5SSDFWagon || isDieselMEK4SSDFReservoir || isDieselMEK4SSDFWagon || isDieselMEK5SSDFReservoir || isDieselMEK5SSDFWagon || isDiesel3OK4Reservoir || isDiesel3OK5Reservoir || isDieselLAK4Reservoir || isDieselLAK5Reservoir || isDieselLCK4Reservoir || isDieselLCK5Reservoir || isDieselLCK6Reservoir || isDieselLDK4Reservoir || isDieselLDK5Reservoir || isDieselLDK6Reservoir || isDiesel3OK4Wagon || isDiesel3OK5Wagon || isDieselLAK4Wagon || isDieselLAK5Wagon || isDieselLCK4Wagon || isDieselLCK5Wagon || isDieselLCK6Wagon || isDieselLDK4Wagon || isDieselLDK5Wagon || isDieselLDK6Wagon || isDieselLBK3Reservoir || isDieselLBK3Wagon || isDieselLBK4Reservoir || isDieselLBK4Wagon || isDieselLBK5Reservoir || isDieselLBK5Wagon || isDieselLAK3Reservoir || isDieselLAK3Wagon || isDieselK4Reservoir || isDieselK5Reservoir || isDieselK4Wagon || isDieselK5Wagon || isDieselEco3_0050_35Reservoir || isDieselEco3_0050_35Wagon || isDieselEco3_0050_40Reservoir || isDieselEco3_0050_40Wagon || isDieselEco3_0100_35Reservoir || isDieselEco3_0100_35Wagon || isDieselEco3_0100_40Reservoir || isDieselEco3_0100_40Wagon || isDieselEcoL_0100_40Reservoir || isDieselEcoL_0100_40Wagon || isDieselEcoL_0100_62Reservoir || isDieselEcoL_0100_62Wagon) ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>№</th>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>Метод контроля</th>
                          <th className={thCls}>{isDieselEcoL_0100_62 ? 'Норма для марки ЭКО-Л-0,100-62' : "Значение по O'zMSt 610:2025"}</th>
                          {!hideDieselOtrColumn && <th className={thCls}>Значение по ОТР UzTR.931-028:2017</th>}
                          <th className={thCls}>Фактическое значение</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const getRowArray = () => {
                            if (isDieselLDK6Reservoir || isDieselLDK6Wagon) return isDieselLDK6Wagon ? DIESEL_LD_K6_WAG_ROWS : DIESEL_LD_K6_RES_ROWS;
                            if (isDieselLDK5Reservoir || isDieselLDK5Wagon) return isDieselLDK5Wagon ? DIESEL_LD_K5_WAG_ROWS : DIESEL_LD_K5_RES_ROWS;
                            if (isDieselLBK3Reservoir || isDieselLBK3Wagon) return isDieselLBK3Wagon ? DIESEL_LB_K3_WAG_ROWS : DIESEL_LB_K3_RES_ROWS;
                            if (isDieselLBK4Reservoir || isDieselLBK4Wagon) return DIESEL_LB_K4_RES_ROWS;
                            if (isDieselLBK5Reservoir || isDieselLBK5Wagon) return DIESEL_LB_K5_RES_ROWS;
                            if (isDieselLAK3Reservoir || isDieselLAK3Wagon) return DIESEL_LA_K3_RES_ROWS;
                            if (isDieselLDK4Reservoir || isDieselLDK4Wagon) return isDieselLDK4Wagon ? DIESEL_LD_K4_WAG_ROWS : DIESEL_LD_K4_RES_ROWS;
                            if (isDieselLCK6Reservoir || isDieselLCK6Wagon) return isDieselLCK6Wagon ? DIESEL_LC_K6_WAG_ROWS : DIESEL_LC_K6_RES_ROWS;
                            if (isDieselEco3_0050_40Wagon) return DIESEL_ECO3_40_WAG_ROWS;
                            if (isDieselEco3_0050_40Reservoir) return DIESEL_ECO3_40_RES_ROWS;
                            if (isDieselEco3_0050_35Wagon) return DIESEL_ECO3_WAG_ROWS;
                            if (isDieselEco3_0050_35Reservoir) return DIESEL_LC_K5_RES_ROWS;
                            if (isDieselEco3_0100_35Wagon) return DIESEL_ECO3_100_35_WAG_ROWS;
                            if (isDieselEco3_0100_35Reservoir) return DIESEL_ECO3_100_35_RES_ROWS;
                            if (isDieselEcoL_0100_62Wagon) return DIESEL_ECOL_100_62_RES_ROWS;
                            if (isDieselEcoL_0100_62Reservoir) return DIESEL_ECOL_100_62_RES_ROWS;
                            if (isDieselEcoL_0100_40Wagon) return DIESEL_ECOL_100_40_RES_ROWS;
                            if (isDieselEcoL_0100_40Reservoir) return DIESEL_ECOL_100_40_RES_ROWS;
                            if (isDieselEco3_0100_40Wagon) return DIESEL_ECO3_100_40_WAG_ROWS;
                            if (isDieselEco3_0100_40Reservoir) return DIESEL_ECO3_100_40_RES_ROWS;
                            if (isDieselLCK5SSDFReservoir || isDieselLCK5SSDFWagon) return isDieselLCK5SSDFWagon ? DIESEL_LCK5_SSDF_WAG_ROWS : DIESEL_LCK5_SSDF_RES_ROWS;
                            if (isDieselLCK5Reservoir || isDieselLCK5Wagon) return isDieselLCK5Wagon ? DIESEL_LC_K5_WAG_ROWS : DIESEL_LC_K5_RES_ROWS;
                            if (isDieselLCK4SSDFReservoir || isDieselLCK4SSDFWagon) return isDieselLCK4SSDFWagon ? DIESEL_LCK4_SSDF_WAG_ROWS : DIESEL_LCK4_SSDF_RES_ROWS;
                            if (isDieselLCK4Reservoir || isDieselLCK4Wagon) return isDieselLCK4Wagon ? DIESEL_LC_K4_WAG_ROWS : DIESEL_LC_K4_RES_ROWS;
                            if (isDieselLAK5Reservoir || isDieselLAK5Wagon) return isDieselLAK5Wagon ? DIESEL_LA_K5_WAG_ROWS : DIESEL_LA_K5_RES_ROWS;
                            if (isDieselLBK5SSDFReservoir || isDieselLBK5SSDFWagon) return isDieselLBK5SSDFWagon ? DIESEL_LBK5_SSDF_WAG_ROWS : DIESEL_LBK5_SSDF_RES_ROWS;
            if (isDieselLBK4SSDFReservoir || isDieselLBK4SSDFWagon) return isDieselLBK4SSDFWagon ? DIESEL_LBK4_SSDF_WAG_ROWS : DIESEL_LBK4_SSDF_RES_ROWS;
            if (isDieselLAK4SSDFReservoir || isDieselLAK4SSDFWagon) return isDieselLAK4SSDFWagon ? DIESEL_LAK4_SSDF_WAG_ROWS : DIESEL_LAK4_SSDF_RES_ROWS;
                            if (isDieselLAK4Reservoir || isDieselLAK4Wagon) return isDieselLAK4Wagon ? DIESEL_LA_K4_WAG_ROWS : DIESEL_LA_K4_RES_ROWS;
                            if (isDiesel3OK4SSDFReservoir || isDiesel3OK4SSDFWagon) return isDiesel3OK4SSDFWagon ? DIESEL_3OK4_SSDF_WAG_ROWS : DIESEL_3OK4_SSDF_RES_ROWS;
                            if (isDiesel3OK5SSDFReservoir || isDiesel3OK5SSDFWagon) return isDiesel3OK5SSDFWagon ? DIESEL_3OK5_SSDF_WAG_ROWS : DIESEL_3OK5_SSDF_RES_ROWS;
                            if (isDiesel3OK5Reservoir || isDiesel3OK5Wagon) return isDiesel3OK5Wagon ? DIESEL_3O_K5_WAG_ROWS : DIESEL_3O_K5_RES_ROWS;
                            if (isDiesel3OK4Reservoir || isDiesel3OK4Wagon) return isDiesel3OK4Wagon ? DIESEL_3O_K4_WAG_ROWS : DIESEL_3O_K4_RES_ROWS;
                            if (isDieselMEK4SSDFReservoir || isDieselMEK4SSDFWagon) return isDieselMEK4SSDFWagon ? DIESEL_MEK4_SSDF_WAG_ROWS : DIESEL_MEK4_SSDF_RES_ROWS;
                            if (isDieselMEK5SSDFReservoir || isDieselMEK5SSDFWagon) return isDieselMEK5SSDFWagon ? DIESEL_MEK5_SSDF_WAG_ROWS : DIESEL_MEK5_SSDF_RES_ROWS;
                            if (isDieselK5Reservoir || isDieselK5Wagon) return isDieselK5Wagon ? DIESEL_K5_WAG_ROWS : DIESEL_K5_RES_ROWS;
                            return isDieselK4Wagon ? DIESEL_K4_WAG_ROWS : DIESEL_K4_RES_ROWS;
                          };
                          const rows = getRowArray();
                          return rows.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(() => {
                              const shouldShowNo = index === 0 || rows[index - 1].no !== row.no;
                              return shouldShowNo ? (
                                <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                              ) : null;
                            })()}
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.name}</td>
                            {(() => {
                              // Merging on gost text alone is wrong when two unrelated items just
                              // happen to cite the same standard (e.g. rows 10/11 here both read
                              // "ГОСТ 32462") — that dropped row 11's gost cell entirely, shifting
                              // every column after it left by one. Requiring the same `no` first
                              // keeps the real multi-row merges (item 3, 9, 16...) working.
                              const shouldShowGost = index === 0 || rows[index - 1].no !== row.no || rows[index - 1].gost !== row.gost || row.gostRowSpan;
                              return shouldShowGost ? (
                                <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                              ) : null;
                            })()}
                            <td className={tdCls}>{row.norm}</td>
                            {!hideDieselOtrColumn && <td className={tdCls}>{row.normOtr}</td>}
                            <td className={tdCls}>
                              {renderActualValueCell(row)}
                            </td>
                          </tr>
                        ));
                        })()}
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isSzhizhennyyGaz ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls} rowSpan={2}>№ п/п</th>
                          <th className={thCls} rowSpan={2}>Наименование показателей</th>
                          <th className={thCls}>Норма для марки</th>
                          <th className={thCls} rowSpan={2}>Фактическое значение</th>
                        </tr>
                        <tr>
                          <th className={thCls}>ПБТ (Пропан-бутан технический)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SZH_GAZ_ROWS.map((row, index) => {
                          const showNo = index === 0 || SZH_GAZ_ROWS[index - 1].no !== row.no;
                          return (
                            <tr key={trackedKey(row.key)}>
                              {showNo && (
                                <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                              )}
                              <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.name}</td>
                              <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.norm}</td>
                              <td className={tdCls}>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  value={actualRowValues[row.key] || ''}
                                  onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                  className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                                />
                              </td>
                            </tr>
                          );
                        })}
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isSeraGaz ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>№ п/п</th>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>Норма по ГОСТ 127.1-93</th>
                          <th className={thCls}>Фактически</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SERA_GAZ_RES_ROWS.map((row) => (
                          <tr key={trackedKey(row.key)}>
                            <td className={tdCls}>{row.no}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.name}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.norm}</td>
                            <td className={tdCls}>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (isRastvoritelS4Reservoir || isRastvoritelS4Wagon) ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>№ п/п</th>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>Норма<br />Q&apos;z DSt 3035 :2015</th>
                          <th className={thCls}>Фактически</th>
                        </tr>
                      </thead>
                      <tbody>
                        {RAS_S4_RES_ROWS.map((row) => (
                          <tr key={trackedKey(row.key)}>
                            <td className={tdCls}>{row.no}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.name}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.norm}</td>
                            <td className={tdCls}>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (isMazutM100Reservoir || isMazutM100Wagon) ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls} rowSpan={2}>№ п/п</th>
                          <th className={thCls} rowSpan={2}>Наименование показателей</th>
                          <th className={thCls}>Значение для марки</th>
                          <th className={thCls} rowSpan={2}>Фактически</th>
                        </tr>
                        <tr>
                          <th className={thCls}>Топочный 100</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MAZUT_M100_RES_ROWS.map((row) => (
                          <tr key={trackedKey(row.key)}>
                            <td className={tdCls}>{row.no}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.name}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.norm}</td>
                            <td className={tdCls}>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (isMazutM40Reservoir || isMazutM40Wagon) ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>№ п/п</th>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>Значение для марки</th>
                          <th className={thCls}>Фактически</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MAZUT_M40_RES_ROWS.map((row) => (
                          <tr key={trackedKey(row.key)}>
                            <td className={tdCls}>{row.no}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.name}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.norm}</td>
                            <td className={tdCls}>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (isKerosineReservoir || isKerosineWagon) ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>Метод контроля</th>
                          <th className={thCls}>Норма для марки фракция керосиновая ОКП 025129</th>
                          <th className={thCls}>Фактически</th>
                        </tr>
                      </thead>
                      <tbody>
                        {KERO_ROWS.map((row) => (
                          <tr key={trackedKey(row.key)}>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.name}</td>
                            <td className={tdCls}>{row.gost}</td>
                            <td className={tdCls} style={{ whiteSpace: 'pre-line' }}>{row.norm}</td>
                            <td className={tdCls}>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isBenzinReservoir ? (
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
                      {BENZIN_RESERVOIR_TABLE_ROWS.map((row, index) => (
                        <tr key={trackedKey(row.key)}>
                          {(index === 0 || BENZIN_RESERVOIR_TABLE_ROWS[index - 1].no !== row.no) && (
                            <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                          )}
                          <td className={tdCls}>{row.name}</td>
                          {(index === 0 || BENZIN_RESERVOIR_TABLE_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                            <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                          )}
                          <td className={tdCls}>{row.norm}</td>
                          <td className={tdCls}>{row.normOtr}</td>
                          <td className={tdCls}>
                            {renderActualValueCell(row)}
                          </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isBenzinWagon ? (
                  <>
                    <div className="px-5 pb-4 pt-4">
                      <div className="rounded-sm border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-meta-4/40">
                        <div className="space-y-3 font-serif text-lg text-black dark:text-white">
                          <div className="flex flex-wrap items-end justify-center gap-2 text-center text-2xl font-semibold">
                            <span>ПАСПОРТ №</span>
                            {renderReservoirInput('passport_no', '', true)}
                          </div>

                          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                            <span>Изготовитель и заказчик:</span>
                            <span>ООО Бухарский НПЗ</span>
                            <span>Дата отбора образцов:</span>
                            {renderReservoirInput('sampling_date', '', true)}
                            <span>по ГОСТ 2517</span>
                          </div>

                          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                            <span>Из резервуара №</span>
                            {renderReservoirInput('reservoir_no', '', true)}
                            <span>количество заявленных вагон цистерн:</span>
                            {renderReservoirInput('wagon_count', '', true)}
                          </div>

                          <div className="flex flex-col gap-y-1 text-xl h-20">
                            <span>номера вагон цистерн:</span>
                            {renderReservoirTextarea('wagon_numbers', true)}
                          </div>

                          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xl">
                            <span>Дата проведения испытаний:</span>
                            {renderReservoirInput('test_date', '', true)}
                            <span>Партия №:</span>
                            {renderReservoirInput('batch_no', '', true)}
                            <span>Октаноповышающая присадка:</span>
                            {renderReservoirInput('additive')}
                          </div>

                          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2 text-xl">
                            <span>Октаноповышающие добавки:</span>
                            {renderReservoirInput('aromatic_hydrocarbons')}
                          </div>
                        </div>
                      </div>
                    </div>
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
                          {BENZIN_WAGON_TABLE_ROWS.length === 0 ? (
                            <tr><td colSpan={6} className="py-6 text-center text-sm text-bodydark2">Строки будут добавлены</td></tr>
                          ) : BENZIN_WAGON_TABLE_ROWS.map((row, index) => (
                            <tr key={trackedKey(row.key)}>
                              {(index === 0 || BENZIN_WAGON_TABLE_ROWS[index - 1].no !== row.no) && (
                                <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                              )}
                              <td className={tdCls}>{row.name}</td>
                              {(index === 0 || BENZIN_WAGON_TABLE_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                                <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                              )}
                              <td className={tdCls}>{row.norm}</td>
                              <td className={tdCls}>{row.normOtr}</td>
                              <td className={tdCls}>
                                {renderActualValueCell(row)}
                              </td>
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
                            {renderEmployeeSelect('sttl_head')}
                          </div>
                          <div className="flex items-end gap-3">
                            <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                            {renderEmployeeSelect('czl_head')}
                          </div>
                          <div className="flex items-end gap-3">
                            <span className="whitespace-nowrap">Диспетчер</span>
                            {renderEmployeeSelect('dispatcher_head')}
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
                  </>
                ) : isAI91Reservoir ? (
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
                        {AI91_RES_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI91_RES_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI91_RES_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              {renderActualValueCell(row)}
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI91PReservoir ? (
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
                        {AI91P_RES_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI91P_RES_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI91P_RES_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI92Reservoir ? (
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
                        {AI92_RES_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI92_RES_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI92_RES_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (isJetA1Reservoir && !isJetA1Notice) ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>№</th>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>Значение по стандарту</th>
                          <th className={thCls}>Значение по ОТР</th>
                          <th className={thCls}>Фактическое значение</th>
                          <th className={thCls}>Метод контроля</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jetA1Rows.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || jetA1Rows[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={`${tdCls} text-left whitespace-pre-line`}>{row.name}</td>
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="text"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
                            {(index === 0 || jetA1Rows[index - 1].method !== row.method || row.methodRowSpan) && (
                              <td rowSpan={row.methodRowSpan || 1} className={`${tdCls} whitespace-pre-line`}>{row.method}</td>
                            )}
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isJetA1Notice ? null : isAI98Wagon ? (
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
                        {AI98_WAG_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI98_WAG_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI98_WAG_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI98Reservoir ? (
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
                        {AI98_RES_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI98_RES_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI98_RES_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI95QWWagon ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>№</th>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>метод контроля</th>
                          <th className={thCls}>Значения по Ts16472899-043:2020</th>
                          <th className={thCls}>Значения по ОТР</th>
                          <th className={thCls}>Фактические значения</th>
                        </tr>
                      </thead>
                      <tbody>
                        {AI95QW_WAG_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI95QW_WAG_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI95QW_WAG_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI95QWReservoir ? (
                  <div className="mx-5 mb-4 overflow-x-auto text-center">
                    <table className="w-full table-auto border-collapse text-center">
                      <thead>
                        <tr>
                          <th className={thCls}>№</th>
                          <th className={thCls}>Наименование показателей</th>
                          <th className={thCls}>метод контроля</th>
                          <th className={thCls}>Значения по Ts16472899-043:2020</th>
                          <th className={thCls}>Значения по ОТР</th>
                          <th className={thCls}>Фактические значения</th>
                        </tr>
                      </thead>
                      <tbody>
                        {AI95QW_RES_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI95QW_RES_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI95QW_RES_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (isAI95Reservoir || isAI95PReservoir) ? (
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
                        {AI95_RES_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI95_RES_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI95_RES_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (isAI95Wagon || isAI95PWagon) ? (
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
                        {AI95_WAG_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI95_WAG_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI95_WAG_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI92Wagon ? (
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
                        {AI92_WAG_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI92_WAG_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI92_WAG_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI91PWagon ? (
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
                        {AI91P_WAG_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI91P_WAG_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI91P_WAG_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              <input type="number" inputMode="decimal" step="any"
                                value={actualRowValues[row.key] || ''}
                                onChange={(event) => setActualRowValue(row.key, event.target.value)}
                                className={`${actualValueInputCls} ${isActualValueInvalid(row, actualRowValues[row.key] || '') ? actualValueInvalidCls : ''}`}
                              />
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : isAI91Wagon ? (
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
                        {AI91_WAG_ROWS.map((row, index) => (
                          <tr key={trackedKey(row.key)}>
                            {(index === 0 || AI91_WAG_ROWS[index - 1].no !== row.no) && (
                              <td rowSpan={row.noRowSpan || 1} className={tdCls}>{row.no}</td>
                            )}
                            <td className={tdCls}>{row.name}</td>
                            {(index === 0 || AI91_WAG_ROWS[index - 1].gost !== row.gost || row.gostRowSpan) && (
                              <td rowSpan={row.gostRowSpan || 1} className={tdCls}>{row.gost}</td>
                            )}
                            <td className={tdCls}>{row.norm}</td>
                            <td className={tdCls}>{row.normOtr}</td>
                            <td className={tdCls}>
                              {renderActualValueCell(row)}
                            </td>
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
                          {renderEmployeeSelect('sttl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Начальник ЦЗЛ</span>
                          {renderEmployeeSelect('czl_head')}
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="whitespace-nowrap">Диспетчер</span>
                          {renderEmployeeSelect('dispatcher_head')}
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
                ) : (
                  <div className="p-6 text-center text-sm text-bodydark2">Шаблон не настроен</div>
                )}
              </fieldset>
              </div>

            <div className="flex items-center justify-end gap-3 border-t border-stroke px-5 py-4 dark:border-strokedark">
              <button
                type="button"
                onClick={handleBack}
                className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
              >
                Отмена
              </button>
              <button
                disabled={pdfLoading || !detail || !canUseDocumentActions}
                onClick={async () => {
                  if (!detail) return;
                  if (hasEmptyActualValue()) {
                    toast.error('Заполните все фактические значения');
                    return;
                  }
                  if (hasInvalidActualValue()) {
                    toast.error('У вас есть несоответствующее значение');
                    return;
                  }
                  setPdfLoading(true);
                  try {
                    const url = await getPdfBlobUrl(selectedType, detail.name, detail.product_standard, reservoirValues, actualRowValues, jetNoticeVariant, approvalInfo?.status, verificationInfo);
                    window.open(url, '_blank');
                  } catch {
                    toast.error('PDF yaratishda xatolik');
                  } finally {
                    setPdfLoading(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
              >
                {pdfLoading ? <FaSpinner size={14} className="animate-spin" /> : <FaRegFileAlt size={14} />}
                {pdfLoading ? 'Загружается...' : 'Просмотр документа'}
              </button>
              <button
                type="button"
                disabled={downloadLoading || !detail || !canUseDocumentActions}
                onClick={async () => {
                  if (!detail) return;
                  if (hasEmptyActualValue()) {
                    toast.error('Заполните все фактические значения');
                    return;
                  }
                  if (hasInvalidActualValue()) {
                    toast.error('У вас есть несоответствующее значение');
                    return;
                  }
                  setDownloadLoading(true);
                  try {
                    await downloadPdf(
                      selectedType,
                      detail.name,
                      detail.product_standard,
                      reservoirValues,
                      actualRowValues,
                      jetNoticeVariant,
                      approvalInfo?.status,
                      verificationInfo,
                    );
                  } catch {
                    toast.error('PDF yaratishda xatolik');
                  } finally {
                    setDownloadLoading(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
              >
                {downloadLoading ? <FaSpinner size={14} className="animate-spin" /> : <FaDownload size={14} />}
                {downloadLoading ? 'Загружается...' : 'Скачать'}
              </button>
              <button
                type="button"
                disabled={saveLoading || !detail || !canUseDocumentActions || isLocked}
                onClick={() => {
                  // Of the four signer selects only Начальник смены is mandatory — the approval
                  // chain already skips any step left unassigned (see resolve_next_status), so
                  // СТТЛ / ЦЗЛ / Диспетчер are filled in only when that step actually applies.
                  const signatureFields = ['shift_head', 'passport_issue_date', 'compliance_number'];
                  const reservoirRequired = [...signatureFields, 'passport_no', 'reservoir', 'measurement_no', 'manufacture_date', 'sampling_date', 'receipt_date', 'test_date', 'batch_no'];
                  const dieselReservoirRequired = [...signatureFields, 'passport_no', 'reservoir', 'batch_no', 'fill_level', 'batch_size', 'manufacture_date', 'sampling_date', 'receipt_date', 'test_date'];
                  const diesel3OReservoirRequired = [...signatureFields, 'passport_no', 'reservoir', 'batch_no', 'fill_level', 'batch_size', 'sampling_date', 'receipt_date', 'test_date'];
                  const diesel3OWagonRequired = [...signatureFields, 'passport_no', 'sampling_date', 'reservoir_no', 'receipt_date', 'test_date'];
                  const dieselWagonRequired = [...signatureFields, 'passport_no', 'sampling_date', 'reservoir_no', 'receipt_date', 'test_date'];
                  // Only some diesel3OWagonRequired variants (ЕВРО-Л-(С)-К4-SSDF, ЕВРО-Л-(В)-К4-SSDF)
                  // actually render a "количество заявленных вагон цистерн" input — the others don't
                  // have that field in their JSX yet, so wagon_count is added here per-variant rather
                  // than to the shared list.
                  const dieselWagonWithCountRequired = [...diesel3OWagonRequired, 'wagon_count'];
                  // ЭКО-Л-0,100-62 wagon form has no wagon_count field — it asks for
                  // wagon_numbers (количество заявленных вагон цистерн) instead.
                  const dieselEcoL62WagonRequired = [...diesel3OWagonRequired, 'wagon_numbers'];
                  const ai91ReservoirRequired = [...signatureFields, 'passport_no', 'reservoir', 'measurement_no', 'batch_no', 'manufacture_date', 'sampling_date', 'receipt_date', 'test_date'];
                  const ai95QWReservoirRequired = [...signatureFields, 'passport_no', 'reservoir', 'fill_level', 'batch_no', 'batch_size', 'sampling_date', 'receipt_date', 'test_date'];
                  const ai95QWWagonRequired = [...signatureFields, 'passport_no', 'sampling_date', 'reservoir_no', 'wagon_count', 'wagon_numbers', 'receipt_date', 'test_date'];
                  const wagonRequired = [...signatureFields, 'passport_no', 'sampling_date', 'reservoir_no', 'wagon_count', 'wagon_numbers', 'test_date', 'batch_no'];
                  const ai91WagonRequired = [...signatureFields, 'passport_no', 'sampling_date', 'reservoir_no', 'wagon_count', 'wagon_numbers', 'receipt_date', 'test_date'];
                  const ai98ReservoirRequired = [...signatureFields, 'passport_no', 'reservoir', 'measurement_no', 'batch_no', 'sampling_date', 'receipt_date', 'test_date'];
                  const ai98WagonRequired = [...signatureFields, 'passport_no', 'sampling_date', 'reservoir_no', 'wagon_count', 'wagon_numbers', 'receipt_date', 'test_date'];
                  const jetA1ReservoirRequired = isJetA1SSF
                    ? [...signatureFields, 'passport_no', 'manufacture_date', 'sampling_date', 'test_date', 'reservoir_no', 'fill_level', 'batch_no', 'batch_size']
                    : [...signatureFields, 'passport_no', 'sampling_date', 'test_date', 'fill_level', 'batch_no', 'batch_size'];
                  const required = isJetA1Reservoir
                    ? jetA1ReservoirRequired
                    : isDiesel3OK4SSDFReservoir
                    ? diesel3OReservoirRequired
                    : isDiesel3OK4SSDFWagon
                    ? diesel3OWagonRequired
                    : isDiesel3OK5SSDFReservoir
                    ? diesel3OReservoirRequired
                    : isDiesel3OK5SSDFWagon
                    ? diesel3OWagonRequired
                    : isDieselLAK4SSDFReservoir
                    ? dieselReservoirRequired
                    : isDieselLAK4SSDFWagon
                    ? diesel3OWagonRequired
                    : isDieselLBK4SSDFReservoir
                    ? dieselReservoirRequired
                    : isDieselLBK4SSDFWagon
                    ? dieselWagonWithCountRequired
                    : isDieselLBK5SSDFReservoir
                    ? dieselReservoirRequired
                    : isDieselLBK5SSDFWagon
                    ? diesel3OWagonRequired
                    : isDieselLCK4SSDFReservoir
                    ? dieselReservoirRequired
                    : isDieselLCK4SSDFWagon
                    ? dieselWagonWithCountRequired
                    : isDieselEco3_0100_40Reservoir
                    ? diesel3OReservoirRequired
                    : isDieselEco3_0100_40Wagon
                    ? diesel3OWagonRequired
                    : isDieselEcoL_0100_40Reservoir
                    ? diesel3OReservoirRequired
                    : isDieselEcoL_0100_40Wagon
                    ? diesel3OWagonRequired
                    : isDieselEcoL_0100_62Reservoir
                    ? diesel3OReservoirRequired
                    : isDieselEcoL_0100_62Wagon
                    ? dieselEcoL62WagonRequired
                    : (isDiesel3OK4Reservoir || isDiesel3OK5Reservoir)
                    ? diesel3OReservoirRequired
                    : (isDieselLAK4Reservoir || isDieselLAK5Reservoir || isDieselLCK4Reservoir || isDieselLCK5Reservoir || isDieselLCK6Reservoir || isDieselLDK4Reservoir || isDieselLDK5Reservoir || isDieselLDK6Reservoir || isDieselLBK3Reservoir || isDieselLBK4Reservoir || isDieselLBK5Reservoir || isDieselLAK3Reservoir)
                    ? dieselReservoirRequired
                    : (isDiesel3OK4Wagon || isDiesel3OK5Wagon || isDieselLAK4Wagon || isDieselLAK5Wagon || isDieselLCK4Wagon || isDieselLCK5Wagon || isDieselLCK6Wagon || isDieselLDK4Wagon || isDieselLDK5Wagon || isDieselLDK6Wagon || isDieselLBK3Wagon || isDieselLBK4Wagon || isDieselLBK5Wagon || isDieselLAK3Wagon)
                    ? diesel3OWagonRequired
                    : (isDieselK4Wagon || isDieselK5Wagon)
                    ? dieselWagonRequired
                    : isDieselMEK4SSDFWagon
                    ? diesel3OWagonRequired
                    : isDieselMEK4SSDFReservoir
                    ? dieselReservoirRequired
                    : isDieselMEK5SSDFWagon
                    ? diesel3OWagonRequired
                    : isDieselMEK5SSDFReservoir
                    ? dieselReservoirRequired
                    : isDieselK5Reservoir
                    ? dieselReservoirRequired
                    : isDieselK4Reservoir
                    ? dieselReservoirRequired
                    : isAI95QWWagon
                    ? ai95QWWagonRequired
                    : isAI98Wagon
                      ? ai98WagonRequired
                      : (isAI91Wagon || isAI92Wagon || isAI95Wagon)
                        ? ai91WagonRequired
                        : (isBenzinWagon || isAI91PWagon || isAI95PWagon)
                          ? wagonRequired
                          : isAI95QWReservoir
                            ? ai95QWReservoirRequired
                            : isAI98Reservoir
                              ? ai98ReservoirRequired
                              : (isAI91Reservoir || isAI92Reservoir || isAI95Reservoir)
                                ? ai91ReservoirRequired
                                : reservoirRequired;
                  const effectiveRequired = descriptor
                    ? (typeof descriptor.requiredFieldKeys === 'function' ? descriptor.requiredFieldKeys(selectedType) : descriptor.requiredFieldKeys)
                    : required;
                  const hasMissing = effectiveRequired.some(k => !reservoirValues[k]);
                  if (hasMissing) {
                    setShowErrors(true);
                    toast.error('Заполните все обязательные поля');
                    return;
                  }
                  if (hasEmptyActualValue()) {
                    toast.error('Заполните все фактические значения');
                    return;
                  }
                  if (hasInvalidActualValue()) {
                    toast.error('У вас есть несоответствующее значение');
                    return;
                  }
                  setShowConfirm(true);
                }}
                className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {saveLoading ? <FaSpinner size={14} className="animate-spin" /> : null}
                {saveLoading ? 'Сохраняется...' : isEdit ? 'Обновление' : 'Сохранить'}
              </button>
              {isEdit && isLocked && approvalInfo?.currentStep && canSignCurrentStep && (
                <button
                  type="button"
                  disabled={approveLoading}
                  onClick={async () => {
                    setApproveLoading(true);
                    try {
                      const response = await axioss.post(`/passports/${editPassportId}/approve/`);
                      const passport = response.data;
                      setApprovalInfo({
                        status: passport.approval_status || 'draft',
                        statusDisplay: passport.approval_status_display || '',
                        currentStep: passport.current_step || null,
                        rejectedStep: passport.rejected_step || null,
                        rejectionComment: passport.rejection_comment || '',
                        rejectedByUsername: passport.rejected_by_username || null,
                        rejectedAt: passport.rejected_at || null,
                        submittedByUsername: passport.submitted_by_username || null,
                        submittedAt: passport.submitted_at || null,
                        sttlApprovedByUsername: passport.sttl_approved_by_username || null,
                        sttlApprovedAt: passport.sttl_approved_at || null,
                        czlApprovedByUsername: passport.czl_approved_by_username || null,
                        czlApprovedAt: passport.czl_approved_at || null,
                        dispatcherApprovedByUsername: passport.dispatcher_approved_by_username || null,
                        dispatcherApprovedAt: passport.dispatcher_approved_at || null,
                        canSubmit: Boolean(passport.can_submit),
                        canApproveCurrentStep: Boolean(passport.can_approve_current_step),
                      });
                      toast.success('Паспорт подписан');
                      window.dispatchEvent(new Event('passport-approval-changed'));
                    } catch (error: any) {
                      toast.error(error?.response?.data?.error || 'Не удалось подписать паспорт');
                    } finally {
                      setApproveLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {approveLoading ? <FaSpinner size={14} className="animate-spin" /> : null}
                  {approveLoading ? 'Подписывается...' : 'Подписать'}
                </button>
              )}
              {isEdit && approvalInfo && ['draft', 'rejected'].includes(approvalInfo.status) && approvalInfo.canSubmit && (
                <button
                  type="button"
                  disabled={submitLoading || !detail}
                  onClick={async () => {
                    setSubmitLoading(true);
                    try {
                      const response = await axioss.post(`/passports/${editPassportId}/submit/`);
                      const passport = response.data;
                      setApprovalInfo({
                        status: passport.approval_status || 'draft',
                        statusDisplay: passport.approval_status_display || '',
                        currentStep: passport.current_step || null,
                        rejectedStep: passport.rejected_step || null,
                        rejectionComment: passport.rejection_comment || '',
                        rejectedByUsername: passport.rejected_by_username || null,
                        rejectedAt: passport.rejected_at || null,
                        submittedByUsername: passport.submitted_by_username || null,
                        submittedAt: passport.submitted_at || null,
                        sttlApprovedByUsername: passport.sttl_approved_by_username || null,
                        sttlApprovedAt: passport.sttl_approved_at || null,
                        czlApprovedByUsername: passport.czl_approved_by_username || null,
                        czlApprovedAt: passport.czl_approved_at || null,
                        dispatcherApprovedByUsername: passport.dispatcher_approved_by_username || null,
                        dispatcherApprovedAt: passport.dispatcher_approved_at || null,
                        canSubmit: Boolean(passport.can_submit),
                        canApproveCurrentStep: Boolean(passport.can_approve_current_step),
                      });
                      toast.success('Паспорт отправлен на согласование');
                    } catch (error: any) {
                      toast.error(error?.response?.data?.error || 'Не удалось отправить паспорт на согласование');
                    } finally {
                      setSubmitLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {submitLoading ? <FaSpinner size={14} className="animate-spin" /> : null}
                  {submitLoading ? 'Отправляется...' : 'Отправить на подпись'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm modal ─────────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-sm border border-stroke bg-white p-6 shadow-lg dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-2 text-base font-semibold text-black dark:text-white">
              Подтверждение
            </h3>
            <p className="mb-2 text-sm text-bodydark2">
              Вы согласны сохранить данные?
            </p>
            {(!reservoirValues.sttl_head || !reservoirValues.czl_head) && (
              <p className="mb-4 text-sm text-warning">
                {!reservoirValues.sttl_head && !reservoirValues.czl_head
                  ? 'Не выбраны Начальник СТТЛ и Начальник ЦЗЛ — эти шаги согласования будут пропущены.'
                  : !reservoirValues.sttl_head
                    ? 'Не выбран Начальник СТТЛ — этот шаг согласования будет пропущен.'
                    : 'Не выбран Начальник ЦЗЛ — этот шаг согласования будет пропущен.'}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded border border-stroke px-5 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              >
                Нет
              </button>
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  if (!detail) return;
                  setShowConfirm(false);
                  setSaveLoading(true);
                  try {
                    let templateId = detail.id;
                    if (templateId === 0) {
                      const createRes = await axioss.post('/passport-templates/', {
                        name: detail.name,
                        category: detail.category,
                        product_standard: detail.product_standard,
                        reservoir_type: selectedType,
                        header_html: '',
                        footer_html: '',
                      });
                      templateId = createRes?.data?.id;
                      if (!templateId) throw new Error('Template id not returned');
                      setDetail(prev => prev ? { ...prev, id: templateId } : null);
                    }
                    const payload = {
                      template: templateId,
                      field_values: reservoirValues,
                      actual_values: actualRowValues,
                      document_html: '',
                    };
                    if (isEdit) {
                      await axioss.patch(`/passports/${editPassportId}/`, payload);
                      toast.success('Паспорт обновлён');
                    } else {
                      await axioss.post('/passports/', payload);
                      toast.success('Паспорт сохранён');
                    }
                    navigate('/pasporta');
                  } catch {
                    toast.error('Ошибка при сохранении паспорта');
                  } finally {
                    setSaveLoading(false);
                  }
                }}
                className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
              >
                {saveLoading ? 'Сохраняется...' : 'Да'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal show={participantsModalOpen} onClose={() => setParticipantsModalOpen(false)} size="3xl">
        <Modal.Header>Участники согласования</Modal.Header>
        <Modal.Body>
          <PassportApprovalStepsTable steps={approvalSteps} passportNumber={reservoirValues.passport_no} />
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setParticipantsModalOpen(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}