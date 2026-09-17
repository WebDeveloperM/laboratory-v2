import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Modal } from 'flowbite-react';
import { FiAlertTriangle, FiTrash2 } from 'react-icons/fi';
import axioss from '../../api/axios';

type PositionOption = {
  selection_key: string;
  position_name: string;
  position_key: string;
  employee_count: number;
  department_id: number | null;
  department_name: string;
};

type DepartmentOption = {
  id: number;
  name: string;
};

type PPEProduct = {
  id: number;
  name: string;
  renewal_months: number;
  type_product: string | null;
  target_gender: 'ALL' | 'M' | 'F';
  is_active?: boolean;
};

type DepartmentPPERule = {
  id: number;
  department_service_id?: number | null;
  department_name?: string;
  position_name: string;
  ppeproduct: number;
  ppeproduct_name: string;
  ppeproduct_type_product?: string | null;
  ppeproduct_target_gender?: 'ALL' | 'M' | 'F';
  ppeproduct_target_gender_display?: string;
  is_allowed: boolean;
  renewal_months: number;
};

type DepartmentPPERuleGroup = {
  key: string;
  department_service_id: number | null;
  department_name: string;
  position_name: string;
  items: DepartmentPPERule[];
};

type DepartmentPPERuleTableRow = {
  key: string;
  department_service_id: number | null;
  department_name: string;
  position_name: string;
  position_names: string[];
  ppeproduct_name: string;
  ppeproduct_target_gender_display: string;
  renewal_months_display: string;
  items: DepartmentPPERule[];
};

const normalizeRole = (rawRole: string | null): 'admin' | 'it_center' | 'shift_head' | 'sttl_head' | 'czl_head' | 'dispatcher' | 'user' => {
  const value = String(rawRole || '').trim().toLowerCase();
  if (value === 'admin' || value === 'админ') return 'admin';
  if (value === 'it_center' || value === 'it-center' || value === 'it center') return 'it_center';
  if (value === 'shift_head' || value === 'начальник смены') return 'shift_head';
  if (value === 'sttl_head' || value === 'начальник сттл') return 'sttl_head';
  if (value === 'czl_head' || value === 'начальник цзл') return 'czl_head';
  if (value === 'dispatcher' || value === 'диспетчер') return 'dispatcher';
  return 'user';
};

const getBackendError = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0];
    if (typeof firstItem === 'string' && firstItem.trim()) return firstItem;
    if (firstItem && typeof firstItem === 'object') {
      const firstNestedField = Object.values(firstItem)[0];
      if (Array.isArray(firstNestedField) && firstNestedField.length) {
        return String(firstNestedField[0]);
      }
      if (typeof firstNestedField === 'string' && firstNestedField.trim()) {
        return firstNestedField;
      }
    }
  }
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  const firstField = Object.values(data)[0];
  if (Array.isArray(firstField) && firstField.length) {
    return String(firstField[0]);
  }
  return fallback;
};

const LARGE_RULE_MODAL_THEME = {
  root: {
    sizes: {
      '7xl': 'w-[80vw] max-w-[80vw]',
    },
  },
  content: {
    inner: 'relative flex h-[70vh] max-h-[70vh] flex-col rounded-lg bg-white shadow dark:bg-gray-700',
  },
};

