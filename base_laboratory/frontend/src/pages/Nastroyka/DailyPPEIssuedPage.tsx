import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import * as XLSX from 'xlsx-js-style';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { resolveEmployeeImageUrl } from '../../utils/urls';
import { getStoredFeatureAccess, normalizeRole, isManagerTierRole } from '../../utils/pageAccess';

type EmployeeInfo = {
  id?: number | string;
  slug?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  surname?: string;
  tabel_number?: string;
  position?: string;
  department?: { name?: string };
  section?: { name?: string };
};

type IssueProduct = {
  id: number;
  name: string;
  size?: string;
  type_product_display?: string | null;
};

type DailyIssuedApiRow = {
  id: number;
  issued_at?: string | null;
  signature_image?: string | null;
  qr_code_image?: string | null;
  qr_scan_url?: string | null;
  employee?: EmployeeInfo;
  ppeproduct_info?: IssueProduct[];
};

type DailyIssueRow = {
  key: string;
  employeeSlug: string;
  tabelNumber: string;
  fullName: string;
  issuedAtRaw: string;
  issuedAt: string;
  productsLabel: string;
  productNames: string[];
  signatureImage: string;
  qrCodeImage: string;
  qrScanUrl: string;
};

const getBackendError = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  const firstField = Object.values(data)[0];
  if (Array.isArray(firstField) && firstField.length > 0) return String(firstField[0]);
  return fallback;
};

const formatDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatIssuedAt = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
};

const formatReportDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
};

const buildFullName = (employee?: EmployeeInfo) => {
  const fullName = String(employee?.full_name || '').trim();
  if (fullName) return fullName;
  return [employee?.last_name, employee?.first_name, employee?.surname]
    .map((part) => String(part || '').trim()).filter(Boolean).join(' ') || '—';
};

const buildProductsLabel = (products?: IssueProduct[]) => {
  if (!Array.isArray(products) || products.length === 0) return '—';
  return products.map((product) => {
    const base = String(product?.name || '').trim();
    const details = [product?.type_product_display, product?.size ? `размер ${product.size}` : '']
      .map((part) => String(part || '').trim()).filter(Boolean).join(', ');
    if (!base) return details || '—';
    return details ? `${base} (${details})` : base;
  }).join('; ');
};

const getProductNames = (products?: IssueProduct[]) =>
  Array.isArray(products) ? products.map((p) => String(p?.name || '').trim()).filter(Boolean) : [];

const mapApiRow = (item: DailyIssuedApiRow): DailyIssueRow => {
  const employee = item?.employee;
  return {
    key: `${employee?.id || item.id}-${item.id}`,
    employeeSlug: String(employee?.slug || '').trim(),
    tabelNumber: String(employee?.tabel_number || '').trim() || '—',
    fullName: buildFullName(employee),
    issuedAtRaw: String(item?.issued_at || ''),
    issuedAt: formatIssuedAt(item?.issued_at),
    productsLabel: buildProductsLabel(item?.ppeproduct_info),
    productNames: getProductNames(item?.ppeproduct_info),
    signatureImage: resolveEmployeeImageUrl(item?.signature_image),
    qrCodeImage: resolveEmployeeImageUrl(item?.qr_code_image),
    qrScanUrl: String(item?.qr_scan_url || '').trim(),
  };
};

const DateInput = forwardRef<HTMLInputElement, { value?: string; onClick?: () => void; placeholder?: string }>(
  ({ value, onClick, placeholder }, ref) => (
    <div className="relative">
      <input
        ref={ref} type="text" value={value ?? ''} onClick={onClick} readOnly placeholder={placeholder}
        className="h-[42px] w-full rounded border border-stroke bg-white px-3 pr-10 text-base text-slate-700 outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:text-slate-200"
      />
      <button type="button" onClick={onClick} className="absolute inset-y-0 right-3 flex items-center text-slate-500" aria-label="Открыть календарь">
        <FaRegCalendarAlt />
      </button>
    </div>
  ),
);
DateInput.displayName = 'DateInput';

