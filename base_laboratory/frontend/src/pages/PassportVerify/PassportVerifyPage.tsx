import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';
import { BASE_URL } from '../../utils/urls';

type VerifyStep = {
  role: string;
  full_name?: string;
  approved_by_username?: string | null;
  approved_at?: string | null;
};

type VerifyResponse = {
  passport_number: string;
  template_name: string;
  template_category: string;
  approval_status_display: string;
  submitted_by_username?: string | null;
  submitted_at?: string | null;
  steps: VerifyStep[];
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function PassportVerifyPage() {
  const { token } = useParams();
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('QR токен не найден.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get<VerifyResponse>(`${BASE_URL}/passports/verify/${token}/`);
        if (!cancelled) {
          setData(response.data);
        }
      } catch (requestError: any) {
        if (!cancelled) {
          setError(requestError?.response?.data?.error || 'Паспорт не найден или ещё не утверждён.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2efe7] px-4 py-8 text-slate-700">
        <div className="mx-auto max-w-2xl border border-slate-300 bg-white p-6 shadow-[8px_8px_0_rgba(15,23,42,0.08)]">
          Загрузка данных паспорта...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f2efe7] px-4 py-8 text-slate-700">
        <div className="mx-auto max-w-2xl border border-red-300 bg-white p-6 shadow-[8px_8px_0_rgba(127,29,29,0.08)]">
          <div className="text-lg font-semibold text-red-600">Паспорт не найден</div>
          <div className="mt-2 text-sm text-slate-600">{error || 'Данные отсутствуют.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 text-slate-900 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Проверка паспорта</div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                <FiCheckCircle size={13} />
                {data.approval_status_display}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">№ {data.passport_number}</h1>
            <div className="mt-1 text-sm text-slate-600">{data.template_name}{data.template_category ? ` · ${data.template_category}` : ''}</div>
          </div>

          <div className="grid gap-0 sm:grid-cols-2">
            <div className="border-b border-slate-200 px-5 py-4 sm:border-r">
              <div className="text-xs uppercase tracking-wide text-slate-500">Создал</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{data.submitted_by_username || '-'}</div>
            </div>
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Отправлено на согласование</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(data.submitted_at)}</div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-950">Кто подписал</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3">ФИО</th>
                  <th className="px-4 py-3">Подписал (логин)</th>
                  <th className="px-4 py-3">Дата и время</th>
                </tr>
              </thead>
              <tbody>
                {data.steps.map((step) => (
                  <tr key={step.role} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">{step.role}</td>
                    <td className="px-4 py-3 text-slate-700">{step.full_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{step.approved_by_username || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(step.approved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
