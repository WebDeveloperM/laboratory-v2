import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axioss from '../../api/axios';
import { Button, Modal } from 'flowbite-react';

type PPEProduct = {
  id: number;
  name: string;
  renewal_months: number;
  low_stock_threshold: number;
  type_product: 'Комплект' | 'Пара' | 'ШТ' | '';
  target_gender: 'ALL' | 'M' | 'F';
  is_active: boolean;
};

const PRODUCT_GENDER_OPTIONS = [
  { value: 'ALL', label: 'Для всех' },
  { value: 'M', label: 'Мужской' },
  { value: 'F', label: 'Женский' },
] as const;

const getProductGenderLabel = (value?: string) => {
  return PRODUCT_GENDER_OPTIONS.find((option) => option.value === value)?.label || 'Для всех';
};

const normalizeRole = (rawRole: string | null): 'admin' | 'it_center' | 'shift_head' | 'sttl_head' | 'czl_head' | 'dispatcher' | 'user' => {
  const value = String(rawRole || '').trim().toLowerCase();
  if (value === 'admin' || value === 'админ') return 'admin';
  if (value === 'it_center' || value === 'it-center' || value === 'it center') return 'it_center';
  if (value === 'shift_head' || value === 'начальник смены') return 'shift_head';
  if (value === 'sttl_head' || value === 'начальник сттл') return 'sttl_head';
  if (value === 'czl_head' || value === 'начальник цзл') return 'czl_head';
  if (value === 'dispatcher' || value === 'диспетчер') return 'dispatcher';
  return 'user';
};

const getBackendError = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  const firstField = Object.values(data)[0];
  if (Array.isArray(firstField) && firstField.length) {
    return String(firstField[0]);
  }
  return fallback;
};

