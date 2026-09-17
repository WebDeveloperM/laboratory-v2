
import { Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import { GenericType } from '../../types/texnology';

type Props = {
    label: string;
    selectData: GenericType[];
    selectedIdComp: GenericType[] | undefined;
    selectedTexnologyId: React.Dispatch<React.SetStateAction<number[] | null>>;
    isSubmitted: boolean | null
};

export default function MultySelectTexnology({ label, selectData, selectedIdComp, selectedTexnologyId, isSubmitted }: Props) {
    // Select uchun optionlarni yaratish
    const [error, setError] = useState<string | null>('')
    const options = selectData?.map(item => ({
        label: item.name,
        value: item.id
    })) || [];

    // **State to control selected values**
    const [selectedValues, setSelectedValues] = useState<number[]>([]);

    // useEffect(() => {
    //     if (isSubmitted && selectedValues.length === 0) {
    //         setError("Обязательное поле"); // Agar hech narsa tanlanmagan bo‘lsa, xatolik qo‘shiladi
    //     } else {
    //         setError(null); // Aks holda xatolik yo‘qoladi
    //     }
    // }, [isSubmitted, selectedValues]);


    // **Sync state with props when component mounts or props change**
    useEffect(() => {
        if (selectedIdComp) {
            setSelectedValues(selectedIdComp.map(item => item.id));
            selectedTexnologyId(selectedIdComp.map(item => item.id));
        }
    }, [selectedIdComp]);

    // **Handle change event**
    const handleChange = (value: number[]) => {
        setSelectedValues(value);
        selectedTexnologyId(value);
    };

    return (
        <Space style={{ width: '100%' }} direction="vertical">
            {label && <label className="block text-black dark:text-white">{label}</label>}

            <Select
                mode="multiple"
                allowClear
                style={{ width: '100%', marginTop: "3px" }}
                placeholder={label}
                showSearch
                className={` dark:border-gray-600  dark:text-white border dark:placeholder-gray-400 dark:bg-gray-800 dark:focus:border-gray-500 rounded-lg ${error ? " border-red-500" : "border-gray-300"
                    }`}
                optionFilterProp="label"
                onChange={handleChange}
                options={options}
                value={selectedValues}
            />

            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        </Space>
    );
}
