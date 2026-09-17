import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { toast } from 'react-toastify';

type ArrivalDetailRow = {
  arrival_id: number;
  received_at: string;
  quantity: number;
  size: string;
  note: string;
  accepted_by: {
    id: number | null;
    username: string;
    full_name: string;
  };
};

type ArrivalDetailsResponse = {
  product_id: number;
  product_name: string;
  size: string;
  date_from: string;
  date_to: string;
  total_arrived: number;
  arrivals: ArrivalDetailRow[];
};

type IssuedDetailRow = {
  item_id: number;
  employee_id: number;
  employee_slug: string;
  employee_name: string;
  tabel_number: string;
  department_name: string;
  section_name: string;
  position: string;
  issued_at: string;
  size: string;
  issued_by: {
    id: number | null;
    username: string;
    full_name: string;
  };
};

type IssuedDetailsResponse = {
  product_id: number;
  product_name: string;
  size: string;
  date_from: string;
  date_to: string;
  total_issued: number;
  issues: IssuedDetailRow[];
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const StatisticsDetailsPage = () => {
  const navigate = useNavigate();
  const { detailsType, productId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [arrivalDetails, setArrivalDetails] = useState<ArrivalDetailsResponse | null>(null);
  const [issuedDetails, setIssuedDetails] = useState<IssuedDetailsResponse | null>(null);

  const isArrivalsPage = detailsType === 'arrivals';
  const isIssuedPage = detailsType === 'issued';
  const productName = searchParams.get('productName') || '';
  const size = searchParams.get('size') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  useEffect(() => {
    if ((!isArrivalsPage && !isIssuedPage) || !productId) {
      navigate('/statistics', { replace: true });
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setArrivalDetails(null);
      setIssuedDetails(null);

      try {
        const params = new URLSearchParams();
        params.append('product_id', productId);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (size) params.append('size', size);

        if (isArrivalsPage) {
          const response = await axioss.get(`${BASE_URL}/statistics/ppe-arrival-details/?${params.toString()}`);
          const payload = response.data as ArrivalDetailsResponse;
          setArrivalDetails({
            ...payload,
            product_name: productName || payload.product_name,
          });
        } else {
          const response = await axioss.get(`${BASE_URL}/statistics/ppe-issued-details/?${params.toString()}`);
          const payload = response.data as IssuedDetailsResponse;
          setIssuedDetails({
            ...payload,
            product_name: productName || payload.product_name,
          });
        }
      } catch (error: any) {
        const backendError = error?.response?.data?.error;
        toast.error(backendError || 'Ошибка при загрузке деталей статистики');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [detailsType, from, isArrivalsPage, isIssuedPage, navigate, productId, productName, size, to]);

  const pageName = isArrivalsPage ? 'Поступило' : 'Выдано';
  const title = useMemo(() => {
    if (isArrivalsPage) {
      const effectiveName = arrivalDetails?.product_name || productName || 'Средство защиты';
      return `Когда и кем принято: ${effectiveName}${size ? ` (Размер ${size})` : ''}`;
    }

    const effectiveName = issuedDetails?.product_name || productName || 'Средство защиты';
    return `Кому выдано: ${effectiveName}${size ? ` (Размер ${size})` : ''}`;
  }, [arrivalDetails?.product_name, isArrivalsPage, issuedDetails?.product_name, productName, size]);

  const subtitle = useMemo(() => {
    if (isArrivalsPage) {
      return `За период поступило: ${arrivalDetails?.total_arrived ?? 0}`;
    }

    return `За период выдано: ${issuedDetails?.total_issued ?? 0}`;
  }, [arrivalDetails?.total_arrived, isArrivalsPage, issuedDetails?.total_issued]);

  return (
    <>
      <Breadcrumb pageName={`Статистика / ${pageName}`} />

      <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-5 flex flex-col gap-3 border-b border-stroke pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-strokedark">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            {(from || to) && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Период: {from ? formatDate(from) : 'с начала'} - {to ? formatDate(to) : 'по текущую дату'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/statistics')}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Назад
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Загрузка...</div>
        ) : isArrivalsPage ? (
          arrivalDetails?.arrivals?.length ? (
            <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-slate-50 text-left dark:border-strokedark dark:bg-slate-800">
                    <th className="px-3 py-2">№</th>
                    <th className="px-3 py-2">Количество</th>
                    <th className="px-3 py-2">Размер</th>
                    <th className="px-3 py-2">Дата приема</th>
                    <th className="px-3 py-2">Кто принял</th>
            
                  </tr>
                </thead>
                <tbody>
                  {arrivalDetails.arrivals.map((arrival, index) => (
                    <tr key={`${arrival.arrival_id}-${arrival.size}-${index}`} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">{arrival.quantity}</td>
                      <td className="px-3 py-2">{arrival.size || '-'}</td>
                      <td className="px-3 py-2">{formatDate(arrival.received_at)}</td>
                      <td className="px-3 py-2">{arrival.accepted_by?.full_name || arrival.accepted_by?.username || '-'}</td>
             
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-500">По выбранному товару приемок не найдено</div>
          )
        ) : issuedDetails?.issues?.length ? (
          <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke bg-slate-50 text-left dark:border-strokedark dark:bg-slate-800">
                  <th className="px-3 py-2">№</th>
                  <th className="px-3 py-2">Табельный номер</th>
                  <th className="px-3 py-2">Кому выдано</th>
                  <th className="px-3 py-2">Размер</th>
                  <th className="px-3 py-2">Цех</th>
                  <th className="px-3 py-2">Отдел</th>
                  <th className="px-3 py-2">Должность</th>
                  <th className="px-3 py-2">Дата выдачи</th>
                  <th className="px-3 py-2">Кто выдал</th>
                </tr>
              </thead>
              <tbody>
                {issuedDetails.issues.map((issue, index) => (
                  <tr key={`${issue.item_id}-${issue.employee_id}-${index}`} className="border-b border-stroke dark:border-strokedark">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{issue.tabel_number || '-'}</td>
                    <td className="px-3 py-2">
                      {issue.employee_slug ? (
                        <Link
                          to={`/item-view/${issue.employee_slug}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {issue.employee_name || '-'}
                        </Link>
                      ) : (
                        issue.employee_name || '-'
                      )}
                    </td>
                    <td className="px-3 py-2">{issue.size || '-'}</td>
                    <td className="px-3 py-2">{issue.department_name || '-'}</td>
                    <td className="px-3 py-2">{issue.section_name || '-'}</td>
                    <td className="px-3 py-2">{issue.position || '-'}</td>
                    <td className="px-3 py-2">{formatDateTime(issue.issued_at)}</td>
                    <td className="px-3 py-2">{issue.issued_by?.full_name || issue.issued_by?.username || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">По выбранному товару выдач не найдено</div>
        )}
      </div>
    </>
  );
};

export default StatisticsDetailsPage;