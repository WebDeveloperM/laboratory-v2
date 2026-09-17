import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Modal, Tabs } from 'flowbite-react';
import { FaSpinner } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axioss from '../../api/axios';
import { buildApprovalSteps } from '../../utils/passportApproval';
import PassportApprovalStepsTable from '../Passport/PassportApprovalStepsTable';
import PassportApprovalHierarchyChart from '../Passport/PassportApprovalHierarchyChart';
import { spravkaTemplates } from '../../pages/Spravki/templates';
import type { SpravkaVerificationInfo } from '../../pages/Spravki/templates/shared/types';

type SpravkaDetail = {
  id: number;
  spravka_number: string;
  actual_values: Record<string, string>;
  shift_head: string;
  sttl_head: string;
  czl_head: string;
  dispatcher_head: string;
  approval_status: string;
  approval_status_display: string;
  current_step: string | null;
  rejected_step: string | null;
  rejected_at: string | null;
  rejection_comment: string | null;
  submitted_by_username: string | null;
  submitted_at: string | null;
  sttl_approved_by_username: string | null;
  sttl_approved_at: string | null;
  czl_approved_by_username: string | null;
  czl_approved_at: string | null;
  dispatcher_approved_by_username: string | null;
  dispatcher_approved_at: string | null;
  can_approve_current_step: boolean;
  can_submit: boolean;
};

type Props = {
  spravkaId: number | null;
  onClose: () => void;
  onActionSuccess?: () => void;
};

