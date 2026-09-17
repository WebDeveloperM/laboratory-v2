import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaEye, FaFileExcel, FaFileWord, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';
import * as XLSX from 'xlsx-js-style';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { normalizeRole } from '../../utils/pageAccess';
import SpravkaViewDrawer from '../../components/Spravki/SpravkaViewDrawer';

type Spravka = {
  id: number;
  spravka_number: string;
  manufacture_date: string;
  reservoir: string;
  measurement: string;
  wagon_count: string;
  wagon_numbers: string;
  sample_collection_date: string;
  issue_date: string;
  actual_values: Record<string, string>;
  sttl_head: string;
  czl_head: string;
  dispatcher_head: string;
  approval_status: string;
  approval_status_display: string;
  current_step: string | null;
  created_at: string;
};

const STEP_FIELD_KEY: Record<string, 'sttl_head' | 'czl_head' | 'dispatcher_head'> = {
  sttl: 'sttl_head',
  czl: 'czl_head',
  dispatcher: 'dispatcher_head',
};

const getNextApprover = (item: Spravka) => {
  if (!item.current_step) return '—';
  const key = STEP_FIELD_KEY[item.current_step];
  return (key && item[key]) || '—';
};

const STATUS_BADGE_CLS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  pending_sttl: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pending_czl: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pending_dispatcher: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const SPRAVKA_ROW_LABELS = [
  'Октановое число (исслед.)',
  'Октановое число (мотор.)',
  'Массовая конц. свинца, мг/кг',
  'Фракц. состав: нач. перегонки',
  'Перегонка 10%',
  'Перегонка 50%',
  'Перегонка 90%',
  'Конец кипения, °С',
  'Остаток в колбе, %',
  'Остаток и потери, %',
  'Давление насыщ. паров',
  'Доля бензола, %',
  'Конц. смол промытых',
  'Индукционный период, мин',
  'Массовая доля серы, мг/кг',
  'Испытание на медной пластинке',
  'Плотность при 20°С',
  'Водорастворимые кислоты',
  'Механические примеси',
  'Внешний вид',
  'Конц. марганца',
  'Конц. железа',
];

const EMPTY_FORM = {
  spravka_number: '',
  manufacture_date: '',
  reservoir: '',
  measurement: '',
  wagon_count: '',
  wagon_numbers: '',
  sample_collection_date: '',
  issue_date: '',
  actual_values: {} as Record<string, string>,
};

type FormState = typeof EMPTY_FORM;

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const inputCls =
  'w-full rounded border border-stroke bg-white px-2 py-1.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark';
const thCls = 'px-4 py-3 text-left text-sm font-semibold text-black dark:text-white bg-gray-2 dark:bg-meta-4';
const tdCls = 'px-4 py-3 text-sm text-black dark:text-white border-b border-stroke dark:border-strokedark';

