
"use client";

import axios from "axios";
import { Modal } from "flowbite-react";
import { useEffect, useState } from "react";
import { Compyuter } from "../../types/compyuters";
import { BASE_IMAGE_URL, BASE_URL } from "../../utils/urls";
import { ModalDataInput } from "../Input/ModalDataInput";
import ModalMultySelectInputTexnology from "../Input/ModalMultySelectInputTexnology";
import axioss from "../../api/axios";
import { isAuthenticated } from "../../utils/auth";


type Props = {
    openModal: boolean,
    setOpenModal: (value: boolean) => void,
    modalData: string
}

export function ModalComponent({ openModal, setOpenModal, modalData }: Props) {
    const [data, setData] = useState<Compyuter>()

    useEffect(() => {
        if (!modalData) return; // Agar modalData yo'q bo'lsa, useEffect ishlamasin

        axioss
            .get(`${BASE_URL}/comp_detail/${modalData}`)
            .then((response) => {
                setData(response.data);
            })
            .catch((err) => console.log(err));
    }, [modalData]);


   
    return (
        <>
            <Modal show={openModal} onClose={() => setOpenModal(false)} size="200px" className="mx-auto z-[999999]" >
                <Modal.Header>Подробный о компьютере</Modal.Header>
                <Modal.Body >
                    <div className="grid sm:grid-cols-12">
                        <div className="sm:col-span-2">
                            <div className="">
                                <img src={`${BASE_IMAGE_URL}/${data?.qr_image}`} className="ml-12 sm:ml-0" alt="" />
                            </div>

                        </div>
                        <div className="col-span-10 ">
                            <div className="grid sm:grid-cols-12 gap-4 p-5 py-3 pb-5">

                                {data && <ModalDataInput label="Номер пломбы" inputData={data.seal_number} />}

                                {data && <ModalDataInput label="Цех" inputData={data.departament.name} />}

                                {data && <ModalDataInput label="Пользователь" inputData={data.user} />}

                                {data && <ModalDataInput label="Руководитель подразделения" inputData={data.departament.name} />}

                                {data && <ModalDataInput label="Зав. склад" inputData={data.warehouse_manager.name} />}

                                {data && <ModalDataInput label="Тип орг.техники" inputData={data.type_compyuter.name} />}

                                {data && <ModalDataInput label="Производитель МП" inputData={data.motherboard.name} />}

                                {data && <ModalDataInput label="Модель МП" inputData={data.motherboard_model.name} />}

                                {data && <ModalDataInput label="Процессор" inputData={data.CPU.name} />}

                                {data && <ModalDataInput label="Поколение процессора" inputData={data.generation.name} />}

                                {data && <ModalDataInput label="Частота процессора" inputData={data.frequency.name} />}

                                {data && <ModalDataInput label="Диск  HDD" inputData={data.HDD.name} />}

                                {data && <ModalDataInput label="Диск  SSD" inputData={data.SSD.name} />}

                                {data && <ModalDataInput label="Тип диска" inputData={data.disk_type.name} />}

                                {data && <ModalDataInput label="Тип оперативки" inputData={data.RAM_type.name} />}

                                {data && <ModalDataInput label="Размер оперативной памяти" inputData={data.RAMSize.name} />}

                                {data && <ModalDataInput label="Видеокарта" inputData={data.GPU.name} />}

                                {data && <ModalDataInput label="IPv4 адрес" inputData={data.ipadresss} />}

                                {data && <ModalDataInput label="Физический(MAC) адрес" inputData={data.mac_adress} />}

                                <div className='col-span-3'>
                                    {data && <ModalMultySelectInputTexnology label="Принтер" selectedIdComp={data.printer} />}
                                </div>
                                <div className='col-span-3'>
                                    {data && <ModalMultySelectInputTexnology label="Сканер" selectedIdComp={data.scaner} />}
                                </div>

                                <div className='col-span-3'>
                                    {data && <ModalMultySelectInputTexnology label="Тип вебкамера" selectedIdComp={data.type_webcamera} />}
                                </div>

                                {data?.model_webcam && <ModalDataInput label="Модель вебкамеры" inputData={data.model_webcam.name} />}

                                <div className='col-span-3'>
                                    {data && <ModalMultySelectInputTexnology label="Тип Монитора" selectedIdComp={data.type_monitor} />}
                                </div>



                            </div>
                        </div>

                    </div>
                </Modal.Body>

            </Modal>
        </>
    );
}
