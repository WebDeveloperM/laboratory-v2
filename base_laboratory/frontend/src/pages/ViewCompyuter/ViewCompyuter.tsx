import { useEffect, useState } from 'react';
import { BASE_URL, resolveEmployeeImageUrl } from '../../utils/urls';
import Skeleton from '../../components/Skeleton/Skeleton';
import axioss from '../../api/axios';
import { isAuthenticated } from '../../utils/auth';
import { Navigate, useParams } from 'react-router-dom';
import { ModalDataInput } from '../../components/Input/ModalDataInput';

type ItemDetail = {
  id: number;
  issued_at: string | null;
  next_due_date: string | null;
  issued_by: number | null;
  issued_by_info?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
  isActive: boolean;
  ppeproduct: Array<number | { id: number; name?: string }>;
  ppeproduct_info?: Array<{
    id: number;
    name: string;
    type_product: string | null;
    renewal_months: number;
  }>;
  employee?: {
    first_name?: string;
    last_name?: string;
    surname?: string;
    tabel_number?: string;
    base_image?: string | null;
    base_image_url?: string | null;
    base_image_data?: string | null;
    position?: string;
    special_clothing_size?: string;
    clothe_size?: string;
    shoe_size?: string;
    jacket_size?: string;
    tshirt_size?: string;
    date_of_employment?: string | null;
    date_of_change_position?: string | null;
    department?: {
      name?: string;
      boss_fullName?: string;
    };
    section?: {
      name?: string;
    };
  };
};

