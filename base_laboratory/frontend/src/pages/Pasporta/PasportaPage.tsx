import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaEye, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';
import { Button, Modal } from 'flowbite-react';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import PassportViewDrawer from '../../components/Passport/PassportViewDrawer';
import { normalizeRole } from '../../utils/pageAccess';

// ─── Types ────────────────────────────────────────────────────────────────────

type PassportItem = {
  id: number;
  template: number | null;
  template_name: string;
  template_category: string;
  passport_number: string;
  field_values: Record<string, string>;
  approval_status: string;
  approval_status_display: string;
  current_step: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const thCls = 'px-4 py-3 text-left text-sm font-semibold text-black dark:text-white bg-gray-2 dark:bg-meta-4';
const tdCls = 'px-4 py-3 text-sm text-black dark:text-white border-b border-stroke dark:border-strokedark';

const STEP_FIELD_KEY: Record<string, string> = {
  sttl: 'sttl_head',
  czl: 'czl_head',
  dispatcher: 'dispatcher_head',
};

const getNextApprover = (item: PassportItem) => {
  if (!item.current_step) return '—';
  const key = STEP_FIELD_KEY[item.current_step];
  return (key && item.field_values?.[key]) || '—';
};

const getReservoirTypeLabel = (item: PassportItem) => {
  const fv = item.field_values || {};
  const isWagon = ['wagon_count', 'wagon_numbers', 'reservoir_no'].some((k) => k in fv);
  return isWagon ? 'Вогон' : 'Резервуар';
};

const formatCategory = (item: PassportItem) =>
  item.template_category ? `${item.template_category} / ${getReservoirTypeLabel(item)}` : '—';

const STATUS_BADGE_CLS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  pending_sttl: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pending_czl: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pending_dispatcher: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PasportaPage() {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const canCreatePassport = role === 'admin' || role === 'shift_head';
  const canDeletePassport = role === 'admin';
  const canEditPassport = role !== 'user';

  const [list, setList] = useState<PassportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewDrawerPassportId, setViewDrawerPassportId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PassportItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Column filters ──────────────────────────────────────────────────────────
  const [numberFilter, setNumberFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchList = () => {
    setLoading(true);
    axioss.get('/passports/')
      .then(r => setList(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => toast.error('Список не удалось загрузить'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, []);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axioss.delete(`/passports/${deleteTarget.id}/`);
      toast.success('Удалено');
      setDeleteTarget(null);
      fetchList();
    } catch {
      toast.error('Ошибка удаления');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const categories = Array.from(new Set(list.map(p => formatCategory(p)).filter(Boolean))).sort();
  const templates = Array.from(new Set(list.map(p => p.template_name).filter(Boolean))).sort();
  const statuses = Array.from(
    new Map(list.map(p => [p.approval_status, p.approval_status_display || p.approval_status])).entries()
  );

  const numberQ = numberFilter.toLowerCase().trim();

  const filtered = list.filter(p => {
    if (q) {
      const matchesGlobal =
        (p.passport_number || '').toLowerCase().includes(q) ||
        (p.template_name || '').toLowerCase().includes(q) ||
        (p.template_category || '').toLowerCase().includes(q);
      if (!matchesGlobal) return false;
    }
    if (numberQ && !(p.passport_number || '').toLowerCase().includes(numberQ)) return false;
    if (templateFilter && p.template_name !== templateFilter) return false;
    if (categoryFilter && formatCategory(p) !== categoryFilter) return false;
    if (statusFilter && p.approval_status !== statusFilter) return false;
    if (dateFilter) {
      const created = p.created_at ? new Date(p.created_at) : null;
      if (!created || isNaN(created.getTime())) return false;
      const createdLocalDate = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
      if (createdLocalDate !== dateFilter) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setCurrentPage(1); }, [q, numberFilter, templateFilter, categoryFilter, statusFilter, dateFilter, pageSize]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb pageName="Паспорта" />

      {/* ── Table card ─────────────────────────────────────────────────────── */}
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
          {canCreatePassport && (
            <button
              onClick={() => navigate('/pasporta/select')}
              className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              <FaPlus size={12} /> Добавить паспорт
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th className={thCls} style={{ width: 48 }}>№</th>
                <th className={thCls}>Паспорт №</th>
                <th className={thCls}>Шаблон</th>
                <th className={thCls}>Категория</th>
                <th className={thCls}>Создан</th>
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
                  <select
                    value={templateFilter}
                    onChange={e => setTemplateFilter(e.target.value)}
                    className="w-full rounded border border-stroke bg-white px-2 py-1 text-xs font-normal outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="">Все</option>
                    {templates.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </th>
                <th className={thCls}>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full rounded border border-stroke bg-white px-2 py-1 text-xs font-normal outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="">Все</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </th>
                <th className={thCls}>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="date-input-icon w-full min-w-[130px] rounded border border-stroke bg-white px-2 py-1 text-xs font-normal outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </th>
                <th className={thCls}>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full rounded border border-stroke bg-white px-2 py-1 text-xs font-normal outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="">Все</option>
                    {statuses.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </th>
                <th className={thCls} />
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-bodydark2">
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-bodydark2">
                    {search || numberFilter || templateFilter || categoryFilter || dateFilter
                      ? 'Паспортов не найдено'
                      : 'Паспортов нет'}
                  </td>
                </tr>
              ) : paginated.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-meta-4">
                  <td className={tdCls}>{(page - 1) * pageSize + i + 1}</td>
                  <td className={tdCls + ' font-semibold'}>
                    {p.passport_number || <span className="text-bodydark2">—</span>}
                  </td>
                  <td className={tdCls}>{p.template_name || '—'}</td>
                  <td className={tdCls}>{formatCategory(p)}</td>
                  <td className={tdCls + ' whitespace-nowrap text-xs text-bodydark2'}>
                    {fmtDate(p.created_at)}
                  </td>
                  <td className={tdCls}>
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE_CLS[p.approval_status] || STATUS_BADGE_CLS.draft}`}>
                      {p.approval_status_display || 'Черновик'}
                    </span>
                  </td>
                  <td className={tdCls}>{getNextApprover(p)}</td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewDrawerPassportId(p.id)}
                        title="Ko'rish"
                        className="rounded bg-primary px-2.5 py-1.5 text-xs text-white hover:bg-opacity-80"
                      >
                        <FaEye size={12} />
                      </button>
                      {canEditPassport && (
                        <button
                          onClick={() => {
                            const wagonKeys = ['wagon_count', 'wagon_numbers', 'reservoir_no'];
                            const isWagon = wagonKeys.some(k => k in (p.field_values || {}));
                            const type = isWagon ? 'wagon' : 'reservoir';
                            navigate(
                              `/pasporta/template/${p.template}?from=benzin&editPassportId=${p.id}&type=${type}`
                            );
                          }}
                          disabled={!p.template}
                          title="Tahrirlash"
                          className="rounded bg-yellow-500 px-2.5 py-1.5 text-xs text-white hover:bg-yellow-600 disabled:opacity-50"
                        >
                          <FaEdit size={12} />
                        </button>
                      )}
                      {canDeletePassport && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="O'chirish"
                          className="rounded bg-red-500 px-2.5 py-1.5 text-xs text-white hover:bg-red-600"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
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

      <Modal show={Boolean(deleteTarget)} onClose={() => !deleteLoading && setDeleteTarget(null)}>
        <Modal.Header>Подтвердите удаление</Modal.Header>
        <Modal.Body>
          <div className="space-y-3">
            <div className="flex justify-center text-red-500">
              <FiAlertTriangle className="h-16 w-16" />
            </div>
            <p className="text-center text-base text-slate-600 dark:text-slate-300">
              {deleteTarget ? `Удалить паспорт № ${deleteTarget.passport_number || deleteTarget.id}?` : 'Удалить паспорт?'}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            Отмена
          </Button>
          <Button color="failure" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Удаление...' : 'Удалить'}
          </Button>
        </Modal.Footer>
      </Modal>

      <PassportViewDrawer
        passportId={viewDrawerPassportId}
        onClose={() => setViewDrawerPassportId(null)}
        onActionSuccess={fetchList}
      />
    </>
  );
}
