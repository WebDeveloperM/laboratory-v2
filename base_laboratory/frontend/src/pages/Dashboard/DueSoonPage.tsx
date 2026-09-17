import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { toast } from 'react-toastify';
import { FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx-js-style';
import { getStoredFeatureAccess, normalizeRole } from '../../utils/pageAccess';

type DueSoonProduct = {
  id: number;
  name: string;
  due_count: number;
};

type DueSoonRow = {
  item_id: number;
  item_slug: string | null;
  employee_id: number;
  employee_slug: string | null;
  employee_name: string;
  tabel_number: string;
  department_name: string;
  section_name: string;
  position: string;
  product_id: number;
  product_name: string;
  size: string;
  issued_at: string | null;
  due_date: string | null;
  days_remaining: number;
  remaining_text: string;
};

type DueSoonResponse = {
  due_days: number;
  selected_product_id: number | null;
  search: string;
  total_count: number;
  products: DueSoonProduct[];
  results: DueSoonRow[];
};

type DueSoonTab = 'employees' | 'summary';

type DueSoonSummaryRow = {
  product_id: number;
  product_name: string;
  size: string;
  count: number;
  label: string;
  quantity_text: string;
  requirement_text: string;
};

const MONTH_OPTIONS = [1, 2, 3, 6, 12];

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parseMonthParam = (raw: string | null) => {
  const parsed = Number(raw);
  return MONTH_OPTIONS.includes(parsed) ? parsed : 1;
};

const DueSoonPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = normalizeRole(localStorage.getItem('role'));
  const canExportExcel = getStoredFeatureAccess(role).dashboard_export_excel;
  const [activeTab, setActiveTab] = useState<DueSoonTab>('employees');
  const [dueMonths, setDueMonths] = useState<number>(() => parseMonthParam(searchParams.get('dueMonths')));
  const [selectedProductId, setSelectedProductId] = useState<string>(() => searchParams.get('productId') || '');
  const [search, setSearch] = useState<string>(() => searchParams.get('search') || '');
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const [loading, setLoading] = useState<boolean>(true);
  const [payload, setPayload] = useState<DueSoonResponse | null>(null);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set('dueMonths', String(dueMonths));
    if (selectedProductId) {
      nextParams.set('productId', selectedProductId);
    }
    if (debouncedSearch) {
      nextParams.set('search', debouncedSearch);
    }
    setSearchParams(nextParams, { replace: true });
  }, [debouncedSearch, dueMonths, selectedProductId, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRows = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set('due_days', String(dueMonths * 30));
        if (selectedProductId) {
          params.set('product_id', selectedProductId);
        }
        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        const response = await axioss.get(`${BASE_URL}/due-soon-employees/?${params.toString()}`, {
          signal: controller.signal,
        });
        setPayload(response.data as DueSoonResponse);
      } catch (error: any) {
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
          return;
        }
        const backendError = error?.response?.data?.error;
        toast.error(backendError || 'Не удалось загрузить список по срокам СИЗ');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRows();

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, dueMonths, selectedProductId]);

  const subtitle = useMemo(() => {
    const count = payload?.total_count ?? 0;
    return `Найдено ${count} записей по сотрудникам, которым скоро потребуется выдача СИЗ.`;
  }, [payload?.total_count]);

  const summaryRows = useMemo<DueSoonSummaryRow[]>(() => {
    const grouped = new Map<string, DueSoonSummaryRow>();

    (payload?.results || []).forEach((row) => {
      const normalizedSize = String(row.size || '').trim() || '-';
      const key = `${row.product_id}::${normalizedSize}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          product_id: row.product_id,
          product_name: row.product_name,
          size: normalizedSize,
          count: 1,
          label: `${row.product_name} (Размер ${normalizedSize})`,
          quantity_text: '1',
          requirement_text: `${row.product_name} (Размер ${normalizedSize}) 1`,
        });
        return;
      }

      const existing = grouped.get(key)!;
      existing.count += 1;
      existing.quantity_text = `${existing.count}`;
      existing.requirement_text = `${existing.product_name} (Размер ${existing.size}) ${existing.count}`;
    });

    return Array.from(grouped.values()).sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, 'ru');
    });
  }, [payload?.results]);

  const exportDueSoonToExcel = () => {
    const detailRows = payload?.results || [];
    const hasData = activeTab === 'employees' ? detailRows.length > 0 : summaryRows.length > 0;

    if (!hasData) {
      toast.info('Экспортировать нечего');
      return;
    }

    try {
      const headers = activeTab === 'employees'
        ? [
            '№',
            'Табельный номер',
            'Сотрудник',
            'Нужный СИЗ',
            'Размер',
            'Цех',
            'Отдел',
            'Должность',
            'Дата выдачи',
            'Следующая выдача',
            'Осталось',
          ]
        : [
            '№',
            'Средство защиты',
            'Количество',
          ];

      const body = activeTab === 'employees'
        ? detailRows.map((row, index) => ([
            index + 1,
            row.tabel_number || '-',
            row.employee_name || '-',
            row.product_name || '-',
            row.size || '-',
            row.department_name || '-',
            row.section_name || '-',
            row.position || '-',
            formatDateTime(row.issued_at),
            formatDateTime(row.due_date),
            row.remaining_text || '-',
          ]))
        : summaryRows.map((row, index) => ([
            index + 1,
            row.label,
            row.quantity_text,
          ]));

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      worksheet['!cols'] = activeTab === 'employees'
        ? [
            { wch: 6 },
            { wch: 18 },
            { wch: 30 },
            { wch: 24 },
            { wch: 12 },
            { wch: 20 },
            { wch: 20 },
            { wch: 24 },
            { wch: 20 },
            { wch: 20 },
            { wch: 16 },
          ]
        : [
            { wch: 6 },
            { wch: 36 },
            { wch: 20 },
          ];

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let row = range.s.r; row <= range.e.r; row += 1) {
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const existingCell = worksheet[cellAddress];
          if (!existingCell) continue;

          const isHeader = row === 0;
          existingCell.s = {
            font: {
              bold: isHeader,
              color: { rgb: isHeader ? 'FFFFFF' : '1E293B' },
            },
            fill: {
              fgColor: { rgb: isHeader ? '2563EB' : row % 2 === 0 ? 'FFFFFF' : 'EFF6FF' },
            },
            alignment: {
              vertical: 'center',
              horizontal: col === 0 ? 'center' : 'left',
              wrapText: true,
            },
            border: {
              top: { style: 'thin', color: { rgb: 'CBD5E1' } },
              bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
              left: { style: 'thin', color: { rgb: 'CBD5E1' } },
              right: { style: 'thin', color: { rgb: 'CBD5E1' } },
            },
          };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'employees' ? 'Due Soon PPE' : 'Due Soon Summary');

      const today = new Date().toISOString().slice(0, 10);
      const productPart = selectedProductId ? `product_${selectedProductId}` : 'all';
      const tabPart = activeTab === 'employees' ? 'details' : 'summary';
      const exportedCount = activeTab === 'employees' ? detailRows.length : summaryRows.length;
      XLSX.writeFile(workbook, `due_soon_ppe_${tabPart}_${dueMonths}m_${productPart}_${today}.xlsx`);
      toast.success(`Экспортировано ${exportedCount} записей`);
    } catch (error) {
      console.error('Ошибка экспорта due-soon Excel:', error);
      toast.error('Не удалось скачать Excel');
    }
  };

  return (
    <>
      <Breadcrumb pageName="Скоро требуется СИЗ" />

      <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-5 flex flex-col gap-3 border-b border-stroke pb-4 md:flex-row md:items-start md:justify-between dark:border-strokedark">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Сотрудники, которым скоро нужно выдать СИЗ
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canExportExcel ? (
              <button
                type="button"
                onClick={exportDueSoonToExcel}
                className="inline-flex items-center gap-2 rounded border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                <FaFileExcel />
                Скачать Excel
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Назад на главную
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            Период
            <select
              value={dueMonths}
              onChange={(event) => setDueMonths(Number(event.target.value))}
              className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month} value={month}>
                  {month} мес.
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 lg:col-span-2">
            Средство защиты
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
            >
              <option value="">Все СИЗ</option>
              {(payload?.products || []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.due_count})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            Поиск
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ФИО, табель, СИЗ, размер"
              className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
            />
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 border-b border-stroke pb-3 dark:border-strokedark">
          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              activeTab === 'employees'
                ? 'bg-primary text-white'
                : 'border border-stroke bg-white text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:bg-boxdark dark:text-slate-200'
            }`}
          >
            По сотрудникам
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              activeTab === 'summary'
                ? 'bg-primary text-white'
                : 'border border-stroke bg-white text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:bg-boxdark dark:text-slate-200'
            }`}
          >
            Сводка по СИЗ
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Загрузка...</div>
        ) : activeTab === 'employees' && payload?.results?.length ? (
          <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke bg-slate-50 text-left dark:border-strokedark dark:bg-slate-800">
                  <th className="px-3 py-2">№</th>
                  <th className="px-3 py-2">Таб номер</th>
                  <th className="px-3 py-2">Сотрудник</th>
                  <th className="px-3 py-2">Нужный СИЗ</th>
                  <th className="px-3 py-2">Размер</th>
                  <th className="px-3 py-2">Цех</th>
                  <th className="px-3 py-2">Отдел</th>
                  <th className="px-3 py-2">Должность</th>
                  <th className="px-3 py-2">Дата выдачи</th>
                  <th className="px-3 py-2">Следующая выдача</th>
                  <th className="px-3 py-2">Осталось</th>
                  <th className="px-3 py-2">Открыть</th>
                </tr>
              </thead>
              <tbody>
                {payload.results.map((row, index) => (
                  <tr key={`${row.item_id}-${row.product_id}`} className="border-b border-stroke dark:border-strokedark">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{row.tabel_number || '-'}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{row.employee_name || '-'}</td>
                    <td className="px-3 py-2">{row.product_name || '-'}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                        {row.size || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.department_name || '-'}</td>
                    <td className="px-3 py-2">{row.section_name || '-'}</td>
                    <td className="px-3 py-2">{row.position || '-'}</td>
                    <td className="px-3 py-2">{formatDateTime(row.issued_at)}</td>
                    <td className="px-3 py-2 text-amber-700">{formatDateTime(row.due_date)}</td>
                    <td className="px-3 py-2 font-medium text-amber-700">{row.remaining_text || '-'}</td>
                    <td className="px-3 py-2">
                      {row.item_slug ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/item-view/${row.item_slug}`)}
                          className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary hover:text-white"
                        >
                          Открыть
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'summary' && summaryRows.length ? (
          <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke bg-slate-50 text-left dark:border-strokedark dark:bg-slate-800">
                  <th className="px-3 py-2">№</th>
                  <th className="px-3 py-2">Средство защиты</th>
                  <th className="px-3 py-2">Количество</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, index) => (
                  <tr key={`${row.product_id}-${row.size}`} className="border-b border-stroke dark:border-strokedark">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{row.label}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {row.quantity_text}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
            {activeTab === 'employees'
              ? 'В выбранном периоде нет сотрудников с приближающимся сроком выдачи СИЗ.'
              : 'В выбранном периоде нет сводных данных по требуемым СИЗ.'}
          </div>
        )}
      </div>
    </>
  );
};

export default DueSoonPage;