export default function SpravkaViewDrawer({ spravkaId, onClose, onActionSuccess }: Props) {
  const [detail, setDetail] = useState<SpravkaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const requestIdRef = useRef(0);

  const loadSpravka = async (id: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setPdfUrl(null);
    setPdfError(null);

    try {
      const r = await axioss.get(`/spravki/${id}/`);
      if (requestIdRef.current !== requestId) return;
      const d: SpravkaDetail = r.data;
      setDetail(d);
      setLoading(false);

      const av = d.actual_values || {};
      const templateName = av._template || '';
      const template = spravkaTemplates[templateName];
      if (!template) return;

      setPdfLoading(true);
      try {
        const verificationInfo: SpravkaVerificationInfo | null =
          d.approval_status === 'approved'
            ? {
                spravkaNumber: d.spravka_number || '',
                steps: [
                  { role: 'Начальник СТТЛ', fullName: d.sttl_head, approvedByUsername: d.sttl_approved_by_username, approvedAt: d.sttl_approved_at },
                  { role: 'Начальник ЦЗЛ', fullName: d.czl_head, approvedByUsername: d.czl_approved_by_username, approvedAt: d.czl_approved_at },
                  { role: 'Диспетчер', fullName: d.dispatcher_head, approvedByUsername: d.dispatcher_approved_by_username, approvedAt: d.dispatcher_approved_at },
                ],
              }
            : null;
        const url = await template.generatePdf(av, 'blob', verificationInfo);
        if (requestIdRef.current !== requestId) {
          if (typeof url === 'string') URL.revokeObjectURL(url);
          return;
        }
        if (typeof url === 'string') setPdfUrl(url);
      } catch {
        if (requestIdRef.current === requestId) setPdfError('Не удалось сформировать PDF');
      } finally {
        if (requestIdRef.current === requestId) setPdfLoading(false);
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setError('Не удалось загрузить справку');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (spravkaId == null) {
      requestIdRef.current += 1;
      setDetail(null);
      setError(null);
      setPdfUrl(null);
      setPdfError(null);
      return;
    }
    setDetail(null);
    loadSpravka(spravkaId);
  }, [spravkaId]);

  useEffect(() => {
    if (!pdfUrl) return;
    return () => URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const steps = detail
    ? buildApprovalSteps({
        status: detail.approval_status,
        currentStep: detail.current_step,
        rejectedStep: detail.rejected_step,
        rejectedAt: detail.rejected_at,
        rejectionComment: detail.rejection_comment,
        submittedByUsername: detail.submitted_by_username,
        submittedAt: detail.submitted_at,
        sttlApprovedByUsername: detail.sttl_approved_by_username,
        sttlApprovedAt: detail.sttl_approved_at,
        czlApprovedByUsername: detail.czl_approved_by_username,
        czlApprovedAt: detail.czl_approved_at,
        dispatcherApprovedByUsername: detail.dispatcher_approved_by_username,
        dispatcherApprovedAt: detail.dispatcher_approved_at,
        fieldValues: {
          shift_head: detail.shift_head,
          sttl_head: detail.sttl_head,
          czl_head: detail.czl_head,
          dispatcher_head: detail.dispatcher_head,
        },
      })
    : [];

  const canSignCurrentStep = Boolean(detail?.can_approve_current_step);

  const handleSubmit = async () => {
    if (spravkaId == null) return;
    setSubmitLoading(true);
    try {
      await axioss.post(`/spravki/${spravkaId}/submit/`);
      toast.success('Справка отправлена на согласование');
      await loadSpravka(spravkaId);
      onActionSuccess?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось отправить справку на согласование');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApprove = async () => {
    if (spravkaId == null) return;
    setApproveLoading(true);
    try {
      await axioss.post(`/spravki/${spravkaId}/approve/`);
      toast.success('Справка подписана');
      setApproveModalOpen(false);
      await loadSpravka(spravkaId);
      onActionSuccess?.();
      window.dispatchEvent(new Event('spravka-approval-changed'));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось подписать справку');
    } finally {
      setApproveLoading(false);
    }
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectComment('');
  };

  const handleReject = async () => {
    if (spravkaId == null) return;
    setRejectLoading(true);
    try {
      await axioss.post(`/spravki/${spravkaId}/reject/`, { comment: rejectComment.trim() });
      toast.success('Справка отклонена');
      closeRejectModal();
      await loadSpravka(spravkaId);
      onActionSuccess?.();
      window.dispatchEvent(new Event('spravka-approval-changed'));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось отклонить справку');
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <>
      <Drawer
        open={spravkaId != null}
        onClose={onClose}
        position="right"
        className="z-[999999] flex w-full max-w-4xl flex-col overflow-hidden"
        theme={{
          root: {
            base: 'fixed z-40 flex flex-col overflow-hidden bg-white p-4 transition-transform dark:bg-gray-800',
            backdrop: 'fixed inset-0 z-[999998] bg-gray-900/50 dark:bg-gray-900/80',
          },
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-stroke pb-4 dark:border-strokedark">
          <h5 className="text-base font-semibold text-gray-500 dark:text-gray-400">
            {detail ? `Справка № ${detail.spravka_number || '—'}` : 'Справка'}
          </h5>
          <div className="flex items-center gap-2">
            {detail?.can_submit && (
              <button
                type="button"
                disabled={submitLoading}
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitLoading ? <FaSpinner className="animate-spin" size={12} /> : null}
                Отправить на подпись
              </button>
            )}
            {canSignCurrentStep && (
              <>
                <button
                  type="button"
                  disabled={approveLoading}
                  onClick={() => setApproveModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {approveLoading ? <FaSpinner className="animate-spin" size={12} /> : null}
                  Подписать
                </button>
                <button
                  type="button"
                  disabled={approveLoading}
                  onClick={() => setRejectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Отклонить
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <FiX size={16} />
              <span className="sr-only">Close menu</span>
            </button>
          </div>
        </div>
        <Drawer.Items className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-bodydark2">
              <FaSpinner className="mr-2 animate-spin" /> Загрузка...
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center text-sm text-red-500">{error}</div>
          ) : detail ? (
            <Tabs
              key={spravkaId}
              aria-label="Просмотр справки"
              theme={{
                base: 'flex h-full min-h-0 flex-col gap-2',
                tabitemcontainer: { base: 'min-h-0 flex-1 overflow-hidden' },
                tabpanel: 'h-full overflow-y-auto py-3',
                tablist: {
                  tabitem: {
                    base: 'flex items-center justify-center rounded-t p-4 text-sm font-medium first:ml-0 focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:text-gray-400 disabled:dark:text-gray-500',
                    variant: {
                      default: {
                        base: 'rounded-t',
                      },
                    },
                  },
                },
              }}
            >
              <Tabs.Item active title="Документ">
                <div className="h-full w-full">
                  {pdfLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-bodydark2">
                      <FaSpinner className="mr-2 animate-spin" /> Формирование PDF...
                    </div>
                  ) : pdfError ? (
                    <div className="flex h-full items-center justify-center text-sm text-red-500">{pdfError}</div>
                  ) : pdfUrl ? (
                    <iframe src={pdfUrl} title="Справка PDF" className="h-full w-full rounded border border-stroke dark:border-strokedark" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-sm text-bodydark2">
                      PDF недоступен для этой справки
                    </div>
                  )}
                </div>
              </Tabs.Item>
              <Tabs.Item title="Участники согласования">
                <PassportApprovalStepsTable steps={steps} passportNumber={detail.spravka_number} docLabel="Справка" />
              </Tabs.Item>
              <Tabs.Item title="Иерархия согласования">
                <PassportApprovalHierarchyChart steps={steps} />
              </Tabs.Item>
            </Tabs>
          ) : null}
        </Drawer.Items>
      </Drawer>

      <Modal show={approveModalOpen} onClose={() => !approveLoading && setApproveModalOpen(false)} className="z-[9999999]">
        <Modal.Header>Подтвердите подписание</Modal.Header>
        <Modal.Body>
          <p className="text-sm text-black dark:text-white">
            Вы уверены, что хотите подписать справку № {detail?.spravka_number || '—'}?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setApproveModalOpen(false)} disabled={approveLoading}>
            Отмена
          </Button>
          <Button color="success" onClick={handleApprove} disabled={approveLoading}>
            {approveLoading ? 'Подписывается...' : 'Подписать'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={rejectModalOpen} onClose={() => !rejectLoading && closeRejectModal()} className="z-[9999999]">
        <Modal.Header>Отклонить справку</Modal.Header>
        <Modal.Body>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-black dark:text-white">Причина отклонения (необязательно)</label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={4}
              placeholder="Укажите причину отклонения (необязательно)"
              className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={closeRejectModal} disabled={rejectLoading}>
            Отмена
          </Button>
          <Button color="failure" onClick={handleReject} disabled={rejectLoading}>
            {rejectLoading ? 'Отклонение...' : 'Отклонить'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