const POSITION_PICKER_MODAL_THEME = {
  root: {
    sizes: {
      '6xl': 'w-[80vw] max-w-[80vw]',
    },
  },
  content: {
    inner: 'relative flex h-[70vh] max-h-[70vh] flex-col rounded-lg bg-white shadow dark:bg-gray-700',
  },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const DepartmentPPERulePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const canEditBaseSettings = role === 'admin' || role === 'it_center' || role === 'shift_head' || role === 'sttl_head' || role === 'czl_head' || role === 'dispatcher';
  const isAdmin = role === 'admin';
  const isCreatePage = location.pathname.endsWith('/create');

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [products, setProducts] = useState<PPEProduct[]>([]);
  const [rules, setRules] = useState<DepartmentPPERule[]>([]);
  const [selectedPositionKeys, setSelectedPositionKeys] = useState<string[]>([]);
  const [productMonths, setProductMonths] = useState<Record<number, string>>({});
  const [productAllowed, setProductAllowed] = useState<Record<number, boolean>>({});
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');
  const [pickerDepartmentSearch, setPickerDepartmentSearch] = useState('');
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editingTableRowKey, setEditingTableRowKey] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<DepartmentPPERuleTableRow | null>(null);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isPositionPickerOpen, setIsPositionPickerOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const selectedPositionEntries = useMemo(
    () => positions.filter((position) => selectedPositionKeys.includes(position.selection_key)),
    [positions, selectedPositionKeys],
  );

  const departmentOrderMap = useMemo(() => {
    const nextMap = new Map<number, number>();
    departments.forEach((department, index) => nextMap.set(department.id, index));
    return nextMap;
  }, [departments]);

  const departmentNameMap = useMemo(() => {
    const nextMap = new Map<number, string>();
    departments.forEach((department) => nextMap.set(department.id, department.name));
    return nextMap;
  }, [departments]);

  const getRuleDepartmentName = (rule: DepartmentPPERule) => {
    if (rule.department_service_id !== null && rule.department_service_id !== undefined) {
      const mappedName = departmentNameMap.get(rule.department_service_id);
      if (mappedName) {
        return mappedName;
      }
    }
    return String(rule.department_name || '').trim();
  };

  const findExistingRule = (departmentId: number | null, positionName: string, ppeproductId: number) => {
    const normalizedPositionName = positionName.trim().toLowerCase();
    return rules.find((rule) => (
      (rule.department_service_id ?? null) === departmentId
      && rule.position_name.trim().toLowerCase() === normalizedPositionName
      && rule.ppeproduct === ppeproductId
    ));
  };

  const departmentTree = useMemo(() => {
    const orderMap = new Map<number, number>();
    departments.forEach((department, index) => orderMap.set(department.id, index));

    const groupedDepartments = new Map<string, { id: number | null; name: string; positions: PositionOption[] }>();
    positions.forEach((position) => {
      const departmentKey = `${position.department_id ?? 'none'}:${position.department_name}`;
      const existing = groupedDepartments.get(departmentKey);
      if (existing) {
        existing.positions.push(position);
        return;
      }

      groupedDepartments.set(departmentKey, {
        id: position.department_id,
        name: position.department_name || 'Без цеха',
        positions: [position],
      });
    });

    return Array.from(groupedDepartments.values())
      .map((department) => ({
        ...department,
        positions: [...department.positions].sort((left, right) => left.position_name.localeCompare(right.position_name, 'ru')),
      }))
      .sort((left, right) => {
        const leftOrder = left.id !== null ? orderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        const rightOrder = right.id !== null ? orderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return left.name.localeCompare(right.name, 'ru');
      });
  }, [departments, positions]);

  const filteredRules = useMemo(() => {
    const normalizedDepartmentSearch = departmentSearch.trim().toLowerCase();
    const normalizedPositionSearch = positionSearch.trim().toLowerCase();

    return rules
      .filter((rule) => {
        const resolvedDepartmentName = getRuleDepartmentName(rule);
        const matchesDepartment = !normalizedDepartmentSearch
          || resolvedDepartmentName.toLowerCase().includes(normalizedDepartmentSearch);
        const matchesPosition = !normalizedPositionSearch
          || rule.position_name.toLowerCase().includes(normalizedPositionSearch);

        return matchesDepartment && matchesPosition;
      })
      .sort((left, right) => {
        const leftHasDepartmentId = left.department_service_id !== null && left.department_service_id !== undefined;
        const rightHasDepartmentId = right.department_service_id !== null && right.department_service_id !== undefined;

        if (leftHasDepartmentId !== rightHasDepartmentId) {
          return leftHasDepartmentId ? -1 : 1;
        }

        const leftDepartmentOrder = leftHasDepartmentId
          ? departmentOrderMap.get(left.department_service_id as number) ?? Number.MAX_SAFE_INTEGER
          : Number.MAX_SAFE_INTEGER;
        const rightDepartmentOrder = rightHasDepartmentId
          ? departmentOrderMap.get(right.department_service_id as number) ?? Number.MAX_SAFE_INTEGER
          : Number.MAX_SAFE_INTEGER;

        if (leftDepartmentOrder !== rightDepartmentOrder) {
          return leftDepartmentOrder - rightDepartmentOrder;
        }

        const departmentCompare = getRuleDepartmentName(left).localeCompare(getRuleDepartmentName(right), 'ru');
        if (departmentCompare !== 0) {
          return departmentCompare;
        }

        const positionCompare = left.position_name.localeCompare(right.position_name, 'ru');
        if (positionCompare !== 0) {
          return positionCompare;
        }

        return left.ppeproduct_name.localeCompare(right.ppeproduct_name, 'ru');
      });
  }, [departmentOrderMap, departmentSearch, positionSearch, rules]);

  const filteredDepartmentTree = useMemo(() => {
    const normalizedSearch = pickerDepartmentSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return departmentTree;
    }

    return departmentTree.filter((department: { id: number | null; name: string; positions: PositionOption[] }) => department.name.toLowerCase().includes(normalizedSearch));
  }, [departmentTree, pickerDepartmentSearch]);

  const groupedRules = useMemo<DepartmentPPERuleGroup[]>(() => {
    const groups = new Map<string, DepartmentPPERuleGroup>();

    filteredRules.forEach((rule) => {
      const departmentName = getRuleDepartmentName(rule);
      const departmentId = rule.department_service_id ?? null;
      const groupKey = `${departmentId ?? 'none'}:${departmentName}:${rule.position_name}`;
      const existingGroup = groups.get(groupKey);

      if (existingGroup) {
        existingGroup.items.push(rule);
        return;
      }

      groups.set(groupKey, {
        key: groupKey,
        department_service_id: departmentId,
        department_name: departmentName,
        position_name: rule.position_name,
        items: [rule],
      });
    });

    return Array.from(groups.values());
  }, [filteredRules]);

  const editingGroup = useMemo(
    () => groupedRules.find((group) => group.key === editingGroupKey) ?? null,
    [editingGroupKey, groupedRules],
  );

  const tableRows = useMemo<DepartmentPPERuleTableRow[]>(() => {
    const rowMap = new Map<string, DepartmentPPERuleTableRow>();

    groupedRules.forEach((group) => {
      const departmentName = group.department_name;
      const departmentId = group.department_service_id ?? null;
      const rulesSignature = [...group.items]
        .sort((left, right) => left.ppeproduct - right.ppeproduct)
        .map((rule) => `${rule.ppeproduct}:${rule.is_allowed ? '1' : '0'}:${rule.renewal_months}`)
        .join('|');
      const rowKey = `${departmentId ?? 'none'}:${departmentName}:${rulesSignature}`;
      const existingRow = rowMap.get(rowKey);

      if (existingRow) {
        existingRow.items.push(...group.items);
        if (!existingRow.position_names.includes(group.position_name)) {
          existingRow.position_names.push(group.position_name);
          existingRow.position_names.sort((left, right) => left.localeCompare(right, 'ru'));
          existingRow.position_name = existingRow.position_names.join(', ');
        }

        const renewalMonthValues = Array.from(new Set(existingRow.items.map((item) => String(item.renewal_months))));
        existingRow.renewal_months_display = renewalMonthValues.join(', ');
        return;
      }

      rowMap.set(rowKey, {
        key: rowKey,
        department_service_id: departmentId,
        department_name: departmentName,
        position_name: group.position_name,
        position_names: [group.position_name],
        ppeproduct_name: group.items.map((item) => item.ppeproduct_name).join(', '),
        ppeproduct_target_gender_display: group.items.map((item) => item.ppeproduct_target_gender_display || 'Для всех').join(', '),
        renewal_months_display: Array.from(new Set(group.items.map((item) => String(item.renewal_months)))).join(', '),
        items: [...group.items],
      });
    });

    return Array.from(rowMap.values()).sort((left, right) => {
      const leftHasDepartmentId = left.department_service_id !== null && left.department_service_id !== undefined;
      const rightHasDepartmentId = right.department_service_id !== null && right.department_service_id !== undefined;

      if (leftHasDepartmentId !== rightHasDepartmentId) {
        return leftHasDepartmentId ? -1 : 1;
      }

      const leftDepartmentOrder = leftHasDepartmentId
        ? departmentOrderMap.get(left.department_service_id as number) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;
      const rightDepartmentOrder = rightHasDepartmentId
        ? departmentOrderMap.get(right.department_service_id as number) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;

      if (leftDepartmentOrder !== rightDepartmentOrder) {
        return leftDepartmentOrder - rightDepartmentOrder;
      }

      const departmentCompare = left.department_name.localeCompare(right.department_name, 'ru');
      if (departmentCompare !== 0) {
        return departmentCompare;
      }

      return left.ppeproduct_name.localeCompare(right.ppeproduct_name, 'ru');
    });
  }, [departmentOrderMap, groupedRules]);

  const selectedGroups = useMemo(
    () => tableRows.filter((group) => selectedGroupKeys.includes(group.key)),
    [selectedGroupKeys, tableRows],
  );

  const totalPages = Math.max(1, Math.ceil(tableRows.length / tableRowsPerPage));

  const paginatedTableRows = useMemo(() => {
    const startIndex = (currentPage - 1) * tableRowsPerPage;
    return tableRows.slice(startIndex, startIndex + tableRowsPerPage);
  }, [currentPage, tableRows, tableRowsPerPage]);

  useEffect(() => {
    setCurrentPage((prev: number) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [departmentSearch, positionSearch, tableRowsPerPage]);

  const editingTableRow = useMemo(
    () => tableRows.find((row) => row.key === editingTableRowKey) ?? null,
    [editingTableRowKey, tableRows],
  );

  const isPositionOccupied = (position: PositionOption) => {
    return rules.some((rule) => {
      const isSameScope = (rule.department_service_id ?? null) === (position.department_id ?? null)
        && rule.position_name.trim().toLowerCase() === position.position_name.trim().toLowerCase();

      if (!isSameScope) {
        return false;
      }

      if (editingTableRow !== null) {
        return !editingTableRow.items.some((editingRule) => (
          (editingRule.department_service_id ?? null) === (position.department_id ?? null)
          && editingRule.position_name.trim().toLowerCase() === position.position_name.trim().toLowerCase()
        ));
      }

      if (editingGroup !== null) {
        return !editingGroup.items.some((editingRule) => editingRule.id === rule.id);
      }

      return true;
    });
  };

  const selectablePositionKeys = useMemo(
    () => positions
      .filter((position) => !isPositionOccupied(position))
      .map((position) => position.selection_key),
    [editingGroup, editingTableRow, positions, rules],
  );

  const isAllPositionsSelected = selectablePositionKeys.length > 0
    && selectablePositionKeys.every((selectionKey) => selectedPositionKeys.includes(selectionKey));

  const isAllVisibleGroupsSelected = paginatedTableRows.length > 0
    && paginatedTableRows.every((group) => selectedGroupKeys.includes(group.key));

  const positionButtonLabel = useMemo(() => {
    if (editingTableRow !== null) {
      return `Выбрано должностей: ${selectedPositionEntries.length}`;
    }
    if (editingGroup !== null) {
      if (selectedPositionEntries[0]) {
        const entry = selectedPositionEntries[0];
        return entry.department_name ? `${entry.position_name} (${entry.department_name})` : entry.position_name;
      }
      return 'Выберите должность';
    }
    if (isAllPositionsSelected) {
      return 'Выбраны все должности';
    }
    if (selectedPositionKeys.length === 0) {
      return 'Выберите цех и должность';
    }
    if (selectedPositionEntries.length === 1) {
      const entry = selectedPositionEntries[0];
      return entry.department_name ? `${entry.position_name} (${entry.department_name})` : entry.position_name;
    }
    return `Выбрано должностей: ${selectedPositionKeys.length}`;
  }, [editingGroup, editingTableRow, isAllPositionsSelected, selectedPositionEntries, selectedPositionKeys]);

  const selectedPositionsByDepartment = useMemo(() => {
    const groupedDepartments = new Map<string, { departmentName: string; positions: string[] }>();

    selectedPositionEntries.forEach((entry) => {
      const departmentName = entry.department_name || 'Без цеха';
      const existingDepartment = groupedDepartments.get(departmentName);

      if (existingDepartment) {
        if (!existingDepartment.positions.includes(entry.position_name)) {
          existingDepartment.positions.push(entry.position_name);
        }
        return;
      }

      groupedDepartments.set(departmentName, {
        departmentName,
        positions: [entry.position_name],
      });
    });

    return Array.from(groupedDepartments.values())
      .map((entry) => ({
        ...entry,
        positions: [...entry.positions].sort((left, right) => left.localeCompare(right, 'ru')),
      }))
      .sort((left, right) => left.departmentName.localeCompare(right.departmentName, 'ru'));
  }, [selectedPositionEntries]);

  const productsForBulkEdit = useMemo(
    () => products.filter((product) => product.is_active !== false).sort((left, right) => left.name.localeCompare(right.name, 'ru')),
    [products],
  );

  const getProductAllowedValue = (productId: number) => {
    if (productAllowed[productId] !== undefined) {
      return productAllowed[productId];
    }
    if (editingGroup !== null || editingTableRow !== null) {
      return false;
    }
    return true;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [departmentsRes, positionsRes, productsRes, rulesRes] = await Promise.all([
        axioss.get('/settings/departments/'),
        axioss.get('/settings/employee-positions/'),
        axioss.get('/settings/ppe-products/'),
        axioss.get('/settings/ppe-department-rules/'),
      ]);

      setDepartments(departmentsRes.data || []);
      setPositions(positionsRes.data || []);
      setProducts(productsRes.data || []);
      setRules(rulesRes.data || []);
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось загрузить данные'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canEditBaseSettings) {
      setLoading(false);
      return;
    }
    loadData();
  }, [canEditBaseSettings]);

  const resetForm = () => {
    setSelectedPositionKeys([]);
    setProductMonths({});
    setProductAllowed({});
    setPickerDepartmentSearch('');
    setEditingGroupKey(null);
    setEditingTableRowKey(null);
    setIsPositionPickerOpen(false);
  };

  const closeRuleModal = () => {
    setIsRuleModalOpen(false);
    resetForm();
  };

  const openCreateRulePage = () => {
    resetForm();
    navigate('/nastroyka/ppe-norms/create');
  };

  const handleCancelRuleForm = () => {
    if (isCreatePage) {
      resetForm();
      navigate('/nastroyka/ppe-norms');
      return;
    }
    closeRuleModal();
  };

  const toggleGroupSelection = (groupKey: string) => {
    setSelectedGroupKeys((prev) => (
      prev.includes(groupKey)
        ? prev.filter((item) => item !== groupKey)
        : [...prev, groupKey]
    ));
  };

  const toggleSelectAllVisibleGroups = () => {
    setSelectedGroupKeys((prev) => {
      if (paginatedTableRows.length === 0) {
        return prev;
      }

      const visibleKeys = paginatedTableRows.map((group) => group.key);
      const allSelected = visibleKeys.every((key) => prev.includes(key));
      if (allSelected) {
        return prev.filter((key) => !visibleKeys.includes(key));
      }

      return Array.from(new Set([...prev, ...visibleKeys]));
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedPositionKeys.length === 0) {
      toast.warning('Выберите хотя бы одну должность');
      return;
    }

    const selectedEntry = selectedPositionEntries[0];
    if (!selectedEntry) {
      toast.warning('Выберите должность');
      return;
    }

    const productRules: Array<{ ppeproduct: number; renewal_months: number; is_allowed: boolean }> = productsForBulkEdit.map((product) => {
      const rawValue = productMonths[product.id];
      const hasExplicitValue = rawValue !== undefined && String(rawValue).trim() !== '';
      const isAllowed = getProductAllowedValue(product.id);

      return {
        ppeproduct: product.id,
        renewal_months: hasExplicitValue
          ? Number(String(rawValue).trim())
          : (isAllowed ? Number(product.renewal_months ?? 0) : 0),
        is_allowed: isAllowed,
      };
    });

    const normalizedProductRules = productRules.filter((item) => Number.isFinite(item.renewal_months));

    if (normalizedProductRules.length === 0) {
      toast.warning('Укажите срок выдачи хотя бы для одного СИЗ или снимите разрешение для ненужных позиций');
      return;
    }

    try {
      if (editingTableRow !== null) {
        const existingRulesByScopeAndProduct = new Map<string, DepartmentPPERule>(
          editingTableRow.items.map((rule) => [
            `${rule.department_service_id ?? 'none'}:${rule.position_name.trim().toLowerCase()}:${rule.ppeproduct}`,
            rule,
          ]),
        );

        if (normalizedProductRules.length === 0) {
          toast.warning('Укажите параметры хотя бы для одного СИЗ');
          return;
        }

        const selectedEntriesByScope = new Map<string, PositionOption>(
          selectedPositionEntries.map((entry) => [
            `${entry.department_id ?? 'none'}:${entry.position_name.trim().toLowerCase()}`,
            entry,
          ]),
        );

        const updateRequests: Promise<any>[] = [];
        const createRequests: Promise<any>[] = [];

        selectedPositionEntries.forEach((entry) => {
          const scopeKey = `${entry.department_id ?? 'none'}:${entry.position_name.trim().toLowerCase()}`;
          const missingProductRules: Array<{ ppeproduct: number; renewal_months: number; is_allowed: boolean }> = [];

          normalizedProductRules.forEach((productRule) => {
            const existingRule = existingRulesByScopeAndProduct.get(`${scopeKey}:${productRule.ppeproduct}`);
            if (existingRule) {
              updateRequests.push(
                axioss.put(`/settings/ppe-department-rules/${existingRule.id}/`, {
                  department_service_id: entry.department_id,
                  department_name: entry.department_name,
                  position_name: entry.position_name,
                  ppeproduct: productRule.ppeproduct,
                  is_allowed: productRule.is_allowed,
                  renewal_months: productRule.renewal_months,
                }),
              );
              return;
            }

            missingProductRules.push(productRule);
          });

          if (missingProductRules.length > 0) {
            createRequests.push(
              axioss.post('/settings/ppe-department-rules/', {
                position_entries: [{
                  department_service_id: entry.department_id,
                  department_name: entry.department_name,
                  position_name: entry.position_name,
                }],
                product_rules: missingProductRules,
              }),
            );
          }
        });

        const normalizedProductIds = new Set(normalizedProductRules.map((item) => item.ppeproduct));
        const deleteRequests = editingTableRow.items
          .filter((rule) => {
            const scopeKey = `${rule.department_service_id ?? 'none'}:${rule.position_name.trim().toLowerCase()}`;
            return !selectedEntriesByScope.has(scopeKey) || !normalizedProductIds.has(rule.ppeproduct);
          })
          .map((rule) => axioss.delete(`/settings/ppe-department-rules/${rule.id}/`));

        const [updatedResponses, createdResponses] = await Promise.all([
          Promise.all(updateRequests),
          Promise.all(createRequests),
        ]);

        await Promise.all(deleteRequests);

        const updatedRules = updatedResponses.map((response) => response.data as DepartmentPPERule);
        const createdRules = createdResponses.flatMap((response) => (
          Array.isArray(response.data) ? response.data : [response.data]
        )) as DepartmentPPERule[];
        const deletedRuleIds = new Set(
          editingTableRow.items
            .filter((rule) => {
              const scopeKey = `${rule.department_service_id ?? 'none'}:${rule.position_name.trim().toLowerCase()}`;
              return !selectedEntriesByScope.has(scopeKey) || !normalizedProductIds.has(rule.ppeproduct);
            })
            .map((rule) => rule.id),
        );

        setRules((prev) => {
          const remaining = prev.filter((item) => !deletedRuleIds.has(item.id));
          const merged = remaining.map((item) => updatedRules.find((updatedItem) => updatedItem.id === item.id) ?? item);
          const existingIds = new Set(merged.map((item) => item.id));
          return [...merged, ...createdRules.filter((item) => !existingIds.has(item.id))];
        });
        toast.success('Нормы обновлены');
      } else if (editingGroup !== null) {
        const existingRulesByProduct = new Map<number, DepartmentPPERule>(
          editingGroup.items.map((rule) => [rule.ppeproduct, rule]),
        );
        const nextProductIds = new Set(normalizedProductRules.map((item) => item.ppeproduct));

        const updateRequests = normalizedProductRules
          .filter((item) => existingRulesByProduct.has(item.ppeproduct))
          .map((item) => {
            const existingRule = existingRulesByProduct.get(item.ppeproduct)!;
            return axioss.put(`/settings/ppe-department-rules/${existingRule.id}/`, {
              department_service_id: selectedEntry.department_id,
              department_name: selectedEntry.department_name,
              position_name: selectedEntry.position_name,
              ppeproduct: item.ppeproduct,
              is_allowed: item.is_allowed,
              renewal_months: item.renewal_months,
            });
          });

        const createPayload = normalizedProductRules
          .filter((item) => !existingRulesByProduct.has(item.ppeproduct))
          .map((item) => ({
            ppeproduct: item.ppeproduct,
            is_allowed: item.is_allowed,
            renewal_months: item.renewal_months,
          }));

        const deleteRequests = editingGroup.items
          .filter((rule) => !nextProductIds.has(rule.ppeproduct))
          .map((rule) => axioss.delete(`/settings/ppe-department-rules/${rule.id}/`));

        const [updatedResponses, createdResponse] = await Promise.all([
          Promise.all(updateRequests),
          createPayload.length > 0
            ? axioss.post('/settings/ppe-department-rules/', {
              position_entries: [{
                department_service_id: selectedEntry.department_id,
                department_name: selectedEntry.department_name,
                position_name: selectedEntry.position_name,
              }],
              product_rules: createPayload,
            })
            : Promise.resolve(null),
        ]);

        await Promise.all(deleteRequests);

        const updatedRules = updatedResponses.map((response) => response.data as DepartmentPPERule);
        const createdRules = createdResponse
          ? ((Array.isArray(createdResponse.data) ? createdResponse.data : [createdResponse.data]) as DepartmentPPERule[])
          : [];
        const deletedRuleIds = new Set(
          editingGroup.items.filter((rule) => !nextProductIds.has(rule.ppeproduct)).map((rule) => rule.id),
        );

        setRules((prev) => {
          const remaining = prev.filter((item) => !deletedRuleIds.has(item.id));
          const merged = remaining.map((item) => updatedRules.find((updatedItem) => updatedItem.id === item.id) ?? item);
          return [...merged, ...createdRules];
        });
        toast.success('Нормы обновлены');
      } else {
        const updateRequests: Promise<any>[] = [];
        const createRequests: Promise<any>[] = [];

        selectedPositionEntries.forEach((entry) => {
          const missingProductRules: Array<{ ppeproduct: number; renewal_months: number; is_allowed: boolean }> = [];

          normalizedProductRules.forEach((productRule) => {
            const existingRule = findExistingRule(entry.department_id ?? null, entry.position_name, productRule.ppeproduct);
            if (existingRule) {
              updateRequests.push(
                axioss.put(`/settings/ppe-department-rules/${existingRule.id}/`, {
                  department_service_id: entry.department_id,
                  department_name: entry.department_name,
                  position_name: entry.position_name,
                  ppeproduct: productRule.ppeproduct,
                  is_allowed: productRule.is_allowed,
                  renewal_months: productRule.renewal_months,
                }),
              );
            } else {
              missingProductRules.push(productRule);
            }
          });

          if (missingProductRules.length > 0) {
            createRequests.push(
              axioss.post('/settings/ppe-department-rules/', {
                position_entries: [{
                  department_service_id: entry.department_id,
                  department_name: entry.department_name,
                  position_name: entry.position_name,
                }],
                product_rules: missingProductRules,
              }),
            );
          }
        });

        const [updatedResponses, createdResponses] = await Promise.all([
          Promise.all(updateRequests),
          Promise.all(createRequests),
        ]);

        const updatedRules = updatedResponses.map((response) => response.data as DepartmentPPERule);
        const createdRules = createdResponses.flatMap((response) => (
          Array.isArray(response.data) ? response.data : [response.data]
        )) as DepartmentPPERule[];

        setRules((prev) => {
          const merged = prev.map((item) => updatedRules.find((updatedItem) => updatedItem.id === item.id) ?? item);
          const existingIds = new Set(merged.map((item) => item.id));
          const nextCreatedRules = createdRules.filter((item) => !existingIds.has(item.id));
          return [...merged, ...nextCreatedRules];
        });

        const affectedCount = updatedRules.length + createdRules.length;
        toast.success(affectedCount > 1 ? 'Нормы сохранены' : 'Норма сохранена');
      }

      if (isCreatePage) {
        resetForm();
        navigate('/nastroyka/ppe-norms');
      } else {
        closeRuleModal();
      }
    } catch (error) {
      toast.error(getBackendError(error, editingGroup !== null || editingTableRow !== null ? 'Ошибка при обновлении норм' : 'Ошибка при добавлении нормы'));
    }
  };

  const handleTableRowEdit = (row: DepartmentPPERuleTableRow) => {
    if (row.items.length === 0) {
      return;
    }

    const matchedSelectionKeys = row.items
      .map((rule) => positions.find((position) => (
        position.position_name === rule.position_name
        && (position.department_id ?? null) === (rule.department_service_id ?? null)
      ))?.selection_key)
      .filter((selectionKey): selectionKey is string => Boolean(selectionKey));

    setEditingGroupKey(null);
    setEditingTableRowKey(row.key);
    setSelectedPositionKeys(Array.from(new Set(matchedSelectionKeys)));
    setProductMonths(
      row.items.reduce<Record<number, string>>((accumulator, item) => {
        accumulator[item.ppeproduct] = String(item.renewal_months);
        return accumulator;
      }, {}),
    );
    setProductAllowed(
      row.items.reduce<Record<number, boolean>>((accumulator, item) => {
        accumulator[item.ppeproduct] = item.is_allowed;
        return accumulator;
      }, {}),
    );
    setIsRuleModalOpen(true);
  };

  const handleGroupEdit = (group: DepartmentPPERuleGroup) => {
    const firstRule = group.items[0];
    if (!firstRule) {
      return;
    }

    const matchedPosition = positions.find(
      (position) => position.position_name === firstRule.position_name && (position.department_id ?? null) === (firstRule.department_service_id ?? null),
    );

    setEditingGroupKey(group.key);
    setEditingTableRowKey(null);
    setSelectedPositionKeys([
      matchedPosition?.selection_key
        || `${firstRule.department_service_id ?? 'none'}:${firstRule.position_name.toLowerCase().trim().replace(/\s+/g, '-')}`,
    ]);
    setProductMonths(
      group.items.reduce<Record<number, string>>((accumulator, item) => {
        accumulator[item.ppeproduct] = String(item.renewal_months);
        return accumulator;
      }, {}),
    );
    setProductAllowed(
      group.items.reduce<Record<number, boolean>>((accumulator, item) => {
        accumulator[item.ppeproduct] = item.is_allowed;
        return accumulator;
      }, {}),
    );
    setIsRuleModalOpen(true);
  };

  const togglePosition = (selectionKey: string) => {
    setSelectedPositionKeys((prev) => {
      if (editingGroup !== null) {
        return prev.includes(selectionKey) ? [] : [selectionKey];
      }
      if (editingTableRow !== null) {
        return prev.includes(selectionKey)
          ? prev.filter((item) => item !== selectionKey)
          : [...prev, selectionKey];
      }
      return prev.includes(selectionKey)
        ? prev.filter((item) => item !== selectionKey)
        : [...prev, selectionKey];
    });
  };

  const getDepartmentPositions = (departmentId: number | null, departmentName: string) => (
    positions.filter((position) => (
      (position.department_id ?? null) === departmentId
      && position.department_name === departmentName
      && !isPositionOccupied(position)
    ))
  );

  const isPositionDisabled = (position: PositionOption) => isPositionOccupied(position);

  const isDepartmentChecked = (departmentId: number | null, departmentName: string) => {
    const departmentPositions = getDepartmentPositions(departmentId, departmentName);
    return departmentPositions.length > 0
      && departmentPositions.every((position) => selectedPositionKeys.includes(position.selection_key));
  };

  const isDepartmentIndeterminate = (departmentId: number | null, departmentName: string) => {
    const departmentPositions = getDepartmentPositions(departmentId, departmentName);
    const selectedCount = departmentPositions.filter((position) => selectedPositionKeys.includes(position.selection_key)).length;
    return selectedCount > 0 && selectedCount < departmentPositions.length;
  };

  const toggleDepartmentPositions = (departmentId: number | null, departmentName: string) => {
    if (editingGroup !== null || editingTableRow !== null) {
      return;
    }

    const departmentPositionKeys = getDepartmentPositions(departmentId, departmentName).map((position) => position.selection_key);
    setSelectedPositionKeys((prev) => {
      const current = new Set(prev);
      const shouldClear = departmentPositionKeys.every((positionKey) => current.has(positionKey));

      if (shouldClear) {
        departmentPositionKeys.forEach((positionKey) => current.delete(positionKey));
      } else {
        departmentPositionKeys.forEach((positionKey) => current.add(positionKey));
      }

      return Array.from(current);
    });
  };

  const toggleAllPositions = () => {
    if (editingGroup !== null || editingTableRow !== null) return;
    setSelectedPositionKeys(isAllPositionsSelected ? [] : selectablePositionKeys);
  };

  const confirmGroupDelete = async () => {
    if (!groupToDelete) return;

    setDeleteLoading(true);
    try {
      await Promise.all(groupToDelete.items.map((rule) => axioss.delete(`/settings/ppe-department-rules/${rule.id}/`)));

      const deletedIds = new Set(groupToDelete.items.map((rule) => rule.id));
      setRules((prev) => prev.filter((item) => !deletedIds.has(item.id)));

      if ((editingGroupKey !== null && editingGroupKey === groupToDelete.key) || (editingTableRowKey !== null && editingTableRowKey === groupToDelete.key)) {
        closeRuleModal();
      }

      setSelectedGroupKeys((prev) => prev.filter((key) => key !== groupToDelete.key));
      setGroupToDelete(null);
      toast.success('Нормы по выбранному цеху и должности удалены');
    } catch (error) {
      toast.error(getBackendError(error, 'Ошибка при удалении норм'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteSelectedGroups = async () => {
    if (selectedGroups.length === 0) {
      toast.warning('Выберите хотя бы одну строку');
      return;
    }

    setDeleteLoading(true);
    try {
      await Promise.all(
        selectedGroups.flatMap((group) => group.items.map((rule) => axioss.delete(`/settings/ppe-department-rules/${rule.id}/`))),
      );

      const deletedIds = new Set(selectedGroups.flatMap((group) => group.items.map((rule) => rule.id)));
      const deletedGroupKeys = new Set(selectedGroups.map((group) => group.key));
      setRules((prev) => prev.filter((item) => !deletedIds.has(item.id)));
      setSelectedGroupKeys((prev) => prev.filter((key) => !deletedGroupKeys.has(key)));

      if ((editingGroupKey !== null && deletedGroupKeys.has(editingGroupKey)) || (editingTableRowKey !== null && deletedGroupKeys.has(editingTableRowKey))) {
        closeRuleModal();
      }

      toast.success('Выбранные нормы удалены');
    } catch (error) {
      toast.error(getBackendError(error, 'Ошибка при удалении выбранных норм'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const openBulkDeleteModal = () => {
    if (selectedGroups.length === 0) {
      toast.warning('Выберите хотя бы одну строку');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  if (!canEditBaseSettings) {
    return (
      <>
        <Breadcrumb pageName="Нормы выдачи по должностям" />
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="text-base text-red-600">Нет доступа к странице</div>
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

  const positionPickerContent = (
    <div className="space-y-3">
      <div className="text-sm text-slate-600 dark:text-slate-300">
        {editingGroup !== null ? 'Выберите должность' : 'Выберите цех и одну или несколько должностей'}
      </div>

      <input
        type="text"
        value={pickerDepartmentSearch}
        onChange={(e) => setPickerDepartmentSearch(e.target.value)}
        placeholder="Поиск по цеху"
        className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
      />

      {editingGroup === null && positions.length > 0 && (
        <label className="flex items-start gap-2 border-b border-stroke pb-3 text-sm font-medium text-black dark:border-strokedark dark:text-white">
          <input
            type="checkbox"
            checked={isAllPositionsSelected}
            onChange={toggleAllPositions}
            className="mt-1"
          />
          <span>Для всех должностей</span>
        </label>
      )}

      <div className="max-h-full space-y-3 overflow-y-auto pr-1">
        {filteredDepartmentTree.map((department) => (
          <div key={department.id} className="rounded border border-stroke/70 p-2 dark:border-strokedark/70">
            <label className="flex items-start gap-2 text-sm font-semibold text-black dark:text-white">
              <input
                type="checkbox"
                checked={isDepartmentChecked(department.id, department.name)}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = isDepartmentIndeterminate(department.id, department.name);
                  }
                }}
                onChange={() => toggleDepartmentPositions(department.id, department.name)}
                className="mt-1"
                disabled={editingGroup !== null}
              />
              <span>{department.name}</span>
            </label>

            <div className="mt-2 space-y-2 pl-6">
              {department.positions.map((position) => {
                const isChecked = selectedPositionKeys.includes(position.selection_key);
                const isDisabled = isPositionDisabled(position);
                return (
                  <label
                    key={position.selection_key}
                    className={`flex items-start gap-2 text-sm ${isDisabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'text-black dark:text-white'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePosition(position.selection_key)}
                      className="mt-1"
                      disabled={isDisabled}
                    />
                    <span>{position.position_name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {filteredDepartmentTree.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Цех не найден.
          </div>
        )}
      </div>
    </div>
  );

  const ruleForm = (
    <form id="department-ppe-rule-form" onSubmit={handleSubmit} className="space-y-3">
    
      <div className="rounded border border-stroke p-4 dark:border-strokedark">
        <div className="mb-3 text-sm font-medium text-black dark:text-white">Срок выдачи по СИЗ</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {productsForBulkEdit.map((product) => (
            <div key={product.id} className="rounded border border-stroke p-3 dark:border-strokedark">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="text-sm text-black dark:text-white">{product.name}</div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getProductAllowedValue(product.id) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {getProductAllowedValue(product.id) ? 'Разрешено' : 'Скрыто'}
                </span>
              </div>
              <label className="mb-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={getProductAllowedValue(product.id)}
                  onChange={(e) => {
                    const nextAllowed = e.target.checked;
                    setProductAllowed((prev) => ({ ...prev, [product.id]: nextAllowed }));
                  }}
                />
                <span>Показывать для выбранной должности</span>
              </label>
              <input
                type="number"
                min={0}
                value={productMonths[product.id] || ''}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (nextValue !== '') {
                    setProductAllowed((prev) => ({ ...prev, [product.id]: true }));
                  }
                  setProductMonths((prev) => {
                    if (nextValue === '') {
                      const nextState = { ...prev };
                      delete nextState[product.id];
                      return nextState;
                    }
                    return { ...prev, [product.id]: nextValue };
                  });
                }}
                placeholder="Срок выдачи (мес.)"
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsPositionPickerOpen(true)}
          className="rounded border border-stroke bg-transparent px-4 py-2 text-sm text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-gray-700"
        >
          {positionButtonLabel}
        </button>
      </div>

      {selectedPositionKeys.length > 0 && (
        <div className="rounded border border-dashed border-stroke px-3 py-3 text-sm text-slate-600 dark:border-strokedark dark:text-slate-300">
          <div className="mb-2 font-medium text-black dark:text-white">Выбранные цехи и должности</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse">
              <thead>
                <tr className="border-b border-stroke text-left dark:border-strokedark">
                  <th className="px-3 py-2 font-medium text-black dark:text-white">№</th>
                  <th className="px-3 py-2 font-medium text-black dark:text-white">Цех</th>
                  <th className="px-3 py-2 font-medium text-black dark:text-white">Должность</th>
                </tr>
              </thead>
              <tbody>
                {selectedPositionsByDepartment.map((entry, index) => (
                  <tr key={entry.departmentName} className="border-b border-stroke last:border-b-0 dark:border-strokedark">
                    <td className="px-3 py-2 align-top">{index + 1}</td>
                    <td className="px-3 py-2 align-top font-medium text-black dark:text-white">{entry.departmentName}</td>
                    <td className="px-3 py-2 align-top">{entry.positions.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </form>
  );

  return (
    <>
      <Breadcrumb pageName="Нормы выдачи по должностям" />

      <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(isCreatePage ? '/nastroyka/ppe-norms' : '/nastroyka')}
            className="rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
          >
            ← Назад
          </button>
          {!isCreatePage && (
            <button
              type="button"
              onClick={openCreateRulePage}
              className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
            >
              + Добавить
            </button>
          )}
        </div>

        {loading && (
          <div className="rounded-sm border border-stroke bg-white p-4 text-sm dark:border-strokedark dark:bg-boxdark">
            Загрузка...
          </div>
        )}

        {isCreatePage ? (
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            {ruleForm}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCancelRuleForm}
                className="rounded border border-stroke px-4 py-2 dark:border-strokedark"
              >
                Отмена
              </button>
              <button type="submit" form="department-ppe-rule-form" className="rounded bg-primary px-4 py-2 text-white">
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  placeholder="Поиск по цеху"
                  className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
                />
                <input
                  type="text"
                  value={positionSearch}
                  onChange={(e) => setPositionSearch(e.target.value)}
                  placeholder="Поиск по должности"
                  className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
                />
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <div>
                    Выбрано: {selectedGroups.length} {tableRows.length > 0 ? `• Страница ${currentPage} из ${totalPages}` : ''}
                  </div>
                  <label className="flex items-center gap-2">
                    <span>Размер страницы</span>
                    <select
                      value={tableRowsPerPage}
                      onChange={(e) => setTableRowsPerPage(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                      className="rounded border border-stroke bg-transparent px-2 py-1 dark:border-strokedark dark:bg-transparent"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openBulkDeleteModal}
                    disabled={selectedGroups.length === 0 || deleteLoading}
                    className={`rounded px-4 py-2 text-sm ${selectedGroups.length > 0 && !deleteLoading ? 'bg-red-600 text-white' : 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                  >
                    {deleteLoading ? 'Удаление...' : 'Удалить выбранные'}
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {tableRows.length === 0 ? (
                  <p className="text-center text-gray-500">Нет данных</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">№</th>
                        <th className="px-3 py-2 text-left font-semibold">Цех</th>
                        <th className="px-3 py-2 text-left font-semibold">Должность</th>
                        <th className="px-3 py-2 text-left font-semibold">Действия</th>
                        {isAdmin && (
                          <th className="px-3 py-2 text-center font-semibold">
                            <input
                              type="checkbox"
                              checked={isAllVisibleGroupsSelected}
                              onChange={toggleSelectAllVisibleGroups}
                              aria-label="Выбрать все строки"
                            />
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTableRows.map((group, index) => (
                        <tr key={group.key} className="border-t border-stroke align-top dark:border-strokedark">
                          <td className="px-3 py-2">{(currentPage - 1) * tableRowsPerPage + index + 1}</td>
                          <td className="px-3 py-2">{group.department_name || '-'}</td>
                          <td className="px-3 py-2">{group.position_name}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTableRowEdit(group)}
                                className="rounded border border-stroke px-2 py-1 text-xs dark:border-strokedark"
                                title="Изменить"
                              >
                                Изменить
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => setGroupToDelete(group)}
                                  className="inline-flex items-center justify-center rounded border border-red-400 px-2 py-1 text-xs text-red-600"
                                  title="Удалить"
                                >
                                  <FiTrash2 className="text-sm" />
                                </button>
                              )}
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-2 text-center align-top">
                              <input
                                type="checkbox"
                                checked={selectedGroupKeys.includes(group.key)}
                                onChange={() => toggleGroupSelection(group.key)}
                                aria-label={`Выбрать ${group.department_name} ${group.position_name}`}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {tableRows.length > tableRowsPerPage && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stroke pt-4 text-sm dark:border-strokedark">
                  <div className="text-slate-600 dark:text-slate-300">
                    Показано {(currentPage - 1) * tableRowsPerPage + 1}-{Math.min(currentPage * tableRowsPerPage, tableRows.length)} из {tableRows.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`rounded border px-3 py-1.5 ${currentPage === 1 ? 'cursor-not-allowed border-slate-200 text-slate-400 dark:border-strokedark dark:text-slate-500' : 'border-stroke text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-gray-700'}`}
                    >
                      Назад
                    </button>
                    <div className="rounded border border-stroke px-3 py-1.5 dark:border-strokedark">
                      {currentPage} / {totalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`rounded border px-3 py-1.5 ${currentPage === totalPages ? 'cursor-not-allowed border-slate-200 text-slate-400 dark:border-strokedark dark:text-slate-500' : 'border-stroke text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-gray-700'}`}
                    >
                      Вперёд
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Modal show={isRuleModalOpen} onClose={closeRuleModal} size="7xl" theme={LARGE_RULE_MODAL_THEME}>
              <Modal.Header>{editingGroup !== null ? 'Изменить нормы выдачи' : 'Добавить нормы выдачи'}</Modal.Header>
              <Modal.Body className="flex-1 overflow-y-auto">
                {ruleForm}
              </Modal.Body>
              <Modal.Footer>
                <Button color="gray" onClick={closeRuleModal}>
                  Отмена
                </Button>
                <Button type="submit" form="department-ppe-rule-form">
                  Сохранить
                </Button>
              </Modal.Footer>
            </Modal>
          </>
        )}
      </div>

      <Modal show={isPositionPickerOpen} onClose={() => setIsPositionPickerOpen(false)} size="6xl" theme={POSITION_PICKER_MODAL_THEME}>
        <Modal.Header>Выберите цех и должность</Modal.Header>
        <Modal.Body className="flex-1 overflow-y-auto">
          {positionPickerContent}
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setIsPositionPickerOpen(false)}>
            Закрыть
          </Button>
          <Button onClick={() => setIsPositionPickerOpen(false)}>
            Выбрать
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(groupToDelete)} onClose={() => !deleteLoading && setGroupToDelete(null)}>
        <Modal.Header>Подтвердите удаление группы</Modal.Header>
        <Modal.Body>
          <div className="space-y-3">
            <div className="flex justify-center text-red-500">
              <FiAlertTriangle className="h-16 w-16" />
            </div>
            <p className="text-center text-base text-slate-600 dark:text-slate-300">
              {groupToDelete
                ? `Удалить все нормы для СИЗ "${groupToDelete.ppeproduct_name}" по должностям "${groupToDelete.position_name}" в цехе "${groupToDelete.department_name || '-'}"?`
                : 'Удалить выбранную группу норм?'}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setGroupToDelete(null)} disabled={deleteLoading}>
            Отмена
          </Button>
          <Button color="failure" onClick={confirmGroupDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Удаление...' : 'Удалить все'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={isBulkDeleteModalOpen} onClose={() => !deleteLoading && setIsBulkDeleteModalOpen(false)}>
        <Modal.Header>Подтвердите массовое удаление</Modal.Header>
        <Modal.Body>
          <div className="space-y-3">
            <div className="flex justify-center text-red-500">
              <FiAlertTriangle className="h-16 w-16" />
            </div>
            <p className="text-center text-base text-slate-600 dark:text-slate-300">
              {`Подтвердите удаление ${selectedGroups.length} выбранных групп?`}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setIsBulkDeleteModalOpen(false)} disabled={deleteLoading}>
            Отмена
          </Button>
          <Button
            color="failure"
            onClick={async () => {
              await handleDeleteSelectedGroups();
              if (!deleteLoading) {
                setIsBulkDeleteModalOpen(false);
              }
            }}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Удаление...' : 'Удалить'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DepartmentPPERulePage;