import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { BASE_URL } from '../../utils/urls';
import { TexnologyDataStructure } from '../../types/texnology';
import AddCompyuterSelecedTexnology from '../../components/SelectedGroup/AddCompyuterSelecedTexnology';
import { Compyuter } from '../../types/compyuters';
import MultySelectTexnology from '../../components/SelectedGroup/MultySelectTexnology';
import Skeleton from '../../components/Skeleton/Skeleton';
import axioss from '../../api/axios';
import { isAuthenticated } from '../../utils/auth';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import EditCompyuterSeleced from '../../components/SelectedGroup/EditCompyuterSeleced';
import { AddItemModal } from '../../components/Modal/AddItemModal.tsx';
import { addItemConfig } from '../../configs/addItemConfig.ts';

type Props = {
  program: number[] | null;
};

const EditCompyuter = forwardRef(({ program }: Props, ref) => {

  const [modalModel, setModalModel] = useState<string | null>(null);
  const inputSealNumberRef = useRef<HTMLInputElement>(null);
  const inputUserRef = useRef<HTMLInputElement>(null);
  const inputIPAddresRef = useRef<HTMLInputElement>(null);
  const inputMacAddresRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<TexnologyDataStructure | null>(null);
  const [localData, setLocalData] = useState('');
  const [isSubmitted, setIsSubmitted] = useState<boolean | null>(false);
  const [compyuterData, setCompyuterData] = useState<Compyuter[]>([]);
  const [compyuterDetailData, setCompyuterDetailData] = useState<Compyuter>();
  const [seal_number, setSealNumber] = useState<{
    value?: string;
    error?: string;
  }>({});
  const [departament, setSelectedDepartment] = useState<number | null>(null);
  console.log(departament, 'departament');
  const [user, setUser] = useState<{ value?: string; error?: string }>({
    value: compyuterDetailData?.user,
    error: '',
  });
  const [warehouse_manager, setSelectedWarehouseManagerId] = useState<
    number | null
  >(null);
  const [section, setSelectedSectionId] = useState<number | null>(null);
  const [type_compyuter, setSelectedTypeCompyuterId] = useState<number | null>(
    null,
  );
  const [motherboard, setSelectedMotherboardId] = useState<number | null>(null);
  const [motherboard_model, setSelectedMotherboardModelId] = useState<
    number | null
  >(null);
  const [CPU, setCPUId] = useState<number | null>(null);
  const [generation, setGenerationId] = useState<number | null>(null);
  const [frequency, setFrequencyId] = useState<number | null>(null);
  const [HDD, setHddId] = useState<number | null>(null);
  const [SSD, setSsdId] = useState<number | null>(null);
  const [disk_type, setDiskTypeId] = useState<number | null>(null);
  const [RAM_type, setRamTypeId] = useState<number | null>(null);
  const [RAMSize, setRamSizeId] = useState<number | null>(null);
  const [GPU, setGpuId] = useState<number | null>(null);
  const [ipadresss, setIpAddressId] = useState<{
    value?: string;
    error?: string;
  }>({});
  const [mac_adress, setMacAddressId] = useState<{
    value?: string;
    error?: string;
  }>({});
  const [printer, setPrinterId] = useState<number[] | null>(null);
  const [scaner, setScanerId] = useState<number[] | null>(null);
  const [mfo, setMfoId] = useState<number[] | null>(null);
  const [type_webcamera, setTypeWebcameraId] = useState<number[] | null>(null);
  const [model_webcam, setModelWebcamId] = useState<number[] | null>(null);
  const [type_monitor, setTypeMonitorId] = useState<number[] | null>(null);

  const [isActive, setIsActive] = useState(compyuterDetailData?.isActive);
  const [internet, setInternet] = useState(compyuterDetailData?.internet);

  const token = localStorage.getItem('token');
  const { slug } = useParams();
  const navigate = useNavigate();

  const refreshData = () => {
    axioss
      .get(`${BASE_URL}/all_texnology/`)
      .then((resp) => setData(resp.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (!token) return;

    axioss
      .get(`${BASE_URL}/all_compyuters/`)
      .then((resp) => setCompyuterData(resp.data))
      .catch((err) => console.log(err));

    axioss
      .get(`${BASE_URL}/all_texnology/`, {
        params: departament != null ? { departament } : {},
      })
      .then((resp) => setData(resp.data))
      .catch((err) => console.log(err));
  }, [token, departament]);

  useEffect(() => {
    if (!slug) return;
    axioss
      .get(`${BASE_URL}/comp_detail/${slug}`)
      .then((response) => {
        setCompyuterDetailData(response.data);
      })
      .catch((err) => console.log(err));
  }, [slug]);

  useEffect(() => {
    if (compyuterDetailData) {
      setSealNumber({ value: compyuterDetailData.seal_number });
      setUser({ value: compyuterDetailData.user });
      setIpAddressId({ value: compyuterDetailData.ipadresss });
      setMacAddressId({ value: compyuterDetailData.mac_adress });
    }
  }, [compyuterDetailData]);

  useEffect(() => {
    setLocalData(
      data?.departament.find((x) => x.id == Number(departament))
        ?.boss_fullName as unknown as string,
    );
  }, [departament]);

  const handlarData = (event?: React.FormEvent | null) => {
    event?.preventDefault();
    setIsSubmitted(true);

    const erroMessage = 'Обязательное поле';

    // if (!inputSealNumberRef.current?.value) {
    //   setSealNumber({ error: erroMessage })
    //   toast.warning("Существует обязательное поле.")
    //   return
    // }
    if (!inputUserRef.current?.value) {
      setUser({ error: erroMessage });
      toast.warning('Существует обязательное поле.');
      return;
    }
    // if (!inputIPAddresRef.current?.value) {
    //   setIpAddressId({ error: erroMessage })
    //   toast.warning("Существует обязательное поле.")
    //   return
    // }
    // if (!inputMacAddresRef.current?.value) {
    //   setMacAddressId({ error: erroMessage })
    //   toast.warning("Существует обязательное поле.")
    //   return
    // }

    const formData = {
      seal_number: seal_number.value,
      departament,
      user: user.value,
      warehouse_manager,
      section,
      type_compyuter,
      motherboard,
      motherboard_model,
      CPU,
      generation,
      frequency,
      HDD,
      SSD,
      disk_type,
      RAM_type,
      RAMSize,
      GPU,
      ipadresss: ipadresss.value,
      mac_adress: mac_adress.value,
      printer,
      scaner,
      mfo,
      type_webcamera,
      model_webcam,
      type_monitor,
      isActive,
      internet,
      program: program,
      slug: slug,
    };

    axioss
      .put(`${BASE_URL}/edit-compyuter/${slug}/`, formData)
      .then((_) => {
        toast.success('Компьютер успешно редактирование');
        navigate('/');
      })
      .catch((err) => {
        if (
          err.response.data.slug[0] ==
          'Компьютеры  с таким slug уже существует.'
        )
          toast.error('Такой компьютер существует');
        else toast.error('Произошла ошибка.');
      });
  };
  console.log(compyuterDetailData);

  useImperativeHandle(ref, () => ({
    submit: handlarData,
  }));

  if (!isAuthenticated()) {
    return <Navigate to="/auth/signin" />;
  }
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4">
        <div className="col-span-4">
          {/* <!-- Input Fields --> */}
          <div className="">
            <div className="flex justify-between border-b border-stroke p-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Введите компьютерные данные
              </h3>
              <ToastContainer />
            </div>
            {data ? (
              <div>
                {/* {selectedCompyuterId != null ? */}
                <form onSubmit={handlarData} className="p-5 py-3 pb-5">
                  <h1 className=" pb-4 font-semibold">Основные параметры</h1>
                  <div className="grid sm:grid-cols-12 gap-4 border-b pb-5">
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Тип орг.техники"
                          selectData={data.type_compyuter}
                          selectedTexnologyId={setSelectedTypeCompyuterId}
                          selectedIdComp={compyuterDetailData?.type_compyuter}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>

                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Производитель МП"
                          selectData={data.motherboard}
                          selectedTexnologyId={setSelectedMotherboardId}
                          selectedIdComp={compyuterDetailData?.motherboard}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>

                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Модель МП"
                          selectData={data.motherboard_model}
                          selectedTexnologyId={setSelectedMotherboardModelId}
                          selectedIdComp={
                            compyuterDetailData?.motherboard_model
                          }
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Процессор"
                          selectData={data.cpu}
                          selectedTexnologyId={setCPUId}
                          selectedIdComp={compyuterDetailData?.CPU}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>

                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Поколение процессора"
                          selectData={data.generation}
                          selectedTexnologyId={setGenerationId}
                          selectedIdComp={compyuterDetailData?.generation}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Частота процессора"
                          selectData={data.frequency}
                          selectedTexnologyId={setFrequencyId}
                          selectedIdComp={compyuterDetailData?.frequency}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Диск  HDD"
                          selectData={data.hdd}
                          selectedTexnologyId={setHddId}
                          selectedIdComp={compyuterDetailData?.HDD}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Диск  SSD"
                          selectData={data.ssd}
                          selectedTexnologyId={setSsdId}
                          selectedIdComp={compyuterDetailData?.SSD}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Тип диска"
                          selectData={data.disk_type}
                          selectedTexnologyId={setDiskTypeId}
                          selectedIdComp={compyuterDetailData?.disk_type}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Тип оперативки"
                          selectData={data.ram_type}
                          selectedTexnologyId={setRamTypeId}
                          selectedIdComp={compyuterDetailData?.RAM_type}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Размер оперативной памяти"
                          selectData={data.ram_size}
                          selectedTexnologyId={setRamSizeId}
                          selectedIdComp={compyuterDetailData?.RAMSize}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Видеокарта"
                          selectData={data.gpu}
                          selectedTexnologyId={setGpuId}
                          selectedIdComp={compyuterDetailData?.GPU}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                  </div>
                  <h1 className=" py-4 font-semibold ">Монитор</h1>
                  <div className="grid sm:grid-cols-12 gap-4 border-b pb-5 ">
                    <div className="col-span-3 relative">
                      <MultySelectTexnology
                        label="Тип Монитора"
                        selectData={data.type_monitor}
                        selectedTexnologyId={setTypeMonitorId}
                        selectedIdComp={compyuterDetailData?.type_monitor}
                        isSubmitted={isSubmitted}
                      />
                      <button
                        type="button"
                        onClick={() => setModalModel('monitor')}
                        className="absolute top-8 right-2 p-1 hover:bg-gray-200 rounded"
                      >
                        <span className="text-xl mr-4">＋</span>
                      </button>
                    </div>
                  </div>

                  <h1 className=" py-4 font-semibold ">
                    Периферийные устройства
                  </h1>
                  <div className="grid sm:grid-cols-12 gap-4 border-b pb-5">
                    <div className="col-span-3 relative">
                      <MultySelectTexnology
                        label="Принтер"
                        selectData={data.printer}
                        selectedTexnologyId={setPrinterId}
                        selectedIdComp={compyuterDetailData?.printer}
                        isSubmitted={isSubmitted}
                      />
                      <button
                        type="button"
                        onClick={() => setModalModel('printer')}
                        className="absolute top-8 right-2 p-1 hover:bg-gray-200 rounded"
                      >
                        <span className="text-xl mr-4">＋</span>
                      </button>
                    </div>
                    <div className="col-span-3 relative">
                      <MultySelectTexnology
                        label="Сканер"
                        selectData={data.scaner}
                        selectedTexnologyId={setScanerId}
                        selectedIdComp={compyuterDetailData?.scaner}
                        isSubmitted={isSubmitted}
                      />
                      <button
                        type="button"
                        onClick={() => setModalModel('scaner')}
                        className="absolute top-8 right-2 p-1 hover:bg-gray-200 rounded"
                      >
                        <span className="text-xl mr-4">＋</span>
                      </button>
                    </div>
                    <div className="col-span-3 relative">
                      <MultySelectTexnology
                        label="МФУ"
                        selectData={data.mfo}
                        selectedTexnologyId={setMfoId}
                        selectedIdComp={compyuterDetailData?.mfo}
                        isSubmitted={isSubmitted}
                      />
                      <button
                        type="button"
                        onClick={() => setModalModel('mfo')}
                        className="absolute top-8 right-2 p-1 hover:bg-gray-200 rounded"
                      >
                        <span className="text-xl mr-4">＋</span>
                      </button>
                    </div>
                    <div className="col-span-3">
                      {data && (
                        <MultySelectTexnology
                          label="Тип вебкамера"
                          selectData={data.type_webcamera}
                          selectedTexnologyId={setTypeWebcameraId}
                          selectedIdComp={compyuterDetailData?.type_webcamera}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>

                    <div className="col-span-3">
                      {data && (
                        <MultySelectTexnology
                          label="Модель вебкамера"
                          selectData={data.model_webcam}
                          selectedTexnologyId={setModelWebcamId}
                          selectedIdComp={compyuterDetailData?.model_webcam}
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                  </div>

                  <h1 className=" py-4 font-semibold ">Подразделение</h1>
                  <div className="grid sm:grid-cols-12 gap-4 border-b pb-5">
                    <div className="col-span-3">
                      {data.departament && (
                        <EditCompyuterSeleced
                          label="Цех"
                          selectData={data}
                          setSelectedDepartment={setSelectedDepartment}
                          isSubmitted={isSubmitted}
                          departmentData={
                            compyuterDetailData?.departament?.id ?? null
                          }
                        />
                      )}
                    </div>
                    <div className="col-span-3 relative">
                      <AddCompyuterSelecedTexnology
                        label="Отдел"
                        selectData={data.section}
                        selectedTexnologyId={setSelectedSectionId}
                        selectedIdComp={compyuterDetailData?.section}
                        isSubmitted={isSubmitted}
                      />
                      <button
                        type="button"
                        onClick={() => setModalModel('section')}
                        className="absolute top-9 right-2 p-1 hover:bg-gray-200 rounded"
                      >
                        <span className="text-xl">＋</span>
                      </button>
                    </div>
                    <div className="col-span-3">
                      <label className="mb-3 block text-black dark:text-white">
                        Пользователь
                      </label>
                      <input
                        type="text"
                        defaultValue={compyuterDetailData?.user}
                        ref={inputUserRef}
                        placeholder="Пользователь"
                        onChange={(e) => setUser({ value: e.target.value })}
                        className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${
                          user.error ? 'border-red' : 'border-stroke'
                        }`}
                      />
                      {user.error && (
                        <p className="text-red-500 text-sm">{user.error}</p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <label className="mb-3 block text-black dark:text-white">
                        Руководитель подразделения
                      </label>
                      <input
                        value={localData}
                        disabled
                        type="text"
                        placeholder="Руководитель подразделения"
                        className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${
                          isSubmitted && !departament
                            ? 'border-red'
                            : 'border-stroke'
                        }`}
                      />
                      {isSubmitted && !departament ? (
                        <p className="text-red-500 text-sm">
                          {'Обязательное поле'}
                        </p>
                      ) : (
                        ''
                      )}
                    </div>

                    <div className="col-span-3">
                      {data && (
                        <AddCompyuterSelecedTexnology
                          label="Зав. склад"
                          selectData={data.warehouse_manager}
                          selectedTexnologyId={setSelectedWarehouseManagerId}
                          selectedIdComp={
                            compyuterDetailData?.warehouse_manager
                          }
                          isSubmitted={isSubmitted}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-12 gap-4 border-b py-5">
                    <div className="col-span-3">
                      <label className="mb-3 block text-black dark:text-white">
                        Номер пломбы
                      </label>
                      <input
                        type="text"
                        value={seal_number.value}
                        onChange={(e) =>
                          setSealNumber({ value: e.target.value })
                        }
                        // ref={inputSealNumberRef}
                        placeholder="Номер пломбы"
                        className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${
                          seal_number.error ? 'border-red' : 'border-stroke'
                        }`}
                      />
                      {seal_number.error && (
                        <p className="text-red-500 text-sm">
                          {seal_number.error}
                        </p>
                      )}
                    </div>

                    <div className="col-span-3">
                      <label className="mb-3 block text-black dark:text-white">
                        IPv4 адрес
                      </label>
                      <input
                        type="text"
                        // ref={inputIPAddresRef}
                        defaultValue={compyuterDetailData?.ipadresss}
                        onChange={(e) =>
                          setIpAddressId({ value: e.target.value })
                        }
                        placeholder="IPv4 адрес"
                        className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${
                          ipadresss.error ? 'border-red' : 'border-stroke'
                        }`}
                      />
                      {ipadresss.error && (
                        <p className="text-red-500 text-sm">
                          {ipadresss.error}
                        </p>
                      )}
                    </div>

                    <div className="col-span-3">
                      <label className="mb-3 block text-black dark:text-white">
                        Физический(MAC) адрес
                      </label>
                      <input
                        type="text"
                        defaultValue={compyuterDetailData?.mac_adress}
                        // ref={inputMacAddresRef}
                        onChange={(e) =>
                          setMacAddressId({ value: e.target.value })
                        }
                        placeholder="Физический(MAC) адрес"
                        className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${
                          mac_adress.error ? 'border-red' : 'border-stroke'
                        }`}
                      />
                      {mac_adress.error && (
                        <p className="text-red-500 text-sm">
                          {mac_adress.error}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-3 mt-10">
                        <label className="flex items-center space-x-3 cursor-pointer text-gray-800 dark:text-gray-200">
                          <span className="text-sm font-medium">Интернет</span>
                          <input
                            disabled
                            type="checkbox"
                            defaultChecked={
                              compyuterData
                                ? compyuterDetailData?.internet
                                : true
                            }
                            onChange={(e) => setInternet(e.target.checked)}
                            className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-brand-500 dark:checked:border-brand-500 focus:ring-offset-0 focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-5">
                    <div className="flex items-center gap-3 ">
                      <label className="flex items-center space-x-3 cursor-pointer text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          defaultChecked={
                            compyuterData ? compyuterDetailData?.isActive : true
                          }
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-brand-500 dark:checked:border-brand-500 focus:ring-offset-0 focus:outline-none"
                        />
                        <span className="text-sm font-medium">Активно</span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-12">
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
          </div>
        </div>
      </div>
      <AddItemModal
        modelKey={modalModel}
        visible={!!modalModel}
        allDepartments={data?.departament}
        onClose={() => setModalModel(null)}
        onCreated={() => {
          refreshData();
          setModalModel(null);
        }}
      />
    </>
  );
});

export default EditCompyuter;
