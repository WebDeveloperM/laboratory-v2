export type NormalizedRole = 'admin' | 'it_center' | 'shift_head' | 'sttl_head' | 'czl_head' | 'dispatcher' | 'user';

// These four roles all share the same page/feature access defaults below —
// they replace the single consolidated laboratory_manager role with per-position labels.
export const MANAGER_TIER_ROLES: NormalizedRole[] = ['shift_head', 'sttl_head', 'czl_head', 'dispatcher'];
export const isManagerTierRole = (role: NormalizedRole) => (MANAGER_TIER_ROLES as string[]).includes(role);

export type PageAccess = {
  dashboard: boolean;
  ppe_arrival: boolean;
  statistics: boolean;
  // Паспорта section, kept separate from `settings` on purpose: the passport form lives on
  // the template page, and Начальник смены needs it without access to all of Настройки.
  passports: boolean;
  settings: boolean;
};

export type FeatureAccess = {
  dashboard_due_cards: boolean;
  dashboard_export_excel: boolean;
  dashboard_delete_employee: boolean;
  employee_ppe_tab: boolean;
  face_id_control: boolean;
  ppe_arrival_intake: boolean;
};

const PAGE_ACCESS_STORAGE_KEY = 'page_access';
const FEATURE_ACCESS_STORAGE_KEY = 'feature_access';

export const normalizeRole = (rawRole: string | null): NormalizedRole => {
  const value = String(rawRole || '').trim().toLowerCase();
  if (value === 'admin' || value === 'админ') return 'admin';
  if (value === 'it_center' || value === 'it-center' || value === 'it center') return 'it_center';
  if (value === 'shift_head' || value === 'начальник смены') return 'shift_head';
  if (value === 'sttl_head' || value === 'начальник сттл') return 'sttl_head';
  if (value === 'czl_head' || value === 'начальник цзл') return 'czl_head';
  if (value === 'dispatcher' || value === 'диспетчер') return 'dispatcher';
  return 'user';
};

export const getDefaultPageAccess = (role: NormalizedRole): PageAccess => {
  if (role === 'admin' || role === 'it_center') {
    return {
      dashboard: true,
      ppe_arrival: true,
      statistics: true,
      passports: true,
      settings: true,
    };
  }

  if (isManagerTierRole(role)) {
    return {
      dashboard: true,
      ppe_arrival: true,
      statistics: true,
      passports: true,
      settings: true,
    };
  }

  // `passports` defaults to true for every role — the section used to be shown to all
  // authenticated users, so defaulting it off would silently take it away.
  return {
    dashboard: true,
    ppe_arrival: false,
    statistics: false,
    passports: true,
    settings: false,
  };
};

export const normalizePageAccess = (rawPageAccess: any, role: NormalizedRole): PageAccess => {
  const defaults = getDefaultPageAccess(role);
  if (!rawPageAccess || typeof rawPageAccess !== 'object') {
    return defaults;
  }

  return {
    dashboard: typeof rawPageAccess.dashboard === 'boolean' ? rawPageAccess.dashboard : defaults.dashboard,
    ppe_arrival: typeof rawPageAccess.ppe_arrival === 'boolean' ? rawPageAccess.ppe_arrival : defaults.ppe_arrival,
    statistics: typeof rawPageAccess.statistics === 'boolean' ? rawPageAccess.statistics : defaults.statistics,
    passports: typeof rawPageAccess.passports === 'boolean' ? rawPageAccess.passports : defaults.passports,
    settings: typeof rawPageAccess.settings === 'boolean' ? rawPageAccess.settings : defaults.settings,
  };
};