const DailyPPEIssuedPage = () => {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const canSeeDailyPpeIssued = role === 'admin' || isManagerTierRole(role);
  const canExportExcel = getStoredFeatureAccess(role).dashboard_export_excel;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DailyIssueRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [productFilter, setProductFilter] = useState('');
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [tabelSearch, setTabelSearch] = useState('');
  const [debouncedTabel, setDebouncedTabel] = useState('');
  const tabelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Debounce tabel search
  useEffect(() => {
    if (tabelDebounceRef.current) clearTimeout(tabelDebounceRef.current);
    tabelDebounceRef.current = setTimeout(() => setDebouncedTabel(tabelSearch), 400);
    return () => { if (tabelDebounceRef.current) clearTimeout(tabelDebounceRef.current); };
  }, [tabelSearch]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [fromDate, toDate, debouncedTabel, productFilter, rowsPerPage]);

  // Fetch PPE product options once
  useEffect(() => {
    axioss.get('/filter-data/')
      .then((res) => {
        const products: { id: number; name: string }[] = Array.isArray(res.data?.ppeproducts) ? res.data.ppeproducts : [];
        setProductOptions(products.map((p) => String(p.name).trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru')));
      })
      .catch(() => {});
  }, []);

  const buildParams = useCallback((overrides: Record<string, string | number> = {}) => {
    const params: Record<string, string | number> = {};
    if (fromDate) params.from_date = formatDateInput(fromDate);
    if (toDate) params.to_date = formatDateInput(toDate);
    if (debouncedTabel.trim()) params.tabel_number = debouncedTabel.trim();
    if (productFilter) params.product_name = productFilter;
    return { ...params, ...overrides };
  }, [fromDate, toDate, debouncedTabel, productFilter]);

  // Main data fetch
  useEffect(() => {
    if (!canSeeDailyPpeIssued) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const params = buildParams({ page: currentPage, page_size: rowsPerPage });
        const res = await axioss.get('/daily-issued-items/', { params });
        if (cancelled) return;
        const count = Number(res.data?.count ?? 0);
        const payload: DailyIssuedApiRow[] = Array.isArray(res.data?.results) ? res.data.results : [];
        setTotalCount(count);
        setRows(payload.map(mapApiRow));
      } catch (error) {
        if (!cancelled) {
          toast.error(getBackendError(error, 'Не удалось загрузить ежедневную выдачу СИЗ'));
          setRows([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [canSeeDailyPpeIssued, currentPage, rowsPerPage, buildParams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  const reportSummary = useMemo(() => {
    const dateBits: string[] = [];
    if (fromDate) dateBits.push(`с ${formatReportDate(formatDateInput(fromDate))}`);
    if (toDate) dateBits.push(`по ${formatReportDate(formatDateInput(toDate))}`);
    const prefix = dateBits.length > 0 ? `Отчет ${dateBits.join(' ')}` : 'Все записи';
    return `${prefix}. Всего получателей: ${totalCount}`;
  }, [totalCount, fromDate, toDate]);

  const exportToExcel = async () => {
    if (totalCount === 0) { toast.info('Экспортировать нечего'); return; }
    setIsExporting(true);
    try {
      const params = buildParams({ no_pagination: 'true' });
      const res = await axioss.get('/daily-issued-items/', { params });
      const payload: DailyIssuedApiRow[] = Array.isArray(res.data?.results) ? res.data.results : [];
      const allRows = payload.map(mapApiRow);

      if (allRows.length === 0) { toast.info('Экспортировать нечего'); return; }

      const headers = ['№', 'Табельный номер', 'Сотрудник', 'Продукт СИЗ', 'Дата выдачи'];
      const body = allRows.map((row, i) => [i + 1, row.tabelNumber || '-', row.fullName || '-', row.productsLabel || '-', row.issuedAt || '-']);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      worksheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 30 }, { wch: 48 }, { wch: 20 }];

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let r = range.s.r; r <= range.e.r; r += 1) {
        for (let c = range.s.c; c <= range.e.c; c += 1) {
          const cell = worksheet[XLSX.utils.encode_cell({ r, c })] as any;
          if (!cell) continue;
          const isHeader = r === 0;
          cell.s = {
            font: { bold: isHeader, color: { rgb: isHeader ? 'FFFFFF' : '1E293B' } },
            fill: { fgColor: { rgb: isHeader ? '217346' : r % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } },
            alignment: { vertical: 'center', horizontal: c === 0 ? 'center' : 'left', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
              left: { style: 'thin', color: { rgb: 'CBD5E1' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } },
            },
          };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily PPE Issued');
      const today = formatDateInput(new Date());
      const fromPart = fromDate ? formatDateInput(fromDate) : 'all';
      const toPart = toDate ? formatDateInput(toDate) : 'all';
      const productPart = productFilter ? productFilter.replace(/[^a-zA-Z0-9а-яА-Я-_]+/g, '_').slice(0, 40) : 'all';
      XLSX.writeFile(workbook, `daily_ppe_issued_${productPart}_${fromPart}_${toPart}_${today}.xlsx`);
      toast.success(`Экспортировано ${allRows.length} записей`);
    } catch (error) {
      toast.error('Не удалось скачать Excel');
    } finally {
      setIsExporting(false);
    }
  };

  if (!canSeeDailyPpeIssued) {
    return (
      <>
        <Breadcrumb pageName="Ежедневная выдача СИЗ" />
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="text-base text-red-600">Нет доступа к странице</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Только администратор, кладовщик и складской рабочий могут просматривать ежедневный отчет по выдаче СИЗ.
          </div>
          <button onClick={() => navigate('/nastroyka')} className="mt-4 rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700">
            ← Назад
          </button>
        </div>
      </>
    );
  }

  const hasActiveFilters = !!(tabelSearch || productFilter || fromDate || toDate);

  return (
    <>
      <Breadcrumb pageName="Ежедневная выдача СИЗ" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">Общий ежедневный журнал выдачи</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{reportSummary}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canExportExcel && (
              <button
                type="button" onClick={exportToExcel} disabled={totalCount === 0 || isExporting}
                title="Скачать Excel" aria-label="Скачать Excel"
                className={`flex h-10 w-12 items-center justify-center rounded-md transition-colors duration-200 ${isExporting ? 'cursor-not-allowed bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="4" fill="#217346" />
                  <path d="M9 6.5C8.44772 6.5 8 6.94772 8 7.5V16.5C8 17.0523 8.44772 17.5 9 17.5H15C15.5523 17.5 16 17.0523 16 16.5V10L12.5 6.5H9Z" fill="white" />
                  <path d="M12.5 6.5L16 10H13.25C12.6977 10 12.25 9.55228 12.25 9V6.5H12.5Z" fill="#e6f2e8" />
                  <path d="M10.4 14.2L11.6 13L10.4 11.8C10.1828 11.5828 10.1828 11.2314 10.4 11.0142C10.6172 10.797 10.9686 10.797 11.1858 11.0142L12.4 12.2284L13.6142 11.0142C13.8314 10.797 14.1828 10.797 14.4 11.0142C14.6172 11.2314 14.6172 11.5828 14.4 11.8L13.2 13L14.4 14.2C14.6172 14.4172 14.6172 14.7686 14.4 14.9858C14.1828 15.203 13.8314 15.203 13.6142 14.9858L12.4 13.7716L11.1858 14.9858C10.9686 15.203 10.6172 15.203 10.4 14.9858C10.1828 14.7686 10.1828 14.4172 10.4 14.2Z" fill="#217346" />
                </svg>
              </button>
            )}
            <button
              type="button" onClick={() => setShowFilters((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded border border-stroke px-4 py-2 text-sm font-medium transition-colors ${showFilters ? 'bg-primary text-white hover:bg-primary/90' : 'bg-white text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:bg-boxdark dark:text-slate-300'}`}
            >
              <FiFilter size={16} />
              Фильтр
            </button>
            <button onClick={() => navigate('/nastroyka')} className="rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700">
              ← Назад
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="flex flex-col gap-3 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="md:w-64">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Средство защиты</label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700 outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:text-slate-200"
                >
                  <option value="">Все средства защиты</option>
                  {productOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="md:w-64">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Табельный номер</label>
                <input
                  type="text" value={tabelSearch}
                  onChange={(e) => setTabelSearch(e.target.value)}
                  placeholder="Введите табельный номер"
                  className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700 outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:text-slate-200"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="md:w-48">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">С даты</label>
                <DatePicker selected={fromDate} onChange={setFromDate} dateFormat="dd.MM.yyyy" placeholderText="dd.mm.yyyy" customInput={<DateInput placeholder="dd.mm.yyyy" />} isClearable wrapperClassName="statistics-date-filter" />
              </div>
              <div className="md:w-48">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">По дату</label>
                <DatePicker selected={toDate} onChange={setToDate} dateFormat="dd.MM.yyyy" placeholderText="dd.mm.yyyy" customInput={<DateInput placeholder="dd.mm.yyyy" />} isClearable wrapperClassName="statistics-date-filter" />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { setTabelSearch(''); setProductFilter(''); setFromDate(null); setToDate(null); }}
                  className="h-[42px] rounded border border-stroke bg-white px-6 text-base text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:bg-boxdark dark:text-slate-300"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          {loading ? (
            <div className="p-5 text-sm text-slate-500">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="p-5 text-sm text-slate-500 dark:text-slate-300">
              {hasActiveFilters ? 'По выбранным фильтрам подтвержденных выдач не найдено.' : 'Подтвержденных выдач не найдено.'}
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">№</th>
                      <th className="px-4 py-3 text-left font-semibold">Табельный номер</th>
                      <th className="px-4 py-3 text-left font-semibold">Сотрудник</th>
                      <th className="px-4 py-3 text-left font-semibold">Продукт СИЗ</th>
                      <th className="px-4 py-3 text-left font-semibold">Дата выдачи</th>
                      <th className="px-4 py-3 text-left font-semibold">QR код</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.key} className="border-t border-stroke align-top dark:border-strokedark">
                        <td className="px-4 py-4 font-medium text-black dark:text-white">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{row.tabelNumber}</td>
                        <td className="px-4 py-4 text-black dark:text-white">
                          {row.employeeSlug ? (
                            <Link to={`/item-view/${row.employeeSlug}`} className="font-medium text-primary hover:underline">{row.fullName}</Link>
                          ) : (
                            <span className="font-medium">{row.fullName}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{row.productsLabel}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">{row.issuedAt}</td>
                        <td className="px-4 py-4">
                          {row.qrCodeImage ? (
                            <div className="space-y-2">
                              <a href={row.qrCodeImage} target="_blank" rel="noreferrer" className="block w-fit">
                                <img src={row.qrCodeImage} alt={`QR ${row.tabelNumber}`} className="h-20 w-20 rounded border border-stroke object-contain p-1 dark:border-strokedark" />
                              </a>
                              {row.qrScanUrl && (
                                <a href={row.qrScanUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Открыть</a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-stroke px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-strokedark">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Показать:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="h-9 rounded-md border border-stroke bg-white px-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    Показано {totalCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, totalCount)} из {totalCount}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className={`rounded border px-3 py-1.5 ${currentPage === 1 ? 'cursor-not-allowed border-slate-200 text-slate-400' : 'border-stroke text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-gray-700'}`}
                  >
                    Назад
                  </button>
                  <div className="rounded border border-stroke px-3 py-1.5 text-sm dark:border-strokedark">
                    {currentPage} / {totalPages}
                  </div>
                  <button
                    type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className={`rounded border px-3 py-1.5 ${currentPage === totalPages ? 'cursor-not-allowed border-slate-200 text-slate-400' : 'border-stroke text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-gray-700'}`}
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DailyPPEIssuedPage;
