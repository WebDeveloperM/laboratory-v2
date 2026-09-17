import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { resolveEmployeeImageUrl } from '../../utils/urls';
import { normalizeRole, isManagerTierRole } from '../../utils/pageAccess';

type BaseImageChangeLogEntry = {
  id: number;
  employee_slug?: string;
  employee_full_name?: string;
  employee_tabel_number?: string;
  changed_by_full_name?: string;
  changed_by_username?: string;
  changed_by_user_id?: string;
  changed_by_role?: string;
  old_image?: string;
  old_image_url?: string;
  new_image?: string;
  new_image_url?: string;
  created_at?: string;
};

type BaseImageChangeLogResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: BaseImageChangeLogEntry[];
};

const PAGE_SIZE = 20;

const getBackendError = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  const firstField = Object.values(data)[0];
  if (Array.isArray(firstField) && firstField.length > 0) {
    return String(firstField[0]);
  }
  return fallback;
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const formatRoleLabel = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'admin') return 'Админ';
  if (normalized === 'shift_head') return 'Начальник смены';
  if (normalized === 'sttl_head') return 'Начальник СТТЛ';
  if (normalized === 'czl_head') return 'Начальник ЦЗЛ';
  if (normalized === 'dispatcher') return 'Диспетчер';
  if (normalized === 'it_center') return 'IT Center';
  if (normalized === 'user') return 'Пользователь';
  return value || '—';
};

const formatChangedByLabel = (row: BaseImageChangeLogEntry) => {
  const fullName = String(row.changed_by_full_name || '').trim();
  const username = String(row.changed_by_username || '').trim();

  if (fullName) return fullName;
  if (username) return username;
  return '—';
};

const extractFileName = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  const withoutQuery = raw.split('?')[0];
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts[parts.length - 1] || raw;
};

const BaseImageChangeLogPage = () => {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const isAdmin = role === 'admin';
  const canViewPage = role === 'admin' || isManagerTierRole(role);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BaseImageChangeLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!canViewPage) return;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axioss.get<BaseImageChangeLogResponse>('/employee-service/base-image-change-logs/', {
          params: {
            page: currentPage,
            page_size: PAGE_SIZE,
            search: search.trim() || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
        });

        const payload = response.data || {};
        setRows(Array.isArray(payload.results) ? payload.results : []);
        setTotalCount(Number(payload.count || 0));
      } catch (error) {
        toast.error(getBackendError(error, 'Не удалось загрузить историю замены базовых фото'));
        setRows([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [canViewPage, currentPage, search, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFrom, dateTo]);

  const handleDelete = async (row: BaseImageChangeLogEntry) => {
    if (!isAdmin || deletingId !== null) return;
    const employeeLabel = row.employee_full_name || row.employee_tabel_number || `#${row.id}`;
    const confirmed = window.confirm(`Удалить запись истории для "${employeeLabel}"?`);
    if (!confirmed) return;

    setDeletingId(row.id);
    try {
      await axioss.delete(`/employee-service/base-image-change-logs/${row.id}/`);
      toast.success('Запись истории удалена');
      setRows((prev) => prev.filter((entry) => entry.id !== row.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось удалить запись истории'));
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (!canViewPage) {
    return (
      <>
        <Breadcrumb pageName="История смены базового фото" />
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="text-base text-red-600">Нет доступа к странице</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Только администратор, складской менеджер и складской рабочий могут просматривать этот отчет.
          </div>
          <button
            onClick={() => navigate('/nastroyka')}
            className="mt-4 rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
          >
            ← Назад
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="История смены базового фото" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">Отчет по изменениям базовых фото сотрудников</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Кто и когда обновлял фотографии в employee_service. Всего записей: {totalCount}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 font-medium">Поиск</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Сотрудник, табельный, пользователь"
                className="rounded border border-stroke px-3 py-2 outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 font-medium">Дата с</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded border border-stroke px-3 py-2 outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 font-medium">Дата по</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded border border-stroke px-3 py-2 outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => navigate('/nastroyka')}
                className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
              >
                ← Назад
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          {loading ? (
            <div className="p-5 text-sm">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="p-5 text-sm text-slate-500 dark:text-slate-300">
              История изменений не найдена.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">№</th>
                    <th className="px-4 py-3 text-left font-semibold">Когда</th>
                    <th className="px-4 py-3 text-left font-semibold">Кто изменил</th>
                    <th className="px-4 py-3 text-left font-semibold">Сотрудник</th>
                    <th className="px-4 py-3 text-left font-semibold">Старое фото</th>
                    <th className="px-4 py-3 text-left font-semibold">Новое фото</th>
                    {isAdmin && <th className="px-4 py-3 text-left font-semibold">Удалить</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const oldImageUrl = resolveEmployeeImageUrl(row.old_image_url || row.old_image);
                    const newImageUrl = resolveEmployeeImageUrl(row.new_image_url || row.new_image);
                    return (
                      <tr key={row.id} className="border-t border-stroke align-top dark:border-strokedark">
                        <td className="px-4 py-4 font-medium text-black dark:text-white">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-slate-700 dark:text-slate-200">{formatDateTime(row.created_at)}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                          <div className="font-medium text-black dark:text-white">{formatRoleLabel(row.changed_by_role)}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatChangedByLabel(row)}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                          {row.employee_slug ? (
                            <Link
                              to={`/item-view/${row.employee_slug}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {row.employee_full_name || '—'}
                            </Link>
                          ) : (
                            <div className="font-medium text-black dark:text-white">{row.employee_full_name || '—'}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Табельный: {row.employee_tabel_number || '—'}</div>
                        
                        </td>
                        <td className="px-4 py-4">
                          {oldImageUrl ? (
                            <a href={oldImageUrl} target="_blank" rel="noreferrer" className="block w-fit">
                              <img
                                src={oldImageUrl}
                                alt={extractFileName(row.old_image)}
                                className="h-24 w-24 rounded border border-stroke object-cover dark:border-strokedark"
                              />
                              <div className="mt-2 max-w-[120px] break-all text-xs text-slate-500">{extractFileName(row.old_image)}</div>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {newImageUrl ? (
                            <a href={newImageUrl} target="_blank" rel="noreferrer" className="block w-fit">
                              <img
                                src={newImageUrl}
                                alt={extractFileName(row.new_image)}
                                className="h-24 w-24 rounded border border-stroke object-cover dark:border-strokedark"
                              />
                              <div className="mt-2 max-w-[120px] break-all text-xs text-slate-500">{extractFileName(row.new_image)}</div>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              disabled={deletingId === row.id || deletingId !== null}
                              className="rounded bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === row.id ? 'Удаление...' : 'Удалить'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Показано {(totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1)}-
            {Math.min(currentPage * PAGE_SIZE, totalCount)} из {totalCount}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="rounded border border-stroke px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
            >
              ← Назад
            </button>
            <div className="text-sm text-slate-700 dark:text-slate-200">
              Страница {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded border border-stroke px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
            >
              Вперед →
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BaseImageChangeLogPage;