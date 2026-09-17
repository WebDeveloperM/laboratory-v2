import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axioss from '../../api/axios';
import { getStoredFeatureAccess, normalizeRole } from '../../utils/pageAccess';

type Employee = {
  id: number;
  slug: string;
  first_name: string;
  last_name: string;
  surname: string;
  tabel_number: string;
  position: string;
  requires_face_id_checkout: boolean;
};

const PAGE_SIZE = 50;

const getBackendError = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  const firstField = Object.values(data)[0];
  if (Array.isArray(firstField) && firstField.length) {
    return String(firstField[0]);
  }
  return fallback;
};

const getEmployeeFullName = (employee: Employee) => {
  return `${employee.last_name} ${employee.first_name} ${employee.surname || ''}`.trim() || '—';
};

const getFaceIdStatusLabel = (requiresFaceIdCheckout: boolean) => {
  return requiresFaceIdCheckout ? 'Требуется' : 'Не требуется';
};

const FaceIDPage = () => {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const canManageFaceIdControl = useMemo(() => getStoredFeatureAccess(role).face_id_control, [role]);

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tableNumberSearch, setTableNumberSearch] = useState('');
  const [employeeNameSearch, setEmployeeNameSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null);
  const [pendingNewStatus, setPendingNewStatus] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalEmployees, setModalEmployees] = useState<Employee[]>([]);
  const [modalTableNumberSearch, setModalTableNumberSearch] = useState('');
  const [modalEmployeeNameSearch, setModalEmployeeNameSearch] = useState('');
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalTotalCount, setModalTotalCount] = useState(0);
  const [selectedModalEmployeeIds, setSelectedModalEmployeeIds] = useState<number[]>([]);
  const [bulkModalStatus, setBulkModalStatus] = useState<'required' | 'not_required'>('not_required');
  const [savingSelectedEmployee, setSavingSelectedEmployee] = useState(false);
  const [selectedMainEmployeeIds, setSelectedMainEmployeeIds] = useState<number[]>([]);
  const [bulkMainStatus, setBulkMainStatus] = useState<'required' | 'not_required'>('not_required');
  const [savingMainBulk, setSavingMainBulk] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'required' | 'not_required'>('all');
  const hasLoadedMainListRef = useRef(false);

  const totalModalPages = Math.max(1, Math.ceil(modalTotalCount / PAGE_SIZE));
  const visibleEmployees = statusFilter === 'all'
    ? employees
    : employees.filter((e) => statusFilter === 'required' ? e.requires_face_id_checkout : !e.requires_face_id_checkout);

  const fetchFaceIdEmployees = async (params: Record<string, string | number | boolean | undefined>) => {
    const response = await axioss.get('/employees/face-id-exemption/', { params });
    return {
      employees: Array.isArray(response.data?.employees) ? response.data.employees as Employee[] : [],
      count: Number(response.data?.count || 0),
    };
  };

  const loadEmployees = async (page = 1) => {
    setLoading(true);
    try {
      const search = [tableNumberSearch.trim(), employeeNameSearch.trim()].filter(Boolean).join(' ');
      const requiresFilter = statusFilter === 'all' ? undefined : statusFilter === 'required';
      const response = await fetchFaceIdEmployees({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        ...(requiresFilter !== undefined ? { requires_face_id_checkout: requiresFilter } : {}),
      });
      setEmployees(response.employees);
      setTotalCount(response.count);
      setCurrentPage(page);
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось загрузить список сотрудников'));
    } finally {
      setLoading(false);
    }
  };

  const loadModalEmployees = async (page = 1) => {
    setModalLoading(true);
    try {
      const search = [modalTableNumberSearch.trim(), modalEmployeeNameSearch.trim()].filter(Boolean).join(' ');
      const response = await axioss.get('/employees/face-id-exemption/', {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
        },
      });
      setModalEmployees(response.data?.employees || []);
      setModalTotalCount(Number(response.data?.count || 0));
      setModalCurrentPage(page);
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось загрузить сотрудников для добавления'));
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageFaceIdControl) {
      setLoading(false);
      return;
    }
    const delay = hasLoadedMainListRef.current ? 250 : 0;
    const timeoutId = window.setTimeout(() => {
      hasLoadedMainListRef.current = true;
      loadEmployees(1);
    }, delay);
    return () => window.clearTimeout(timeoutId);
  }, [canManageFaceIdControl, employeeNameSearch, tableNumberSearch, statusFilter]);

  useEffect(() => {
    if (!canManageFaceIdControl || !isAddModalOpen) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      loadModalEmployees(1);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [canManageFaceIdControl, isAddModalOpen, modalEmployeeNameSearch, modalTableNumberSearch]);

  const handleToggleFaceIdExemption = async (employeeSlug: string, employeeId: number, newStatus: boolean) => {
    try {
      const response = await axioss.patch(`/employees/${employeeSlug}/face-id-exemption/`, {
        requires_face_id_checkout: newStatus,
      });
      setEmployees((prev) => {
        if (newStatus) {
          return prev.filter((emp) => emp.id !== employeeId);
        }
        return prev.map((emp) =>
          emp.id === employeeId ? { ...emp, requires_face_id_checkout: newStatus } : emp,
        );
      });
      setModalEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeId ? { ...emp, requires_face_id_checkout: newStatus } : emp,
        ),
      );
      const message = newStatus
        ? `Face ID требуется для ${response.data.employee.full_name}`
        : `Face ID НЕ требуется для ${response.data.employee.full_name}`;
      toast.success(message);
    } catch (error) {
      toast.error(getBackendError(error, 'Ошибка при обновлении статуса Face ID'));
      throw error;
    }
  };

  const toggleMainEmployeeSelection = (employeeId: number) => {
    setSelectedMainEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );
  };

  const toggleSelectAllMainEmployees = () => {
    setSelectedMainEmployeeIds((prev) => {
      const pageIds = visibleEmployees.map((e) => e.id);
      const areAllSelected = pageIds.length > 0 && pageIds.every((id) => prev.includes(id));
      if (areAllSelected) return prev.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...prev, ...pageIds]));
    });
  };

  const handleMainBulkApply = async () => {
    if (selectedMainEmployeeIds.length === 0 || savingMainBulk) return;
    const targetStatus = bulkMainStatus === 'required';
    const selected = visibleEmployees.filter((e) => selectedMainEmployeeIds.includes(e.id));
    const toUpdate = selected.filter((e) => e.requires_face_id_checkout !== targetStatus);
    if (toUpdate.length === 0) {
      toast.info(`У выбранных сотрудников уже установлен статус: ${getFaceIdStatusLabel(targetStatus)}`);
      setSelectedMainEmployeeIds([]);
      return;
    }
    setSavingMainBulk(true);
    try {
      await Promise.all(toUpdate.map((e) => handleToggleFaceIdExemption(e.slug, e.id, targetStatus)));
      setSelectedMainEmployeeIds([]);
      toast.success(`Статус "${getFaceIdStatusLabel(targetStatus)}" установлен для ${toUpdate.length} сотрудника(ов)`);
    } finally {
      setSavingMainBulk(false);
    }
  };

  const openAddModal = () => {
    setModalTableNumberSearch('');
    setModalEmployeeNameSearch('');
    setSelectedModalEmployeeIds([]);
    setBulkModalStatus('not_required');
    setModalCurrentPage(1);
    setModalTotalCount(0);
    setModalEmployees([]);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (savingSelectedEmployee) {
      return;
    }
    setIsAddModalOpen(false);
    setSelectedModalEmployeeIds([]);
  };

  const handleAddSelectedEmployee = async () => {
    if (selectedModalEmployeeIds.length === 0 || savingSelectedEmployee) {
      return;
    }

    const targetStatus = bulkModalStatus === 'required';
    const selectedEmployees = modalEmployees.filter((employee) => selectedModalEmployeeIds.includes(employee.id));
    const employeesToUpdate = selectedEmployees.filter(
      (employee) => employee.requires_face_id_checkout !== targetStatus,
    );

    if (employeesToUpdate.length === 0) {
      toast.info(`У выбранных сотрудников уже установлен статус: ${getFaceIdStatusLabel(targetStatus)}`);
      closeAddModal();
      return;
    }

    setSavingSelectedEmployee(true);
    try {
      await Promise.all(
        employeesToUpdate.map((employee) =>
          handleToggleFaceIdExemption(employee.slug, employee.id, targetStatus),
        ),
      );
      await loadEmployees(1);
      await loadModalEmployees(modalCurrentPage);
      setIsAddModalOpen(false);
      setSelectedModalEmployeeIds([]);
      toast.success(
        `Статус "${getFaceIdStatusLabel(targetStatus)}" установлен для ${employeesToUpdate.length} сотрудника(ов)`,
      );
    } finally {
      setSavingSelectedEmployee(false);
    }
  };

  const toggleModalEmployeeSelection = (employeeId: number) => {
    setSelectedModalEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const toggleSelectAllModalEmployees = () => {
    setSelectedModalEmployeeIds((prev) => {
      const pageEmployeeIds = modalEmployees.map((employee) => employee.id);
      const areAllSelected = pageEmployeeIds.length > 0 && pageEmployeeIds.every((id) => prev.includes(id));

      if (areAllSelected) {
        return prev.filter((id) => !pageEmployeeIds.includes(id));
      }

      return Array.from(new Set([...prev, ...pageEmployeeIds]));
    });
  };

  const openConfirmModal = (employee: Employee, newStatus: boolean) => {
    setPendingEmployee(employee);
    setPendingNewStatus(newStatus);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setPendingEmployee(null);
    setPendingNewStatus(false);
  };

  const confirmToggle = () => {
    if (pendingEmployee) {
      handleToggleFaceIdExemption(pendingEmployee.slug, pendingEmployee.id, pendingNewStatus);
    }
    closeConfirmModal();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (!canManageFaceIdControl) {
    return (
      <>
        <Breadcrumb pageName="Face ID настройки" />
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="text-base text-red-600">Нет доступа к странице</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            У вашей роли нет доступа к управлению Face ID.
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
      <Breadcrumb pageName="Face ID настройки" />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/nastroyka')}
            className="rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
          >
            ← Назад
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
          >
            + Добавить
          </button>
        </div>

        {loading && (
          <div className="rounded-sm border border-stroke bg-white p-4 text-sm dark:border-strokedark dark:bg-boxdark">
            Загрузка...
          </div>
        )}

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Выберите сотрудников, которым не требуется Face ID верификация при получении СИЗ.
          </p>

          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="text"
              value={tableNumberSearch}
              onChange={(event) => setTableNumberSearch(event.target.value)}
              placeholder="Поиск по табельному номеру"
              className="flex-1 rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
            />
            <input
              type="text"
              value={employeeNameSearch}
              onChange={(event) => setEmployeeNameSearch(event.target.value)}
              placeholder="Поиск по ФИО"
              className="flex-1 rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'required' | 'not_required'); setSelectedMainEmployeeIds([]); }}
              className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
            >
              <option value="all">Все статусы</option>
              <option value="not_required">Не требуется</option>
              <option value="required">Требуется</option>
            </select>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex flex-col">
                <span className="mb-1 text-xs text-slate-500 dark:text-slate-400">Статус для выбранных</span>
                <select
                  value={bulkMainStatus}
                  onChange={(e) => setBulkMainStatus(e.target.value as 'required' | 'not_required')}
                  className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
                >
                  <option value="not_required">Не требуется</option>
                  <option value="required">Требуется</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleMainBulkApply}
                disabled={selectedMainEmployeeIds.length === 0 || savingMainBulk}
                className="mt-5 rounded bg-primary px-4 py-2 text-sm text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingMainBulk ? 'Сохранение...' : `Применить${selectedMainEmployeeIds.length > 0 ? ` (${selectedMainEmployeeIds.length})` : ''}`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={visibleEmployees.length > 0 && visibleEmployees.every((e) => selectedMainEmployeeIds.includes(e.id))}
                      onChange={toggleSelectAllMainEmployees}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Таб. №</th>
                  <th className="px-3 py-2 text-left font-semibold">ФИО</th>
                  <th className="px-3 py-2 text-left font-semibold">Должность</th>
                  <th className="px-3 py-2 text-left font-semibold">Face ID при выдаче</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map((emp) => {
                  const fullName = getEmployeeFullName(emp);
                  return (
                    <tr key={emp.id} className="border-t border-stroke dark:border-strokedark">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedMainEmployeeIds.includes(emp.id)}
                          onChange={() => toggleMainEmployeeSelection(emp.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-500">{emp.tabel_number || '—'}</td>
                      <td className="px-3 py-2">{fullName || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{emp.position || '—'}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openConfirmModal(emp, !emp.requires_face_id_checkout)}
                          className={`rounded px-3 py-1 text-xs font-medium ${emp.requires_face_id_checkout ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          {emp.requires_face_id_checkout ? 'Требуется' : 'Не требуется'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && visibleEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">Нет данных</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-stroke pt-4 text-sm dark:border-strokedark sm:flex-row sm:items-center sm:justify-between">
            <div className="text-gray-500">
              Показано {(totalCount === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1)}-
              {Math.min(((currentPage - 1) * PAGE_SIZE) + visibleEmployees.length, totalCount)} из {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadEmployees(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="rounded border border-stroke px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
              >
                Назад
              </button>
              <span className="text-gray-500">{currentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => loadEmployees(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="rounded border border-stroke px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
              >
                Вперёд
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && pendingEmployee && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="text-xl font-semibold text-black dark:text-white">Подтвердите изменение</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Изменить требование Face ID для сотрудника{' '}
              <span className="font-medium text-black dark:text-white">
                {`${pendingEmployee.last_name} ${pendingEmployee.first_name} ${pendingEmployee.surname || ''}`.trim()}
              </span>
              ?
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={confirmToggle} className="rounded bg-primary px-4 py-2 text-white">
                Подтвердить
              </button>
              <button type="button" onClick={closeConfirmModal} className="rounded border border-stroke px-4 py-2 dark:border-strokedark">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="flex h-[70vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-boxdark">
            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Добавить сотрудника</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Выберите сотрудника, для которого Face ID при выдаче СИЗ не требуется.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={savingSelectedEmployee}
                className="rounded px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-boxdark-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex flex-col gap-3 rounded border border-stroke bg-slate-50 p-4 dark:border-strokedark dark:bg-boxdark-2 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={modalTableNumberSearch}
                    onChange={(event) => setModalTableNumberSearch(event.target.value)}
                    placeholder="Поиск по табельному номеру"
                    className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
                  />
                  <input
                    type="text"
                    value={modalEmployeeNameSearch}
                    onChange={(event) => setModalEmployeeNameSearch(event.target.value)}
                    placeholder="Поиск по ФИО"
                    className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
                  />
                </div>
                <label className="flex min-w-[220px] flex-col text-sm text-slate-700 dark:text-slate-200">
                  <span className="mb-1 font-medium">Статус для выбранных</span>
                  <select
                    value={bulkModalStatus}
                    onChange={(event) => setBulkModalStatus(event.target.value as 'required' | 'not_required')}
                    className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark"
                  >
                    <option value="not_required">Не требуется</option>
                    <option value="required">Требуется</option>
                  </select>
                </label>
              </div>

              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={toggleSelectAllModalEmployees}
                  disabled={modalEmployees.length === 0 || modalLoading}
                  className="rounded border border-stroke px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-slate-200 dark:hover:bg-boxdark-2"
                >
                  {modalEmployees.length > 0 && modalEmployees.every((employee) => selectedModalEmployeeIds.includes(employee.id))
                    ? 'Снять выбор со страницы'
                    : 'Выбрать всю страницу'}
                </button>
                <div className="text-slate-500 dark:text-slate-300">
                  Выбрано: {selectedModalEmployeeIds.length}
                </div>
              </div>

              <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Выбор</th>
                      <th className="px-3 py-2 text-left font-semibold">Таб. №</th>
                      <th className="px-3 py-2 text-left font-semibold">ФИО</th>
                      <th className="px-3 py-2 text-left font-semibold">Должность</th>
                      <th className="px-3 py-2 text-left font-semibold">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalEmployees.map((emp) => {
                      const isSelected = selectedModalEmployeeIds.includes(emp.id);
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => toggleModalEmployeeSelection(emp.id)}
                          className={`cursor-pointer border-t border-stroke transition-colors dark:border-strokedark ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-boxdark-2'
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleModalEmployeeSelection(emp.id)}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-3 py-3 text-gray-500">{emp.tabel_number || '—'}</td>
                          <td className="px-3 py-3 text-slate-900 dark:text-white">{getEmployeeFullName(emp)}</td>
                          <td className="px-3 py-3 text-gray-500">{emp.position || '—'}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded px-3 py-1 text-xs font-medium ${
                                emp.requires_face_id_checkout
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {getFaceIdStatusLabel(emp.requires_face_id_checkout)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!modalLoading && modalEmployees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-500">Нет сотрудников</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-gray-500">
                  Показано {(modalTotalCount === 0 ? 0 : ((modalCurrentPage - 1) * PAGE_SIZE) + 1)}-
                  {Math.min(modalCurrentPage * PAGE_SIZE, modalTotalCount)} из {modalTotalCount}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadModalEmployees(Math.max(1, modalCurrentPage - 1))}
                    disabled={modalCurrentPage <= 1 || modalLoading}
                    className="rounded border border-stroke px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
                  >
                    Назад
                  </button>
                  <span className="text-gray-500">
                    {modalCurrentPage} / {totalModalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadModalEmployees(Math.min(totalModalPages, modalCurrentPage + 1))}
                    disabled={modalCurrentPage >= totalModalPages || modalLoading}
                    className="rounded border border-stroke px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stroke px-6 py-4 dark:border-strokedark">
              <button
                type="button"
                onClick={closeAddModal}
                disabled={savingSelectedEmployee}
                className="rounded border border-stroke px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-slate-200 dark:hover:bg-boxdark-2"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddSelectedEmployee}
                disabled={selectedModalEmployeeIds.length === 0 || savingSelectedEmployee}
                className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSelectedEmployee ? 'Сохранение...' : 'Изменить статус'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FaceIDPage;
