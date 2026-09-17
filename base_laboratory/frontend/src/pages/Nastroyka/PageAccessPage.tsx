import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axioss from '../../api/axios';
import { normalizeRole } from '../../utils/pageAccess';

type PageAccessSettingsRow = {
  role: 'admin' | 'it_center' | 'shift_head' | 'sttl_head' | 'czl_head' | 'dispatcher' | 'user';
  role_label: string;
  pages: {
    dashboard: boolean;
    ppe_arrival: boolean;
    statistics: boolean;
    passports: boolean;
    settings: boolean;
  };
  features: {
    dashboard_due_cards: boolean;
    dashboard_export_excel: boolean;
    dashboard_delete_employee: boolean;
    employee_ppe_tab: boolean;
    face_id_control: boolean;
    ppe_arrival_intake: boolean;
  };
  is_locked: boolean;
};

const PAGE_LABELS: Array<{ key: keyof PageAccessSettingsRow['pages']; label: string }> = [
  { key: 'dashboard', label: 'Главная страница' },
  { key: 'ppe_arrival', label: 'Прием СИЗ' },
  { key: 'statistics', label: 'Статистика' },
  { key: 'passports', label: 'Паспорта' },
  { key: 'settings', label: 'Настройки' },
];

const FEATURE_LABELS: Array<{ key: keyof PageAccessSettingsRow['features']; label: React.ReactNode }> = [
  { key: 'dashboard_due_cards', label: 'До истечения срока и карточки' },
  { key: 'dashboard_export_excel', label: 'Все Excel, включая Прием СИЗ' },
  { key: 'dashboard_delete_employee', label: 'Delete' },
  { key: 'employee_ppe_tab', label: 'Средства защиты tab' },
  { key: 'face_id_control', label: 'Face ID настройки' },
  { key: 'ppe_arrival_intake', label: 'Прием поступивших СИЗ на склад' },
];

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

const PageAccessPage = () => {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [rows, setRows] = useState<PageAccessSettingsRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingRow, setPendingRow] = useState<PageAccessSettingsRow | null>(null);

  const loadPageAccess = async () => {
    setLoading(true);
    try {
      const response = await axioss.get('/users/page-access-settings/');
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось загрузить доступы к страницам'));
    } finally {
      setLoading(false);
    }
  };

  const updateCheckbox = (roleKey: string, pageKey: keyof PageAccessSettingsRow['pages'], value: boolean) => {
    setRows((prev) => prev.map((row) => (
      row.role === roleKey
        ? {
            ...row,
            pages: {
              ...row.pages,
              [pageKey]: value,
            },
          }
        : row
    )));
  };

  const updateFeatureCheckbox = (roleKey: string, featureKey: keyof PageAccessSettingsRow['features'], value: boolean) => {
    setRows((prev) => prev.map((row) => (
      row.role === roleKey
        ? {
            ...row,
            features: {
              ...row.features,
              [featureKey]: value,
            },
          }
        : row
    )));
  };

  const handleSaveClick = (row: PageAccessSettingsRow) => {
    if (row.is_locked) return;
    setPendingRow(row);
    setIsModalOpen(true);
  };

  const confirmSave = async () => {
    if (!pendingRow) return;
    setIsModalOpen(false);
    await executeSave(pendingRow);
    setPendingRow(null);
  };

  const cancelSave = () => {
    setIsModalOpen(false);
    setPendingRow(null);
  };

  const executeSave = async (row: PageAccessSettingsRow) => {
    if (row.is_locked) return;

    setSavingRole(row.role);
    try {
      const response = await axioss.patch('/users/page-access-settings/', {
        role: row.role,
        pages: row.pages,
        features: row.features,
      });

      setRows((prev) => prev.map((entry) => (entry.role === row.role ? response.data : entry)));
      toast.success(`Доступы для роли "${row.role_label}" сохранены`);
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось сохранить доступы'));
      loadPageAccess();
    } finally {
      setSavingRole(null);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadPageAccess();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <>
        <Breadcrumb pageName="Доступ к страницам" />
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
      <Breadcrumb pageName="Доступ к страницам" />

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/nastroyka')}
            className="rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
          >
            ← Назад
          </button>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-black dark:text-white">Управление доступом по ролям</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Администратор может включать и отключать доступ к разделам бокового меню и отдельным функциям для каждой роли.
            </p>
          </div>

          {loading ? (
            <div className="text-sm">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">Данные не найдены</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Роль</th>
                      {PAGE_LABELS.map((page) => (
                        <th key={page.key} className="px-4 py-3 text-center font-semibold">{page.label}</th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSaving = savingRole === row.role;
                      return (
                        <tr key={row.role} className="border-t border-stroke dark:border-strokedark">
                          <td className="px-4 py-3 font-medium text-black dark:text-white">
                            <div>{row.role_label}</div>
                            <div className="text-xs text-slate-500">{row.role}</div>
                          </td>
                          {PAGE_LABELS.map((page) => (
                            <td key={page.key} className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.pages[page.key]}
                                disabled={row.is_locked || isSaving}
                                onChange={(event) => updateCheckbox(row.role, page.key, event.target.checked)}
                                className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center">
                            {row.is_locked ? (
                              <span className="text-xs text-slate-500">Всегда включено</span>
                            ) : (
                              <button
                                onClick={() => handleSaveClick(row)}
                                disabled={isSaving}
                                className="rounded bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                              >
                                {isSaving ? 'Сохранение...' : 'Сохранить'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-8">
                <h3 className="mb-3 text-base font-semibold text-black dark:text-white">Функции внутри страниц</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Роль</th>
                        {FEATURE_LABELS.map((feature) => (
                          <th key={feature.key} className="px-4 py-3 text-center font-semibold">{feature.label}</th>
                        ))}
                        <th className="px-4 py-3 text-center font-semibold">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const isSaving = savingRole === row.role;
                        return (
                          <tr key={`${row.role}-features`} className="border-t border-stroke dark:border-strokedark">
                            <td className="px-4 py-3 font-medium text-black dark:text-white">
                              <div>{row.role_label}</div>
                              <div className="text-xs text-slate-500">{row.role}</div>
                            </td>
                            {FEATURE_LABELS.map((feature) => (
                              <td key={feature.key} className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.features[feature.key]}
                                  disabled={row.is_locked || isSaving}
                                  onChange={(event) => updateFeatureCheckbox(row.role, feature.key, event.target.checked)}
                                  className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center">
                              {row.is_locked ? (
                                <span className="text-xs text-slate-500">Всегда включено</span>
                              ) : (
                                <button
                                  onClick={() => handleSaveClick(row)}
                                  disabled={isSaving}
                                  className="rounded bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                                >
                                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isModalOpen && pendingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-boxdark">
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">Подтвердите сохранение</h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
              Вы уверены, что хотите сохранить изменения доступа для роли "{pendingRow.role_label}"?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelSave}
                className="rounded border border-stroke px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 dark:border-strokedark dark:text-slate-300 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={confirmSave}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PageAccessPage;