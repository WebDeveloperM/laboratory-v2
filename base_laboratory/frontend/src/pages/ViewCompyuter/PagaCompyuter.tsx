import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import {Link, Navigate, useParams} from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import { Tabs } from 'flowbite-react';
import ViewCompyuter from "./ViewCompyuter.tsx";
import ViewPO from "./ViewPO.tsx";
import {FaLongArrowAltLeft} from "react-icons/fa";
import { getStoredFeatureAccess, normalizeRole } from '../../utils/pageAccess';



const PageCompyuter = () => {
      const { slug } = useParams()
  const role = normalizeRole(localStorage.getItem('role'));
  const canViewEmployeePPETab = getStoredFeatureAccess(role).employee_ppe_tab;


  const customTheme = {

    tablist: {
      tabitem: {
        base: "p-4",
        active: {
          on: "border-b-2 border-red-500",
          off: "border-transparent",
        },
      },
    },
  };

  if (!isAuthenticated()) {
    return <Navigate to="/auth/signin" />
  }
  return (
    <>
      <Breadcrumb pageName="Информация о сотрудниках" />


      <div className="grid grid-cols-1 sm:grid-cols-4">

        <div className="col-span-4">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="max-w-full m-4">
              <Tabs aria-label="Tabs example" theme={customTheme}>
                <Tabs.Item active title="Персональные данные">
                  <ViewCompyuter />
                </Tabs.Item>
                {canViewEmployeePPETab && (
                  <Tabs.Item title="Средства защиты">
                    <ViewPO />
                  </Tabs.Item>
                )}
              </Tabs>
            </div>
            <div className="flex justify-between border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <Link to={`/`} type='submit' className="flex items-center justify-center gap-2 rounded-md bg-slate-500 py-2 px-3 text-center font-medium text-white hover:bg-opacity-90 lg:px-5 xl:px-5" >
                < FaLongArrowAltLeft className='text-xl' />
                Назад
              </Link>
              <div />

            </div>
          </div>
        </div >
      </div >
    </>
  );
};

export default PageCompyuter;
