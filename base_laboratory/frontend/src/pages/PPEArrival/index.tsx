import { forwardRef, useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { toast } from 'react-toastify';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import * as XLSX from 'xlsx-js-style';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getStoredFeatureAccess, normalizeRole } from '../../utils/pageAccess';

type ProductOption = {
  id: number;
  name: string;
};

type ArrivalRow = {
  id: number;
  ppeproduct: number;
  ppeproduct_name: string;
  quantity: number;
  size?: string | null;
  size_breakdown?: Record<string, number>;
  size_display?: string;
  received_at: string;
  accepted_by?: string | null;
};

type SizeRowInput = {
  size: string;
  quantity: string;
};

type ExpandedArrivalRow = {
  key: string;
  ppeproduct_name: string;
  quantity: number | string;
  size: string;
  received_at: string;
  accepted_by?: string | null;
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}.${month}.${year}`;
};

const normalizeDate = (value?: string | null) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const expandArrivalRowBySizes = (row: ArrivalRow, sizeFilterTokens: string[] = []): ExpandedArrivalRow[] => {
  const breakdown = row.size_breakdown && typeof row.size_breakdown === 'object'
    ? Object.entries(row.size_breakdown)
    : [];

  const rows = breakdown.length > 0
    ? breakdown.map(([sizeKey, qty], index) => ({
      key: `${row.id}-${sizeKey}-${index}`,
      ppeproduct_name: `${row.ppeproduct_name} (Размер ${sizeKey})`,
      quantity: Number(qty) || 0,
      size: sizeKey,
      received_at: row.received_at,
      accepted_by: row.accepted_by,
    }))
    : [{
      key: `${row.id}-base`,
      ppeproduct_name: row.ppeproduct_name,
      quantity: row.quantity ?? '-',
      size: row.size_display || row.size || '-',
      received_at: row.received_at,
      accepted_by: row.accepted_by,
    }];

  if (sizeFilterTokens.length === 0) {
    return rows;
  }

  const normalizedTokens = sizeFilterTokens.map((token) => token.trim().toLowerCase());

  return rows.filter((item) => {
    const normalizedSize = String(item.size || '').trim().toLowerCase();
    return normalizedTokens.includes(normalizedSize);
  });
};

const DateInput = forwardRef<HTMLInputElement, { value?: string; onClick?: () => void; placeholder?: string; className?: string }>((
  { value, onClick, placeholder, className },
  ref,
) => (
  <div className="relative">
    <input
      ref={ref}
      type="text"
      value={value ?? ''}
      onClick={onClick}
      readOnly
      placeholder={placeholder}
      className={className || 'w-full rounded border px-3 py-2 pr-10'}
    />
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-y-0 right-3 flex items-center text-slate-500"
      aria-label="Открыть календарь"
    >
      <FaRegCalendarAlt />
    </button>
  </div>
));

DateInput.displayName = 'DateInput';

const PPEArrivalPage = () => {
  const currentRole = normalizeRole(localStorage.getItem('role'));
  const featureAccess = getStoredFeatureAccess(currentRole);
  const canReceiveToWarehouse = featureAccess.ppe_arrival_intake;
  const canExportExcel = featureAccess.dashboard_export_excel;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [arrivals, setArrivals] = useState<ArrivalRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [sizeRows, setSizeRows] = useState<SizeRowInput[]>([{ size: '', quantity: '' }]);
  const [receivedAt, setReceivedAt] = useState<Date | null>(new Date());
  const [filterFromDate, setFilterFromDate] = useState<Date | null>(null);
  const [filterToDate, setFilterToDate] = useState<Date | null>(null);
  const [arrivalProductFilterId, setArrivalProductFilterId] = useState<number | ''>('');
  const [arrivalSizeFilter, setArrivalSizeFilter] = useState('');

  // Show/hide filters state (like Statistics page)
  const [showFilters, setShowFilters] = useState(false);

  const parsedSizeBreakdown = useMemo(() => {
    const parsed: Record<string, number> = {};
    let hasAnyInput = false;

    for (const row of sizeRows) {
      const sizePart = row.size.trim();
      const qtyPart = row.quantity.trim();

      if (sizePart || qtyPart) {
        hasAnyInput = true;
      }

      if (!sizePart && !qtyPart) {
        continue;
      }

      if (!sizePart || !qtyPart) {
        return {
          map: {} as Record<string, number>,
          total: 0,
          valid: false,
          error: 'Укажите точный размер и количество для каждой строки.',
          hasAnyInput,
        };
      }

      const quantity = Number(qtyPart);
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        return {
          map: {} as Record<string, number>,
          total: 0,
          valid: false,
          error: `${sizePart} должен быть положительным целым числом`,
          hasAnyInput,
        };
      }

      parsed[sizePart] = (parsed[sizePart] || 0) + quantity;
    }

    const total = Object.values(parsed).reduce((sum, qty) => sum + qty, 0);
    return { map: parsed, total, valid: total > 0, error: '', hasAnyInput };
  }, [sizeRows]);

  const addSizeRow = () => {
    setSizeRows((prev) => [...prev, { size: '', quantity: '' }]);
  };

  const removeSizeRow = (indexToRemove: number) => {
    setSizeRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleSizeRowChange = (index: number, field: 'size' | 'quantity', value: string) => {
    setSizeRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const canSave = useMemo(() => {
    return Boolean(selectedProductId) && parsedSizeBreakdown.valid && receivedAt !== null;
  }, [selectedProductId, parsedSizeBreakdown.valid, receivedAt]);

  const sizeFilterTokens = useMemo(() => {
    return arrivalSizeFilter
      .trim()
      .toLowerCase()
      .split(/[\s,;]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }, [arrivalSizeFilter]);

  const filteredArrivals = useMemo(() => {
    const fromDateStr = filterFromDate ? toDateInput(filterFromDate) : '';
    const toDateStr = filterToDate ? toDateInput(filterToDate) : '';

    const rowMatchesSizeFilter = (row: ArrivalRow) => {
      if (sizeFilterTokens.length === 0) return true;

      const normalizedSizes = row.size_breakdown && typeof row.size_breakdown === 'object'
        ? Object.keys(row.size_breakdown).map((sizeKey) => String(sizeKey).trim().toLowerCase())
        : [String(row.size_display || row.size || '').trim().toLowerCase()].filter(Boolean);

      if (normalizedSizes.length === 0) {
        return false;
      }

      return normalizedSizes.some((sizeValue) => sizeFilterTokens.includes(sizeValue));
    };

    return arrivals.filter((row) => {
      const receivedDate = normalizeDate(row.received_at);
      if (!receivedDate) return false;
      if (fromDateStr && receivedDate < fromDateStr) return false;
      if (toDateStr && receivedDate > toDateStr) return false;
      if (arrivalProductFilterId && Number(row.ppeproduct) !== Number(arrivalProductFilterId)) return false;
      if (!rowMatchesSizeFilter(row)) return false;
      return true;
    });
  }, [arrivals, filterFromDate, filterToDate, arrivalProductFilterId, sizeFilterTokens]);

  const groupedArrivals = useMemo(() => {
    const groups: Array<{ date: string; rows: ArrivalRow[] }> = [];
    const groupIndexByDate = new Map<string, number>();

    filteredArrivals.forEach((row) => {
      const dateKey = normalizeDate(row.received_at);
      const existingIndex = groupIndexByDate.get(dateKey);

      if (existingIndex === undefined) {
        groupIndexByDate.set(dateKey, groups.length);
        groups.push({ date: dateKey, rows: [row] });
        return;
      }

      groups[existingIndex].rows.push(row);
    });

    return groups;
  }, [filteredArrivals]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [arrivalsResponse, productsResponse] = await Promise.all([
        axioss.get(`${BASE_URL}/ppe-arrivals/`),
        axioss.get(`${BASE_URL}/filter-data/`),
      ]);

      const arrivalsData = Array.isArray(arrivalsResponse.data) ? arrivalsResponse.data : [];
      setArrivals(arrivalsData);

      const productsData = Array.isArray(productsResponse.data?.ppeproducts) ? productsResponse.data.ppeproducts : [];
      setProducts(
        productsData.map((product: any) => ({
          id: Number(product.id),
          name: String(product.name || ''),
        })),
      );
    } catch {
      toast.error('Ошибка при загрузке данных прихода СИЗ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSubmit = async () => {
    if (!canSave || saving) return;

    try {
      setSaving(true);
      const payload = {
        ppeproduct: selectedProductId,
        quantity: parsedSizeBreakdown.total,
        size: null,
        size_breakdown: parsedSizeBreakdown.map,
        received_at: receivedAt ? toDateInput(receivedAt) : '',
      };

      await axioss.post(`${BASE_URL}/ppe-arrivals/`, payload);
      toast.success('Приход СИЗ успешно сохранен');

      setSelectedProductId('');
      setSizeRows([{ size: '', quantity: '' }]);
      setReceivedAt(new Date());

      await loadInitialData();
    } catch (error: any) {
      const backendError = error?.response?.data?.error;
      toast.error(backendError || 'Ошибка при сохранении прихода СИЗ');
    } finally {
      setSaving(false);
    }
  };

  const exportArrivalsToExcel = () => {
    if (!filteredArrivals.length) {
      toast.info('Экспорт uchun записей yo‘q');
      return;
    }

    setIsExporting(true);

    try {
      const sortedRows = [...filteredArrivals].sort((left, right) => {
        const leftTime = left.received_at ? new Date(left.received_at).getTime() : Number.POSITIVE_INFINITY;
        const rightTime = right.received_at ? new Date(right.received_at).getTime() : Number.POSITIVE_INFINITY;
        return leftTime - rightTime;
      });

      const expandedRows = sortedRows.flatMap((row) => expandArrivalRowBySizes(row, sizeFilterTokens));

      const headers = ['№', 'Средство защиты', 'Количество', 'Размер', 'Дата приема', 'Принял'];
      const body = expandedRows.map((row, index) => [
        index + 1,
        row.ppeproduct_name || '-',
        row.quantity ?? '-',
        row.size || '-',
        formatDate(row.received_at),
        row.accepted_by || '-',
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 35 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 30 },
      ];

      const baseCellStyle = {
        border: {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } },
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
          wrapText: true,
        },
        font: {
          name: 'Calibri',
          sz: 11,
          color: { rgb: '1E293B' },
        },
      };

      const headerStyle = {
        ...baseCellStyle,
        fill: {
          fgColor: { rgb: '1F4E78' },
        },
        font: {
          name: 'Calibri',
          sz: 11,
          bold: true,
          color: { rgb: 'FFFFFF' },
        },
      };

      const evenRowStyle = {
        ...baseCellStyle,
        fill: {
          fgColor: { rgb: 'F8FAFC' },
        },
      };

      const oddRowStyle = {
        ...baseCellStyle,
        fill: {
          fgColor: { rgb: 'FFFFFF' },
        },
      };

      const totalRows = body.length + 1;
      const totalCols = headers.length;

      for (let row = 0; row < totalRows; row += 1) {
        for (let col = 0; col < totalCols; col += 1) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress] as any;
          if (!cell) continue;
          if (row === 0) {
            cell.s = headerStyle;
          } else {
            cell.s = row % 2 === 0 ? evenRowStyle : oddRowStyle;
          }
        }
      }

      worksheet['!rows'] = Array.from({ length: totalRows }, (_, rowIndex) => (
        rowIndex === 0 ? { hpt: 24 } : { hpt: 20 }
      ));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'PPE Arrivals');

      const today = toDateInput(new Date());
      const fromPart = filterFromDate ? toDateInput(filterFromDate) : 'all';
      const toPart = filterToDate ? toDateInput(filterToDate) : 'all';
      XLSX.writeFile(workbook, `ppe_arrivals_${fromPart}_${toPart}_${today}.xlsx`);
      toast.success(`Экспортировано ${body.length} записей`);
    } catch (error) {
      console.error('Ошибка экспорта Excel:', error);
      toast.error('Не удалось скачать Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Прием СИЗ" />

      <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        {canReceiveToWarehouse && (
          <h2 className="mb-4 text-lg font-semibold">Прием поступивших СИЗ на склад</h2>
        )}

      {canReceiveToWarehouse && (
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
  {/* Chap tomondagi inputlar */}
  <div className="flex w-full flex-wrap gap-3 md:w-auto md:flex-nowrap">
    <div className="flex-1 min-w-[240px] max-w-[350px]">
      <label className="mb-1 block text-sm font-medium">Средство защиты</label>
      <select
        value={selectedProductId}
        onChange={(event) =>
          setSelectedProductId(event.target.value ? Number(event.target.value) : "")
        }
        className="w-full rounded border px-3 py-2"
      >
        <option value="">Выберите продукт</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
    </div>

    <div className="flex-1 min-w-[260px] max-w-[420px]">
      <label className="mb-1 block text-sm font-medium">Размер / Количество</label>
      <div className="space-y-2">
        {sizeRows.map((row, index) => (
          <div key={`size-row-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={row.size}
              onChange={(event) => handleSizeRowChange(index, 'size', event.target.value)}
              placeholder="Размер"
              className="w-full rounded border px-3 py-2"
            />
            <input
              type="number"
              min={1}
              value={row.quantity}
              onChange={(event) => handleSizeRowChange(index, 'quantity', event.target.value)}
              placeholder="Количество"
              className="w-[110px] rounded border px-3 py-2"
            />
            {index === 0 ? (
              <button
                type="button"
                onClick={addSizeRow}
                className="h-10 rounded border border-stroke bg-white px-4 text-lg font-semibold text-slate-700 hover:bg-slate-50"
                title="Yangi razmer qo‘shish"
              >
                +
              </button>
            ) : (
              <button
                type="button"
                onClick={() => removeSizeRow(index)}
                className="h-10 rounded border border-stroke bg-white px-4 text-lg font-semibold text-red-600 hover:bg-red-50"
                title="Qatorni o‘chirish"
                disabled={sizeRows.length < 2}
              >
                -
              </button>
            )}
          </div>
        ))}
      </div>
      {!parsedSizeBreakdown.valid && parsedSizeBreakdown.hasAnyInput ? (
        <p className="mt-1 text-xs text-red-600">{parsedSizeBreakdown.error}</p>
      ) : null}
    </div>

    <div className="flex-1 min-w-[80px] max-w-[120px]">
      <label className="mb-1 block text-sm font-medium">Итого</label>
      <input
        type="number"
        value={parsedSizeBreakdown.total || ''}
        readOnly
        placeholder="0"
        className="w-full rounded border px-3 py-2"
      />
    </div>

    

    <div className="flex-1 min-w-[100px] max-w-[180px]">
      <label className="mb-1 block text-sm font-medium">Дата приема</label>
      <DatePicker
        selected={receivedAt}
        onChange={(date: Date | null) => setReceivedAt(date)}
        dateFormat="dd.MM.yyyy"
        customInput={<DateInput />}
        placeholderText="дд.мм.гггг"
      />
    </div>
  </div>

  {/* O'ng tomondagi filter (o‘ngga yopishadi) */}
  <div className="flex w-full flex-wrap items-end justify-end gap-3 md:ml-auto md:w-auto md:flex-nowrap ppe-arrival-date-filter">
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-600">С даты</label>
      <DatePicker
        selected={filterFromDate}
        onChange={(date: Date | null) => setFilterFromDate(date)}
        dateFormat="dd.MM.yyyy"
        customInput={<DateInput className="rounded border px-2 py-1 pr-8 text-xs" />}
        isClearable
        placeholderText="дд.мм.гггг"
      />
    </div>

    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-600">По дату</label>
      <DatePicker
        selected={filterToDate}
        onChange={(date: Date | null) => setFilterToDate(date)}
        dateFormat="dd.MM.yyyy"
        customInput={<DateInput className="rounded border px-2 py-1 pr-8 text-xs" />}
        isClearable
        placeholderText="дд.мм.гггг"
      />
    </div>

    {(filterFromDate || filterToDate) && (
      <button
        type="button"
        onClick={() => {
          setFilterFromDate(null);
          setFilterToDate(null);
        }}
        className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
      >
        Сбросить фильтр
      </button>
    )}
  </div>
