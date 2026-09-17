import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

const SPRAVKA_TEMPLATES = [
  'Газойль Синтетик',
  'Газойль',
  'САУ',
  'Керосин Синтетик',
  'Керосин',
  'ММА',
  'МТБЭ',
  'ОБ - 111',
  'Прямой бензин',
  'Синтетик нафта',
  'Бензин Россия Справка ПЛОТНОСТЬ',
  'Бензин Справка ПЛОТНОСТЬ',
  'Газоконденсат РВС',
  'Газоконденсат В-С',
  'ДЖЕТ Справка ПЛОТНОСТЬ',
  'Диз топ ЕВРО Л(В)-К4 Справка ПЛОТНОСТЬ',
  'Диз топ ЕВРО Л(С)-К4 ССДФ Справка ПЛОТНОСТЬ',
  'Диз топ ЕВРО Л(С)-К4 Справка ПЛОТНОСТЬ',
  'Диз топ ЭКО-3-0.100-40 Справка ПЛОТНОСТЬ',
  'Диз топ ЭКО-Л-0.100-62 Справка ПЛОТНОСТЬ',
  'Нефть РВС',
  'Нефть В-С',
  'Синтетик керосин РВС',
  'Синтетик керосин В-С',
];

export default function SpravkiSelectPage() {
  const navigate = useNavigate();

  const handleSelect = (name: string) => {
    navigate(`/spravki/create?name=${encodeURIComponent(name)}`);
  };

  return (
    <>
      <Breadcrumb pageName="Добавить справку — выбор шаблона" />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate('/spravki')}
          className="inline-flex items-center gap-2 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
        >
          <FaArrowLeft size={12} /> Назад
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="mb-1 text-base font-semibold text-black dark:text-white">Выберите тип продукции</h2>
        <p className="mb-5 text-sm text-bodydark2">Выберите шаблон для создания справки</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SPRAVKA_TEMPLATES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelect(name)}
              className="flex items-center justify-between rounded border border-stroke px-5 py-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:hover:border-primary"
            >
              <span className="text-sm font-semibold text-black dark:text-white">{name}</span>
              <FaPlus size={13} className="shrink-0 text-primary" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
