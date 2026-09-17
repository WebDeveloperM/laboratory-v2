export type ApprovalStepKey = 'submitted' | 'sttl' | 'czl' | 'dispatcher';
export type ApprovalStepStatusKind = 'created' | 'approved' | 'rejected' | 'pending' | 'not_reached' | 'skipped';

export type ApprovalStepView = {
  key: ApprovalStepKey;
  role: string;
  fullName: string;
  statusKind: ApprovalStepStatusKind;
  statusLabel: string;
  timestamp: string | null;
  comment: string | null;
  isRejectedStep: boolean;
};

export type ApprovalChainInput = {
  status: string;
  currentStep: string | null;
  rejectedStep: string | null;
  rejectedAt?: string | null;
  rejectionComment?: string | null;
  submittedByUsername?: string | null;
  submittedAt?: string | null;
  sttlApprovedByUsername?: string | null;
  sttlApprovedAt?: string | null;
  czlApprovedByUsername?: string | null;
  czlApprovedAt?: string | null;
  dispatcherApprovedByUsername?: string | null;
  dispatcherApprovedAt?: string | null;
  fieldValues?: Record<string, string>;
};

const STEP_DEFS = [
  { key: 'sttl' as const, role: 'Начальник СТТЛ', nameKey: 'sttl_head' },
  { key: 'czl' as const, role: 'Начальник ЦЗЛ', nameKey: 'czl_head' },
  { key: 'dispatcher' as const, role: 'Диспетчер', nameKey: 'dispatcher_head' },
];

export function buildApprovalSteps(input: ApprovalChainInput): ApprovalStepView[] {
  const fv = input.fieldValues || {};

  const submitted: ApprovalStepView = {
    key: 'submitted',
    role: 'Начальник смены',
    fullName: fv['shift_head'] || input.submittedByUsername || '—',
    statusKind: input.submittedAt ? 'created' : 'not_reached',
    statusLabel: input.submittedAt ? 'Отправлено' : '—',
    timestamp: input.submittedAt || null,
    comment: null,
    isRejectedStep: false,
  };

  const approvedByAt: Record<'sttl' | 'czl' | 'dispatcher', { by?: string | null; at?: string | null }> = {
    sttl: { by: input.sttlApprovedByUsername, at: input.sttlApprovedAt },
    czl: { by: input.czlApprovedByUsername, at: input.czlApprovedAt },
    dispatcher: { by: input.dispatcherApprovedByUsername, at: input.dispatcherApprovedAt },
  };

  const rest: ApprovalStepView[] = STEP_DEFS.map((def) => {
    const { by, at } = approvedByAt[def.key];
    const isRejectedStep = input.status === 'rejected' && input.rejectedStep === def.key;
    const isCurrent = input.currentStep === def.key;
    const approved = Boolean(at);
    const isSkipped = !approved && !isRejectedStep && !isCurrent && Boolean(input.submittedAt) && !fv[def.nameKey];

    const statusKind: ApprovalStepStatusKind = approved
      ? 'approved'
      : isRejectedStep
        ? 'rejected'
        : isCurrent
          ? 'pending'
          : isSkipped
            ? 'skipped'
            : 'not_reached';
    const statusLabel = approved
      ? 'Подписано'
      : isRejectedStep
        ? 'Отклонено'
        : isCurrent
          ? 'Ожидание'
          : isSkipped
            ? 'Пропущено (не назначен)'
            : '—';

    return {
      key: def.key,
      role: def.role,
      fullName: fv[def.nameKey] || by || '—',
      statusKind,
      statusLabel,
      timestamp: at || (isRejectedStep ? input.rejectedAt || null : null),
      comment: isRejectedStep ? (input.rejectionComment || '—') : null,
      isRejectedStep,
    };
  });

  return [submitted, ...rest];
}

// For progressive/graphical views: hide steps that haven't been reached yet.
// Shows everything up to and including the first step that isn't done
// (pending/rejected/not_reached); if every step is done, shows all of them.
export function visibleHierarchySteps(steps: ApprovalStepView[]): ApprovalStepView[] {
  const frontierIndex = steps.findIndex(
    (step) => step.statusKind !== 'approved' && step.statusKind !== 'created' && step.statusKind !== 'skipped',
  );
  if (frontierIndex === -1) return steps;
  return steps.slice(0, frontierIndex + 1);
}

// "ШАБОНОВ МАЪРУФ БАХРОМОВИЧ" -> "Шабонов М.Б"
export function formatShortName(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '—' || raw === '-') return '—';

  const parts = raw.split(/\s+/).filter(Boolean);
  const surname = parts[0]
    .toLocaleLowerCase('ru-RU')
    .replace(/(^|[-'’])(\S)/g, (_m, sep: string, letter: string) => sep + letter.toLocaleUpperCase('ru-RU'));

  const initials = parts
    .slice(1, 3)
    .map((part) => part.charAt(0).toLocaleUpperCase('ru-RU'))
    .join('.');

  return initials ? `${surname} ${initials}` : surname;
}

export function formatApprovalTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
