import React, { useEffect, useState } from 'react'
import Skeleton from '../../components/Skeleton/Skeleton';
import ComputerTable from '../../components/Tables/DataTable';
import { Compyuter } from '../../types/compyuters';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';

export default function AllComputers() {
    const [data, setData] = useState<Compyuter[] | null>()
    const [computerData, setComputerData] = useState<Compyuter[]>([])
    const [deleteCompForChecked, setDeleteCompForChecked] = useState<boolean>(false)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;


    useEffect(() => {

        axioss
            .get(`${BASE_URL}/all_employees/?page=${currentPage}&page_size=${pageSize}`)
            .then((response) => {
                // setData(response.data.results);
                console.log(response.data.results, "111111111111111111111111");
                setComputerData(response.data.results);
                console.log(response.data);

                setTotalCount(response.data.count);

            })
            .catch((err) => {
                console.error('Xatolik:', err);

            });
    }, [currentPage]);



    return (


        <>
            <div className='mt-6'>
                <MainTable />
                {/* <ComputerTable checkedComputer={computerData} setDeleteCompForChecked={setDeleteCompForChecked} isFiltered={!!selectKey} /> */}
            </div>
        </> 
        // <>
        //     {data ?
        //         <>
        //             <div className='mt-6'>
        //                 {/* <MainTable /> */}
        //                 <ComputerTable checkedComputer={computerData} setDeleteCompForChecked={setDeleteCompForChecked} />
        //             </div>
        //         </> :

        //         <div className='grid grid-cols-12'>
        //             <div className='col-span-3 '>
        //                 <Skeleton />
        //             </div>
        //             <div className='col-span-3 '>
        //                 <Skeleton />
        //             </div>
        //             <div className='col-span-3 '>
        //                 <Skeleton />
        //             </div>
        //             <div className='col-span-3 '>
        //                 <Skeleton />
        //             </div>

        //         </div>

        //      }


        // </>
    );
}
