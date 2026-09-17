import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEye, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';

type Template = {
  id: number;
  name: string;
  category: string;
  product_standard: string;
  reservoir_type: string;
  fields_count: number;
  rows_count: number;
};

type BenzinSpec = {
  key: string;
  title: string;
  standard: string;
  matcher: RegExp;
};

const BENZIN_SPECS: BenzinSpec[] = [
  {
    key: 'benzin-ai-91',
    title: 'Бензин АИ-91',
    standard: "O'zDSt 3031:2015",
    matcher: /(аи|ai)[-\s]?91(?!.*(присад|prisad|quwatt|мтбэ))/i,
  },
  {
    key: 'benzin-ai-91-prisadka',
    title: 'Бензин АИ-91+присадка',
    standard: "O'zDSt 3031:2015",
    matcher: /(аи|ai)[-\s]?91.*(присад|prisad|мтбэ|additive)/i,
  },
  {
    key: 'benzin-ai-92',
    title: 'Бензин АИ-92',
    standard: "O'zDSt 3031:2015",
    matcher: /(аи|ai)[-\s]?92(?!.*(присад|prisad|quwatt|мтбэ))/i,
  },
  {
    key: 'benzin-ai-92-prisadka',
    title: 'Бензин АИ-92+присадка',
    standard: "O'zDSt 3031:2015",
    matcher: /(аи|ai)[-\s]?92.*(присад|prisad|мтбэ|additive)/i,
  },
  {
    key: 'benzin-ai-95',
    title: 'Бензин АИ-95',
    standard: "O'zDSt 3031:2015",
    matcher: /(аи|ai)[-\s]?95(?!.*quwatt)/i,
  },
  {
    key: 'benzin-ai-95-quwatt',
    title: 'Бензин АИ-95 QuWatt',
    standard: "O'zDSt 3031:2015",
    matcher: /(аи|ai)[-\s]?95.*quwatt|quwatt.*(аи|ai)[-\s]?95/i,
  },
  {
    key: 'benzin-ai-98',
    title: 'Бензин АИ-98',
    standard: "O'zDSt 3031:2015",
    matcher: /(аи|ai)[-\s]?98/i,
  },
];

export default function BenzinTemplatesDetailPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    setLoading(true);
    axioss.get('/passport-templates/')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.results ?? [];
        setTemplates(list);
      })
      .catch(() => toast.error('Список шаблонов не удалось загрузить'))
      .finally(() => setLoading(false));
  }, []);

  const benzinTemplates = useMemo(
    () => templates.filter((t) =>
      (t.category || '').toLowerCase().includes('бензин') ||
      (t.category || '').toLowerCase().includes('benzin') ||
      (t.name || '').toLowerCase().includes('бензин') ||
      (t.name || '').toLowerCase().includes('benzin')
    ),
    [templates],
  );

  const mappedSpecs = useMemo(() => {
    return BENZIN_SPECS.map((spec) => {
      const found = benzinTemplates.find((t) => spec.matcher.test(t.name || '')) || null;
      return { spec, found };
    });
  }, [benzinTemplates]);

  const handleCreatePassport = (spec: BenzinSpec, found: Template | null) => {
    if (found) {
      navigate(`/nastroyka/passport-templates/detail/${found.id}?from=benzin`);
      return;
    }

    // Always open detail page first; that page creates missing template and keeps user on same screen.
    navigate(`/nastroyka/passport-templates/detail/new?from=benzin&item=${spec.key}`);
  };

  return (
    <>
      <Breadcrumb pageName="Бензин шаблоны" />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate('/nastroyka/passport-templates')}
          className="inline-flex items-center gap-2 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
        >
          <FaArrowLeft size={12} /> Назад шаблоны
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h3 className="text-base font-semibold text-black dark:text-white">Бензин — шаблоны</h3>
          <p className="mt-1 text-sm text-bodydark2">Всего шаблонов: {benzinTemplates.length}</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-bodydark2">Загрузка...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mappedSpecs.map(({ spec, found }) => (
                <div key={spec.key} className="flex items-center justify-between rounded border border-stroke px-4 py-3 dark:border-strokedark">
                  <span className="text-sm font-semibold text-black dark:text-white">{spec.title}</span>
                  <button
                    type="button"
                    onClick={() => handleCreatePassport(spec, found)}
                    className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-opacity-90"
                  >
                    {found ? <FaEye size={11} /> : <FaPlus size={11} />}
                    Создать паспорт
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
