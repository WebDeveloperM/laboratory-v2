import { useEffect, useState } from 'react';
import { FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import PassportViewDrawer from '../../components/Passport/PassportViewDrawer';
import SpravkaViewDrawer from '../../components/Spravki/SpravkaViewDrawer';

type PassportPendingItem = {
  id: number;
  template: number | null;
  field_values: Record<string, string>;
  passport_number: string;
  template_name: string;
  template_category: string;
  approval_status: string;
  approval_status_display: string;
  current_step: string | null;
  submitted_by_username: string | null;
  submitted_at: string | null;
  created_at: string;
};

type SpravkaPendingItem = {
  id: number;
  spravka_number: string;
  approval_status: string;
  approval_status_display: string;
  current_step: string | null;
  submitted_by_username: string | null;
  submitted_at: string | null;
  created_at: string;
};

type UnifiedItem = {
  kind: 'passport' | 'spravka';
  id: number;
  number: string;
  label: string;
  approval_status_display: string;
  submitted_by_username: string | null;
  submitted_at: string | null;
};

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const thCls = 'px-4 py-3 text-left text-sm font-semibold text-black dark:text-white bg-gray-2 dark:bg-meta-4';
const tdCls = 'px-4 py-3 text-sm text-black dark:text-white border-b border-stroke dark:border-strokedark';

export default function PendingApprovalsPage() {
  const [list, setList] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDrawerPassportId, setViewDrawerPassportId] = useState<number | null>(null);
  const [viewDrawerSpravkaId, setViewDrawerSpravkaId] = useState<number | null>(null);

  const fetchList = () => {
    setLoading(true);
    Promise.all([
      axioss.get('/passports/pending-approvals/').then((r: any) => (Array.isArray(r.data) ? r.data : []) as PassportPendingItem[]).catch(() => []),
      axioss.get('/spravki/pending-approvals/').then((r: any) => (Array.isArray(r.data) ? r.data : []) as SpravkaPendingItem[]).catch(() => []),
    ])
      .then(([passports, spravki]) => {
        const unified: UnifiedItem[] = [
          ...passports.map((p): UnifiedItem => ({
            kind: 'passport',
            id: p.id,
            number: p.passport_number || '—',
            label: [p.template_name, p.template_category].filter(Boolean).join(' · '),
            approval_status_display: p.approval_status_display,
            submitted_by_username: p.submitted_by_username,
            submitted_at: p.submitted_at,
          })),
          ...spravki.map((s): UnifiedItem => ({
            kind: 'spravka',
            id: s.id,
            number: s.spravka_number || '—',
            label: '',
            approval_status_display: s.approval_status_display,
            submitted_by_username: s.submitted_by_username,
            submitted_at: s.submitted_at,
          })),
        ].sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));
        setList(unified);
      })
      .catch(() => toast.error('Список не удалось загрузить'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <>
      <Breadcrumb pageName="На подписи мне" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="max-w-full overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-bodydark2">Загрузка...</div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-sm text-bodydark2">Нет документов, ожидающих вашей подписи.</div>
          ) : (
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className={thCls}>Тип</th>
                  <th className={thCls}>№</th>
                  <th className={thCls}>Шаблон</th>
                  <th className={thCls}>Текущий шаг</th>
                  <th className={thCls}>Отправлено</th>
                  <th className={thCls}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={`${item.kind}-${item.id}`}>
                    <td className={tdCls}>
                      <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${item.kind === 'passport' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                        {item.kind === 'passport' ? 'Паспорт' : 'Справка'}
                      </span>
                    </td>
                    <td className={tdCls}>{item.number}</td>
                    <td className={tdCls}>
                      {item.label && <div className="text-xs text-bodydark2">{item.label}</div>}
                    </td>
                    <td className={tdCls}>{item.approval_status_display}</td>
                    <td className={tdCls}>
                      {item.submitted_by_username || '—'}
                      <div className="text-xs text-bodydark2">{fmtDate(item.submitted_at)}</div>
                    </td>
                    <td className={tdCls}>
                      <button
                        onClick={() => item.kind === 'passport' ? setViewDrawerPassportId(item.id) : setViewDrawerSpravkaId(item.id)}
                        className="inline-flex items-center gap-1 rounded border border-stroke px-2 py-1 text-xs dark:border-strokedark"
                      >
                        <FaEye size={12} /> Просмотр
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <PassportViewDrawer
        passportId={viewDrawerPassportId}
        onClose={() => setViewDrawerPassportId(null)}
        onActionSuccess={fetchList}
      />
      <SpravkaViewDrawer
        spravkaId={viewDrawerSpravkaId}
        onClose={() => setViewDrawerSpravkaId(null)}
        onActionSuccess={fetchList}
      />
    </>
  );
}
