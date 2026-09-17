import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { FilterMatchMode } from 'primereact/api';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Compyuter } from '../../types/compyuters';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { Link } from 'react-router-dom';
import { ModalDeleteComponent } from '../Modal/ModalDelete';
import { Calendar } from "primereact/calendar";
import { useDebounce } from 'use-debounce';
import { ProgressSpinner } from "primereact/progressspinner";
import { exportToExcel } from '../../utils/excelExport';
import { FiTrash2 } from 'react-icons/fi';
import { FaFileExcel } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getStoredFeatureAccess, normalizeFeatureAccess, normalizeRole as normalizeStoredRole, storeFeatureAccess } from '../../utils/pageAccess';

interface IFilterField {
    value: any;
    matchMode: FilterMatchMode;
}

interface IFilters {
    [key: string]: IFilterField;

    history_date: IFilterField;
    history_user: IFilterField;
}

interface IFilterOptions {
    departments: { id: number; name: string; sort_order?: number }[];
    sections: { id: number; name: string; raw_name: string }[];
    ip_addresses: string[];
    type_compyuters: { id: number; name: string }[];
    users: string[];
}

type Props = {
    checkedComputer: Compyuter[];
    setDeleteCompForChecked: React.Dispatch<React.SetStateAction<boolean>>;
    isFiltered: boolean
    loadingFilter: boolean
    allEmployeeCount?: number
    onShowAllEmployees?: () => void
    filterKey?: string
};

function addCalendarMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

function getOverdueProducts(rowData: any): string[] {
    const issuedAt = rowData?.issued_at;
    const products: any[] = rowData?.ppeproduct_info ?? [];
    if (!issuedAt || products.length === 0) return [];
    const issued = new Date(issuedAt);
    if (Number.isNaN(issued.getTime())) return [];
    const now = new Date();
    return products
        .filter((p) => {
            const months = Number(p?.renewal_months ?? 0);
            if (months <= 0) return false;
            return addCalendarMonths(issued, months) < now;
        })
        .map((p) => String(p?.name ?? '').trim())
        .filter(Boolean);
}

