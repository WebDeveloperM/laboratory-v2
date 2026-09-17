import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaEye, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { spravkaTemplates } from './templates';
import { normalizeRole } from '../../utils/pageAccess';
import { inputLine } from './templates/shared/styles';
import type { AV, Person } from './templates/shared/types';

export default function SpravkiCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateName = params.get('name') || '';
  const editId = params.get('id') || '';
  const [form, setForm] = useState<AV>({});
  const [downloading, setDownloading] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const template = spravkaTemplates[templateName];
  const requiredFields = template?.requiredFields || [];
  const isFieldMissing = (key: string) => requiredFields.includes(key) && !String(form[key] || '').trim();
  const errCls = (key: string) => (showErrors && isFieldMissing(key) ? ' !border-red-600' : '');

  // Yangi spravkani faqat smena boshlig'i (va admin) yarata oladi — SpravkaListCreateView
  // dagi tekshiruv bilan bir xil. Tahrirlash (?id=...) bundan mustasno: unga
  // «Обычный пользователь» dan boshqa barcha rollar kira oladi.
  const role = normalizeRole(localStorage.getItem('role'));
  const canCreateSpravka = role === 'admin' || role === 'shift_head';
  const creationBlocked = !editId && !canCreateSpravka;

  useEffect(() => {
    if (creationBlocked) {
      toast.error('Создавать справку может только начальник смены');
      navigate('/spravki', { replace: true });
    }
  }, [creationBlocked, navigate]);

  useEffect(() => {
    axioss.get('/settings/responsible-persons/')
      .then((r: any) => setPersons(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => {});

    if (editId) {
      axioss.get(`${BASE_URL}/spravki/${editId}/`)
        .then((r: any) => {
          const av: AV = r.data?.actual_values || {};
          setForm({
            ...av,
            smena_boshligi: r.data?.shift_head || av.smena_boshligi || '',
            sttl_head: r.data?.sttl_head || '',
            czl_head: r.data?.czl_head || '',
            dispatcher_head: r.data?.dispatcher_head || '',
          });
        })
        .catch(() => toast.error('Маълумот юкланмади'));
    } else {
      axioss.get('/spravki/')
        .then((r: any) => {
          const list: any[] = Array.isArray(r.data) ? r.data : r.data?.results ?? [];
          // Faqat taklif sifatida to'ldiramiz: raqam endi qo'lda kiritilgani uchun
          // so'rov kech kelib foydalanuvchi yozganini o'chirib yubormasligi kerak.
          setForm((f) => (f.malumotnoma_no ? f : { ...f, malumotnoma_no: String(list.length + 1) }));
        })
        .catch(() => {});
    }
  }, [editId]);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  // Smena boshlig'i o'z nomidan spravka yaratadi, shuning uchun imzolovchini ro'yxatdan
  // tanlamaydi — o'z ismi avtomatik qo'yiladi. Faqat yaratishda: tahrirlashda saqlangan
  // imzolovchi ustidan yozib yuborilmasligi kerak.
  const autoShiftHead = !editId && role === 'shift_head';
  const ownPerson = useMemo(() => {
    if (!autoShiftHead) return null;
    const ownSlug = localStorage.getItem('employee_slug') || '';
    if (!ownSlug) return null;
    return persons.find((p) => p.employee_slug === ownSlug) || null;
  }, [autoShiftHead, persons]);

  useEffect(() => {
    if (ownPerson) {
      setForm((f) => (f.smena_boshligi === ownPerson.full_name ? f : { ...f, smena_boshligi: ownPerson.full_name }));
    }
  }, [ownPerson]);

  const handlePreview = async () => {
    if (!template) return;
    setDownloading(true);
    try { await template.generatePdf(form, 'open'); }
    finally { setDownloading(false); }
  };

  const handleDownload = async () => {
    if (!template) return;
    setDownloading(true);
    try { await template.generatePdf(form, 'download'); }
    finally { setDownloading(false); }
  };

  const handleSave = async () => {
    if (requiredFields.some(isFieldMissing)) {
      setShowErrors(true);
      toast.error('Заполните все обязательные поля');
      return;
    }

    // Yagona doim majburiy maydon — smena boshlig'i: imzo zanjiri shunga tayanadi.
    // Qolganlari, jumladan ma'lumotnoma raqami, shu shablon o'z requiredFields'ida
    // ko'rsatmasa, bo'sh qolishi mumkin.
    if (!String(form.smena_boshligi || '').trim()) {
      toast.error('Укажите начальника смены');
      return;
    }

    const payload = {
      spravka_number: form.malumotnoma_no || '',
      manufacture_date: '',
      reservoir: '',
      measurement: '',
      wagon_count: form.vagon_soni || '',
      wagon_numbers: form.vagon_nomeri || '',
      sample_collection_date: form.namuna_sana || '',
      issue_date: form.berilgan_sana || '',
      shift_head: form.smena_boshligi || '',
      sttl_head: form.sttl_head || '',
      czl_head: form.czl_head || '',
      dispatcher_head: form.dispatcher_head || '',
      actual_values: { ...form, _template: templateName },
    };
    try {
      if (editId) {
        await axioss.patch(`${BASE_URL}/spravki/${editId}/`, payload);
      } else {
        await axioss.post(`${BASE_URL}/spravki/`, payload);
      }
      toast.success(editId ? 'Изменения сохранены' : 'Сохранено');
      navigate('/spravki');
    } catch {
      toast.error('Ошибка при сохранении');
    }
  };

  // Yuqoridagi effekt /spravki ga qaytaradi — shu orada forma ko'rinib ketmasin.
  if (creationBlocked) return null;

  if (!template) {
    return (
      <>
        <Breadcrumb pageName="Создать справку" />
        <div className="rounded-sm border border-stroke bg-white p-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="text-bodydark2">Шаблон «{templateName}» пока не настроен.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName={editId ? `Таҳрирлаш — ${templateName}` : `Справка — ${templateName}`} />

      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/spravki/select')}
          className="inline-flex items-center gap-2 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
        >
          <FaArrowLeft size={12} /> Назад шаблоны
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">

        {/* Doc code */}
        <div className="mb-3 text-right text-xs font-bold text-black dark:text-white">
          {template.docCode}
        </div>

        {/* Title */}
        <div className="mb-2 text-center text-sm font-bold underline text-black dark:text-white">
          {template.title}
        </div>

        {/* Ma'lumotnoma № — VAQTINCHA qo'lda kiritiladi (test ko'rsatuvi uchun).
            Avtomatik raqamlashga qaytarilganda bu inputni yana <span> ga almashtiring. */}
        <div className="mb-5 flex items-center justify-center gap-2">
          <span className="text-sm font-bold text-black dark:text-white">Ma'lumotnoma №</span>
          <input
            className={inputLine + ' w-32 text-center font-bold'}
            placeholder="..."
            value={form.malumotnoma_no || ''}
            onChange={(e) => set('malumotnoma_no', e.target.value)}
          />
        </div>

        {/* Address */}
        <div className="mb-4 text-sm text-black dark:text-white">
          Manzil va sinov joyi:{' '}
          <span className="underline">{template.address}</span>
        </div>

        {template.HeaderExtra && <template.HeaderExtra form={form} set={set} />}

        {/* Yetkazib beruvchi + Vagon soni */}
        <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div className="flex flex-1 items-baseline gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
              Yetkazib beruvchi tashkilot:
            </span>
            <input
              className={inputLine + ' flex-1 min-w-0' + errCls('yetkazib_beruvchi')}
              placeholder=""
              value={form.yetkazib_beruvchi || ''}
              onChange={(e) => set('yetkazib_beruvchi', e.target.value)}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
              Vagon sisternalar soni:
            </span>
            <input
              className={inputLine + ' w-20' + errCls('vagon_soni')}
              placeholder=""
              value={form.vagon_soni || ''}
              onChange={(e) => set('vagon_soni', e.target.value)}
            />
          </div>
        </div>

        {/* Vagon nomeri */}
        <div className="mb-5 flex items-baseline gap-2">
          <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
            Namuna olingan v/s nomeri:
          </span>
          <input
            className={inputLine + ' flex-1' + errCls('vagon_nomeri')}
            placeholder=""
            value={form.vagon_nomeri || ''}
            onChange={(e) => set('vagon_nomeri', e.target.value)}
          />
        </div>

        {/* Dates row */}
        {!template.shortDatesRow && (
        <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
              Namuna olingan sana:
            </span>
            <input
              className={inputLine + ' w-28' + errCls('namuna_sana')}
              placeholder=""
              value={form.namuna_sana || ''}
              onChange={(e) => set('namuna_sana', e.target.value)}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
              GOST 2517 bo'yicha:
            </span>
            <input
              className={inputLine + ' w-24' + errCls('gost_2517')}
              placeholder=""
              value={form.gost_2517 || ''}
              onChange={(e) => set('gost_2517', e.target.value)}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
              Sinov o'tkazilgan sana:
            </span>
            <input
              type="date"
              className={inputLine + ' w-40' + errCls('sinov_sana')}
              value={form.sinov_sana || ''}
              onChange={(e) => set('sinov_sana', e.target.value)}
            />
          </div>
        </div>
        )}

        {template.shortDatesRow && (
        <div className="mb-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
              GOST 2517 bo'yicha namuna olingan sana:
            </span>
            <input
              type="date"
              className={inputLine + ' w-40' + errCls('gost_namuna_sana')}
              value={form.gost_namuna_sana || ''}
              onChange={(e) => set('gost_namuna_sana', e.target.value)}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
              Sinov o'tkazilgan sana:
            </span>
            <input
              type="date"
              className={inputLine + ' w-40' + errCls('sinov_sana')}
              value={form.sinov_sana || ''}
              onChange={(e) => set('sinov_sana', e.target.value)}
            />
          </div>
        </div>
        )}

        <template.Table form={form} set={set} requiredFields={requiredFields} showErrors={showErrors} />

        {/* Smena boshligi */}
        <div className="mb-3 flex items-baseline gap-2">
          <span className="whitespace-nowrap text-sm text-black dark:text-white">Smena boshlig'i:</span>
          {autoShiftHead ? (
            ownPerson ? (
              <span
                className="border-b border-gray-600 text-sm font-medium text-black dark:border-gray-400 dark:text-white"
                style={{ width: 300 }}
              >
                {ownPerson.full_name}
              </span>
            ) : (
              <span className="text-sm text-red-600 dark:text-red-500">
                Вы не добавлены в справочник «Ответственное лицо» — обратитесь к администратору.
              </span>
            )
          ) : (
            <select
              className="border-b border-gray-600 bg-transparent text-sm outline-none dark:border-gray-400 dark:text-white"
              style={{ width: 300 }}
              value={form.smena_boshligi || ''}
              onChange={(e) => set('smena_boshligi', e.target.value)}
            >
              <option value="">— Выбрать —</option>
              {persons.filter((p) => p.position === 'Начальник смены').map((p) => (
                <option key={p.id} value={p.full_name}>{p.full_name}</option>
              ))}
            </select>
          )}
        </div>

        {/* STTL boshlig'i */}
        <div className="mb-3 flex items-baseline gap-2">
          <span className="whitespace-nowrap text-sm text-black dark:text-white">STTL boshlig'i:</span>
          <select
            className="border-b border-gray-600 bg-transparent text-sm outline-none dark:border-gray-400 dark:text-white"
            style={{ width: 300 }}
            value={form.sttl_head || ''}
            onChange={(e) => set('sttl_head', e.target.value)}
          >
            <option value="">— Выбрать —</option>
            {persons.filter((p) => p.position === 'Начальник СТТЛ').map((p) => (
              <option key={p.id} value={p.full_name}>{p.full_name}</option>
            ))}
          </select>
        </div>

        {/* SZL boshlig'i */}
        <div className="mb-3 flex items-baseline gap-2">
          <span className="whitespace-nowrap text-sm text-black dark:text-white">SZL boshlig'i:</span>
          <select
            className="border-b border-gray-600 bg-transparent text-sm outline-none dark:border-gray-400 dark:text-white"
            style={{ width: 300 }}
            value={form.czl_head || ''}
            onChange={(e) => set('czl_head', e.target.value)}
          >
            <option value="">— Выбрать —</option>
            {persons.filter((p) => p.position === 'Начальник ЦЗЛ').map((p) => (
              <option key={p.id} value={p.full_name}>{p.full_name}</option>
            ))}
          </select>
        </div>

        {/* Dispetcher */}
        <div className="mb-3 flex items-baseline gap-2">
          <span className="whitespace-nowrap text-sm text-black dark:text-white">Dispetcher:</span>
          <select
            className="border-b border-gray-600 bg-transparent text-sm outline-none dark:border-gray-400 dark:text-white"
            style={{ width: 300 }}
            value={form.dispatcher_head || ''}
            onChange={(e) => set('dispatcher_head', e.target.value)}
          >
            <option value="">— Выбрать —</option>
            {persons.filter((p) => p.position === 'Диспетчер').map((p) => (
              <option key={p.id} value={p.full_name}>{p.full_name}</option>
            ))}
          </select>
        </div>

        {/* Berilgan sana */}
        <div className="flex items-baseline gap-2">
          <span className="whitespace-nowrap text-sm text-black dark:text-white">
            Ma'lumotnoma berilgan sana:
          </span>
          <input
            type="date"
            className={inputLine + ' w-40' + errCls('berilgan_sana')}
            value={form.berilgan_sana || ''}
            onChange={(e) => set('berilgan_sana', e.target.value)}
          />
        </div>

        {/* Divider */}
        <hr className="mt-6 border-stroke dark:border-strokedark" />

        {/* Bottom action bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/spravki/select')}
            className="rounded border border-stroke px-5 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded border border-stroke px-5 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-60 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
          >
            <FaEye size={13} /> Просмотр документа
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded border border-stroke px-5 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-60 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
          >
            <FaDownload size={13} /> Скачать
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            <FaSave size={13} /> {editId ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </div>
      </div>
    </>
  );
}
