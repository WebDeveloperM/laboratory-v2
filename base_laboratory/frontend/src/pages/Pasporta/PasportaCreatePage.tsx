import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaFilePdf } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import ExcelEditor, { type ExcelEditorHandle } from '../../components/ExcelEditor';
import axioss from '../../api/axios';
import html2pdf from 'html2pdf.js';
import { isActualValueInvalid, ACTUAL_VALUE_INVALID_CSS } from '../../utils/passportValidation';

// ─── Types ────────────────────────────────────────────────────────────────────

type TField = {
  id: number;
  key: string;
  label: string;
  field_type: 'text' | 'date' | 'number' | 'select' | 'textarea';
  options: string[];
  order: number;
  required: boolean;
};

type TRow = {
  id: number;
  order: number;
  name: string;
  gost: string;
  standard_value: string;
  standard_value_2: string;
  unit: string;
  is_section: boolean;
};

type Template = {
  id: number;
  name: string;
  category: string;
  product_standard: string;
  reservoir_type: string;
  header_html: string;
  footer_html: string;
  fields: TField[];
  rows: TRow[];
};

type TemplateListItem = {
  id: number;
  name: string;
  category: string;
  product_standard: string;
};

// ─── Document generator ───────────────────────────────────────────────────────

function generateDocumentHtml(
  tpl: Template,
  fieldValues: Record<string, string>,
  actualValues: Record<string, string>,
): string {
  // Replace {{key}} placeholders in header/footer
  const fill = (html: string) => {
    return html.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => fieldValues[key] ?? '');
  };

  const header = fill(tpl.header_html || '');
  const footer = fill(tpl.footer_html || '');

  // Build table
  let rowIndex = 0;
  const tableRows = tpl.rows.map(row => {
    if (row.is_section) {
      return `<tr><td colspan="6" style="padding:3px 6px;font-weight:bold;border:1px solid #555;background:#f3f3f3;">${row.name}</td></tr>`;
    }

    rowIndex += 1;
    const actual = actualValues[String(row.id)] ?? '';
    const normMain = row.standard_value || '-';
    const normOtr = row.standard_value_2 || '-';
    return `<tr>
      <td style="padding:2px 4px;border:1px solid #555;text-align:center;vertical-align:top;">${rowIndex}.</td>
      <td style="padding:2px 6px;border:1px solid #555;vertical-align:top;">${row.name}</td>
      <td style="padding:2px 4px;border:1px solid #555;text-align:center;vertical-align:top;">${row.gost || '-'}</td>
      <td style="padding:2px 4px;border:1px solid #555;text-align:center;vertical-align:top;">${normMain}</td>
      <td style="padding:2px 4px;border:1px solid #555;text-align:center;vertical-align:top;">${normOtr}</td>
      <td style="padding:2px 4px;border:1px solid #555;text-align:center;vertical-align:top;font-weight:bold;">${actual || '&nbsp;'}</td>
    </tr>`;
  }).join('');

  const tableHtml = `
    <table style="border-collapse:collapse;width:100%;font-family:'Times New Roman',serif;font-size:10.5pt;margin:10px 0;">
      <thead>
        <tr style="background:#efefef;">
          <th style="padding:3px 4px;border:1px solid #555;text-align:center;width:5%;">№ п/п</th>
          <th style="padding:3px 6px;border:1px solid #555;text-align:center;width:39%;">Наименование показателей</th>
          <th style="padding:3px 4px;border:1px solid #555;text-align:center;width:16%;">НД на метод испытания</th>
          <th style="padding:3px 4px;border:1px solid #555;text-align:center;width:13%;">Норма по O'z DSt летн.</th>
          <th style="padding:3px 4px;border:1px solid #555;text-align:center;width:13%;">Норма по ОТР</th>
          <th style="padding:3px 4px;border:1px solid #555;text-align:center;width:14%;">Фактическое значение</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;

  return header + tableHtml + footer;
}

// ─── Component ────────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark';

export default function PasportaCreatePage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEdit = Boolean(editId);

  const previewRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const actualEditorRef = useRef<ExcelEditorHandle>(null);

  const [templateList, setTemplateList] = useState<TemplateListItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadingTpl, setLoadingTpl] = useState(false);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [actualValues, setActualValues] = useState<Record<string, string>>({});
  const [documentHtml, setDocumentHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Load template list
  useEffect(() => {
    axioss.get('/passport-templates/')
      .then(r => setTemplateList(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => {});
  }, []);

  // In edit mode — load existing passport and pre-fill form
  useEffect(() => {
    if (!editId || templateList.length === 0) return;
    (async () => {
      setLoadingTpl(true);
      try {
        const r = await axioss.get(`/passports/${editId}/`);
        const passport = r.data;
        const tplId = String(passport.template || '');
        setSelectedId(tplId);
        if (tplId) {
          const rt = await axioss.get(`/passport-templates/${tplId}/`);
          const tpl: Template = rt.data;
          setTemplate(tpl);
          setFieldValues(passport.field_values || {});
          setActualValues(passport.actual_values || {});
        }
      } catch { toast.error('Паспорт юклаб бўлмади'); }
      finally { setLoadingTpl(false); }
    })();
  }, [editId, templateList]);

  // Load template detail
  const handleTemplateSelect = async (id: string) => {
    setSelectedId(id);
    setTemplate(null);
    setFieldValues({});
    setActualValues({});
    setDocumentHtml('');
    if (!id) return;
    setLoadingTpl(true);
    try {
      const r = await axioss.get(`/passport-templates/${id}/`);
      const tpl: Template = r.data;
      setTemplate(tpl);
      // Init field values
      const fv: Record<string, string> = {};
      tpl.fields.forEach(f => {
        fv[f.key] = f.field_type === 'select' && f.options?.length ? '' : '';
        // Pre-fill reservoir if template specifies
        if (f.key === 'reservoir_type' || f.key === 'reservoir') {
          if (tpl.reservoir_type === 'reservoir') fv[f.key] = 'Резервуар';
          if (tpl.reservoir_type === 'wagon') fv[f.key] = 'Вагон';
        }
      });
      setFieldValues(fv);
      // Init actual values
      const av: Record<string, string> = {};
      tpl.rows.forEach(row => { if (!row.is_section) av[String(row.id)] = ''; });
      setActualValues(av);
    } catch { toast.error("Шаблонни юклаб бўлмади"); }
    finally { setLoadingTpl(false); }
  };

  // Debounced preview update
  useEffect(() => {
    if (!template) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const html = generateDocumentHtml(template, fieldValues, actualValues);
      setDocumentHtml(html);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [fieldValues, actualValues, template]);

  const setFV = (key: string, val: string) =>
    setFieldValues(prev => ({ ...prev, [key]: val }));

  const handleDownloadPdf = async () => {
    if (!template || !previewRef.current) {
      toast.warn('Avval shablon tanlang');
      return;
    }

    const pdfElement = previewRef.current;
    const passportNo = (fieldValues.passport_no || fieldValues.passport_number || 'passport').trim();
    const safePassportNo = passportNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `passport_${safePassportNo || 'document'}.pdf`;

    setPdfLoading(true);
    try {
      const exporter = (html2pdf as any)();
      await exporter
        .set({
          margin: [8, 8, 8, 8],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(pdfElement)
        .save();
      toast.success('PDF yuklab olindi');
    } catch {
      toast.error('PDF yaratishda xatolik');
    } finally {
      setPdfLoading(false);
    }
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!template) { toast.warn('Шаблон танланг'); return; }
    setSaving(true);
    try {
      const finalHtml = generateDocumentHtml(template, fieldValues, actualValues);
      const payload = {
        template: template.id,
        field_values: fieldValues,
        actual_values: actualValues,
        document_html: finalHtml,
      };
      if (isEdit) {
        await axioss.patch(`/passports/${editId}/`, payload);
        toast.success('Паспорт янгиланди');
      } else {
        await axioss.post('/passports/', payload);
        toast.success('Паспорт сақланди');
      }
      navigate('/pasporta');
    } catch { toast.error('Сақлашда хатолик'); }
    finally { setSaving(false); }
  };

  // Group template list by category
  const grouped = templateList.reduce<Record<string, TemplateListItem[]>>((acc, t) => {
    const cat = t.category || 'Другое';
    (acc[cat] = acc[cat] || []).push(t);
    return acc;
  }, {});

  return (
    <>
      <Breadcrumb pageName={isEdit ? 'Паспортни tahrirlash' : 'Yangi pasport'} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* ── LEFT: form ──────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Template selector */}
          <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h4 className="mb-3 text-sm font-semibold text-black dark:text-white">1. Shablon tanlash</h4>
            <select className={inputCls} value={selectedId}
              disabled={isEdit}
              onChange={e => handleTemplateSelect(e.target.value)}>
              <option value="">— Shablon tanlang —</option>
              {Object.entries(grouped).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map(t => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}{t.product_standard ? ` (${t.product_standard})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {loadingTpl && <p className="mt-2 text-xs text-bodydark2">Yuklanmoqda...</p>}
          </div>

          {/* Header fields */}
          {template && template.fields.length > 0 && (
            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
              <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
                2. Hujjat ma'lumotlari
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {template.fields.map(f => (
                  <div key={f.id}>
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                      {f.label}
                      {f.required && <span className="ml-1 text-danger">*</span>}
                    </label>
                    {f.field_type === 'select' ? (
                      <select className={inputCls} value={fieldValues[f.key] || ''}
                        onChange={e => setFV(f.key, e.target.value)}>
                        <option value="">— Выберите —</option>
                        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.field_type === 'textarea' ? (
                      <textarea className={inputCls} rows={3} value={fieldValues[f.key] || ''}
                        onChange={e => setFV(f.key, e.target.value)} />
                    ) : (
                      <input
                        className={inputCls}
                        type={f.field_type === 'date' ? 'date' : f.field_type === 'number' ? 'number' : 'text'}
                        value={fieldValues[f.key] || ''}
                        onChange={e => setFV(f.key, e.target.value)}
                        placeholder={f.label}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actual values — Excel editor */}
          {template && template.rows.length > 0 && (
            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
              <h4 className="mb-3 text-sm font-semibold text-black dark:text-white">
                3. Фактические значения
              </h4>
              <p className="mb-3 text-xs text-bodydark2">
                Faqat <strong>"Фактическое значение"</strong> ustunini to'ldiring. Qolgan ustunlar o'qish uchun.
              </p>
              <ExcelEditor
                key={template.id}
                ref={actualEditorRef}
                height={Math.min(600, Math.max(200, template.rows.length * 26 + 60))}
                minSpareRows={0}
                columns={[
                  { title: 'Наименование показателей', width: 320, readOnly: true },
                  { title: 'Метод контроля', width: 150, readOnly: true },
                  { title: 'Значение по НД', width: 120, readOnly: true },
                  { title: 'Фактическое значение', width: 160 },
                ]}
                data={template.rows.map(row => [
                  row.name,
                  row.is_section ? '' : row.gost,
                  row.is_section ? '' : row.standard_value,
                  row.is_section ? '' : (actualValues[String(row.id)] || ''),
                ])}
                onChange={(data) => {
                  const newAV: Record<string, string> = {};
                  data.forEach((rowData, i) => {
                    const tplRow = template.rows[i];
                    if (tplRow && !tplRow.is_section) {
                      newAV[String(tplRow.id)] = String(rowData[3] ?? '').trim();
                    }
                  });
                  setActualValues(newAV);
                }}
                getCellStyle={(rowData: string[], rowIndex: number, colIndex: number) => {
                  if (colIndex !== 3) return undefined;
                  const tplRow = template.rows[rowIndex];
                  if (!tplRow || tplRow.is_section) return undefined;
                  const invalid = isActualValueInvalid(
                    { name: tplRow.name, norm: tplRow.standard_value || '' },
                    rowData[3] || '',
                  );
                  return invalid ? ACTUAL_VALUE_INVALID_CSS : undefined;
                }}
              />
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate('/pasporta')}
              className="rounded border border-stroke px-6 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4">
              Отмена
            </button>
            <button onClick={handleSave} disabled={saving || !template}
              className="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60">
              {saving ? 'Сақланмоқда...' : isEdit ? 'Янгилаш' : 'Сақлаш'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: preview ──────────────────────────────────────────────── */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between border-b border-stroke px-5 py-3 dark:border-strokedark">
            <h4 className="text-sm font-semibold text-black dark:text-white">Preview</h4>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!template || pdfLoading}
              className="inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaFilePdf size={12} />
              {pdfLoading ? 'PDF tayyorlanmoqda...' : 'PDF yuklab olish'}
            </button>
          </div>
          <div style={{ background: '#525659', minHeight: 600, padding: '24px 16px', overflowY: 'auto' }}>
            {!template ? (
              <div className="flex h-40 items-center justify-center">
                <span className="text-sm text-gray-400">Shablon tanlanmagan</span>
              </div>
            ) : (
              <div
                ref={previewRef}
                style={{
                  background: '#fff',
                  maxWidth: 794,
                  minHeight: 1123,
                  margin: '0 auto',
                  padding: '72px 90px',
                  boxShadow: '0 3px 16px rgba(0,0,0,0.45)',
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: '11pt',
                  lineHeight: 1.5,
                  color: '#000',
                }}
                dangerouslySetInnerHTML={{ __html: documentHtml }}
              />
            )}
          </div>
        </div>

      </div>
    </>
  );
}
