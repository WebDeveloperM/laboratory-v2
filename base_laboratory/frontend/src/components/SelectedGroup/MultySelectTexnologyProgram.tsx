
import { Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import { ProgramType } from '../../types/texnology';

type Props = {
    label: string;
    selectData: ProgramType[];
    selectedIdComp: ProgramType[] | undefined;
    selectedTexnologyId: React.Dispatch<React.SetStateAction<number[]>>;

    disable?: boolean
    is_view?: boolean
};

type OptionType = {
    label: string
    value: number
}

export default function MultySelectTexnologyProgram({ label, selectData, selectedIdComp, selectedTexnologyId, disable = false, is_view = false }: Props) {
    const options = selectData?.map(item => ({
        label: item.title,
        value: item.id
    })) || [];

    const [selectedValues, setSelectedValues] = useState<number[] | OptionType[]>([]);



    useEffect(() => {
        if (selectedIdComp) {
            setSelectedValues(selectedIdComp.map(item => item.id));
            selectedTexnologyId(selectedIdComp.map(item => item.id));
        }
    }, [selectedIdComp]);

    useEffect(() => {
        if (is_view) {
            setSelectedValues(options)
        }
    }, [selectData]);

    const handleChange = (value: number[]) => {
        setSelectedValues(value);
        selectedTexnologyId(value);
    };

    return (
        <Space style={{ width: '100%' }} direction="vertical">

            <Select
                mode="multiple"
                allowClear
                style={{ width: '100%', marginTop: "3px" }}
                placeholder={label}
                showSearch
                className={` dark:border-gray-600 dark:text-white border dark:placeholder-gray-400 dark:bg-gray-800 dark:focus:border-gray-500 rounded-lg`}
                optionFilterProp="label"
                onChange={handleChange}
                options={options}
                value={selectedValues.map((v) => typeof v === 'number' ? v : v.value)}
                disabled={disable}
            />
        </Space>
    );
}
