import { useEffect, useState } from 'react';
import { Button, Modal } from 'flowbite-react';
import { ApprovalStepView, formatApprovalTimestamp } from '../../utils/passportApproval';
import { generateQrCodeBase64 } from '../../utils/passportPdf';

const thCls = 'border border-stroke px-3 py-2 text-center text-xs font-semibold text-black dark:border-strokedark dark:text-white bg-gray-2 dark:bg-meta-4';
const tdCls = 'border border-stroke px-3 py-2 text-xs text-black dark:border-strokedark dark:text-white';

type Props = {
  steps: ApprovalStepView[];
  passportNumber?: string;
  docLabel?: string;
};

export default function PassportApprovalStepsTable({ steps, passportNumber, docLabel = 'Паспорт' }: Props) {
  const [qrByStep, setQrByStep] = useState<Record<string, string>>({});
  const [zoomedQr, setZoomedQr] = useState<{ src: string; label: string } | null>(null);

  const hasQr = (step: ApprovalStepView) => step.statusKind === 'approved' || step.statusKind === 'created';

  const qrEligibleSteps = steps.filter(hasQr);
  const qrDepsKey = qrEligibleSteps.map((step) => `${step.key}:${step.fullName}:${step.timestamp}`).join('|');

  useEffect(() => {
    if (!qrDepsKey) {
      setQrByStep({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        qrEligibleSteps.map(async (step) => {
          const text = [
            `${docLabel} № ${passportNumber || '-'}`,
            `ФИО: ${step.fullName}`,
            `Должность: ${step.role}`,
            `${step.statusLabel}: ${formatApprovalTimestamp(step.timestamp)}`,
          ].join('\n');
          const qr = await generateQrCodeBase64(text);
          return [step.key, qr] as const;
        }),
      );
      if (!cancelled) setQrByStep(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrDepsKey, passportNumber]);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className={thCls}>Должность</th>
              <th className={thCls}>ФИО</th>
              <th className={thCls}>Статус</th>
              <th className={thCls}>Дата</th>
              <th className={thCls}>Подтверждение</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <tr key={step.key} className={step.isRejectedStep ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                <td className={tdCls}>{step.role}</td>
                <td className={tdCls}>{step.fullName}</td>
                <td className={`${tdCls} ${step.isRejectedStep ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                  {step.statusLabel}
                </td>
                <td className={tdCls}>{formatApprovalTimestamp(step.timestamp)}</td>
                <td className={tdCls}>
                  {hasQr(step) && qrByStep[step.key] ? (
                    <img
                      src={qrByStep[step.key]}
                      alt="QR"
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => setZoomedQr({ src: qrByStep[step.key], label: `${step.role} — ${step.fullName}` })}
                    />
                  ) : (
                    step.comment ?? '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={Boolean(zoomedQr)} onClose={() => setZoomedQr(null)} className="z-[9999999]">
        <Modal.Header>{zoomedQr?.label}</Modal.Header>
        <Modal.Body>
          <div className="flex justify-center">
            {zoomedQr && <img src={zoomedQr.src} alt="QR" className="h-64 w-64" />}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setZoomedQr(null)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
