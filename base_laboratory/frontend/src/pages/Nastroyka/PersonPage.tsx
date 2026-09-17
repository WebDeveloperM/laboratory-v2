import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axioss from '../../api/axios';
import { Button, Modal } from 'flowbite-react';

type ResponsiblePerson = {
  id: number;
  full_name: string;
  position: string;
  employee_slug?: string | null;
};

type EmployeeItem = {
  slug: string;
  full_name: string;
  tabel_number?: string;
  position?: string;
  department?: { name?: string } | null;
  section?: { name?: string } | null;
  base_image_url?: string | null;
};

const EMPLOYEE_PAGE_SIZE = 50;

const RESPONSIBLE_POSITION_OPTIONS = ['Начальник смены', 'Начальник СТТЛ', 'Начальник ЦЗЛ', 'Диспетчер'];

const RESPONSIBLE_POSITION_TO_ROLE: Record<string, string> = {
  'Начальник смены': 'shift_head',
  'Начальник СТТЛ': 'sttl_head',
  'Начальник ЦЗЛ': 'czl_head',
  'Диспетчер': 'dispatcher',
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
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  const firstField = Object.values(data)[0];
  if (Array.isArray(firstField) && firstField.length) {
    return String(firstField[0]);
  }
  return fallback;
};

const LARGE_PERSON_MODAL_THEME = {
  root: {
    sizes: {
      '4xl': 'w-[80vw] max-w-[80vw]',
    },
  },
  content: {
    inner: 'relative flex h-[75vh] max-h-[75vh] flex-col rounded-lg bg-white shadow dark:bg-gray-700',
  },
};

