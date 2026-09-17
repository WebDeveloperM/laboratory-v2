import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axioss from '../../api/axios';
import { Button, Modal } from 'flowbite-react';

type EmployeeItem = {
  slug: string;
  full_name: string;
  tabel_number?: string;
  login?: string;
  position?: string;
  department?: { name?: string } | null;
  section?: { name?: string } | null;
  base_image_url?: string | null;
};

type SettingsUser = {
  id: number;
  username: string;
  auth_username?: string;
  first_name: string;
  last_name: string;
  role: string;
  base_avatar?: string | null;
  is_superuser?: boolean;
  is_active?: boolean;
  employee_slug?: string | null;
  face_id_required?: boolean;
  generated_password?: string;
  employee?: EmployeeItem | null;
};

type GeneratedCredentials = {
  title?: string;
  description?: string;
  login: string;
  password?: string;
};

type DeleteCandidate = {
  id: number;
  username: string;
};

const USERS_PAGE_SIZE = 50;
const EMPLOYEE_PAGE_SIZE = 50;

const ROLE_LABELS: Record<string, string> = {
  user: 'Пользователь',
  it_center: 'IT Center',
  shift_head: 'Начальник смены',
  sttl_head: 'Начальник СТТЛ',
  czl_head: 'Начальник ЦЗЛ',
  dispatcher: 'Диспетчер',
  admin: 'Администратор',
};

const normalizeRole = (rawRole: string | null): string => {
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

const normalizeBoolean = (value: unknown, defaultValue = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  return defaultValue;
};

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'u', ғ: 'g', қ: 'q', ҳ: 'h', ң: 'ng', ә: 'a', і: 'i', ї: 'yi', є: 'ye',
};

const transliterateToLatin = (value: string | null | undefined): string => {
  return Array.from(String(value || '')).map((char) => {
    const lowerChar = char.toLowerCase();
    return CYRILLIC_TO_LATIN_MAP[lowerChar] ?? char;
  }).join('');
};