export default function ComputerTable({
    checkedComputer,
    setDeleteCompForChecked, isFiltered, loadingFilter = false, allEmployeeCount = 0, onShowAllEmployees, filterKey = ''
}: Props) {
    const [computers, setComputers] = useState<Compyuter[]>([]);
    const [openDeleteModal, setDeleteOpenModal] = useState(false);
    const [deleteModalData, setDeleteModalData] = useState('');
    const [deleteCompData, setDeleteCompData] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [nextUrl, setNextUrl] = useState(null);
    const [prevUrl, setPrevUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [debouncedSearch] = useDebounce(searchText, 300);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
    const [sectionOptions, setSectionOptions] = useState<{ id: number; name: string; raw_name: string; department_id?: number }[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [tabelNumberSearch, setTabelNumberSearch] = useState('');
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [sectionSearch, setSectionSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [debouncedUserSearch] = useDebounce(userSearch, 300);
    const [positionSearch, setPositionSearch] = useState('');
    const [issuedAtSearch, setIssuedAtSearch] = useState<Date | null>(null);
    const [changeDateSearch, setChangeDateSearch] = useState<Date | null>(null);
    const [changeUserSearch, setChangeUserSearch] = useState('');
    const [historyUserOptions, setHistoryUserOptions] = useState<string[]>([]);
    const [overdueProductFilter, setOverdueProductFilter] = useState('');

    const role = normalizeStoredRole(localStorage.getItem('role'));

    const [canDelete, setCanDelete] = useState<boolean>(() => {
        return getStoredFeatureAccess(role).dashboard_delete_employee;
    });
    const [canExportExcel, setCanExportExcel] = useState<boolean>(() => {
        return getStoredFeatureAccess(role).dashboard_export_excel;
    });


    const extractPrefix = (s: string | undefined): number => {
        if (!s) return Number.POSITIVE_INFINITY;
        const m = s.match(/^(\d+)/);
        return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
    };

    const [filterOptions, setFilterOptions] = useState<IFilterOptions>({
        departments: [],
        sections: [],
        ip_addresses: [],
        type_compyuters: [],
        users: [],
    });
    const dateOverlay = useRef<OverlayPanel | null>(null);
    const userOverlay = useRef<OverlayPanel | null>(null);
    const importFileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        Promise.all([
            axioss.get(`${BASE_URL}/settings/departments/`),
            axioss.get(`${BASE_URL}/settings/sections/`),
        ])
            .then(([departmentsResponse, sectionsResponse]) => {
                const departments = Array.isArray(departmentsResponse.data)
                    ? departmentsResponse.data.map((department: any) => ({
                        ...department,
                        id: Number(department.id),
                    }))
                    : [];
                const sections = Array.isArray(sectionsResponse.data)
                    ? sectionsResponse.data.map((section: any) => ({
                        id: section.id,
                        name: section.name,
                        raw_name: section.name,
                        department_id: Number(section.department),
                    }))
                    : [];

                setFilterOptions({
                    departments,
                    sections,
                    ip_addresses: [],
                    type_compyuters: [],
                    users: [],
                });
            })
            .catch((err) => console.error('Ошибка получения фильтров:', err));
    }, []);

    useEffect(() => {
        axioss
            .get(`${BASE_URL}/item-history-users/`)
            .then((response) => {
                const users = Array.isArray(response.data?.users)
                    ? response.data.users.map((user: unknown) => String(user).trim()).filter(Boolean)
                    : [];
                setHistoryUserOptions(users);
            })
            .catch((err) => console.error('Ошибка получения пользователей истории:', err));
    }, []);

    useEffect(() => {
        axioss
            .get(`${BASE_URL}/users/user/`)
            .then((response) => {
                const payload = response.data || {};
                const role = normalizeStoredRole(payload.role || localStorage.getItem('role'));
                const nextFeatureAccess = normalizeFeatureAccess(payload?.feature_access, role);
                const nextCanDelete = nextFeatureAccess.dashboard_delete_employee;
                const nextCanExportExcel = nextFeatureAccess.dashboard_export_excel;

                setCanDelete(nextCanDelete);
                setCanExportExcel(nextCanExportExcel);

                localStorage.setItem('role', role);
                storeFeatureAccess(nextFeatureAccess);
            })
            .catch((err) => {
                console.error('Ошибка получения текущих прав пользователя:', err);
            });
    }, []);


    useEffect(() => {
        setOverdueProductFilter('');
    }, [filterKey]);

    useEffect(() => {
        setDeleteCompForChecked(deleteCompData);
        if (isFiltered) return;
        if (checkedComputer && checkedComputer.length > 0) {
            setComputers(sortByDepartment(checkedComputer.map(c => ({ ...c }))));
        } else {
            setComputers([]);
        }
    }, [checkedComputer, deleteCompData, setDeleteCompForChecked, isFiltered]);

    const [filters, setFilters] = useState<IFilters>({
        global: { value: '', matchMode: FilterMatchMode.CONTAINS },
        'employee.department.name': { value: null, matchMode: FilterMatchMode.CONTAINS },
        'employee.section.name': { value: null, matchMode: FilterMatchMode.CONTAINS },
        'employee.tabel_number': { value: null, matchMode: FilterMatchMode.CONTAINS },
        'type_compyuter.name': { value: null, matchMode: FilterMatchMode.CONTAINS },
        issued_at: { value: null, matchMode: FilterMatchMode.CONTAINS },
        user: { value: null, matchMode: FilterMatchMode.CONTAINS },
        history_date: { value: null, matchMode: FilterMatchMode.DATE_IS },
        history_user: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });

    useEffect(() => {
        if (isFiltered) {
            if (checkedComputer && checkedComputer.length > 0) {
                setTotalCount(checkedComputer.length);
            } else {
                setTotalCount(0);
            }
            setLoading(false);
            return;
        }
        setLoading(true);
        const params = buildQueryParams(debouncedSearch, debouncedUserSearch);
        axioss.get(`${BASE_URL}/all-items/?${params}`)
            .then(res => {
                if (res.data.results && res.data.results.length > 0) {
                    const sorted = sortByDepartment(res.data.results);
                    setComputers(sorted);
                    setTotalCount(res.data.count);
                } else {
                    if (res.data.count > 0 && first > 0) {
                        setFirst(Math.max(0, first - rows));
                        return;
                    }
                    setComputers([]);
                    setTotalCount(0);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [
        isFiltered,
        first,
        rows,
        debouncedSearch,
        checkedComputer,
        deleteCompData,
        selectedDepartmentId,
        sectionSearch,
        tabelNumberSearch,
        debouncedUserSearch,
        positionSearch,
        issuedAtSearch,
        changeDateSearch,
        changeUserSearch,
    ]);

    const buildQueryParams = (search: string, userValue: string) => {
        const params = new URLSearchParams();

        if (selectedDepartmentId) {
            params.append('department_id', String(selectedDepartmentId));
            if (departmentSearch.trim()) {
                params.append('department', departmentSearch.trim());
            }
        }

        if (sectionSearch.trim()) {
            params.append('section', sectionSearch.trim());
        }

        if (tabelNumberSearch.trim()) {
            params.append('tabel_number', tabelNumberSearch.trim());
        }

        if (userValue.trim()) {
            params.append('user', userValue.trim());
        }

        if (positionSearch.trim()) {
            params.append('position', positionSearch.trim());
        }

        if (issuedAtSearch) {
            params.append('issued_at', formatDateKey(issuedAtSearch));
        }

        if (changeDateSearch) {
            params.append('history_date', formatDateKey(changeDateSearch));
        }

        if (changeUserSearch.trim()) {
            params.append('history_user', changeUserSearch.trim());
        }

        if (search) {
            params.append('search', search);
        }

        params.append('page', String(Math.floor(safeFirst / rows) + 1));
        params.append('page_size', String(rows));

        return params.toString();
    };


    const isDetail = (rowData: Compyuter) => {
        const itemSlug = (rowData as any)?.slug;
        const employeeSlug = (rowData as any)?.employee?.slug || (rowData as any)?.employee_slug;
        const actionSlug = itemSlug || employeeSlug;

        if (!actionSlug) {
            return (
                <div className="sm:col-span-1 col-span-3 flex items-center justify-center text-center">
                    <span className="text-gray-400">—</span>
                </div>
            );
        }

        return (
            <div className="sm:col-span-1 col-span-3 flex items-center justify-center text-center">
                <div className="flex items-center justify-center space-x-3.5">
                    <Link
                        to={`/item-view/${actionSlug}`}
                        className="hover:text-primary"
                    >
                        <svg
                            className="fill-current"
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M8.99981 14.8219C3.43106 14.8219 0.674805 9.50624 0.562305 9.28124C0.47793 9.11249 0.47793 8.88749 0.562305 8.71874C0.674805 8.49374 3.43106 3.20624 8.99981 3.20624C14.5686 3.20624 17.3248 8.49374 17.4373 8.71874C17.5217 8.88749 17.5217 9.11249 17.4373 9.28124C17.3248 9.50624 14.5686 14.8219 8.99981 14.8219ZM1.85605 8.99999C2.4748 10.0406 4.89356 13.5562 8.99981 13.5562C13.1061 13.5562 15.5248 10.0406 16.1436 8.99999C15.5248 7.95936 13.1061 4.44374 8.99981 4.44374C4.89356 4.44374 2.4748 7.95936 1.85605 8.99999Z"
                                fill=""
                            />
                            <path
                                d="M9 11.3906C7.67812 11.3906 6.60938 10.3219 6.60938 9C6.60938 7.67813 7.67812 6.60938 9 6.60938C10.3219 6.60938 11.3906 7.67813 11.3906 9C11.3906 10.3219 10.3219 11.3906 9 11.3906ZM9 7.875C8.38125 7.875 7.875 8.38125 7.875 9C7.875 9.61875 8.38125 10.125 9 10.125C9.61875 10.125 10.125 9.61875 10.125 9C10.125 8.38125 9.61875 7.875 9 7.875Z"
                                fill=""
                            />
                        </svg>
                    </Link>
                    {canDelete ? (
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteModalData(actionSlug);
                                setDeleteOpenModal(true);
                            }}
                            className="hover:text-red-500"
                        >
                            <FiTrash2 />
                        </button>
                    ) : null}
                </div>
            </div>
        );
    };

    const typeComputerBodyTemplate = (rowData: Compyuter) => {
        const position = (rowData as any)?.employee?.position;
        if (!position) return '—';
        return position;
    };

    const userBodyTemplate = (rowData: Compyuter) => {
        const employee = (rowData as any)?.employee;
        if (!employee) return '—';
        const slug = employee?.slug || employee?.employee_slug || rowData?.slug;
        const fullName = [employee.last_name, employee.first_name].filter(Boolean).join(' ');

        const content = (
            <div className="min-w-0">
                <span className="truncate">{fullName || '—'}</span>
            </div>
        );

        if (!slug) return content;
        return (
            <Link
                to={`/item-view/${slug}`}
                className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
                {content}
            </Link>
        );
    };


    useEffect(() => {
        if (!selectedDepartmentId) {
            setSectionOptions([]);
            return;
        }

        setSectionOptions(
            filterOptions.sections.filter((section: any) => section.department_id === selectedDepartmentId)
        );
    }, [selectedDepartmentId, filterOptions.sections]);



    const handleExportToExcel = async () => {
        try {
            setIsExporting(true);

            let exportSource: Compyuter[] = isFiltered ? checkedComputer : [];
            const filename = isFiltered ? 'filter_items' : 'all_items';

            if (!isFiltered) {
                const params = new URLSearchParams(buildQueryParams(searchText.trim(), userSearch.trim()));
                params.delete('page');
                params.delete('page_size');

                const response = await axioss.get(`${BASE_URL}/all-items/?${params.toString()}&no_pagination=true&include_issue_history=true`);
                exportSource = Array.isArray(response.data) ? response.data : [];
            }

            const dataToExport = applyLocalTableFilters(exportSource);

            if (dataToExport.length === 0) {
                toast.warning('Нет данных для экспорта');
                return;
            }

            exportToExcel(dataToExport, filename);
            toast.success(`Успешно экспортировано ${dataToExport.length} записей в Excel`);
        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            toast.error('Произошла ошибка при экспорте данных');
        } finally {
            setIsExporting(false);
        }
    };



    const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = '';

        if (!selectedFile) return;

        const isExcelFile = /\.(xlsx|xls)$/i.test(selectedFile.name);
        if (!isExcelFile) {
            toast.error('Файл должен быть формата .xlsx или .xls');
            return;
        }

        try {
            setIsImporting(true);
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await axioss.post(`${BASE_URL}/import-employees/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const created = Number(response.data?.created || 0);
            const updated = Number(response.data?.updated || 0);
            const skipped = Number(response.data?.skipped || 0);
            const errors: string[] = Array.isArray(response.data?.errors) ? response.data.errors : [];

            toast.success(`Импорт завершен. Добавлено: ${created}, обновлено: ${updated}, пропущено: ${skipped}`);
            if (errors.length > 0) {
                toast.warning(`Есть ошибки в ${errors.length} строках. Проверьте формат Excel.`);
            }

            onShowAllEmployees?.();
            setDeleteCompData(prev => !prev);
        } catch (error: any) {
            const backendError = error?.response?.data?.error;
            toast.error(backendError || 'Ошибка при импорте Excel');
        } finally {
            setIsImporting(false);
        }
    };

    const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFirst(0);
        const v = e.target.value
        setSearchText(v);
        // setFilters(f => ({...f, global: {value: v, matchMode: FilterMatchMode.CONTAINS}}));
    };


    const changesHeader = (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center">
                <span>Изменение</span>
                {changeUserSearch && (
                    <i
                        className="pi pi-times-circle ml-2 cursor-pointer text-red-500"
                        title="Сбросить пользователя"
                        onClick={() => {
                            setChangeUserSearch('');
                            setFilters(prev => ({
                                ...prev,
                                history_user: { value: null, matchMode: FilterMatchMode.CONTAINS }
                            }));
                            setFirst(0);
                        }}
                    />
                )}
                <i
                    className="pi pi-filter ml-2 cursor-pointer text-gray-700"
                    title="Выбрать пользователя"
                    onClick={e => userOverlay.current?.toggle(e)}
                />
                <OverlayPanel
                    ref={userOverlay}
                    appendTo={document.body}
                    className="bg-white p-3 rounded shadow-lg max-h-60 overflow-auto"
                >
                    {(historyUserOptions.length > 0
                        ? historyUserOptions
                        : Array.from(new Set(
                            computers
                                .map((item) => String((item as any)?.history_user ?? '').trim())
                                .filter(Boolean)
                        ))
                    )
                        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                        .map((user) => (
                            <button
                                key={user}
                                className="block w-full text-left px-3 py-1 hover:bg-gray-100"
                                onClick={() => {
                                    setChangeUserSearch(user);
                                    setFilters(prev => ({
                                        ...prev,
                                        history_user: { value: user, matchMode: FilterMatchMode.CONTAINS }
                                    }));
                                    setFirst(0);
                                    userOverlay.current?.hide();
                                }}
                            >
                                {user}
                            </button>
                        ))}
                </OverlayPanel>
            </div>
            <Calendar
                value={changeDateSearch}
                onChange={(e) => {
                    const selectedDate = e.value ? new Date(e.value as Date) : null;
                    setChangeDateSearch(selectedDate);
                    setFilters(prev => ({
                        ...prev,
                        history_date: { value: selectedDate, matchMode: FilterMatchMode.DATE_IS }
                    }));
                    setFirst(0);
                }}
                dateFormat="dd.mm.yy"
                placeholder="Дата..."
                className="w-[140px] h-7 text-xs"
                inputClassName="text-xs"
                panelClassName="border border-gray-300 bg-white shadow-md"
            />
        </div>
    );


    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    function applyLocalTableFilters(data: Compyuter[]) {
        const departmentValue = departmentSearch.trim().toLowerCase();
        const departmentIdValue = selectedDepartmentId;
        const sectionValue = sectionSearch.trim().toLowerCase();
        const tabelValue = tabelNumberSearch.trim().toLowerCase();
        const userValue = userSearch.trim().toLowerCase();
        const positionValue = positionSearch.trim().toLowerCase();
        const issuedAtValue = issuedAtSearch ? formatDateKey(issuedAtSearch) : '';
        const changeDateValue = changeDateSearch ? formatDateKey(changeDateSearch) : '';
        const changeUserValue = changeUserSearch.trim().toLowerCase();
        const overdueProductValue = overdueProductFilter.trim().toLowerCase();

        const globalSearch = isFiltered ? searchText.trim().toLowerCase() : '';

        return data.filter((computer) => {
            const employee = (computer as any)?.employee;
            const departmentId = Number(employee?.department?.id || 0);
            const department = String(employee?.department?.name ?? '').toLowerCase();
            const section = String(employee?.section?.name ?? '').toLowerCase();
            const tabelNumber = String(employee?.tabel_number ?? '').toLowerCase();
            const position = String(employee?.position ?? '').toLowerCase();
            const issuedAtRaw = (computer as any)?.issued_at;
            const issuedAt = issuedAtRaw instanceof Date
                ? formatDateKey(issuedAtRaw)
                : String(issuedAtRaw ?? '').split('T')[0];
            const historyDateRaw = (computer as any)?.history_date;
            const historyDate = historyDateRaw ? formatDateKey(new Date(historyDateRaw)) : '';
            const historyUser = String((computer as any)?.history_user ?? '').toLowerCase();

            const fullName = [employee?.last_name, employee?.first_name, employee?.surname]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesGlobalSearch = !globalSearch || [
                department,
                section,
                tabelNumber,
                fullName,
                position,
                issuedAt,
                historyDate,
                historyUser,
            ].some((value) => value.includes(globalSearch));

            const matchesOverdueProduct = !overdueProductValue ||
                getOverdueProducts(computer).some((name) => name.toLowerCase() === overdueProductValue);

            return (
                (!departmentIdValue || departmentId === departmentIdValue) &&
                (!departmentValue || department.includes(departmentValue)) &&
                (!sectionValue || section.includes(sectionValue)) &&
                (!tabelValue || tabelNumber.includes(tabelValue)) &&
                (!userValue || fullName.includes(userValue)) &&
                (!positionValue || position.includes(positionValue)) &&
                (!issuedAtValue || issuedAt === issuedAtValue) &&
                (!changeDateValue || historyDate === changeDateValue) &&
                (!changeUserValue || historyUser.includes(changeUserValue)) &&
                matchesOverdueProduct &&
                matchesGlobalSearch
            );
        });
    }

    const formatDisplayDate = (value: unknown) => {
        if (!value) return '—';
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(parsed.getTime())) return String(value);

        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const formatDisplayDateTime = (value: unknown) => {
        if (!value) return '—';
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(parsed.getTime())) return String(value);

        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        const hours = String(parsed.getHours()).padStart(2, '0');
        const minutes = String(parsed.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    };

    const ipHeader = (
        <div className="flex flex-col items-center gap-2">
            <span>Дата выдачи</span>
            <Calendar
                value={issuedAtSearch}
                onChange={(e) => {
                    setIssuedAtSearch(e.value ? new Date(e.value as Date) : null);
                    setFirst(0);
                }}
                dateFormat="dd.mm.yy"
                placeholder="Выберите дату"
                className="w-[140px] h-7 text-xs"
                inputClassName="text-xs"
                panelClassName="border border-gray-300 bg-white shadow-md"
            />
        </div>
    );

    const sortByDepartment = (data: Compyuter[]): Compyuter[] => {
        return [...data].sort((a, b) => {
            const aSortOrder = Number((a as any).employee?.department?.sort_order || 0);
            const bSortOrder = Number((b as any).employee?.department?.sort_order || 0);
            const aName = (a as any).employee?.department?.name;
            const bName = (b as any).employee?.department?.name;

            if (!aName && !bName) return 0;
            if (!aName) return 1;
            if (!bName) return -1;

            const hasASortOrder = Number.isFinite(aSortOrder) && aSortOrder > 0;
            const hasBSortOrder = Number.isFinite(bSortOrder) && bSortOrder > 0;

            if (hasASortOrder || hasBSortOrder) {
                if (!hasASortOrder) return 1;
                if (!hasBSortOrder) return -1;
                if (aSortOrder !== bSortOrder) {
                    return aSortOrder - bSortOrder;
                }
            }

            const n1 = extractPrefix(aName);
            const n2 = extractPrefix(bName);

            if (n1 === n2) {
                return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
            }
            return n1 - n2;
        });
    };

    // Sort only when checkedComputer changes, not on every local filter change
    const sortedCheckedComputers = useMemo(
        () => (isFiltered && checkedComputer && checkedComputer.length > 0
            ? sortByDepartment(checkedComputer)
            : []),
        [isFiltered, checkedComputer]
    );

    const baseFilteredComputers = useMemo(() => {
        if (!isFiltered) return computers;
        return applyLocalTableFilters(sortedCheckedComputers);
    }, [isFiltered, computers, sortedCheckedComputers, selectedDepartmentId, departmentSearch, sectionSearch, tabelNumberSearch, userSearch, positionSearch, issuedAtSearch, changeDateSearch, changeUserSearch, searchText, overdueProductFilter]);

    const overdueProductOptions = useMemo(() => {
        if (filterKey !== 'overdue') return [];
        const names = new Set<string>();
        sortedCheckedComputers.forEach((row) => {
            getOverdueProducts(row).forEach((name) => names.add(name));
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'));
    }, [filterKey, sortedCheckedComputers]);

    const hasLocalFilters = isFiltered && Boolean(
        selectedDepartmentId ||
        departmentSearch.trim() ||
        sectionSearch.trim() ||
        tabelNumberSearch.trim() ||
        userSearch.trim() ||
        positionSearch.trim() ||
        issuedAtSearch ||
        changeDateSearch ||
        changeUserSearch.trim() ||
        overdueProductFilter.trim()
    );

    const totalRecordsForPaginator = hasLocalFilters
        ? baseFilteredComputers.length
        : totalCount;

    const safeFirst = Math.min(
        first,
        Math.max(0, Math.floor(Math.max(totalRecordsForPaginator - 1, 0) / rows) * rows),
    );

    const filteredComputers = useMemo(() => {
        if (!isFiltered) {
            return baseFilteredComputers;
        }
        const start = safeFirst;
        const end = safeFirst + rows;
        return baseFilteredComputers.slice(start, end);
    }, [baseFilteredComputers, isFiltered, safeFirst, rows]);

    const departmentInputHeader = (
        <div className="flex flex-col items-center gap-2 px-2 py-1">
            <span>Цехы</span>
            <select
                value={selectedDepartmentId ? String(selectedDepartmentId) : ''}
                onChange={(e) => {
                    const nextId = e.target.value ? Number(e.target.value) : null;
                    const nextDepartment = filterOptions.departments.find((department) => department.id === nextId);
                    setSelectedDepartmentId(nextId);
                    setDepartmentSearch(nextDepartment?.name || '');
                    setFirst(0);
                }}
                className="w-[160px] h-8 text-xs bg-white px-2.5 py-1 border border-gray-300 rounded-md"
            >
                <option value="">Все</option>
                {filterOptions.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                        {department.name}
                    </option>
                ))}
            </select>
        </div>
    );

    const sectionInputHeader = (
        <div className="flex flex-col items-center gap-2">
            <span>Отдел</span>
            <InputText
                value={sectionSearch}
                onChange={(e) => {
                    setSectionSearch(e.target.value);
                    setFirst(0);
                }}
                placeholder="Поиск..."
                className="w-[140px] h-7 text-xs bg-transparent px-2 border border-gray-300 rounded-md placeholder:text-xs"
            />
        </div>
    );

    const tabelNumberHeader = (
        <div className="flex flex-col items-center gap-2">
            <span>Таб номер</span>
            <InputText
                value={tabelNumberSearch}
                onChange={(e) => {
                    setTabelNumberSearch(e.target.value);
                    setFirst(0);
                }}
                placeholder="Поиск..."
                className="w-[100px] h-7 text-xs bg-transparent px-2 border border-gray-300 rounded-md placeholder:text-xs"
            />
        </div>
    );

    const userInputHeader = (
        <div className="flex flex-col items-center gap-2">
            <span>Пользователь</span>
            <InputText
                value={userSearch}
                onChange={(e) => {
                    setUserSearch(e.target.value);
                    setFirst(0);
                }}
                placeholder="Поиск..."
                className="w-[140px] h-7 text-xs bg-transparent px-2 border border-gray-300 rounded-md placeholder:text-xs"
            />
        </div>
    );

    const positionInputHeader = (
        <div className="flex flex-col items-center gap-2">
            <span>Должность</span>
            <InputText
                value={positionSearch}
                onChange={(e) => {
                    setPositionSearch(e.target.value);
                    setFirst(0);
                }}
                placeholder="Поиск..."
                className="w-[140px] h-7 text-xs bg-transparent px-2 border border-gray-300 rounded-md placeholder:text-xs"
            />
        </div>
    );

    const actionsHeader = (
        <div className="w-full text-center">Действия</div>
    );

    return (
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="sm:flex justify-between py-6 px-4 md:px-6 xl:px-7.5 border-b">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onShowAllEmployees?.()}
                        className="inline-flex items-center h-9 rounded-md border border-stroke bg-meta-2 px-3 text-[14px] font-semibold text-black transition-colors duration-200 hover:bg-primary hover:text-white dark:border-strokedark dark:bg-meta-4 dark:text-white"
                        title="Показать всех сотрудников"
                    >
                        Все сотрудники: {allEmployeeCount}
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Показать:</span>
                        <select
                            value={rows}
                            onChange={(e) => {
                                const newRows = Number(e.target.value);
                                setRows(newRows);
                                setFirst(0);
                            }}
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
                <div className="flex items-center gap-3">
                    <input
                        ref={importFileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleImportFileChange}
                    />

                    {canExportExcel && (
                        <button
                            onClick={handleExportToExcel}
                            disabled={isExporting}
                            className={`hidden lg:flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-200 ${isExporting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                } text-white`}
                            title="Скачать данные в Excel"
                            aria-label="Скачать данные в Excel"
                        >
                            {isExporting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <FaFileExcel className="w-5 h-5" />
                            )}
                        </button>
                    )}

                    {/* Глобальный поиск */}
                    <InputText
                        type="search"
                        value={searchText}
                        onChange={onSearch}
                        placeholder="Поиск..."
                        className="h-9"
                    />

                </div>
            </div>

            {loadingFilter && (
                <div className="flex justify-center items-center py-8">
                    <ProgressSpinner
                        style={{ width: '50px', height: '50px' }}
                        strokeWidth="4"
                    />
                    <span className="ml-3 text-gray-600">Загрузка данных...</span>
                </div>
            )}


            <div className={loadingFilter ? 'hidden' : ''}>
                <DataTable
                    value={filteredComputers}
                    paginator
                    lazy
                    first={safeFirst}
                    rows={rows}
                    onPage={e => {
                        if (e.rows !== rows) {
                            setRows(e.rows);
                            setFirst(0);
                            return;
                        }

                        const activeTotalRecords = totalRecordsForPaginator;
                        const maxFirst = Math.max(0, Math.floor(Math.max(activeTotalRecords - 1, 0) / e.rows) * e.rows);
                        setRows(e.rows);
                        setFirst(Math.min(e.first, maxFirst));
                    }}
                    totalRecords={totalRecordsForPaginator}
                    filters={filters}
                    emptyMessage={
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '20px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: 'gray',
                            }}
                        >
                            🚫 Данные не найдены
                        </div>
                    }
                    globalFilterFields={[
                        'employee.department.name',
                        'employee.section.name',
                        'employee.tabel_number',
                        'employee.first_name',
                        'employee.last_name',
                        'employee.surname',
                        'employee.position',
                        'issued_at',
                        'next_due_date',
                        'isActive',
                        'slug',
                        'issued_by_info.username',
                        'issued_by_info.full_name',
                        'addedUser',
                        'updatedUser',
                        'updatedAt',
                        'history_date',
                        'history_user'
                    ]}
                    rowClassName={() => 'border border-gray-300'}
                    className="p-3 table-border"
                    style={{ fontSize: '90%' }}
                >
                    <Column
                        header="№"
                        body={(_, options) => {
                            const globalIndex = options.rowIndex + 1;
                            return <span>{globalIndex}</span>;
                        }}
                        bodyStyle={{ border: '1px solid #c8c5c4', }}
                        style={{ width: '40px', textAlign: 'center' }}
                        headerStyle={{
                            fontWeight: 'bold',
                            textAlign: 'center',
                            paddingLeft: '15px',
                            color: 'black',
                            border: '1px solid #c8c5c4',
                        }}
                    />

                    <Column
                        field="employee.tabel_number"
                        header={tabelNumberHeader}
                        style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
                        bodyStyle={{
                            paddingLeft: '10px',
                            width: '120px',
                            minWidth: '120px',
                            maxWidth: '120px',
                        }}
                        headerStyle={{
                            fontWeight: 'bold',
                            border: '1px solid #c8c5c4',
                            textAlign: 'center',
                            padding: '10px',
                            color: 'black',
                            width: '120px',
                            minWidth: '120px',
                            maxWidth: '120px',
                        }}
                    />

                    <Column
                        field="employee.first_name"
                        header={userInputHeader}
                        body={userBodyTemplate}
                        bodyStyle={{
                            minWidth: '210px',
                            maxWidth: '260px',
                        }}
                        headerStyle={{
                            fontWeight: 'bold',
                            border: '1px solid #c8c5c4',
                            textAlign: 'center',
                            padding: '10px',
                            color: 'black',
                            minWidth: '210px',
                        }}
                    />

                    <Column
                        field="employee.department.name"
                        header={departmentInputHeader}
                        className="hidden lg:table-cell"
                        headerClassName="hidden lg:table-cell"
                        bodyStyle={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            width: "300px",
                            padding: "10px",
                            paddingLeft: "15px",
                        }}
                        headerStyle={{
                            fontWeight: 'bold',
                            border: '1px solid #c8c5c4',
                            textAlign: 'center',
                            padding: '10px',
                            color: 'black',
                        }}
                    />
                    <Column
                        field="employee.section.name"
                        header={sectionInputHeader}
                        className="hidden lg:table-cell"
                        headerClassName="hidden lg:table-cell"
                        headerStyle={{
                            fontWeight: 'bold',
                            border: '1px solid #c8c5c4',
                            textAlign: 'center',
                            padding: '10px',
                            color: 'black',
                        }}
                    />
                    <Column
                        field="employee.position"
                        body={typeComputerBodyTemplate}
                        header={positionInputHeader}
                        className="hidden lg:table-cell"
                        headerClassName="hidden lg:table-cell"
                        bodyStyle={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            padding: '10px',
                            minWidth: '220px',
                        }}
                        headerStyle={{
                            fontWeight: 'bold',
                            border: '1px solid #c8c5c4',
                            textAlign: 'center',
                            padding: '10px',
                            color: 'black',
                            minWidth: '220px',
                        }}
                    />
                    {filterKey === 'overdue' && (
                        <Column
                            header={
                                <div className="flex flex-col items-center gap-2">
                                    <span>Просроченные СИЗ</span>
                                    <select
                                        value={overdueProductFilter}
                                        onChange={(e) => {
                                            setOverdueProductFilter(e.target.value);
                                            setFirst(0);
                                        }}
                                        className="w-[170px] h-8 text-xs bg-white px-2.5 py-1 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Все</option>
                                        {overdueProductOptions.map((name) => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            }
                            className="hidden lg:table-cell"
                            headerClassName="hidden lg:table-cell"
                            body={(rowData) => {
                                const overdue = getOverdueProducts(rowData);
                                if (overdue.length === 0) return <span className="text-gray-400">—</span>;
                                return (
                                    <div className="flex flex-col gap-1">
                                        {overdue.map((name) => (
                                            <span
                                                key={name}
                                                className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                                            >
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                );
                            }}
                            bodyStyle={{
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                padding: '10px',
                                minWidth: '200px',
                            }}
                            headerStyle={{
                                fontWeight: 'bold',
                                border: '1px solid #c8c5c4',
                                textAlign: 'center',
                                padding: '10px',
                                color: 'black',
                                minWidth: '200px',
                            }}
                        />
                    )}
                    <Column
                        field="issued_at"
                        header={ipHeader}
                        className="hidden lg:table-cell"
                        headerClassName="hidden lg:table-cell"
                        body={(rowData) => formatDisplayDate((rowData as any)?.issued_at)}
                        headerStyle={{
                            fontWeight: 'bold',
                            border: '1px solid #c8c5c4',
                            textAlign: 'center',
                            padding: '10px',
                            color: 'black',
                        }}
                    />

                    <Column
                        field="changes"
                        header={changesHeader}
                        className="hidden lg:table-cell"
                        headerClassName="hidden lg:table-cell"
                        body={(rowData) => (
                            <div style={{ textAlign: 'center', fontSize: '0.8rem', lineHeight: 1.2 }}>
                                {(rowData as any)?.history_date
                                    ? <div>{formatDisplayDateTime((rowData as any).history_date)}</div>
                                    : <div style={{ color: '#bbb' }}>—</div>
                                }
                                {(rowData as any)?.history_user
                                    ? <div>{(rowData as any).history_user}</div>
                                    : null
                                }
                            </div>
                        )}
                        headerStyle={{
                            fontWeight: 'bold',
                            border: '1px solid #c8c5c4',
                            textAlign: 'center',
                            padding: '10px',
                            color: 'black',
                            width: '170px',
                        }}
                        bodyStyle={{
                            width: '170px',
                            minWidth: '170px',
                            maxWidth: '170px',
                        }}
                        style={{
                            width: '170px',
                            minWidth: '170px',
                            maxWidth: '170px',
                        }}
                    />
                </DataTable>
            </div>


            <ModalDeleteComponent
                openDeleteModal={openDeleteModal}
                setDeleteOpenModal={setDeleteOpenModal}
                deleteModalData={deleteModalData}
                setDeleteCompData={setDeleteCompData}
                canDelete={canDelete}
            />
        </div>
    );
}