const PersonPage = () => {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const canEditBaseSettings = role === 'admin' || role === 'it_center' || role === 'shift_head' || role === 'sttl_head' || role === 'czl_head' || role === 'dispatcher';
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [persons, setPersons] = useState<ResponsiblePerson[]>([]);
  const [personFullName, setPersonFullName] = useState('');
  const [personPosition, setPersonPosition] = useState('');
  const [personEmployeeSlug, setPersonEmployeeSlug] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeResultCount, setEmployeeResultCount] = useState(0);
  const [employeeSource, setEmployeeSource] = useState<'employee_service' | 'local' | null>(null);
  const employeeDropdownRef = useRef<HTMLDivElement | null>(null);

  const resetPersonForm = () => {
    setEditingPersonId(null);
    setPersonFullName('');
    setPersonPosition('');
    setPersonEmployeeSlug('');
  };

  const closePersonModal = () => {
    setIsPersonModalOpen(false);
    resetPersonForm();
  };

  const openCreatePersonModal = () => {
    resetPersonForm();
    setIsPersonModalOpen(true);
  };

  const loadEmployees = async (search = employeeSearch) => {
    setEmployeeLoading(true);
    try {
      const response = await axioss.get('/users/employees-list/', {
        params: {
          page: 1,
          page_size: EMPLOYEE_PAGE_SIZE,
          search: search || undefined,
        },
      });
      const payload = response.data || {};
      const results = Array.isArray(payload) ? payload : payload.results || [];
      setEmployees(results);
      setEmployeeResultCount(Array.isArray(payload) ? results.length : Number(payload.count || 0));
      setEmployeeSource(payload._source === 'local' ? 'local' : 'employee_service');
    } catch {
      setEmployees([]);
      setEmployeeResultCount(0);
      setEmployeeSource(null);
    } finally {
      setEmployeeLoading(false);
    }
  };

  useEffect(() => {
    if (!employeeDropdownOpen) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      loadEmployees(employeeSearch);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [employeeDropdownOpen, employeeSearch]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadPersons = async () => {
    setLoading(true);
    try {
      const response = await axioss.get('/settings/responsible-persons/');
      setPersons(response.data || []);
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
    loadPersons();
  }, [canEditBaseSettings]);

  const syncLinkedUserRole = async () => {
    const role = RESPONSIBLE_POSITION_TO_ROLE[personPosition.trim()];
    if (!personEmployeeSlug || !role) {
      return;
    }

    try {
      const response = await axioss.patch('/users/settings-users/sync-role/', {
        employee_slug: personEmployeeSlug,
        role,
      });
      if (response.data?.synced) {
        toast.success('Роль привязанного пользователя обновлена в соответствии с должностью');
      }
    } catch (error) {
      toast.warning(getBackendError(error, 'Не удалось синхронизировать роль пользователя'));
    }
  };

  const createLinkedUserAccount = async () => {
    const role = RESPONSIBLE_POSITION_TO_ROLE[personPosition.trim()];
    if (!personEmployeeSlug || !role) {
      return;
    }

    try {
      const response = await axioss.post('/users/settings-users/', {
        employee_slug: personEmployeeSlug,
        role,
        face_id_required: true,
      });
      toast.success(
        `Пользователь создан. Логин: ${response.data?.username || '—'}, пароль: ${response.data?.generated_password || '—'}`,
      );
    } catch (error) {
      const message = getBackendError(error, 'Не удалось создать пользователя для ответственного лица');
      if (message.includes('уже привязан')) {
        await syncLinkedUserRole();
      } else {
        toast.warning(message);
      }
    }
  };

  const handleCreatePerson = async (event: FormEvent) => {
    event.preventDefault();
    if (!personFullName.trim() || !personPosition.trim()) {
      toast.warning('ФИО и должность ответственного лица обязательны');
      return;
    }

    try {
      if (editingPersonId !== null) {
        const response = await axioss.put(`/settings/responsible-persons/${editingPersonId}/`, {
          full_name: personFullName.trim(),
          position: personPosition.trim(),
          employee_slug: personEmployeeSlug || null,
        });
        setPersons((prev) => prev.map((entry) => (entry.id === editingPersonId ? response.data : entry)));
        toast.success('Ответственное лицо обновлено');
        await syncLinkedUserRole();
      } else {
        const response = await axioss.post('/settings/responsible-persons/', {
          full_name: personFullName.trim(),
          position: personPosition.trim(),
          employee_slug: personEmployeeSlug || null,
        });
        setPersons((prev) => [...prev, response.data]);
        toast.success('Ответственное лицо добавлено');
        await createLinkedUserAccount();
      }
      closePersonModal();
    } catch (error) {
      toast.error(getBackendError(error, editingPersonId !== null ? 'Ошибка при обновлении ответственного лица' : 'Ошибка при добавлении ответственного лица'));
    }
  };

  const handleEditPerson = (item: ResponsiblePerson) => {
    setEditingPersonId(item.id);
    setPersonFullName(item.full_name || '');
    setPersonPosition(item.position || '');
    setPersonEmployeeSlug(item.employee_slug || '');
    setIsPersonModalOpen(true);
  };

  const handleDeletePerson = async (item: ResponsiblePerson) => {
    const isConfirmed = window.confirm(`Удалить запись "${item.full_name}"?`);
    if (!isConfirmed) return;

    try {
      await axioss.delete(`/settings/responsible-persons/${item.id}/`);
      setPersons((prev) => prev.filter((entry) => entry.id !== item.id));
      if (editingPersonId === item.id) {
        closePersonModal();
      }
      toast.success('Ответственное лицо удалено');
    } catch (error) {
      toast.error(getBackendError(error, 'Ошибка при удалении ответственного лица'));
    }
  };

  const handleCancelEdit = () => {
    closePersonModal();
  };

  if (!canEditBaseSettings) {
    return (
      <>
        <Breadcrumb pageName="Ответственное лицо" />
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

  return (
    <>
      <Breadcrumb pageName="Ответственное лицо" />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/nastroyka')}
            className="rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
          >
            ← Назад
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreatePersonModal}
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

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="max-h-96 overflow-auto">
            {persons.length === 0 ? (
              <p className="text-center text-gray-500">Нет данных</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Должность</th>
                    <th className="px-3 py-2 text-left font-semibold">ФИО</th>
                    {isAdmin && <th className="px-3 py-2 text-left font-semibold">Действия</th>}
                  </tr>
                </thead>
                <tbody>
                  {persons.map((item) => (
                    <tr key={item.id} className="border-t border-stroke dark:border-strokedark">
                      <td className="px-3 py-2">{item.position}</td>
                      <td className="px-3 py-2">{item.full_name}</td>
                      {isAdmin && (
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditPerson(item)}
                              className="rounded border border-stroke px-2 py-1 text-xs dark:border-strokedark"
                            >
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDeletePerson(item)}
                              className="rounded border border-red-400 px-2 py-1 text-xs text-red-600"
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal show={isPersonModalOpen} onClose={handleCancelEdit} size="4xl" theme={LARGE_PERSON_MODAL_THEME}>
        <Modal.Header>{editingPersonId !== null ? 'Изменить ответственное лицо' : 'Добавить ответственное лицо'}</Modal.Header>
        <Modal.Body className="flex-1 overflow-y-auto">
          <form id="person-form" onSubmit={handleCreatePerson} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div ref={employeeDropdownRef} className="relative">
                <div
                  className="w-full cursor-pointer rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
                  onClick={() => setEmployeeDropdownOpen((prev) => !prev)}
                >
                  {personFullName ? (
                    <span>{personFullName}</span>
                  ) : (
                    <span className="text-gray-400">— Выберите сотрудника —</span>
                  )}
                </div>
                {employeeDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
                    <input
                      autoFocus
                      value={employeeSearch}
                      onChange={(event) => setEmployeeSearch(event.target.value)}
                      placeholder="Поиск по ФИО, табельному номеру, должности..."
                      className="w-full border-b border-stroke px-3 py-2 text-sm outline-none dark:border-strokedark dark:bg-boxdark"
                    />
                    {employeeSource === 'local' && (
                      <div className="border-b border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
                        Employee Service недоступен — показаны локальные сотрудники
                      </div>
                    )}
                    <div className="border-b border-stroke px-3 py-2 text-xs text-gray-400 dark:border-strokedark">
                      {employeeLoading ? 'Загрузка...' : `Найдено: ${employeeResultCount}. Показаны первые ${employees.length}.`}
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {employees.map((emp) => (
                        <div
                          key={emp.slug}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setPersonFullName(emp.full_name);
                            setPersonEmployeeSlug(emp.slug);
                            setEmployeeDropdownOpen(false);
                            setEmployeeSearch('');
                          }}
                        >
                          <div>{emp.full_name} {emp.tabel_number ? `(${emp.tabel_number})` : ''}</div>
                          <div className="text-xs text-gray-400">
                            {[emp.position, emp.department?.name, emp.section?.name].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      ))}
                      {!employeeLoading && employees.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">Нет результатов</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <select
                value={personPosition}
                onChange={(e) => setPersonPosition(e.target.value)}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
              >
                <option value="">— Выберите роль —</option>
                {RESPONSIBLE_POSITION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={handleCancelEdit}>
            Отмена
          </Button>
          <Button type="submit" form="person-form">
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PersonPage;
