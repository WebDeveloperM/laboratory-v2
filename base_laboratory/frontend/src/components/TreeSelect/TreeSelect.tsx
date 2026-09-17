import React, { useMemo, useState } from "react"
import { TreeSelect } from "antd"
import type { TreeSelectProps } from "antd"
import { WorkerDataByLanguage } from "@clinica/types"

interface DataNode {
    id: number
    nameUz: string
}

export interface WorkerData {
    [key: string]: DataNode[]
}

interface TreeSelectComponentProps {

    
   
}

const TreeSelectComponent: React.FC<TreeSelectComponentProps> = ({
    data,
    placeholder, 
}) => {
    const treeData = useMemo(() => {
        const workerData = data
        if (!workerData || Object.keys(workerData).length === 0) {
            return [] // Agar ma'lumot bo'lmasa, bo'sh array qaytariladi
        }
        return Object.entries(workerData).map(([category, items]) => ({
            title: category,
            value: category,
            key: category,
            children: items.map((item: any) => ({
                title: item.nameUz, // Tilga qarab nomni tanlash
                value: item.id,
                key: item.id,
            })),
        }))
    }, [data])

    const [value, setValue] = useState<number[]>([])

    const handleChange: TreeSelectProps<number[]>["onChange"] = (newValue) => {
        const workerData = data[language]
        newValue = newValue
            .map((item) => {
                if (typeof item == "string" && workerData) {
                    Object.entries(workerData).forEach(([category, value]) => {
                        // @ts-ignore
                        if (category === item.toString()) item = value.map((child) => child.id)
                    })
                }
                return item
            })
            .flat()

        setValue(newValue)
        onChange(newValue)
    }

    return (
        <TreeSelect
            treeData={treeData}
            value={value}
            onChange={handleChange}
            treeCheckable
            placeholder={placeholder}
            style={{ width: "100%", paddingTop: "4px" }}
            showCheckedStrategy={TreeSelect.SHOW_PARENT}
        /> 
    )
}

export default TreeSelectComponent



// import React, { useState } from 'react';
// import { TreeSelect } from 'antd';

// const { SHOW_PARENT } = TreeSelect;

// const treeData = [
//   {
//     title: 'Node1',
//     value: '0',
//     key: '0',
//     children: [
//       {
//         title: 'Child Node1',
//         value: '0-1',
//         key: '0-0-0',
//       },
//     ],
//   },
//   {
//     title: 'Node2',
//     value: '0-1',
//     key: '0-1',
//     children: [
//       {
//         title: 'Child Node3',
//         value: '0-1-0',
//         key: '0-1-0',
//       },
//       {
//         title: 'Child Node4',
//         value: '0-1-1',
//         key: '0-1-1',
//       },
//       {
//         title: 'Child Node5',
//         value: '0-1-2',
//         key: '0-1-2',
//       },
//     ],
//   },
// ];

// const TreeSelectComponent: React.FC = () => {
//   const [value, setValue] = useState(['0-0-0']);
//     console.log(value, "111111");
    
//   const onChange = (newValue: string[]) => {
//     console.log('onChange ', newValue);
//     setValue(newValue);

//   };

//   const tProps = {
//     treeData,
//     value,
//     className: "mt-2",
//     onChange,
//     treeCheckable: true,
//     showCheckedStrategy: SHOW_PARENT,
//     placeholder: 'Please select',
//     style: {
//       width: '100%',
//     },
//   };

//   return <TreeSelect {...tProps} />;
// };

// export default TreeSelectComponent;