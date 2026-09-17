import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { BASE_URL, resolveEmployeeImageUrl } from '../../utils/urls';

type EmployeeInfo = {
  id?: number;
  slug?: string;
  full_name?: string;
  tabel_number?: string;
  position?: string;
  department_name?: string;
  section_name?: string;
  base_image?: string | null;
  base_image_data?: string | null;
};

type ProductInfo = {
  id: number;
  name: string;
  type_product?: string | null;
  type_product_display?: string | null;
  renewal_months?: number;
  size?: string | null;
};

type UserInfo = {
  id?: number | null;
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  base_avatar?: string | null;
};

type IssueQrResponse = {
  qr_token: string;
  qr_scan_url?: string;
  qr_code_image?: string | null;
  employee: EmployeeInfo;
  issue: {
    item_id?: number;
    item_slug?: string;
    issued_at?: string | null;
    confirmed_at?: string | null;
    employee_signed_at?: string | null;
    warehouse_signed_at?: string | null;
    created_at?: string | null;
    issued_by_info?: UserInfo | null;
    created_by_info?: UserInfo | null;
    signature_image?: string | null;
    warehouse_signature_image?: string | null;
    verified_image?: string | null;
  };
  products: ProductInfo[];
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

export default function IssueQrDetailPage() {
  const { token } = useParams();
  const [data, setData] = useState<IssueQrResponse | null>(null);
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
        const response = await axios.get<IssueQrResponse>(`${BASE_URL}/issue-qr/${token}/`);
        if (!cancelled) {
          setData(response.data);
        }
      } catch (requestError: any) {
        if (!cancelled) {
          setError(requestError?.response?.data?.error || 'Не удалось загрузить данные выдачи.');
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
        <div className="mx-auto max-w-4xl border border-slate-300 bg-white p-6 shadow-[8px_8px_0_rgba(15,23,42,0.08)]">
          Загрузка данных выдачи...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f2efe7] px-4 py-8 text-slate-700">
        <div className="mx-auto max-w-4xl border border-red-300 bg-white p-6 shadow-[8px_8px_0_rgba(127,29,29,0.08)]">
          <div className="text-lg font-semibold text-red-600">QR выдача не найдена</div>
          <div className="mt-2 text-sm text-slate-600">{error || 'Данные отсутствуют.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 text-slate-900 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">QR выдача СИЗ</div>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{data.employee.full_name || 'Сотрудник'}</h1>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border-b border-slate-200 px-5 py-4 xl:border-r">
                <div className="text-xs uppercase tracking-wide text-slate-500">Таб. №</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{data.employee.tabel_number || '-'}</div>
              </div>
              <div className="border-b border-slate-200 px-5 py-4 sm:border-l xl:border-l-0 xl:border-r">
                <div className="text-xs uppercase tracking-wide text-slate-500">Должность</div>
                <div className="mt-2 break-words text-sm font-semibold leading-5 text-slate-900">{data.employee.position || '-'}</div>
              </div>
              <div className="border-b border-slate-200 px-5 py-4 xl:border-r xl:border-b-0">
                <div className="text-xs uppercase tracking-wide text-slate-500">Цех</div>
                <div className="mt-2 break-words text-sm font-semibold leading-5 text-slate-900">{data.employee.department_name || '-'}</div>
              </div>
              <div className="border-b border-slate-200 px-5 py-4 sm:border-l xl:border-l-0 xl:border-b-0">
                <div className="text-xs uppercase tracking-wide text-slate-500">Отдел</div>
                <div className="mt-2 break-words text-sm font-semibold leading-5 text-slate-900">{data.employee.section_name || '-'}</div>
              </div>
            </div>

            <div className="flex items-center justify-center bg-slate-50 p-5 lg:border-l lg:border-slate-200">
              <div className="w-full max-w-[140px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {data.employee.base_image_data || data.employee.base_image ? (
                  <img
                    src={resolveEmployeeImageUrl(data.employee.base_image_data || data.employee.base_image || '')}
                    alt="employee_base_photo"
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-slate-400">Нет фото</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <h2 className="text-lg font-semibold text-slate-950">Полученные средства защиты</h2>
              {data.issue.item_slug ? (
                <Link
                  to={`/item-view/${data.issue.item_slug}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Открыть карточку
                </Link>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">№</th>
                    <th className="px-4 py-3">Наименование</th>
                    <th className="px-4 py-3">Размер</th>
                    <th className="px-4 py-3">Ед. изм.</th>
                    <th className="px-4 py-3">Срок</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product, index) => (
                    <tr key={`${product.id}-${index}`} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                      <td className="px-4 py-3 text-slate-700">{product.size || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{product.type_product_display || product.type_product || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{product.renewal_months ?? '-'} мес.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-slate-950">Фото подтверждения</h2>
            </div>
            <div className="bg-slate-50 p-3 sm:p-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {data.issue.verified_image ? (
                  <img
                    src={resolveEmployeeImageUrl(data.issue.verified_image)}
                    alt="issue_verified_image"
                    className="h-64 w-full object-contain bg-white sm:h-80"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-slate-400 sm:h-80">Фото отсутствует</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-950">Склад менеджер</h2>
          </div>

          <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex items-center justify-center bg-slate-50 p-5 lg:border-r lg:border-slate-200">
              <div className="w-full max-w-[140px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {data.issue.issued_by_info?.base_avatar ? (
                  <img
                    src={resolveEmployeeImageUrl(data.issue.issued_by_info.base_avatar)}
                    alt="issued_by_avatar"
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-slate-400">Нет фото</div>
                )}
              </div>
            </div>

            <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border-b border-slate-200 px-5 py-4 xl:border-r xl:border-b-0">
                <div className="text-xs uppercase tracking-wide text-slate-500">Фамилия</div>
                <div className="mt-2 break-words text-sm font-semibold text-slate-900">{data.issue.issued_by_info?.last_name || '-'}</div>
              </div>
              <div className="border-b border-slate-200 px-5 py-4 sm:border-l xl:border-l-0 xl:border-r xl:border-b-0">
                <div className="text-xs uppercase tracking-wide text-slate-500">Имя</div>
                <div className="mt-2 break-words text-sm font-semibold text-slate-900">{data.issue.issued_by_info?.first_name || '-'}</div>
              </div>
              <div className="border-b border-slate-200 px-5 py-4 xl:border-r xl:border-b-0">
                <div className="text-xs uppercase tracking-wide text-slate-500">Должность</div>
                <div className="mt-2 break-words text-sm font-semibold text-slate-900">{data.issue.issued_by_info?.position || '-'}</div>
              </div>
              <div className="px-5 py-4 sm:border-l xl:border-l-0">
                <div className="text-xs uppercase tracking-wide text-slate-500">Выдано</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(data.issue.issued_at)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}