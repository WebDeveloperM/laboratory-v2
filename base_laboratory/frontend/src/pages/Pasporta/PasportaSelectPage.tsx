import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';

const JET_A1_STATIC = [
  { key: 'jet-a1',     name: 'Jet A-1',                standard: 'DEF STAN 91-091' },
  { key: 'jet-a1-ssf', name: 'Jet A-1-SSF',            standard: 'DEF STAN 91-091' },
  { key: 'jet-a1-izv', name: 'Извещение для Jet А-1',  standard: '' },
];

const DIESEL_STATIC = [
  { key: 'diesel-evro-m-e-k4', name: 'ЕВРО-М-(Е)-К4', standard: '' },
  { key: 'diesel-evro-m-e-k5', name: 'ЕВРО-М-(Е)-К5', standard: '' },
  { key: 'diesel-evro-3-o-k4', name: 'ЕВРО-3-(О)-К4', standard: '' },
  { key: 'diesel-evro-3-o-k5', name: 'ЕВРО-3-(О)-К5', standard: '' },
  { key: 'diesel-evro-l-a-k3', name: 'ЕВРО-Л-(А)-К3', standard: '' },
  { key: 'diesel-evro-l-a-k4', name: 'ЕВРО-Л-(А)-К4', standard: '' },
  { key: 'diesel-evro-l-a-k5', name: 'ЕВРО-Л-(А)-К5', standard: '' },
  { key: 'diesel-evro-l-c-k4', name: 'ЕВРО-Л-(С)-К4', standard: '' },
  { key: 'diesel-evro-l-c-k5', name: 'ЕВРО-Л-(С)-К5', standard: '' },
  { key: 'diesel-evro-l-c-k6', name: 'ЕВРО-Л-(С)-К6', standard: '' },
  { key: 'diesel-evro-l-d-k4', name: 'ЕВРО-Л-(D)-К4', standard: '' },
  { key: 'diesel-evro-l-d-k5', name: 'ЕВРО-Л-(D)-К5', standard: '' },
  { key: 'diesel-evro-l-d-k6', name: 'ЕВРО-Л-(D)-К6', standard: '' },
  { key: 'diesel-evro-l-b-k3', name: 'ЕВРО-Л-(Б)-К3', standard: '' },
  { key: 'diesel-evro-l-b-k4', name: 'ЕВРО-Л-(Б)-К4', standard: '' },
  { key: 'diesel-evro-l-b-k5', name: 'ЕВРО-Л-(Б)-К5', standard: '' },
];

const DIESEL_SSDF_STATIC = [
  { key: 'diesel-evro-m-e-k4-ssdf', name: 'ЕВРО-М-(Е)-К4 SSDF', standard: '' },
  { key: 'diesel-evro-m-e-k5-ssdf', name: 'ЕВРО-М-(Е)-К5 SSDF', standard: '' },
  { key: 'diesel-evro-3-o-k4-ssdf', name: 'ЕВРО-3-(О)-К4 SSDF', standard: '' },
  { key: 'diesel-evro-3-o-k5-ssdf', name: 'ЕВРО-3-(О)-К5 SSDF', standard: '' },
  { key: 'diesel-evro-l-a-k4-ssdf', name: 'ЕВРО-Л-(А)-К4 SSDF', standard: '' },
  { key: 'diesel-evro-l-b-k4-ssdf', name: 'ЕВРО-Л-(В)-К4 SSDF', standard: '' },
  { key: 'diesel-evro-l-b-k5-ssdf', name: 'ЕВРО-Л-(В)-К5 SSDF', standard: '' },
  { key: 'diesel-evro-l-c-k4-ssdf', name: 'ЕВРО-Л-(С)-К4 SSDF', standard: '' },
  { key: 'diesel-evro-l-c-k5-ssdf', name: 'ЕВРО-Л-(С)-К5 SSDF', standard: '' },
];

const DIESEL_ECO_STATIC: { key: string; name: string; standard: string }[] = [
  { key: 'diesel-eco-3-0050-35', name: 'Диз. топ ЭКО-3-0.050-35', standard: '' },
  { key: 'diesel-eco-3-0050-40', name: 'Диз. топ ЭКО-3-0.050-40', standard: '' },
  { key: 'diesel-eco-3-0100-35', name: 'Диз. топ ЭКО-3-0.100-35', standard: '' },
  { key: 'diesel-eco-3-0100-40', name: 'Диз. топ ЭКО-3-0.100-40', standard: '' },
  { key: 'diesel-eco-l-0100-40', name: 'Диз. топ ЭКО-Л-0,100-40', standard: '' },
  { key: 'diesel-eco-l-0100-62', name: 'Диз. топ ЭКО-Л-0,100-62', standard: '' },
];

