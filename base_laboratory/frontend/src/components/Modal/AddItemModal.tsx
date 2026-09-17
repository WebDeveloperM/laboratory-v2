// src/components/Modal/AddItemModal.tsx
import React, { FC, useState, useEffect } from 'react';
import axios from '../../api/axios';
import { addItemConfig, ModelConfig } from '../../configs/addItemConfig';

interface Props {
  modelKey: string | null;
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  allDepartments?: { id: number; name: string }[];
}

export const AddItemModal: FC<Props> = ({
  modelKey,
  visible,
  onClose,
  onCreated,
  allDepartments,
}) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [config, setConfig] = useState<ModelConfig | null>(null);

  useEffect(() => {
    if (!modelKey) return;
    const cfg = { ...addItemConfig[modelKey] };
    if (cfg.key === 'section' && allDepartments) {
      cfg.fields = cfg.fields.map((f) =>
        f.name === 'department' ? { ...f, options: allDepartments } : f,
      );
    }
    setConfig(cfg);
    setForm({});
  }, [modelKey, allDepartments]);

  if (!visible || !config) return null;

  const handleChange = (name: string, value: any) =>
    setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(config.endpoint, form);
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ошибка создания');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        {/* Кнопка закрытия */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-200 rounded-full"
        >
          {/*<CloseIcon className="w-5 h-5 text-gray-600" />*/}
          X
        </button>

        <h2 className="text-2xl font-semibold mb-4">
          Добавить «{config.title}»
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((f) => (
            <div key={f.name}>
              <label className="block mb-1 text-gray-700">{f.label}</label>
              {f.type === 'text' ? (
                <input
                  type="text"
                  placeholder={`Введите ${f.label.toLowerCase()}`}
                  value={form[f.name] || ''}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring"
                />
              ) : (
                <select
                  value={form[f.name] || ''}
                  onChange={(e) => handleChange(f.name, Number(e.target.value))}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring"
                >
                  <option value="">— Выберите {f.label.toLowerCase()} —</option>
                  {f.options?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