const ProductPage = () => {
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
  const canEditBaseSettings = role === 'admin' || role === 'it_center' || role === 'shift_head' || role === 'sttl_head' || role === 'czl_head' || role === 'dispatcher';
  const canCreateProduct = canEditBaseSettings;
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<PPEProduct[]>([]);
  const [productName, setProductName] = useState('');
  const [productRenewalMonths, setProductRenewalMonths] = useState<string>('');
  const [productLowStockThreshold, setProductLowStockThreshold] = useState<string>('');
  const [productType, setProductType] = useState<'Комплект' | 'Пара' | 'ШТ'>('ШТ');
  const [productGender, setProductGender] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductName('');
    setProductRenewalMonths('');
    setProductLowStockThreshold('');
    setProductType('ШТ');
    setProductGender('ALL');
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    resetProductForm();
  };

  const openCreateProductModal = () => {
    resetProductForm();
    setIsProductModalOpen(true);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await axioss.get('/settings/ppe-products/');
      setProducts(response.data || []);
    } catch (error) {
      toast.error(getBackendError(error, 'Не удалось загрузить данные'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canEditBaseSettings) {
      setLoading(false);
      return;
    }
    loadProducts();
  }, [canEditBaseSettings]);

  const handleCreateProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!productName.trim()) {
      toast.warning('Укажите название СИЗ');
      return;
    }

    try {
      if (editingProductId !== null) {
        const currentProduct = products.find((item) => item.id === editingProductId);
        const response = await axioss.put(`/settings/ppe-products/${editingProductId}/`, {
          name: productName.trim(),
          renewal_months: Number(productRenewalMonths || 0),
          low_stock_threshold: Number(productLowStockThreshold || 0),
          type_product: productType,
          target_gender: productGender,
          is_active: currentProduct?.is_active ?? true,
        });
        const updatedProduct = response.data as PPEProduct;
        setProducts((prev) => prev
          .map((item) => (item.id === updatedProduct.id ? updatedProduct : item))
          .sort((left, right) => left.name.localeCompare(right.name, 'ru')));
        toast.success('СИЗ обновлен');
      } else {
        const response = await axioss.post('/settings/ppe-products/', {
          name: productName.trim(),
          renewal_months: Number(productRenewalMonths || 0),
          low_stock_threshold: Number(productLowStockThreshold || 0),
          type_product: productType,
          target_gender: productGender,
          is_active: true,
        });
        const createdProduct = response.data as PPEProduct;
        setProducts((prev) => [...prev, createdProduct].sort((left, right) => left.name.localeCompare(right.name, 'ru')));
        toast.success('Средство индивидуальной защиты добавлено');
      }
      closeProductModal();
    } catch (error) {
      toast.error(getBackendError(error, editingProductId !== null ? 'Ошибка при обновлении СИЗ' : 'Ошибка при добавлении СИЗ'));
    }
  };

  const handleEditProduct = (item: PPEProduct) => {
    setEditingProductId(item.id);
    setProductName(item.name || '');
    setProductRenewalMonths(String(item.renewal_months ?? ''));
    setProductLowStockThreshold(String(item.low_stock_threshold ?? ''));
    setProductType((item.type_product || 'ШТ') as 'Комплект' | 'Пара' | 'ШТ');
    setProductGender((item.target_gender || 'ALL') as 'ALL' | 'M' | 'F');
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (item: PPEProduct) => {
    const isConfirmed = window.confirm(`Удалить СИЗ "${item.name}"?`);
    if (!isConfirmed) return;

    try {
      await axioss.delete(`/settings/ppe-products/${item.id}/`);
      setProducts((prev) => prev.filter((product) => product.id !== item.id));
      if (editingProductId === item.id) {
        closeProductModal();
      }
      toast.success('СИЗ удален');
    } catch (error) {
      toast.error(getBackendError(error, 'Ошибка при удалении СИЗ'));
    }
  };

  const handleCancelEdit = () => {
    closeProductModal();
  };

  if (!canEditBaseSettings) {
    return (
      <>
        <Breadcrumb pageName="Средство инд. защиты" />
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="text-base text-red-600">Нет доступа к странице</div>
          <button
            onClick={() => navigate('/nastroyka')}
            className="mt-4 rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
          >
            ← Назад
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Средство инд. защиты" />

      <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/nastroyka')}
            className="rounded border border-stroke px-4 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-700"
          >
            ← Назад
          </button>
          {canCreateProduct && (
            <button
              type="button"
              onClick={openCreateProductModal}
              className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
            >
              + Добавить
            </button>
          )}
        </div>

        {loading && (
          <div className="rounded-sm border border-stroke bg-white p-4 text-sm dark:border-strokedark dark:bg-boxdark">
            Загрузка...
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Всего СИЗ: {products.length}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {products.length === 0 ? (
              <p className="text-center text-gray-500">Нет данных</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Название</th>
                    <th className="px-3 py-2 text-left font-semibold">Тип</th>
                    <th className="px-3 py-2 text-left font-semibold">Для кого</th>
                    <th className="px-3 py-2 text-left font-semibold">Срок (мес.)</th>
                    <th className="px-3 py-2 text-left font-semibold">Порог</th>
                    {isAdmin && <th className="px-3 py-2 text-left font-semibold">Действия</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.id} className="border-t border-stroke dark:border-strokedark">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.type_product}</td>
                      <td className="px-3 py-2">{getProductGenderLabel(item.target_gender)}</td>
                      <td className="px-3 py-2">{item.renewal_months}</td>
                      <td className="px-3 py-2">{item.low_stock_threshold}</td>
                      {isAdmin && (
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditProduct(item)}
                              className="rounded border border-stroke px-2 py-1 text-xs dark:border-strokedark"
                            >
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(item)}
                              className="rounded border border-red-400 px-2 py-1 text-xs text-red-600"
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal show={isProductModalOpen} onClose={handleCancelEdit} size="4xl">
        <Modal.Header>{editingProductId !== null ? 'Изменить СИЗ' : 'Добавить СИЗ'}</Modal.Header>
        <Modal.Body>
          <form id="product-form" onSubmit={handleCreateProduct} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Название СИЗ"
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
              />
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as 'Комплект' | 'Пара' | 'ШТ')}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
              >
                <option value="ШТ">ШТ</option>
                <option value="Комплект">Комплект</option>
                <option value="Пара">Пара</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={productGender}
                onChange={(e) => setProductGender(e.target.value as 'ALL' | 'M' | 'F')}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
              >
                {PRODUCT_GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={productRenewalMonths}
                onChange={(e) => setProductRenewalMonths(e.target.value)}
                placeholder="Срок обновления (мес.)"
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="number"
                min={0}
                value={productLowStockThreshold}
                onChange={(e) => setProductLowStockThreshold(e.target.value)}
                placeholder="Порог остатка"
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 dark:border-strokedark dark:bg-transparent"
              />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={handleCancelEdit}>
            Отмена
          </Button>
          <Button type="submit" form="product-form">
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProductPage;
