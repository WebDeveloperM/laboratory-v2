import { BASE_URL } from '../utils/urls';

export interface SelectOption {
  id: number;
  name: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'select';
  options?: SelectOption[];
}

export interface ModelConfig {
  key: string;
  endpoint: string;
  title: string;
  fields: FieldConfig[];
}

export const addItemConfig: Record<string, ModelConfig> = {
  printer: {
    key: 'printer',
    endpoint: `${BASE_URL}/printers/`,
    title: 'Принтер',
    fields: [{ name: 'name', label: 'Название принтера', type: 'text' }],
  },
  scaner: {
    key: 'scaner',
    endpoint: `${BASE_URL}/scaners/`,
    title: 'Сканер',
    fields: [{ name: 'name', label: 'Название сканера', type: 'text' }],
  },
  mfo: {
    key: 'mfo',
    endpoint: `${BASE_URL}/mfos/`,
    title: 'МФУ',
    fields: [{ name: 'name', label: 'Название МФУ', type: 'text' }],
  },
  monitor: {
    key: 'monitor',
    endpoint: `${BASE_URL}/monitors/`,
    title: 'Монитор',
    fields: [{ name: 'name', label: 'Название монитора', type: 'text' }],
  },
  section: {
    key: 'section',
    endpoint: `${BASE_URL}/sections/`,
    title: 'Отдел',
    fields: [
      { name: 'department', label: 'Цех', type: 'select' },
      { name: 'name', label: 'Название отдела', type: 'text' },
    ],
  },
};