const KEROSINE_STATIC: { key: string; name: string; standard: string }[] = [
  { key: 'kerosine-fraktsiya', name: 'Керосиновая фракция', standard: '' },
];

const MAZUT_STATIC: { key: string; name: string; standard: string }[] = [
  { key: 'mazut-m-40',  name: 'Мазут-М-40',  standard: '' },
  { key: 'mazut-m-100', name: 'Мазут-М-100', standard: '' },
];

const RASTVORITEL_STATIC: { key: string; name: string; standard: string }[] = [
  { key: 'rastvoritel-uglevodorodnyy', name: 'Растворитель углеводородный', standard: '' },
];

const SERA_STATIC: { key: string; name: string; standard: string }[] = [
  { key: 'tekhnicheskaya-sera', name: 'Техническая сера', standard: '' },
];

const GAZ_STATIC: { key: string; name: string; standard: string }[] = [
  { key: 'szhizhennyy-gaz', name: 'Сжиженный газ', standard: '' },
];

const STATIC_CATEGORIES = [
  'Дизель',
  'Дизель ЕВРО SSDF',
  'Дизель ЭКО',
  'Керосиновая фракция',
  'Мазут',
  'Растворитель углеводородный',
  'Техническая сера',
  'Сжиженный газ',
];

const normalizeStaticName = (name: string) => (name || '')
  .toLowerCase()
  .trim()
  .replace(/^топливо\s+дизельное\s+дт-\s*/i, '')
  .replace(/[–—−-]/g, '')
  .replace(/[()]/g, '')
  .replace(/\s+/g, '');

type Template = {
  id: number;
  name: string;
  category: string;
  product_standard: string;
  reservoir_type: string;
};