const normalizeLoginPart = (value: string | null | undefined): string => {
  return transliterateToLatin(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase();
};

const buildLoginFromEmployee = (employee: EmployeeItem | null | undefined): string => {
  if (!employee) {
    return '';
  }

  const fullNameParts = String(employee.full_name || '').split(/\s+/).filter(Boolean);
  const inferredLastName = fullNameParts[0] || '';
  const inferredFirstName = fullNameParts[1] || '';
  const baseLogin = [
    normalizeLoginPart(inferredFirstName),
    normalizeLoginPart(inferredLastName),
    normalizeLoginPart(employee.tabel_number || ''),
  ].filter(Boolean).join('_');

  return baseLogin
    || normalizeLoginPart(employee.login || '')
    || normalizeLoginPart(employee.tabel_number || '')
    || normalizeLoginPart(employee.slug || '');
};

const LARGE_USER_MODAL_THEME = {
  root: {
    sizes: {
      '5xl': 'w-[80vw] max-w-[80vw]',
    },
  },
  content: {
    inner: 'relative flex h-[70vh] max-h-[70vh] flex-col rounded-lg bg-white shadow dark:bg-gray-700',
  },
};

const UserPage = () => {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersCount, setUsersCount] = useState(0);
  const [usersSearch, setUsersSearch] = useState('');

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [userEmployeeSlug, setUserEmployeeSlug] = useState<string>('');
  const [userFaceIdRequired, setUserFaceIdRequired] = useState(true);
  const [userLogin, setUserLogin] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeResultCount, setEmployeeResultCount] = useState(0);
  const [employeeSource, setEmployeeSource] = useState<'employee_service' | 'local' | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DeleteCandidate | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement | null>(null);

  const loadUsers = async (page = 1, search = usersSearch) => {
    setLoading(true);
    try {
      const response = await axioss.get('/users/settings-users/', {
        params: {
          page,
          page_size: USERS_PAGE_SIZE,
          search: search || undefined,
        },
      });
      const payload = response.data || {};
      const results = Array.isArray(payload) ? payload : payload.results || [];
      setUsers(results);
      setUsersCount(Array.isArray(payload) ? results.length : Number(payload.count || 0));
      setUsersPage(page);
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось загрузить данные'));
    } finally {
      setLoading(false);
    }
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

  const editingUser = useMemo(
    () => users.find((item) => item.id === editingUserId) || null,
    [editingUserId, users],
  );

  const selectedEmployee = useMemo(() => {
    return (
      employees.find((entry) => entry.slug === userEmployeeSlug) ||
      editingUser?.employee ||
      users.find((entry) => entry.employee?.slug === userEmployeeSlug)?.employee ||
      null
    );
  }, [editingUser, employees, userEmployeeSlug, users]);

  const pendingLogin = useMemo(() => {
    return buildLoginFromEmployee(selectedEmployee);
  }, [selectedEmployee]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadUsers(1, '');
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      loadUsers(1, usersSearch);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [isAdmin, usersSearch]);

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

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserRole('user');
    setUserEmployeeSlug('');
    setUserFaceIdRequired(true);
    setUserLogin('');
    setUserPassword('');
    setIsPasswordVisible(false);
    setIsResettingPassword(false);
    setEmployeeSearch('');
    setEmployeeDropdownOpen(false);
    setEmployeeSource(null);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    resetUserForm();
  };

  const openCreateUserModal = () => {
    resetUserForm();
    setIsUserModalOpen(true);
  };

  const handleCreateOrUpdateUser = async (event: FormEvent) => {
    event.preventDefault();

    if (!userEmployeeSlug) {
      toast.warning('Выберите сотрудника');
      return;
    }

    try {
      if (editingUserId !== null) {
        const response = await axioss.put(`/users/settings-users/${editingUserId}/`, {
          employee_slug: userEmployeeSlug,
          role: userRole,
          face_id_required: userFaceIdRequired,
          username: userLogin,
          password: userPassword || undefined,
        });
        const updatedLogin = String(response.data?.auth_username || response.data?.username || userLogin || '');
        setGeneratedCredentials({
          title: 'Учётные данные обновлены',
          description: userPassword
            ? 'Используйте эти данные для входа на странице «Войти в систему». Новый пароль показан только один раз.'
            : 'Логин обновлён. Если пароль не указан, текущий пароль остаётся без изменений.',
          login: updatedLogin,
          password: userPassword || undefined,
        });
        toast.success('Пользователь обновлен');
      } else {
        const response = await axioss.post('/users/settings-users/', {
          employee_slug: userEmployeeSlug,
          role: userRole,
          face_id_required: userFaceIdRequired,
        });
        const createdLogin = String(response.data?.auth_username || response.data?.username || '');
        if (createdLogin && response.data?.generated_password) {
          setGeneratedCredentials({
            title: 'Учётные данные созданы',
            description: 'Сохраните эти данные. Они используются для входа на странице «Войти в систему», пароль показывается только один раз.',
            login: createdLogin,
            password: String(response.data.generated_password),
          });
        }
        toast.success('Пользователь добавлен');
      }

      resetUserForm();
      setIsUserModalOpen(false);
      await loadUsers(usersPage, usersSearch);
    } catch (error) {
      toast.error(getBackendError(error, editingUserId !== null ? 'Ошибка при обновлении пользователя' : 'Ошибка при добавлении пользователя'));
    }
  };

  const handleEditUser = (item: SettingsUser) => {
    setEditingUserId(item.id);
    setUserRole(item.role || 'user');
    setUserEmployeeSlug(item.employee_slug || '');
    setUserFaceIdRequired(normalizeBoolean(item.face_id_required, true));
    setUserLogin(String(item.auth_username || item.username || ''));
    setUserPassword('');
    setIsPasswordVisible(false);
    setEmployeeSearch('');
    setIsUserModalOpen(true);
    if (item.employee) {
      setEmployees((prev) => {
        if (prev.some((entry) => entry.slug === item.employee?.slug)) {
          return prev;
        }
        return [item.employee as EmployeeItem, ...prev];
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      await axioss.delete(`/users/settings-users/${deleteCandidate.id}/`);
      if (editingUserId === deleteCandidate.id) {
        closeUserModal();
      }
      setDeleteCandidate(null);
      toast.success('Пользователь удален');
      await loadUsers(usersPage, usersSearch);
    } catch (error) {
      toast.error(getBackendError(error, 'Ошибка при удалении пользователя'));
    }
  };

  const handleResetPassword = async () => {
    if (editingUserId === null) {
      return;
    }

    try {
      setIsResettingPassword(true);
      const response = await axioss.post(`/users/settings-users/${editingUserId}/reset-password/`);
      const nextLogin = String(response.data?.auth_username || response.data?.username || userLogin || '');
      const nextPassword = String(response.data?.generated_password || '');
      setUserLogin(nextLogin);
      setUserPassword(nextPassword);
      setIsPasswordVisible(true);
      if (nextPassword) {
        setGeneratedCredentials({
          title: 'Пароль сброшен',
          description: 'Используйте эти данные для входа на странице «Войти в систему». Новый пароль показан только один раз.',
          login: nextLogin,
          password: nextPassword,
        });
      }
      await loadUsers(usersPage, usersSearch);
      toast.success('Пароль обновлён');
    } catch (error) {
      toast.error(getBackendError(error, 'Ошибка при сбросе пароля'));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const totalUserPages = Math.max(1, Math.ceil(usersCount / USERS_PAGE_SIZE));

  if (!isAdmin) {
    return (
      <>
        <Breadcrumb pageName="Пользователи" />
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
      <Breadcrumb pageName="Пользователи" />

      {generatedCredentials && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="text-xl font-semibold text-black dark:text-white">{generatedCredentials.title || 'Учётные данные созданы'}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{generatedCredentials.description || 'Сохраните эти данные. Они используются для входа на странице «Войти в систему», пароль показывается только один раз.'}</p>
            <div className="mt-4 space-y-3 rounded border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Логин</div>
                <div className="mt-1 font-medium text-black dark:text-white">{generatedCredentials.login}</div>
              </div>
              {generatedCredentials.password && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Пароль</div>
                  <div className="mt-1 font-medium text-black dark:text-white">{generatedCredentials.password}</div>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const credentialsText = generatedCredentials.password
                      ? `Логин: ${generatedCredentials.login}\nПароль: ${generatedCredentials.password}`
                      : `Логин: ${generatedCredentials.login}`;
                    await navigator.clipboard.writeText(credentialsText);
                    toast.success('Учётные данные скопированы');
                  } catch {
                    toast.error('Не удалось скопировать учётные данные');
                  }
                }}
                className="rounded bg-primary px-4 py-2 text-white"
              >
                Копировать
              </button>
              <button
                type="button"
                onClick={() => setGeneratedCredentials(null)}
                className="rounded border border-stroke px-4 py-2 dark:border-strokedark"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="text-xl font-semibold text-black dark:text-white">Удалить пользователя?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Пользователь <span className="font-medium text-black dark:text-white">{deleteCandidate.username}</span> будет удалён из TB project.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteUser}
                className="rounded bg-danger px-4 py-2 text-white"
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="rounded border border-stroke px-4 py-2 dark:border-strokedark"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

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
            onClick={openCreateUserModal}
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
          <div className="mb-4">
            <input
              value={usersSearch}
              onChange={(event) => setUsersSearch(event.target.value)}
              placeholder="Поиск по логину, имени, фамилии, табельному номеру..."
              className="w-full rounded border border-stroke bg-transparent px-3 py-2.5 dark:border-strokedark dark:bg-transparent"
            />
          </div>

          <div className="max-h-96 overflow-auto">
            {users.length === 0 ? (
              <p className="text-center text-gray-500">Нет данных</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Сотрудник</th>
                    <th className="px-3 py-2 text-left font-semibold">Логин</th>
                    <th className="px-3 py-2 text-left font-semibold">Роль</th>
                    <th className="px-3 py-2 text-left font-semibold">Должность</th>
                    <th className="px-3 py-2 text-left font-semibold">Face ID</th>
                    <th className="px-3 py-2 text-left font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const employee = item.employee;
                    const displayLogin = String(item.auth_username || item.username || '').trim() || '—';
                    return (
                      <tr key={item.id} className="border-t border-stroke dark:border-strokedark">
                        <td className="px-3 py-2">
                          <div className="font-medium">{employee?.full_name || (item.first_name || item.last_name ? `${item.first_name} ${item.last_name}`.trim() : '—')}</div>
                          {employee?.tabel_number && <div className="text-xs text-gray-400">Таб. № {employee.tabel_number}</div>}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{displayLogin}</td>
                        <td className="px-3 py-2">{ROLE_LABELS[item.role] || item.role}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{employee?.position || '—'}</td>
                        <td className="px-3 py-2">
                          {normalizeBoolean(item.face_id_required, true) ? (
                            <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">Да</span>
                          ) : (
                            <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">Нет</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditUser(item)} className="rounded border border-stroke px-2 py-1 text-xs dark:border-strokedark">
                              Изменить
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCandidate({ id: item.id, username: item.username })}
                              className="rounded border border-red-400 px-2 py-1 text-xs text-red-600"
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-stroke pt-4 text-sm dark:border-strokedark sm:flex-row sm:items-center sm:justify-between">
            <div className="text-gray-500">
              Показано {(usersCount === 0 ? 0 : ((usersPage - 1) * USERS_PAGE_SIZE) + 1)}-
              {Math.min(usersPage * USERS_PAGE_SIZE, usersCount)} из {usersCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadUsers(Math.max(1, usersPage - 1), usersSearch)}
                disabled={usersPage <= 1}
                className="rounded border border-stroke px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
              >
                Назад
              </button>
              <span className="text-gray-500">{usersPage} / {totalUserPages}</span>
              <button
                type="button"
                onClick={() => loadUsers(Math.min(totalUserPages, usersPage + 1), usersSearch)}
                disabled={usersPage >= totalUserPages}
                className="rounded border border-stroke px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark"
              >
                Вперёд
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal show={isUserModalOpen} onClose={closeUserModal} size="5xl" theme={LARGE_USER_MODAL_THEME}>
        <Modal.Header>{editingUserId !== null ? 'Изменить пользователя' : 'Добавить пользователя'}</Modal.Header>
        <Modal.Body className="flex-1 overflow-y-auto">
          <form id="user-form" onSubmit={handleCreateOrUpdateUser} className="space-y-4">
            <div ref={employeeDropdownRef} className="relative">
              <label className="mb-1 block text-sm font-medium text-black dark:text-white">Сотрудник</label>
              <div
                className="w-full cursor-pointer rounded border border-stroke bg-transparent px-3 py-2.5 dark:border-strokedark dark:bg-transparent"
                onClick={() => setEmployeeDropdownOpen((prev) => !prev)}
              >
                {selectedEmployee ? (
                  <span>
                    {selectedEmployee.full_name}
                    {selectedEmployee.tabel_number ? ` (${selectedEmployee.tabel_number})` : ''}
                    {selectedEmployee.position ? ` — ${selectedEmployee.position}` : ''}
                  </span>
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
                        className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${emp.slug === userEmployeeSlug ? 'bg-primary/10 font-medium' : ''}`}
                        onClick={() => {
                          setUserEmployeeSlug(emp.slug);
                          setUserLogin(buildLoginFromEmployee(emp));
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

            {selectedEmployee && (
              <div className="flex items-center gap-4 rounded border border-stroke bg-gray-50 p-3 dark:border-strokedark dark:bg-gray-800">
                {selectedEmployee.base_image_url ? (
                  <img
                    src={selectedEmployee.base_image_url}
                    alt="employee"
                    className="h-16 w-12 rounded border object-cover bg-black"
                  />
                ) : (
                  <div className="flex h-16 w-12 items-center justify-center rounded border bg-gray-200 text-xs text-gray-400 dark:bg-gray-700">
                    Нет фото
                  </div>
                )}
                <div className="text-sm">
                  <div className="font-medium">{selectedEmployee.full_name}</div>
                  {selectedEmployee.tabel_number && <div className="text-gray-500">Таб. №: {selectedEmployee.tabel_number}</div>}
                  {selectedEmployee.position && <div className="text-gray-500">Должность: {selectedEmployee.position}</div>}
                  {selectedEmployee.department?.name && <div className="text-gray-500">Цех: {selectedEmployee.department.name}</div>}
                  {selectedEmployee.section?.name && <div className="text-gray-500">Отдел: {selectedEmployee.section.name}</div>}
                </div>
              </div>
            )}

            {selectedEmployee && editingUserId === null && (
              <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                <div className="font-medium">Для страницы «Войти в систему» будет создан логин и пароль.</div>
                <div className="mt-1">Логин: <span className="font-semibold">{pendingLogin || 'будет сгенерирован автоматически'}</span></div>
                <div className="mt-1 text-xs opacity-80">Пароль будет сгенерирован автоматически и показан после нажатия «Добавить».</div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-black dark:text-white">Роль</label>
                <select
                  value={userRole}
                  onChange={(event) => setUserRole(event.target.value)}
                  className="w-full rounded border border-stroke bg-transparent px-3 py-2.5 dark:border-strokedark dark:bg-transparent"
                >
                  <option value="user">Пользователь</option>
                  <option value="it_center">IT Center</option>
                  <option value="shift_head">Начальник смены</option>
                  <option value="sttl_head">Начальник СТТЛ</option>
                  <option value="czl_head">Начальник ЦЗЛ</option>
                  <option value="dispatcher">Диспетчер</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={userFaceIdRequired}
                      onChange={(event) => setUserFaceIdRequired(event.target.checked)}
                      className="sr-only"
                    />
                    <div className={`block h-8 w-14 rounded-full ${userFaceIdRequired ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <div className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition ${userFaceIdRequired ? 'translate-x-full' : ''}`}></div>
                  </div>
                  <span className="text-sm text-black dark:text-white">Face ID при входе</span>
                </label>
              </div>
            </div>

            {editingUserId !== null && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black dark:text-white">Логин</label>
                  <input
                    value={userLogin}
                    onChange={(event) => setUserLogin(event.target.value)}
                    placeholder="Введите логин"
                    className="w-full rounded border border-stroke bg-transparent px-3 py-2.5 dark:border-strokedark dark:bg-transparent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black dark:text-white">Новый пароль</label>
                  <div className="flex gap-2">
                    <input
                      type={isPasswordVisible ? 'text' : 'password'}
                      value={userPassword}
                      onChange={(event) => setUserPassword(event.target.value)}
                      placeholder="Оставьте пустым, чтобы не менять"
                      className="w-full rounded border border-stroke bg-transparent px-3 py-2.5 dark:border-strokedark dark:bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((prev) => !prev)}
                      className="rounded border border-stroke px-3 py-2 text-sm dark:border-strokedark"
                    >
                      {isPasswordVisible ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Если поле пустое, текущий пароль не изменится.</div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isResettingPassword}
                      className="rounded border border-stroke px-3 py-2 text-sm dark:border-strokedark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isResettingPassword ? 'Сброс...' : 'Сбросить пароль'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={closeUserModal}>
            Отмена
          </Button>
          <Button type="submit" form="user-form">
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UserPage;