export const getDefaultFeatureAccess = (role: NormalizedRole): FeatureAccess => {
  if (role === 'admin') {
    return {
      dashboard_due_cards: true,
      dashboard_export_excel: true,
      dashboard_delete_employee: true,
      employee_ppe_tab: true,
      face_id_control: true,
      ppe_arrival_intake: true,
    };
  }

  if (role === 'it_center') {
    return {
      dashboard_due_cards: true,
      dashboard_export_excel: true,
      dashboard_delete_employee: true,
      employee_ppe_tab: true,
      face_id_control: false,
      ppe_arrival_intake: true,
    };
  }

  if (isManagerTierRole(role)) {
    return {
      dashboard_due_cards: true,
      dashboard_export_excel: true,
      dashboard_delete_employee: false,
      employee_ppe_tab: true,
      face_id_control: true,
      ppe_arrival_intake: true,
    };
  }

  return {
    dashboard_due_cards: true,
    dashboard_export_excel: true,
    dashboard_delete_employee: false,
    employee_ppe_tab: true,
    face_id_control: false,
    ppe_arrival_intake: false,
  };
};

export const normalizeFeatureAccess = (rawFeatureAccess: any, role: NormalizedRole): FeatureAccess => {
  const defaults = getDefaultFeatureAccess(role);
  if (!rawFeatureAccess || typeof rawFeatureAccess !== 'object') {
    return defaults;
  }

  return {
    dashboard_due_cards: typeof rawFeatureAccess.dashboard_due_cards === 'boolean' ? rawFeatureAccess.dashboard_due_cards : defaults.dashboard_due_cards,
    dashboard_export_excel: typeof rawFeatureAccess.dashboard_export_excel === 'boolean' ? rawFeatureAccess.dashboard_export_excel : defaults.dashboard_export_excel,
    dashboard_delete_employee: typeof rawFeatureAccess.dashboard_delete_employee === 'boolean' ? rawFeatureAccess.dashboard_delete_employee : defaults.dashboard_delete_employee,
    employee_ppe_tab: typeof rawFeatureAccess.employee_ppe_tab === 'boolean' ? rawFeatureAccess.employee_ppe_tab : defaults.employee_ppe_tab,
    face_id_control: typeof rawFeatureAccess.face_id_control === 'boolean' ? rawFeatureAccess.face_id_control : defaults.face_id_control,
    ppe_arrival_intake: typeof rawFeatureAccess.ppe_arrival_intake === 'boolean' ? rawFeatureAccess.ppe_arrival_intake : defaults.ppe_arrival_intake,
  };
};

export const getStoredPageAccess = (role?: NormalizedRole): PageAccess => {
  const resolvedRole = role || normalizeRole(localStorage.getItem('role'));
  const defaults = getDefaultPageAccess(resolvedRole);
  const rawValue = localStorage.getItem(PAGE_ACCESS_STORAGE_KEY);

  if (!rawValue) {
    return defaults;
  }

  try {
    return normalizePageAccess(JSON.parse(rawValue), resolvedRole);
  } catch {
    return defaults;
  }
};

export const storePageAccess = (pageAccess: PageAccess) => {
  localStorage.setItem(PAGE_ACCESS_STORAGE_KEY, JSON.stringify(pageAccess));
};

export const getStoredFeatureAccess = (role?: NormalizedRole): FeatureAccess => {
  const resolvedRole = role || normalizeRole(localStorage.getItem('role'));
  const defaults = getDefaultFeatureAccess(resolvedRole);
  const rawValue = localStorage.getItem(FEATURE_ACCESS_STORAGE_KEY);

  if (!rawValue) {
    return defaults;
  }

  try {
    return normalizeFeatureAccess(JSON.parse(rawValue), resolvedRole);
  } catch {
    return defaults;
  }
};

export const storeFeatureAccess = (featureAccess: FeatureAccess) => {
  localStorage.setItem(FEATURE_ACCESS_STORAGE_KEY, JSON.stringify(featureAccess));
};

export const clearStoredPageAccess = () => {
  localStorage.removeItem(PAGE_ACCESS_STORAGE_KEY);
  localStorage.removeItem(FEATURE_ACCESS_STORAGE_KEY);
};

export const getFirstAccessibleRoute = (pageAccess: PageAccess) => {
  if (pageAccess.dashboard) return '/';
  if (pageAccess.ppe_arrival) return '/ppe-arrival';
  if (pageAccess.statistics) return '/statistics';
  if (pageAccess.passports) return '/pasporta';
  if (pageAccess.settings) return '/nastroyka';
  return null;
};