</div>
      )}


        <div className="mb-6 flex flex-wrap items-center gap-3">
          {canReceiveToWarehouse && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSave || saving}
              className="rounded bg-meta-3 px-4 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Принять на склад'}
            </button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
          {/* Right side: Filter toggle button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded border border-stroke px-4 py-2 text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:bg-boxdark dark:text-slate-300'
            }`}
          >
            <FiFilter size={16} />
            Фильтр
          </button>

          {/* Right side: Excel export button */}
          {canExportExcel && (
            <button
              type="button"
              onClick={exportArrivalsToExcel}
              disabled={filteredArrivals.length === 0 || isExporting}
              title="Скачать Excel"
              className={`flex h-10 w-12 items-center justify-center rounded-md transition-colors duration-200 ${
                isExporting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="4" fill="#217346" />
                <path
                  d="M9 6.5C8.44772 6.5 8 6.94772 8 7.5V16.5C8 17.0523 8.44772 17.5 9 17.5H15C15.5523 17.5 16 17.0523 16 16.5V10L12.5 6.5H9Z"
                  fill="white"
                />
                <path d="M12.5 6.5L16 10H13.25C12.6977 10 12.25 9.55228 12.25 9V6.5H12.5Z" fill="#e6f2e8" />
                <path
                  d="M10.4 14.2L11.6 13L10.4 11.8C10.1828 11.5828 10.1828 11.2314 10.4 11.0142C10.6172 10.797 10.9686 10.797 11.1858 11.0142L12.4 12.2284L13.6142 11.0142C13.8314 10.797 14.1828 10.797 14.4 11.0142C14.6172 11.2314 14.6172 11.5828 14.4 11.8L13.2 13L14.4 14.2C14.6172 14.4172 14.6172 14.7686 14.4 14.9858C14.1828 15.203 13.8314 15.203 13.6142 14.9858L12.4 13.7716L11.1858 14.9858C10.9686 15.203 10.6172 15.203 10.4 14.9858C10.1828 14.7686 10.1828 14.4172 10.4 14.2Z"
                  fill="#217346"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Filter inputs - collapsible like Statistics page */}
        {showFilters && (
          <div className="mb-4 flex w-full flex-wrap items-end gap-3">
            {/* Left side: Date filters and Сбросить */}
            <div className="flex w-full flex-wrap items-end gap-3 md:w-auto md:flex-nowrap">
              <div className="w-full md:w-48">
                <label className="mb-1 block text-sm font-medium">С даты</label>
                <DatePicker
                  selected={filterFromDate}
                  onChange={(date: Date | null) => setFilterFromDate(date)}
                  dateFormat="dd.MM.yyyy"
                  customInput={<DateInput className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700" />}
                  isClearable
                  placeholderText="дд.мм.гггг"
                />
              </div>

              <div className="w-full md:w-48">
                <label className="mb-1 block text-sm font-medium">По дату</label>
                <DatePicker
                  selected={filterToDate}
                  onChange={(date: Date | null) => setFilterToDate(date)}
                  dateFormat="dd.MM.yyyy"
                  customInput={<DateInput className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700" />}
                  isClearable
                  placeholderText="дд.мм.гггг"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setArrivalProductFilterId('');
                  setArrivalSizeFilter('');
                  setFilterFromDate(null);
                  setFilterToDate(null);
                }}
                className="h-[42px] rounded border border-stroke bg-white px-6 text-base text-slate-700 hover:bg-slate-50"
              >
                Сбросить
              </button>
            </div>

            {/* Right side: Product and Size filters */}
            <div className="ml-auto flex w-full flex-wrap items-end gap-3 md:w-auto md:flex-nowrap">
              <div className="w-full md:w-64">
                <label className="mb-1 block text-sm font-medium">Средство защиты</label>
                <select
                  value={arrivalProductFilterId}
                  onChange={(event) =>
                    setArrivalProductFilterId(event.target.value ? Number(event.target.value) : '')
                  }
                  className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700"
                >
                  <option value="">Все средства защиты</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-48">
                <label className="mb-1 block text-sm font-medium">Размер</label>
                <input
                  type="text"
                  value={arrivalSizeFilter}
                  onChange={(event) => setArrivalSizeFilter(event.target.value)}
                  placeholder="Фильтр по размеру"
                  className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700"
                />
              </div>
            </div>
          </div>
        )}

        {groupedArrivals.length > 0 ? (
          <div className="space-y-3">
            {groupedArrivals.map((group, groupIndex) => (
              <div
                key={`arrival-group-${group.date}-${groupIndex}`}
                className="overflow-hidden rounded-md border border-stroke dark:border-strokedark"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke bg-gray-2 px-4 py-2 dark:border-strokedark dark:bg-meta-4">
                  <div className="text-sm font-medium">Приемка #{groupedArrivals.length - groupIndex}</div>
                  <div className="text-xs text-slate-600">Дата приема: {formatDate(group.date)}</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stroke bg-gray-2 text-left dark:border-strokedark dark:bg-meta-4">
                        <th className="px-3 py-2">№</th>
                        <th className="px-3 py-2">Средство защиты</th>
                        <th className="px-3 py-2">Количество</th>
                          <th className="px-3 py-2">Размер</th>
                        <th className="px-3 py-2">Дата приема</th>
                        <th className="px-3 py-2">Принял</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.flatMap((row) => expandArrivalRowBySizes(row, sizeFilterTokens)).map((row, rowIndex) => (
                        <tr key={row.key} className="border-b border-stroke dark:border-strokedark">
                          <td className="px-3 py-2">{rowIndex + 1}</td>
                          <td className="px-3 py-2">{row.ppeproduct_name}</td>
                          <td className="px-3 py-2">{row.quantity}</td>
                            <td className="px-3 py-2">{row.size}</td>
                          <td className="px-3 py-2">{formatDate(row.received_at)}</td>
                          <td className="px-3 py-2">{row.accepted_by || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-stroke px-4 py-8 text-center text-gray-500">
            {loading ? 'Загрузка...' : 'По выбранному диапазону дата приема записи не найдены'}
          </div>
        )}
      </div>
    </>
  );
};

export default PPEArrivalPage;
