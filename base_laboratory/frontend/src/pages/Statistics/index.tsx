import { forwardRef, useEffect, useMemo, useState, Fragment } from 'react';
import type { ApexOptions } from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { toast } from 'react-toastify';
import { FaRegCalendarAlt, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

type StatisticsRow = {
  product_id: number;
  product_name: string;
  arrived: number;
  issued: number;
  remaining: number;
  low_stock_threshold: number;
};

type StatisticsResponse = {
  date_from: string;
  date_to: string;
  totals: {
    arrived: number;
    issued: number;
    remaining: number;
  };
  rows: StatisticsRow[];
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DateInput = forwardRef<HTMLInputElement, { value?: string; onClick?: () => void; placeholder?: string }>(
  ({ value, onClick, placeholder }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        value={value ?? ''}
        onClick={onClick}
        readOnly
        placeholder={placeholder}
        className="w-full rounded border px-3 py-2 pr-10"
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
  ),
);

DateInput.displayName = 'DateInput';

const StatisticsPage = () => {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [stats, setStats] = useState<StatisticsResponse | null>(null);

  // Filters for main statistics table
  const [productFilter, setProductFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchStats = async (range?: { from: string; to: string }) => {
    try {
      const effectiveFrom = range ? range.from : appliedFromDate;
      const effectiveTo = range ? range.to : appliedToDate;
      const params = new URLSearchParams();
      if (effectiveFrom) params.append('from', effectiveFrom);
      if (effectiveTo) params.append('to', effectiveTo);
      // Cache-bust so low_stock_threshold changes elsewhere always show up
      params.append('_t', String(Date.now()));

      const query = params.toString();
      const url = `${BASE_URL}/statistics/ppe/?${query}`;
      const statsResponse = await axioss.get(url);

      setStats(statsResponse.data as StatisticsResponse);
    } catch (error: any) {
      const backendError = error?.response?.data?.error;
      toast.error(backendError || 'Ошибка при загрузке статистики');
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const nextRange = {
      from: fromDate ? toDateInput(fromDate) : '',
      to: toDate ? toDateInput(toDate) : '',
    };
    setAppliedFromDate(nextRange.from);
    setAppliedToDate(nextRange.to);
    fetchStats(nextRange);
  }, [fromDate, toDate]);

  // Refetch when user returns to this tab so updated low_stock_threshold is reflected
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [appliedFromDate, appliedToDate]);

  const rows = useMemo(() => stats?.rows ?? [], [stats]);

  // Extract unique product base names (without size) for filter dropdown
  const productOptions = useMemo(() => {
    const baseNames = rows.map((row) => {
      // Extract base name before "(Размер" or just use full name
      const match = row.product_name.match(/^(.+?)\s*\(Размер/);
      return match ? match[1].trim() : row.product_name;
    });
    return Array.from(new Set(baseNames)).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [rows]);

  // Filter rows based on selected filters
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Filter by product base name
      if (productFilter) {
        const match = row.product_name.match(/^(.+?)\s*\(Размер/);
        const baseName = match ? match[1].trim() : row.product_name;
        if (baseName.toLowerCase() !== productFilter.toLowerCase()) return false;
      }

      // Filter by size
      if (sizeFilter) {
        const sizeMatch = row.product_name.match(/\(Размер\s*([^)]+)\)/i);
        const size = sizeMatch ? sizeMatch[1].trim().toLowerCase() : '';
        if (!size.includes(sizeFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [rows, productFilter, sizeFilter]);

  // Group filtered rows by base product name
  type GroupedProduct = {
    baseName: string;
    rows: StatisticsRow[];
    totals: { arrived: number; issued: number; remaining: number };
    lowStockThreshold: number;
  };

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, GroupedProduct>();

    filteredRows.forEach((row) => {
      const match = row.product_name.match(/^(.+?)\s*\(Размер/);
      const baseName = match ? match[1].trim() : row.product_name;

      if (!groups.has(baseName)) {
        groups.set(baseName, {
          baseName,
          rows: [],
          totals: { arrived: 0, issued: 0, remaining: 0 },
          lowStockThreshold: Number(row.low_stock_threshold || 0),
        });
      }

      const group = groups.get(baseName)!;
      group.rows.push(row);
      group.totals.arrived += row.arrived;
      group.totals.issued += row.issued;
      group.totals.remaining += row.remaining;
      group.lowStockThreshold = Number(row.low_stock_threshold || group.lowStockThreshold || 0);
    });

    return Array.from(groups.values()).sort((a, b) => a.baseName.localeCompare(b.baseName, 'ru'));
  }, [filteredRows]);

  const toggleGroup = (baseName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(baseName)) {
        next.delete(baseName);
      } else {
        next.add(baseName);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroups(new Set(groupedProducts.map((g) => g.baseName)));
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  const extractSizeFromProductName = (productName: string) => {
    const match = productName.match(/\(Размер\s*([^)]+)\)/i);
    return match ? match[1].trim() : '';
  };

  const openDetailsPage = (
    detailsType: 'arrivals' | 'issued',
    row: StatisticsRow,
    options?: { baseProductName?: string; size?: string },
  ) => {
    const params = new URLSearchParams();
    const resolvedProductName = options?.baseProductName || row.product_name;
    const size = options?.size ?? extractSizeFromProductName(row.product_name);

    params.append('productName', resolvedProductName);
    if (size) params.append('size', size);
    if (appliedFromDate) params.append('from', appliedFromDate);
    if (appliedToDate) params.append('to', appliedToDate);

    navigate(`/statistics/${detailsType}/${row.product_id}?${params.toString()}`);
  };


  const groupedBarCategories = useMemo(
    () => groupedProducts.map((group) => group.baseName),
    [groupedProducts],
  );

  const groupedBarSeries = useMemo(
    () => [
      {
        name: 'Поступило',
        data: groupedProducts.map((group) => group.totals.arrived),
      },
      {
        name: 'Выдано',
        data: groupedProducts.map((group) => group.totals.issued),
      },
      {
        name: 'Остаток',
        data: groupedProducts.map((group) => group.totals.remaining),
      },
    ],
    [groupedProducts],
  );

  const groupedBarOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        toolbar: { show: false },
      },
      colors: ['#3C50E0', '#6577F3', '#0FADCF'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 1,
        colors: ['transparent'],
      },
      xaxis: {
        categories: groupedBarCategories,
        labels: {
          rotate: -25,
          hideOverlappingLabels: true,
        },
      },
      yaxis: {
        min: 0,
      },
      legend: {
        position: 'top',
      },
      tooltip: {
        y: {
          formatter: (val) => `${val}`,
        },
      },
    }),
    [groupedBarCategories],
  );

  const donutData = useMemo(() => {
    const sorted = [...groupedProducts]
      .sort((left, right) => right.totals.remaining - left.totals.remaining)
      .filter((item) => item.totals.remaining > 0);

    const top = sorted.slice(0, 6);
    const otherSum = sorted.slice(6).reduce((sum, item) => sum + item.totals.remaining, 0);

    const labels = top.map((item) => item.baseName);
    const values = top.map((item) => item.totals.remaining);

    if (otherSum > 0) {
      labels.push('Остальные');
      values.push(otherSum);
    }

    return { labels, values };
  }, [groupedProducts]);

  const donutOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'donut',
      },
      labels: donutData.labels,
      legend: {
        position: 'bottom',
        formatter: (seriesName: string, opts: any) => {
          const value = donutData.values[opts.seriesIndex] ?? 0;
          return `${seriesName} (${value})`;
        },
      },
      dataLabels: {
        enabled: false,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val) => `${val}`,
        },
      },
    }),
    [donutData.labels, donutData.values],
  );


  return (
    <>
      <Breadcrumb pageName="Статистика" />

      <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        {/* Filters row - collapsible */}


        {/* Expand/Collapse controls and Filter button */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-2">
            {groupedProducts.some((g) => g.rows.length > 1) && (
              <>
                <button
                  type="button"
                  onClick={expandAllGroups}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Развернуть все
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={collapseAllGroups}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Свернуть все
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded border border-stroke px-4 py-2 text-sm font-medium transition-colors ${showFilters
                ? 'bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:bg-boxdark dark:text-slate-300'
              }`}
          >
            <FiFilter size={16} />
            Фильтр
          </button>
        </div>

        {showFilters && (
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            {/* Left side: Product and Size filters */}
            <div className="flex flex-2 flex-col gap-3 md:flex-row md:items-end">
              <div className="md:w-60">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full rounded border border-stroke px-3 py-2"
                >
                  <option value="">Все средства защиты</option>
                  {productOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:w-48">
                <input
                  type="text"
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  placeholder="Фильтр по размеру"
                  className="w-full rounded border border-stroke px-3 py-2"
                />
              </div>
              {(productFilter || sizeFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setProductFilter('');
                    setSizeFilter('');
                  }}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* Right side: Date filters */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="md:w-48">
                <label className="mb-1 block text-sm font-medium">С даты</label>
                <DatePicker
                  selected={fromDate}
                  onChange={(date: Date | null) => setFromDate(date)}
                  dateFormat="dd.MM.yyyy"
                  placeholderText="dd.mm.yyyy"
                  customInput={<DateInput placeholder="dd.mm.yyyy" />}
                  isClearable
                  wrapperClassName="statistics-date-filter"
                />
              </div>
              <div className="md:w-48">
                <label className="mb-1 block text-sm font-medium">По дату</label>
                <DatePicker
                  selected={toDate}
                  onChange={(date: Date | null) => setToDate(date)}
                  dateFormat="dd.MM.yyyy"
                  placeholderText="dd.mm.yyyy"
                  customInput={<DateInput placeholder="dd.mm.yyyy" />}
                  isClearable
                  wrapperClassName="statistics-date-filter"
                />
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded border border-stroke">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke bg-slate-50 text-left">
                <th className="px-3 py-2 w-10">№</th>
                <th className="px-3 py-2">Средство защиты</th>
                <th className="px-3 py-2">Поступило</th>
                <th className="px-3 py-2">Выдано</th>
                <th className="px-3 py-2">Остаток</th>
              </tr>
            </thead>
            <tbody>
              {groupedProducts.length > 0 ? (
                groupedProducts.map((group, groupIndex) => {
                  const isExpanded = expandedGroups.has(group.baseName);
                  const hasMultipleSizes = group.rows.length > 1;
                  const isGroupLowStock = group.lowStockThreshold > 0 && group.totals.remaining <= group.lowStockThreshold;

                  return (
                    <Fragment key={`group-${group.baseName}`}>
                      {/* Group header row */}
                      <tr
                        className={`border-b border-stroke ${hasMultipleSizes ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                        onClick={() => hasMultipleSizes && toggleGroup(group.baseName)}
                      >
                        <td className="px-3 py-2">{groupIndex + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {hasMultipleSizes && (
                              <span className="text-slate-400">
                                {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                              </span>
                            )}
                            <span className={hasMultipleSizes ? 'font-medium' : ''}>
                              {hasMultipleSizes ? group.baseName : group.rows[0].product_name}
                            </span>
                            {hasMultipleSizes && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {group.rows.length} размер{group.rows.length > 4 ? 'ов' : group.rows.length > 1 ? 'а' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetailsPage('arrivals', group.rows[0], { baseProductName: group.baseName, size: '' });
                            }}
                            className="rounded px-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {group.totals.arrived}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetailsPage('issued', group.rows[0], { baseProductName: group.baseName, size: '' });
                            }}
                            className="rounded px-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {group.totals.issued}
                          </button>
                        </td>
                        <td className={`px-3 py-2 ${isGroupLowStock ? 'bg-red-50 font-semibold text-red-700' : ''}`}>{group.totals.remaining}</td>
                      </tr>

                      {/* Expanded size rows */}
                      {hasMultipleSizes && isExpanded && group.rows.map((row) => {
                        const sizeMatch = row.product_name.match(/\(Размер\s*([^)]+)\)/i);
                        const size = sizeMatch ? sizeMatch[1].trim() : '-';
                        const isLowStock = Number(row.low_stock_threshold || 0) > 0 && row.remaining <= Number(row.low_stock_threshold || 0);

                        return (
                          <tr
                            key={row.product_id}
                            className="border-b border-stroke bg-slate-50/50"
                          >
                            <td className="px-3 py-2"></td>
                            <td className="px-3 py-2 pl-10">
                              <span className="text-slate-600">Размер {size}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              <button
                                type="button"
                                onClick={() => openDetailsPage('arrivals', row, { baseProductName: group.baseName, size })}
                                className="rounded px-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                {row.arrived}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              <button
                                type="button"
                                onClick={() => openDetailsPage('issued', row, { baseProductName: group.baseName, size })}
                                className="rounded px-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                {row.issued}
                              </button>
                            </td>
                            <td className={`px-3 py-2 text-slate-600 ${isLowStock ? 'bg-red-50 font-semibold text-red-700' : ''}`}>{row.remaining}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    Нет данных за выбранный период
                  </td>
                </tr>
              )}
              {groupedProducts.length > 0 && (
                <tr className="border-t-2 border-stroke bg-slate-100 font-semibold dark:border-strokedark dark:bg-slate-800">
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">Итого</td>
                  <td className="px-3 py-2">{stats?.totals?.arrived ?? 0}</td>
                  <td className="px-3 py-2">{stats?.totals?.issued ?? 0}</td>
                  <td className="px-3 py-2">{stats?.totals?.remaining ?? 0}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded border border-stroke p-4">
            <div className="mb-3 text-sm font-semibold">Поступило / Выдано / Остаток</div>
            {groupedProducts.length > 0 ? (
              <ReactApexChart
                options={groupedBarOptions}
                series={groupedBarSeries}
                type="bar"
                height={320}
              />
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">Нет данных для построения графика</div>
            )}
          </div>

          <div className="rounded border border-stroke p-4">
            <div className="mb-3 text-sm font-semibold">Остаток по средствам защиты</div>
            {donutData.values.length > 0 ? (
              <ReactApexChart
                options={donutOptions}
                series={donutData.values}
                type="donut"
                height={320}
              />
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">Остаток равен 0, график не отображается</div>
            )}
          </div>
        </div>

      </div>

    </>
  );
};

export default StatisticsPage;