const ViewCompyuter = () => {
  const { slug } = useParams();

  const [data, setData] = useState<ItemDetail | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const employeeBaseImageUrl = resolveEmployeeImageUrl(
    data?.employee?.base_image_data || data?.employee?.base_image_url || data?.employee?.base_image,
  );

  useEffect(() => {
    if (!slug) return;

    axioss
      .get(`${BASE_URL}/item-view/${slug}`)
      .then((response) => {
        setData(response.data);
        setImageLoadFailed(false);
      })
      .catch((err) => console.log(err));
  }, [slug]);

  if (!isAuthenticated()) {
    return <Navigate to="/auth/signin" />;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4">
        <div className="col-span-4">
          <div className=" py-5">
            {data ? (
              <div>
                <h1 className="p-5 pt-5 pb-3 font-semibold">Сотрудник</h1>
                <div className="p-5 py-3 pb-5 border-b mb-2">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="grid sm:grid-cols-12 gap-4">
                        <ModalDataInput
                          label="Фамилия"
                          inputData={data.employee?.last_name || '-'}
                          wrapperClassName="col-span-3"
                        />
                        <ModalDataInput
                          label="Имя"
                          inputData={data.employee?.first_name || '-'}
                          wrapperClassName="col-span-3"
                        />
                        <ModalDataInput
                          label="Отчество"
                          inputData={data.employee?.surname || '-'}
                          wrapperClassName="col-span-3"
                        />
                        <ModalDataInput
                          label="Табельный номер"
                          inputData={data.employee?.tabel_number || '-'}
                          wrapperClassName="col-span-3"
                        />
                        <ModalDataInput
                          label="Должность"
                          inputData={data.employee?.position || '-'}
                          multiline
                          rows={1}
                          wrapperClassName="col-span-6"
                        />
                        <ModalDataInput
                          label="Цех"
                          inputData={data.employee?.department?.name || '-'}
                          wrapperClassName="col-span-3"
                        />
                        <ModalDataInput
                          label="Отдел"
                          inputData={data.employee?.section?.name || '-'}
                          wrapperClassName="col-span-3"
                        />
                        <ModalDataInput
                          label="Руководитель цеха"
                          inputData={data.employee?.department?.boss_fullName || '-'}
                          wrapperClassName="col-span-6"
                        />
                      </div>
                    </div>

                    <div className="w-full shrink-0 self-start lg:w-auto">
                      <label className="mb-2 block text-black dark:text-white">Базовое фото сотрудника</label>
                      {employeeBaseImageUrl && !imageLoadFailed ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(employeeBaseImageUrl)}
                          className="h-40 w-full max-w-xs rounded border bg-black/5 p-1 lg:w-48"
                        >
                          <img
                            src={employeeBaseImageUrl}
                            alt="employee_base_image"
                            className="h-full w-full rounded object-cover bg-black"
                            onError={() => setImageLoadFailed(true)}
                          />
                        </button>
                      ) : (
                        <div className="w-full max-w-xs rounded border border-dashed px-4 py-3 text-sm text-gray-500 lg:w-48">
                          Базовое фото отсутствует
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h1 className="p-5 pt-2 pb-3 font-semibold">Размер персонала</h1>
                <div className="grid sm:grid-cols-12 gap-4 p-5 py-3 pb-7 border-b mb-2">
                  <ModalDataInput
                    label="Спецодежды"
                    inputData={data.employee?.special_clothing_size || '-'}
                    wrapperClassName="col-span-3"
                  />
                  <ModalDataInput
                    label="Обуви"
                    inputData={data.employee?.shoe_size || '-'}
                    wrapperClassName="col-span-3"
                  />
                  <ModalDataInput
                    label="Куртка"
                    inputData={data.employee?.jacket_size || '-'}
                    wrapperClassName="col-span-3"
                  />
                  <ModalDataInput
                    label="Футболка"
                    inputData={data.employee?.tshirt_size || '-'}
                    wrapperClassName="col-span-3"
                  />
                  <ModalDataInput
                    label="Дата приема на работу"
                    inputData={formatDate(data.employee?.date_of_employment)}
                    wrapperClassName="col-span-3"
                  />
                  <ModalDataInput
                    label="Дата последнего изменения должности"
                    inputData={formatDate(data.employee?.date_of_change_position)}
                    wrapperClassName="col-span-3"
                  />
                </div>

                <h1 className="p-5 pt-2 pb-3 font-semibold">Выдача СИЗ</h1>
                <div className="grid sm:grid-cols-12 gap-4 p-5 py-3 pb-7 border-b">
                  {/* <ModalDataInput label="Дата выдачи" inputData={formatDate(data.issued_at)} /> */}
                  {/* <ModalDataInput label="Следующая выдача" inputData={formatDate(data.next_due_date)} /> */}
                  <ModalDataInput
                    label="Выдал"
                    inputData={data.issued_by_info?.full_name || data.issued_by_info?.username || (data.issued_by ? String(data.issued_by) : '-')}
                  />
                  <div className="col-span-3">
                    <label className="mb-3 block text-black dark:text-white">Активен</label>
                    <div className="w-full rounded-md border-stroke bg-transparent py-2 px-3 text-black dark:border-form-strokedark dark:bg-form-input dark:text-white">
                      <input
                        type="checkbox"
                        checked={Boolean(data.isActive)}
                        disabled
                        readOnly
                        className="w-4 h-4 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

       
              </div>
            ) : (
              <div className="grid grid-cols-12 ">
                <div className="col-span-3 ">
                  <Skeleton />
                </div>
                <div className="col-span-3 ">
                  <Skeleton />
                </div>
                <div className="col-span-3 ">
                  <Skeleton />
                </div>
                <div className="col-span-3 ">
                  <Skeleton />
                </div>
              </div>
            )}

            {previewImage ? (
              <div
                className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    setPreviewImage(null);
                  }
                }}
              >
                <div className="w-full max-w-2xl rounded-md bg-white p-4 shadow-xl dark:bg-boxdark">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Базовое фото сотрудника</h3>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="flex h-6 w-6 items-center justify-center rounded border text-sm leading-none hover:bg-slate-50 dark:hover:bg-boxdark-2"
                      aria-label="Close preview"
                    >
                      ×
                    </button>
                  </div>

                  <div className="rounded border p-2">
                    <img
                      src={previewImage}
                      alt="preview_base_image"
                      className="max-h-[75vh] w-full rounded object-contain"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

      </div>

    </>
  );
};

export default ViewCompyuter;