export default function SpravkiPage() {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const canCreateSpravka = role === 'admin' || role === 'shift_head';
  const canEditSpravka = role !== 'user';
  const [list, setList] = useState<Spravka[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewDrawerId, setViewDrawerId] = useState<number | null>(null);

  // ── Column filters ──────────────────────────────────────────────────────────
  const [numberFilter, setNumberFilter] = useState('');
  const [createdDateFilter, setCreatedDateFilter] = useState('');

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchList = () => {
    setLoading(true);
    axioss
      .get(`${BASE_URL}/spravki/`)
      .then((r) => setList(r.data?.results ?? (Array.isArray(r.data) ? r.data : [])))
      .catch(() => toast.error('Не удалось загрузить список справок'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, []);

  const openModal = () => { setForm(EMPTY_FORM); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const setField = (key: keyof Omit<FormState, 'actual_values'>, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setActualValue = (idx: number, val: string) =>
    setForm((f) => ({
      ...f,
      actual_values: { ...f.actual_values, [String(idx)]: val },
    }));

  const handleSave = async () => {
    if (!form.spravka_number.trim()) {
      toast.warn('Введите номер справки');
      return;
    }
    setSaving(true);
    try {
      await axioss.post(`${BASE_URL}/spravki/`, form);
      toast.success('Справка сохранена');
      closeModal();
      fetchList();
    } catch {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (id: number, num: string) => {
    try {
      const resp = await axioss.get(`${BASE_URL}/spravki/${id}/download/`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `spravka_${num}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Ошибка при скачивании');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить справку?')) return;
    try {
      await axioss.delete(`${BASE_URL}/spravki/${id}/`);
      toast.success('Удалено');
      fetchList();
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const exportExcel = () => {
    if (!list.length) { toast.info('Нет данных'); return; }
    const headers = ['№', 'Номер справки', 'Резервуар', 'Замер', 'Вагон-цистерн', 'Дата выдачи', 'Создана'];
    const body = list.map((s, i) => [
      i + 1, s.spravka_number, s.reservoir || '—', s.measurement || '—',
      s.wagon_count || '—', s.issue_date || '—', fmtDate(s.created_at),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    ws['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Справки');
    XLSX.writeFile(wb, `spravki_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Экспортировано ${list.length} записей`);
  };

  const q = search.toLowerCase().trim();
  const numberQ = numberFilter.toLowerCase().trim();

  const filtered = list.filter(s => {
    if (q) {
      const matchesGlobal =
        (s.spravka_number || '').toLowerCase().includes(q) ||
        (s.reservoir || '').toLowerCase().includes(q) ||
        (s.measurement || '').toLowerCase().includes(q);
      if (!matchesGlobal) return false;
    }
    if (numberQ && !(s.spravka_number || '').toLowerCase().includes(numberQ)) return false;
    if (createdDateFilter) {
      const created = s.created_at ? new Date(s.created_at) : null;
      if (!created || isNaN(created.getTime())) return false;
      const createdLocalDate = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
      if (createdLocalDate !== createdDateFilter) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, numberFilter, createdDateFilter, pageSize]);

  return (
    <>
      <Breadcrumb pageName="Справки" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-6 py-4 dark:border-strokedark">
          <div className="flex items-center gap-3">
            <span className="text-sm text-bodydark2">Все: {list.length}</span>
            <div className="relative">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-bodydark2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="rounded border border-stroke bg-gray-2 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-bodydark2">Показать:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="h-9 rounded-md border border-stroke bg-white px-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 rounded bg-[#21a366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c8c57]"
            >
              <FaFileExcel size={14} /> Excel
            </button>
            {canCreateSpravka && (
              <button
                onClick={() => navigate('/spravki/select')}
                className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
              >
                <FaPlus size={12} /> Добавить справку
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th className={thCls} style={{ width: 48 }}>№</th>
                <th className={thCls}>Номер справки</th>
                <th className={thCls}>Создана</th>
                <th className={thCls}>Статус</th>
                <th className={thCls}>Следующий подписант</th>
                <th className={thCls} style={{ width: 140 }}>Действия</th>
              </tr>
              <tr>
                <th className={thCls} />
                <th className={thCls}>
                  <input
                    value={numberFilter}
                    onChange={e => setNumberFilter(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full rounded border border-stroke bg-white px-2 py-1 text-xs font-normal outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </th>
                <th className={thCls}>
                  <input
                    type="date"
                    value={createdDateFilter}
                    onChange={e => setCreatedDateFilter(e.target.value)}
                    className="w-full rounded border border-stroke bg-white px-2 py-1 text-xs font-normal outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </th>
                <th className={thCls} />
                <th className={thCls} />
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-bodydark2">Загрузка...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-bodydark2">
                    {search || numberFilter || createdDateFilter
                      ? 'Справок не найдено'
                      : 'Нет данных'}
                  </td>
                </tr>
              ) : paginated.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-meta-4">
                  <td className={tdCls}>{(page - 1) * pageSize + i + 1}</td>
                  <td className={tdCls + ' font-semibold'}>{s.spravka_number}</td>
                  <td className={tdCls + ' whitespace-nowrap text-xs text-bodydark2'}>{fmtDate(s.created_at)}</td>
                  <td className={tdCls}>
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE_CLS[s.approval_status] || STATUS_BADGE_CLS.draft}`}>
                      {s.approval_status_display || 'Черновик'}
                    </span>
                  </td>
                  <td className={tdCls}>{getNextApprover(s)}</td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewDrawerId(s.id)}
                        title="Ko'rish"
                        className="rounded bg-primary px-2.5 py-1.5 text-xs text-white hover:bg-opacity-80"
                      >
                        <FaEye size={12} />
                      </button>
                      {canEditSpravka && (
                        <button
                          onClick={() => {
                            const tpl = (s.actual_values as any)?._template || 'Газойль Синтетик';
                            navigate(`/spravki/create?name=${encodeURIComponent(tpl)}&id=${s.id}`);
                          }}
                          title="Tahrirlash"
                          className="rounded bg-yellow-500 px-2.5 py-1.5 text-xs text-white hover:bg-yellow-600"
                        >
                          <FaEdit size={12} />
                        </button>
                      )}
<button
                        onClick={() => handleDelete(s.id)}
                        title="Удалить"
                        className="rounded bg-red-500 px-2.5 py-1.5 text-xs text-white hover:bg-red-600"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke px-6 py-4 dark:border-strokedark">
            <span className="text-sm text-bodydark2">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} / {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-stroke px-3 py-1.5 text-sm text-black hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              >
                ‹
              </button>
              <span className="text-sm text-bodydark2">{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-stroke px-3 py-1.5 text-sm text-black hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8">
          <div className="w-full max-w-3xl rounded-sm bg-white p-6 shadow-xl dark:bg-boxdark">
            <h2 className="mb-6 text-xl font-semibold text-black dark:text-white">Новая справка</h2>

            <div className="mb-6 grid grid-cols-2 gap-4">
              {(
                [
                  ['spravka_number', 'Номер справки *'],
                  ['manufacture_date', 'Дата изготовления / налива'],
                  ['reservoir', 'Резервуар'],
                  ['measurement', 'Замер'],
                  ['wagon_count', 'Кол-во вагон-цистерн'],
                  ['sample_collection_date', 'Дата отбора образцов'],
                  ['issue_date', 'Дата выдачи'],
                ] as [keyof Omit<FormState, 'actual_values'>, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-bodydark2">{label}</label>
                  <input
                    className={inputCls}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={label.replace(' *', '')}
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-bodydark2">Номера вагон-цистерн</label>
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={2}
                  value={form.wagon_numbers}
                  onChange={(e) => setField('wagon_numbers', e.target.value)}
                  placeholder="Номера вагон-цистерн через пробел или запятую"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-black dark:text-white">Фактические значения</h3>
              <div className="overflow-hidden rounded border border-stroke dark:border-strokedark">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 dark:bg-meta-4">
                      <th className="w-8 px-3 py-2 text-left text-xs font-semibold text-black dark:text-white">№</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-black dark:text-white">Показатель</th>
                      <th className="w-40 px-3 py-2 text-left text-xs font-semibold text-black dark:text-white">Факт. значение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPRAVKA_ROW_LABELS.map((label, idx) => (
                      <tr key={idx} className="border-t border-stroke dark:border-strokedark">
                        <td className="px-3 py-1.5 text-xs text-bodydark2">{idx + 1}</td>
                        <td className="px-3 py-1.5 text-xs text-black dark:text-white">{label}</td>
                        <td className="px-3 py-1.5">
                          <input
                            className="w-full rounded border border-stroke bg-white px-2 py-1 text-xs outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
                            value={form.actual_values[String(idx)] || ''}
                            onChange={(e) => setActualValue(idx, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded border border-stroke px-5 py-2 text-sm hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SpravkaViewDrawer
        spravkaId={viewDrawerId}
        onClose={() => setViewDrawerId(null)}
        onActionSuccess={fetchList}
      />
    </>
  );
}
