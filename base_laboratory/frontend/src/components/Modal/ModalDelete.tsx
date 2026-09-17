
"use client";

import { Button, Modal } from "flowbite-react";
import { useState } from "react";
import { BASE_URL } from "../../utils/urls";

import { FiAlertTriangle } from "react-icons/fi";
import axioss from "../../api/axios";
import { toast } from "react-toastify";

type Props = {
    openDeleteModal: boolean,
    setDeleteOpenModal: (value: boolean) => void,
    deleteModalData: string,
    setDeleteCompData: React.Dispatch<React.SetStateAction<boolean>>,
    canDelete: boolean,
}

export function ModalDeleteComponent({ openDeleteModal, setDeleteOpenModal, deleteModalData, setDeleteCompData, canDelete }: Props) {

    const [loading, setLoading] = useState(false);

    const handleDelete = () => {
        if (!canDelete) {
            toast.warning("Вы не администратор. У вас нет прав на удаление.");
            return;
        }

        setLoading(true);
        axioss
            .delete(`${BASE_URL}/item-delete/${deleteModalData}`)
            .then(() => {
                setLoading(false);
                setDeleteOpenModal(false);
                setDeleteCompData((prev) => !prev)
            })
            .catch((err) => {
                setLoading(false);
                const backendMessage = err?.response?.data?.error;
                if (err?.response?.status === 403) {
                    toast.warning(backendMessage || "У вас нет прав на удаление.");
                    setDeleteOpenModal(false);
                    return;
                }
                toast.error("Удаление не выполнено");
                console.error("Error deleting:", err);
            });
    };


    return (
        <>
            <Modal show={openDeleteModal} onClose={() => setDeleteOpenModal(false)}>
                <Modal.Header>Подтвердите удаление</Modal.Header>
                <Modal.Body>
                    <div className="space-y-2">
                        <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 flex justify-center">
                            <FiAlertTriangle className="w-20 h-20 text-red-500" />
                        </p>
                        <p className="text-base leading-relaxed text-gray-500 text-center dark:text-gray-400">
                            Вы уверены, что хотите удалить этого сотрудника из базы данных?
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button color="gray" onClick={() => setDeleteOpenModal(false)}>Отмена</Button>
                    <Button color="red" onClick={handleDelete} disabled={loading}>
                        {loading ? "Удаление..." : "Удалить"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
