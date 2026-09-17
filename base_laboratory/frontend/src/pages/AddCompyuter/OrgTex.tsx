import AddCompyuterSeleced from '../../components/SelectedGroup/AddCompyuterSeleced';
import {
    useEffect, useRef,
    useState, forwardRef,
    useImperativeHandle,
} from 'react';

import { BASE_URL } from '../../utils/urls';
import { TexnologyDataStructure } from '../../types/texnology';
import AddCompyuterSelecedTexnology from '../../components/SelectedGroup/AddCompyuterSelecedTexnology';
import { FaCopy } from "react-icons/fa";
import { Compyuter } from '../../types/compyuters';
import CopyCompyuterSeleced from '../../components/SelectedGroup/CopyCompyuterSeleced';
import MultySelectTexnology from '../../components/SelectedGroup/MultySelectTexnology';
import Skeleton from '../../components/Skeleton/Skeleton';
import axioss from '../../api/axios';
import { isAuthenticated } from '../../utils/auth';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { UploadOutlined } from '@ant-design/icons';

import { Button, Upload } from 'antd';

type Props = {
    program: number[] | null;
    compyuterDetailData: Compyuter | undefined;
    setCompyuterDetailData: React.Dispatch<React.SetStateAction<Compyuter | undefined>>;

};
const OrgTex = forwardRef(({ program, compyuterDetailData, setCompyuterDetailData }: Props, ref) => {

    // const inputSealNumberRef = useRef<HTMLInputElement>(null);
    const inputUserRef = useRef<HTMLInputElement>(null);
    const inputIPAddresRef = useRef<HTMLInputElement>(null);
    const inputMacAddresRef = useRef<HTMLInputElement>(null);
    const [data, setData] = useState<TexnologyDataStructure | null>(null)
    const [localData, setLocalData] = useState("")
    // const [isOptionSelected, setIsOptionSelected] = useState<boolean>(false);
    const [isSubmitted, setIsSubmitted] = useState<boolean | null>(false)

    const [openCopyTab, setOpenCopyTab] = useState(false);

    const [compyuterData, setCompyuterData] = useState<Compyuter[]>([])

    const [selectedCompyuterId, setSelectedCopyuterId] = useState<string | null>(null);

    // All selected Texnology items

    const [seal_number, setSealNumber] = useState<{ value?: string, error?: string }>({});
    const [departament, setSelectedDepartment] = useState<number | null>(null);
    const [user, setUser] = useState<{ value?: string, error?: string }>({});
    const [warehouse_manager, setSelectedWarehouseManagerId] = useState<number | null>(null);
    const [section, setSelectedSectionId] = useState<number | null>(null);
    const [type_compyuter, setSelectedTypeCompyuterId] = useState<number | null>(null);
    const [motherboard, setSelectedMotherboardId] = useState<number | null>(null);
    const [motherboard_model, setSelectedMotherboardModelId] = useState<number | null>(null);
    const [CPU, setCPUId] = useState<number | null>(null);
    const [generation, setGenerationId] = useState<number | null>(null);
    const [frequency, setFrequencyId] = useState<number | null>(null);
    const [HDD, setHddId] = useState<number | null>(null);
    const [SSD, setSsdId] = useState<number | null>(null);
    const [disk_type, setDiskTypeId] = useState<number | null>(null);
    const [RAM_type, setRamTypeId] = useState<number | null>(null);
    const [RAMSize, setRamSizeId] = useState<number | null>(null);
    const [GPU, setGpuId] = useState<number | null>(null);
    const [ipadresss, setIpAddressId] = useState<{ value?: string, error?: string }>({});
    const [mac_adress, setMacAddressId] = useState<{ value?: string, error?: string }>({});

    const [printer, setPrinterId] = useState<number[] | null>(null);
    const [scaner, setScanerId] = useState<number[] | null>(null);
    const [mfo, setMfoId] = useState<number[] | null>(null);
    const [type_webcamera, setTypeWebcameraId] = useState<number[] | null>(null);
    const [model_webcam, setModelWebcamId] = useState<number[] | null>(null);
    const [type_monitor, setTypeMonitorId] = useState<number[] | null>(null);

    const [isActive, setIsActive] = useState(true);
    const [internet, setInternet] = useState(true);

    const token = localStorage.getItem('token')
    const navigate = useNavigate()


    const [jsonData, setJsonData] = useState<Compyuter | undefined>()
    const [hasPosted, setHasPosted] = useState(false);

    useEffect(() => {
        if (!jsonData || hasPosted) return;

        setHasPosted(true); // faqat bir marta post qiladi

        axioss
            .post(`${BASE_URL}/add-computer-with-json/`, jsonData)
            .then((response) => {
                toast.success('Файл JSON успешно загружен');
                navigate("/")
            })
            .catch((err) => {
                console.log(err.response.data.error);
                if (err.response.data.error == "Kompyuter obyektini yaratishda xatolik: UNIQUE constraint failed: base_compyuter.slug") {
                    toast.warning('Такой компьютер существует');
                    return
                }
                toast.warning("Произошла ошибка.")

            });
    }, [jsonData]);


    // useEffect(() => {
    //     if (!jsonData) return

    //     axioss
    //         .post(`${BASE_URL}/add-computer-with-json/`, jsonData)
    //         .then((response) => {
    //             console.log(response.data, "4444444444444444444");  
    //             setCompyuterData(response.data);
    //         })
    //         .catch((err) => {
    //             console.log(err.response.data.error, "555555555555");  
    //             if (err.response.data.error == "Kompyuter obyektini yaratishda xatolik: UNIQUE constraint failed: base_compyuter.slug") {
    //                 toast.warning("bunday user mavjud")
    //                 return
    //             }
    //         });

    // }, [jsonData])

    const handleFileChange = (info: any) => {
        const file = info.file.originFileObj;
        if (file) {
            const reader = new FileReader();

            reader.onload = (e: any) => {
                try {
                    const result = JSON.parse(e.target.result);
                    setJsonData(result)

                } catch (error) {
                    toast.error('Неверный формат JSON');
                }
            };

            reader.readAsText(file);
        }
    };



    const props = {
        beforeUpload: (file: any) => {

            const isJson = file.name.endsWith('.json');
            if (!isJson) {
                toast.error('Вы можете загружать только файлы JSON!');
            }

            return isJson;
        },
        onChange: handleFileChange,
    };

    useEffect(() => {
        setUser({ value: jsonData?.user })
        setIpAddressId({ value: jsonData?.ipadresss })
        setMacAddressId({ value: jsonData?.mac_adress })

    }, [jsonData]);

    useEffect(() => {
        if (!token) return

        axioss
            .get(`${BASE_URL}/all_compyuters/`)
            .then((response) => {
                console.log(response.data, 'asdasdasd')
                setCompyuterData(response.data.results);
            })
            .catch((err) => console.log(err));

        axioss
            .get(`${BASE_URL}/all_texnology/`)
            .then((response) => {
                setData(response.data);
            })
            .catch((err) => console.log(err));

    }, []);

    useEffect(() => {
        if (!selectedCompyuterId) return;
        axioss
            .get(`${BASE_URL}/comp_detail/${selectedCompyuterId}`)
            .then((response) => {
                setCompyuterDetailData(response.data);
            })
            .catch((err) => console.log(err));
    }, [selectedCompyuterId]);


    useEffect(() => {
        setLocalData(data?.departament.find(x => x.id == Number(departament))?.boss_fullName as unknown as string)
    }, [departament]);



    const handlarData = (e: React.FormEvent) => {
        e?.preventDefault();
        setIsSubmitted(true)
        const erroMessage = "Обязательное поле"
     
        if (!inputUserRef.current?.value) {
            setUser({ error: erroMessage })
            toast.warning("Существует обязательное поле.")
            return
        }
        if (!inputIPAddresRef.current?.value) {
            setIpAddressId({ error: erroMessage })
            toast.warning("Существует обязательное поле.")
            return
        }
        if (!inputMacAddresRef.current?.value) {
            setMacAddressId({ error: erroMessage })
            toast.warning("Существует обязательное поле.")
            return
        }

        const formData = {
            seal_number: seal_number.value,
            departament,
            section,
            user: user.value,
            warehouse_manager,
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
        }

        axioss
            .post(`${BASE_URL}/add-compyuter/`, formData)
            .then((response) => {
                toast.success("Компьютер успешно добавлен", {
                    onClose: () => navigate("/"),
                });
                console.log(response.data, "777777777");
            })
            .catch((err) => {
                if (err.response.data.slug[0] == "Компьютеры  с таким slug уже существует.")
                    toast.error("Такой компьютер существует")
                else toast.error("Произошла ошибка.")
            });

    };
    useImperativeHandle(ref, () => ({
        submit: handlarData,
    }));

    if (!isAuthenticated()) {
        return <Navigate to="/auth/signin" />
    }
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-4">

                <div className="col-span-4">
                    {/* <!-- Input Fields --> */}
                    <div className=" bg-white  dark:border-strokedark dark:bg-boxdark">

                        <div className="flex justify-between border-b items-center border-stroke py-4 px-6.5 dark:border-strokedark">
                            <h3 className="font-medium text-black dark:text-white text-xl">
                                Введите компьютерные данные
                            </h3>
                            <ToastContainer />

                            <div className='flex justify-around'>
                                <div>
                                    <Upload {...props}>
                                        <Button className="inline-flex items-center justify-center gap-2.5 rounded-md bg-meta-3 py-5 px-5 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10" icon={<UploadOutlined />}>
                                            Добавить через json
                                        </Button>
                                    </Upload>


                                </div>

                                <div className={`mx-5  ${!openCopyTab ? "block" : "hidden"} `}>
                                    <button onClick={() => setOpenCopyTab(!openCopyTab)} className="inline-flex items-center justify-center gap-2.5 rounded-md bg-meta-3 py-2 px-5 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10" >
                                        <FaCopy />
                                        Копировать
                                    </button>
                                </div>
                            </div>



                        </div>

                        {
                            data ?
                                <div>
                                    <div className={`mx-5 mt-4  ${openCopyTab ? "block" : "hidden"} `}>
                                        {data && <CopyCompyuterSeleced label='Выберите компьютер' compyuterData={compyuterData} setSelectedCopyuterId={setSelectedCopyuterId} />}
                                    </div>

                                    {/* {selectedCompyuterId != null ? */}
                                    <form onSubmit={handlarData} className="p-5 py-3 pb-5">
                                        <h1 className='pb-4 pt-2 font-semibold'>Основные параметры</h1>
                                        <div className='grid sm:grid-cols-12 gap-4 border-b pb-5'>

                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Тип орг.техники' selectData={data.type_compyuter} selectedTexnologyId={setSelectedTypeCompyuterId} selectedIdComp={compyuterDetailData?.type_compyuter} isSubmitted={isSubmitted} />}
                                            </div>

                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Производитель МП' selectData={data.motherboard} selectedTexnologyId={setSelectedMotherboardId} selectedIdComp={compyuterDetailData?.motherboard} isSubmitted={isSubmitted} />}
                                            </div>

                                            <div className='col-span-3'>
                                                {data &&
                                                    <AddCompyuterSelecedTexnology label='Модель МП'
                                                        selectData={data.motherboard_model}
                                                        selectedTexnologyId={setSelectedMotherboardModelId}
                                                        selectedIdComp={compyuterDetailData?.motherboard_model} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Процессор' selectData={data.cpu} selectedTexnologyId={setCPUId} selectedIdComp={compyuterDetailData?.CPU} isSubmitted={isSubmitted} />}
                                            </div>

                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Поколение процессора' selectData={data.generation} selectedTexnologyId={setGenerationId} selectedIdComp={compyuterDetailData?.generation} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Частота процессора' selectData={data.frequency} selectedTexnologyId={setFrequencyId} selectedIdComp={compyuterDetailData?.frequency} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Диск  HDD' selectData={data.hdd} selectedTexnologyId={setHddId} selectedIdComp={compyuterDetailData?.HDD} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Диск  SSD' selectData={data.ssd} selectedTexnologyId={setSsdId} selectedIdComp={compyuterDetailData?.SSD} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Тип диска' selectData={data.disk_type} selectedTexnologyId={setDiskTypeId} selectedIdComp={compyuterDetailData?.disk_type} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Тип оперативки' selectData={data.ram_type} selectedTexnologyId={setRamTypeId} selectedIdComp={compyuterDetailData?.RAM_type} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Размер оперативной памяти' selectData={data.ram_size} selectedTexnologyId={setRamSizeId} selectedIdComp={compyuterDetailData?.RAMSize} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Видеокарта' selectData={data.gpu} selectedTexnologyId={setGpuId} selectedIdComp={compyuterDetailData?.GPU} isSubmitted={isSubmitted} />}
                                            </div>

                                        </div>
                                        <h1 className=' py-4 font-semibold'>Монитор</h1>
                                        <div className='grid sm:grid-cols-12 gap-4 border-b pb-5'>
                                            <div className='col-span-3'>


                                                {data &&
                                                    <MultySelectTexnology
                                                        label="Тип Монитора"
                                                        selectData={data.type_monitor}
                                                        selectedTexnologyId={setTypeMonitorId}
                                                        selectedIdComp={compyuterDetailData?.type_monitor}
                                                        isSubmitted={isSubmitted}
                                                    />
                                                }
                                            </div>
                                        </div>

                                        <h1 className='py-4 font-semibold'>Периферийные устройства</h1>
                                        <div className='grid sm:grid-cols-10 gap-4 border-b pb-5'>
                                            <div className='col-span-2'>
                                                {data && <MultySelectTexnology label='Принтер' selectData={data.printer} selectedTexnologyId={setPrinterId} selectedIdComp={compyuterDetailData?.printer} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-2'>
                                                {data && <MultySelectTexnology label='Сканер' selectData={data.scaner} selectedTexnologyId={setScanerId} selectedIdComp={compyuterDetailData?.scaner} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-2'>
                                                {data && <MultySelectTexnology label='МФУ' selectData={data.mfo} selectedTexnologyId={setMfoId} selectedIdComp={compyuterDetailData?.mfo} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-2'>
                                                {data && <MultySelectTexnology label='Тип вебкамера' selectData={data.type_webcamera} selectedTexnologyId={setTypeWebcameraId} selectedIdComp={compyuterDetailData?.type_webcamera} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-2'>
                                                {data.model_webcam && <MultySelectTexnology label='Модель вебкамеры' selectData={data.model_webcam} selectedTexnologyId={setModelWebcamId} selectedIdComp={compyuterDetailData?.model_webcam} isSubmitted={isSubmitted} />}
                                            </div>
                                        </div>

                                        <h1 className='py-4 font-semibold'>Подразделение</h1>
                                        <div className='grid sm:grid-cols-12 gap-4 border-b pb-5'>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSeleced label='Цех' selectData={data} setSelectedDepartment={setSelectedDepartment} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Отдел' selectData={data.section} selectedTexnologyId={setSelectedSectionId} selectedIdComp={compyuterDetailData?.section} isSubmitted={isSubmitted} />}
                                            </div>
                                            <div className='col-span-3'>
                                                <label className="mb-3 block text-black dark:text-white">
                                                    Пользователь
                                                </label>
                                                <input
                                                    type="text"
                                                    ref={inputUserRef}
                                                    placeholder="Пользователь"
                                                    value={user.value}
                                                    onChange={(e) => setUser({ value: e.target.value })}
                                                    className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${user.error ? 'border-red' : "border-stroke"}`}
                                                />
                                                {user.error && <p className="text-red-500 text-sm">{user.error}</p>}

                                            </div>
                                            <div className='col-span-3'>
                                                <label className="mb-3 block text-black dark:text-white">
                                                    Руководитель подразделения
                                                </label>
                                                <input
                                                    value={localData}
                                                    disabled
                                                    type="text"
                                                    placeholder="Руководитель подразделения"
                                                    className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${isSubmitted && !departament ? 'border-red' : "border-stroke"}`}
                                                />
                                                {isSubmitted && !departament ? <p className="text-red-500 text-sm">{"Обязательное поле"}</p> : ""}
                                            </div>

                                            <div className='col-span-3'>
                                                {data && <AddCompyuterSelecedTexnology label='Зав. склад' selectData={data.warehouse_manager} selectedTexnologyId={setSelectedWarehouseManagerId} selectedIdComp={compyuterDetailData?.warehouse_manager} isSubmitted={isSubmitted} />}
                                            </div>
                                        </div>


                                        <div className='grid sm:grid-cols-12 gap-4 border-b py-5'>
                                            <div className='col-span-3'>
                                                <label className="mb-3 block text-black dark:text-white">
                                                    Номер пломбы
                                                </label>
                                                <input
                                                    type="text"
                                                    onChange={(e) => setSealNumber({ value: e.target.value })}
                                                    // ref={inputSealNumberRef}
                                                    placeholder="Номер пломбы"
                                                    className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${seal_number.error ? 'border-red' : "border-stroke"}`}
                                                />
                                                {seal_number.error && <p className="text-red-500 text-sm">{seal_number.error}</p>}
                                            </div>
                                            <div className='col-span-3'>
                                                <label className="mb-3 block text-black dark:text-white">
                                                    IPv4 адрес
                                                </label>
                                                <input
                                                    type="text"
                                                    ref={inputIPAddresRef}
                                                    value={ipadresss.value}
                                                    onChange={e => setIpAddressId({ value: e.target.value })}
                                                    placeholder="IPv4 адрес"
                                                    className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${ipadresss.error ? 'border-red' : "border-stroke"}`}
                                                />
                                                {ipadresss.error && <p className="text-red-500 text-sm">{ipadresss.error}</p>}
                                            </div>

                                            <div className='col-span-3'>
                                                <label className="mb-3 block text-black dark:text-white">
                                                    Физический(MAC) адрес
                                                </label>
                                                <input
                                                    type="text"
                                                    ref={inputMacAddresRef}
                                                    value={mac_adress.value}
                                                    onChange={e => setMacAddressId({ value: e.target.value })}
                                                    placeholder="Физический(MAC) адрес"
                                                    className={`w-full rounded-md  bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${mac_adress.error ? 'border-red' : "border-stroke"}`}
                                                />
                                                {mac_adress.error && <p className="text-red-500 text-sm">{mac_adress.error}</p>}
                                            </div>

                                            <div className="col-span-3">
                                                <div className="flex items-center gap-3 mt-10">
                                                    <label className="flex items-center space-x-3 cursor-pointer text-gray-800 dark:text-gray-200">
                                                        <span className="text-sm font-medium">Интернет</span>
                                                        <input
                                                            type="checkbox"
                                                            defaultChecked={
                                                                compyuterData ? compyuterDetailData?.internet : true

                                                            }
                                                            onChange={(e) => setInternet(e.target.checked)}
                                                            className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-brand-500 dark:checked:border-brand-500 focus:ring-offset-0 focus:outline-none"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='flex justify-between items-center mt-5'>
                                            <div className="flex items-center gap-3 ">
                                                <label className="flex items-center space-x-3 cursor-pointer text-gray-800 dark:text-gray-200">
                                                    <input type="checkbox"
                                                        defaultChecked={compyuterData ? compyuterDetailData?.isActive : true}
                                                        onChange={e => setIsActive(e.target.checked)}
                                                        className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-brand-500 dark:checked:border-brand-500 focus:ring-offset-0 focus:outline-none" />
                                                    <span className="text-sm font-medium">Активно</span>
                                                </label>
                                            </div>

                                            {/* <button type='submit' className="flex items-center justify-center gap-4 rounded-md bg-meta-3 py-2 px-5 text-center font-medium text-white hover:bg-opacity-90 lg:px-5 xl:px-7" >
                                                <TbCloudPlus />
                                                Добовить
                                            </button> */}

                                        </div>
                                    </form>


                                </div> :

                                <div className='grid grid-cols-12'>
                                    <div className='col-span-3 '>
                                        <Skeleton />
                                    </div>
                                    <div className='col-span-3 '>
                                        <Skeleton />
                                    </div>
                                    <div className='col-span-3 '>
                                        <Skeleton />
                                    </div>
                                    <div className='col-span-3 '>
                                        <Skeleton />
                                    </div>

                                </div>

                        }

                    </div>
                </div >

            </div >

        </>
    );
});

export default OrgTex;
