import { FaCheckCircle, FaHourglassHalf, FaMinusCircle, FaPaperPlane, FaRegCircle, FaTimesCircle } from 'react-icons/fa';
import { ApprovalStepView, ApprovalStepStatusKind, formatApprovalTimestamp, formatShortName, visibleHierarchySteps } from '../../utils/passportApproval';

const STYLES: Record<ApprovalStepStatusKind, { card: string; badge: string; icon: JSX.Element; passed: boolean }> = {
  created: {
    card: 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    icon: <FaPaperPlane className="text-sky-500" />,
    passed: true,
  },
  approved: {
    card: 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    icon: <FaCheckCircle className="text-green-500" />,
    passed: true,
  },
  pending: {
    card: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <FaHourglassHalf className="text-amber-500" />,
    passed: false,
  },
  rejected: {
    card: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: <FaTimesCircle className="text-red-500" />,
    passed: false,
  },
  not_reached: {
    card: 'border-stroke bg-gray-2 opacity-70 dark:border-strokedark dark:bg-meta-4',
    badge: 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
    icon: <FaRegCircle className="text-bodydark2" />,
    passed: false,
  },
  skipped: {
    card: 'border-stroke bg-gray-2 opacity-70 dark:border-strokedark dark:bg-meta-4',
    badge: 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
    icon: <FaMinusCircle className="text-bodydark2" />,
    passed: true,
  },
};

export default function PassportApprovalHierarchyChart({ steps }: { steps: ApprovalStepView[] }) {
  const visibleSteps = visibleHierarchySteps(steps);
  return (
    <div className="flex w-full flex-col overflow-x-auto px-4 sm:flex-row sm:items-stretch">
      {visibleSteps.map((step, index) => {
        const style = STYLES[step.statusKind];
        const isLast = index === visibleSteps.length - 1;
        const lineCls = style.passed ? 'bg-green-400 dark:bg-green-700' : 'bg-gray-200 dark:bg-strokedark';
        return (
          <div key={step.key} className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center">
            <div className={`flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-3 shadow-1 ${style.card}`}>
              <div className="text-lg">{style.icon}</div>
              <div className="truncate text-sm font-semibold text-black dark:text-white" title={step.role}>{step.role}</div>
              <div className="truncate text-xs text-bodydark2" title={step.fullName}>{formatShortName(step.fullName)}</div>
              <span className={`mt-1 inline-block w-fit max-w-full truncate rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                {step.statusLabel}
              </span>
              <div className="truncate text-xs text-bodydark2">{formatApprovalTimestamp(step.timestamp)}</div>
              {step.comment && <div className="text-xs italic text-red-500">{step.comment}</div>}
            </div>
            {!isLast && (
              <>
                <div className={`mx-auto h-6 w-0.5 sm:hidden ${lineCls}`} />
                <div className={`hidden h-0.5 w-4 shrink-0 self-center sm:block ${lineCls}`} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