export default function PasportaSelectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || '');

  useEffect(() => {
    axioss.get('/passport-templates/')
      .then((r: any) => {
        const all: Template[] = Array.isArray(r.data) ? r.data : r.data?.results ?? [];
        const seen = new Set<string>();
        const unique = all.filter(t => {
          const key = t.name.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setTemplates(unique);
      })
      .catch(() => toast.error('Шаблонlarni yuklashda xatolik'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(templates.map(t => t.category).filter(Boolean))].sort();
    const existing = new Set(cats.map((cat) => cat.toLowerCase()));
    const extras = STATIC_CATEGORIES.filter((cat) => !existing.has(cat.toLowerCase()));
    return [...cats, ...extras];
  }, [templates]);

  const jetStaticNames = new Set(JET_A1_STATIC.map(p => normalizeStaticName(p.name)));
  const dieselStaticNames = new Set(DIESEL_STATIC.map(p => normalizeStaticName(p.name)));
  const dieselSsdfStaticNames = new Set(DIESEL_SSDF_STATIC.map(p => normalizeStaticName(p.name)));
  const dieselEcoStaticNames = new Set(DIESEL_ECO_STATIC.map(p => normalizeStaticName(p.name)));
  const kerosineStaticNames = new Set(KEROSINE_STATIC.map(p => normalizeStaticName(p.name)));
  const mazutStaticNames = new Set(MAZUT_STATIC.map(p => normalizeStaticName(p.name)));
  const rastvoritelStaticNames = new Set(RASTVORITEL_STATIC.map(p => normalizeStaticName(p.name)));
  const seraStaticNames = new Set(SERA_STATIC.map(p => normalizeStaticName(p.name)));
  const gazStaticNames = new Set(GAZ_STATIC.map(p => normalizeStaticName(p.name)));

  const isStaticTemplateName = (name: string) => {
    const n = normalizeStaticName(name);
    return jetStaticNames.has(n) || dieselStaticNames.has(n) || dieselSsdfStaticNames.has(n) || dieselEcoStaticNames.has(n)
      || kerosineStaticNames.has(n) || mazutStaticNames.has(n) || rastvoritelStaticNames.has(n) || seraStaticNames.has(n) || gazStaticNames.has(n);
  };

  const filtered = (activeCategory
    ? templates.filter(t => t.category === activeCategory)
    : templates
  ).filter(t => {
    return !isStaticTemplateName(t.name);
  });

  const getCategoryCount = (category: string) => {
    const categoryVisibleCount = templates
      .filter(t => t.category === category)
      .filter(t => !isStaticTemplateName(t.name)).length;

    const categoryLower = category.toLowerCase();
    if (categoryLower === 'дизель эко') return categoryVisibleCount + DIESEL_ECO_STATIC.length;
    if (categoryLower === 'дизель евро ssdf') return categoryVisibleCount + DIESEL_SSDF_STATIC.length;
    if (categoryLower.includes('дизель')) return categoryVisibleCount + DIESEL_STATIC.length;
    if (categoryLower.includes('jet')) return categoryVisibleCount + JET_A1_STATIC.length;
    if (categoryLower === 'керосиновая фракция') return categoryVisibleCount + KEROSINE_STATIC.length;
    if (categoryLower === 'мазут') return categoryVisibleCount + MAZUT_STATIC.length;
    if (categoryLower === 'растворитель углеводородный') return categoryVisibleCount + RASTVORITEL_STATIC.length;
    if (categoryLower === 'техническая сера') return categoryVisibleCount + SERA_STATIC.length;
    if (categoryLower === 'сжиженный газ') return categoryVisibleCount + GAZ_STATIC.length;
    return categoryVisibleCount;
  };

  const allCount = templates.filter(t => !isStaticTemplateName(t.name)).length + JET_A1_STATIC.length + DIESEL_STATIC.length + DIESEL_SSDF_STATIC.length + DIESEL_ECO_STATIC.length + KEROSINE_STATIC.length + MAZUT_STATIC.length + RASTVORITEL_STATIC.length + SERA_STATIC.length + GAZ_STATIC.length;

  const handleSelect = (t: Template) => {
    const isBenzin = (t.category || '').toLowerCase().includes('бензин');
    const isDiesel = (t.category || '').toLowerCase().includes('дизель');
    if (isBenzin) {
      navigate(`/pasporta/template/${t.id}?from=benzin`);
    } else if (isDiesel) {
      navigate(`/pasporta/template/${t.id}?from=diesel`);
    } else {
      navigate(`/pasporta/template/${t.id}`);
    }
  };

  const showJetStatic = !activeCategory || activeCategory.toLowerCase().includes('jet');
  const showDieselStatic = !activeCategory || activeCategory.toLowerCase() === 'дизель';
  const showDieselSsdfStatic = !activeCategory || activeCategory.toLowerCase() === 'дизель евро ssdf';
  const showDieselEcoStatic = !activeCategory || activeCategory.toLowerCase() === 'дизель эко';
  const showKerosineStatic = !activeCategory || activeCategory.toLowerCase() === 'керосиновая фракция';
  const showMazutStatic = !activeCategory || activeCategory.toLowerCase() === 'мазут';
  const showRastvoritelStatic = !activeCategory || activeCategory.toLowerCase() === 'растворитель углеводородный';
  const showSeraStatic = !activeCategory || activeCategory.toLowerCase() === 'техническая сера';
  const showGazStatic = !activeCategory || activeCategory.toLowerCase() === 'сжиженный газ';
  const hasStaticCards = showJetStatic || showDieselStatic || showDieselSsdfStatic || showDieselEcoStatic
    || showKerosineStatic || showMazutStatic || showRastvoritelStatic || showSeraStatic || showGazStatic;

  return (
    <>
      <Breadcrumb pageName="Добавить паспорт — выбор шаблона" />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate('/pasporta')}
          className="inline-flex items-center gap-2 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
        >
          <FaArrowLeft size={12} /> Назад
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h3 className="text-base font-semibold text-black dark:text-white">Выберите тип продукции</h3>
          <p className="mt-1 text-sm text-bodydark2">Выберите шаблон для создания паспорта</p>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-stroke px-6 py-3 dark:border-strokedark">
            <button
              onClick={() => setActiveCategory('')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === ''
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-bodydark2 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-4/80'
              }`}
            >
              Все ({allCount})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-bodydark2 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-4/80'
                }`}
              >
                {/* Displayed name only — the plain "Дизель" static list is all ЕВРО-branded
                    products now that SSDF has its own tab, but the underlying category value
                    stays "Дизель" so it still matches any real backend template tagged that way. */}
                {cat === 'Дизель' ? 'Дизель ЕВРО' : cat} ({getCategoryCount(cat)})
              </button>
            ))}
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center text-sm text-bodydark2">Загрузка...</div>
          ) : filtered.length === 0 && !hasStaticCards ? (
            <div className="py-16 text-center text-sm text-bodydark2">Шаблоны отсутствуют</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t)}
                  className="flex items-center justify-between rounded border border-stroke px-5 py-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary"
                >
                  <div>
                    <div className="text-sm font-semibold text-black dark:text-white">{t.name}</div>
                    {t.product_standard && (
                      <div className="mt-0.5 text-xs text-bodydark2">{t.product_standard}</div>
                    )}
                    {t.category && (
                      <div className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-bodydark2 dark:bg-meta-4">
                        {t.category}
                      </div>
                    )}
                  </div>
                  <FaPlus size={13} className="shrink-0 text-primary" />
                </button>
              ))}

              {showJetStatic && JET_A1_STATIC.map(p => {
                const existing = templates.find(t => normalizeStaticName(t.name) === normalizeStaticName(p.name));
                return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => existing
                    ? navigate(`/pasporta/template/${existing.id}?from=jet`)
                    : navigate(`/pasporta/template/new?from=jet&item=${p.key}`)
                  }
                  className="flex items-center justify-between rounded border border-stroke px-5 py-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary"
                >
                  <div>
                    <div className="text-sm font-semibold text-black dark:text-white">{p.name}</div>
                    {p.standard && (
                      <div className="mt-0.5 text-xs text-bodydark2">{p.standard}</div>
                    )}
                    <div className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-bodydark2 dark:bg-meta-4">
                      Jet A-1
                    </div>
                  </div>
                  <FaPlus size={13} className="shrink-0 text-primary" />
                </button>
                );
              })}

              {showDieselStatic && DIESEL_STATIC.map(p => {
                return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => navigate(`/pasporta/template/new?from=diesel&item=${p.key}`)}
                  className="flex items-center justify-between rounded border border-stroke px-5 py-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary"
                >
                  <div>
                    <div className="text-sm font-semibold text-black dark:text-white">{p.name}</div>
                    {p.standard && (
                      <div className="mt-0.5 text-xs text-bodydark2">{p.standard}</div>
                    )}
                    <div className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-bodydark2 dark:bg-meta-4">
                      Дизель
                    </div>
                  </div>
                  <FaPlus size={13} className="shrink-0 text-primary" />
                </button>
                );
              })}
            </div>
          )}
          <hr className="mt-4 border-t border-stroke dark:border-strokedark" />

          {showDieselSsdfStatic && !loading && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {DIESEL_SSDF_STATIC.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => navigate(`/pasporta/template/new?from=diesel&item=${p.key}`)}
                  className="flex items-center justify-between rounded border border-stroke px-5 py-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary"
                >
                  <div>
                    <div className="text-sm font-semibold text-black dark:text-white">{p.name}</div>
                    <div className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-bodydark2 dark:bg-meta-4">
                      Дизель
                    </div>
                  </div>
                  <FaPlus size={13} className="shrink-0 text-primary" />
                </button>
              ))}
            </div>
          )}

          {showDieselEcoStatic && !loading && DIESEL_ECO_STATIC.length > 0 && (
            <>
              <hr className="mt-4 border-t border-stroke dark:border-strokedark" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {DIESEL_ECO_STATIC.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => navigate(`/pasporta/template/new?from=diesel-eco&item=${p.key}`)}
                    className="flex items-center justify-between rounded border border-stroke px-5 py-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary"
                  >
                    <div>
                      <div className="text-sm font-semibold text-black dark:text-white">{p.name}</div>
                      {p.standard && (
                        <div className="mt-0.5 text-xs text-bodydark2">{p.standard}</div>
                      )}
                      <div className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-bodydark2 dark:bg-meta-4">
                        Дизель ЭКО
                      </div>
                    </div>
                    <FaPlus size={13} className="shrink-0 text-primary" />
                  </button>
                ))}
              </div>
            </>
          )}

          {[
            { show: showKerosineStatic, list: KEROSINE_STATIC, label: 'Керосиновая фракция', from: 'kerosine' },
            { show: showMazutStatic, list: MAZUT_STATIC, label: 'Мазут', from: 'mazut' },
            { show: showRastvoritelStatic, list: RASTVORITEL_STATIC, label: 'Растворитель углеводородный', from: 'rastvoritel' },
            { show: showSeraStatic, list: SERA_STATIC, label: 'Техническая сера', from: 'sera' },
            { show: showGazStatic, list: GAZ_STATIC, label: 'Сжиженный газ', from: 'gaz' },
          ].map(({ show, list, label, from }) =>
            show && !loading && list.length > 0 ? (
              <div key={label}>
                <hr className="mt-4 border-t border-stroke dark:border-strokedark" />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => navigate(`/pasporta/template/new?from=${from}&item=${p.key}`)}
                      className="flex items-center justify-between rounded border border-stroke px-5 py-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary"
                    >
                      <div>
                        <div className="text-sm font-semibold text-black dark:text-white">{p.name}</div>
                        {p.standard && (
                          <div className="mt-0.5 text-xs text-bodydark2">{p.standard}</div>
                        )}
                        <div className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-bodydark2 dark:bg-meta-4">
                          {label}
                        </div>
                      </div>
                      <FaPlus size={13} className="shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
    </>
  );
}
