import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import { Tabs } from 'flowbite-react';
import OrgTex from './OrgTex';
import PO from './PO';
import { useState, useRef } from 'react';
import { TbCloudPlus } from 'react-icons/tb';
import { Compyuter } from '../../types/compyuters';


const AddCompyuter = () => {

  const [program, setProgramId] = useState<number[]>([]);
  const editCompyuterRef = useRef<{ submit: () => void }>(null);
  const [compyuterDetailData, setCompyuterDetailData] = useState<Compyuter | undefined>()


  const handleSaveClick = () => {
    if (editCompyuterRef.current) {
      editCompyuterRef.current.submit();
    }
  };

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
      <Breadcrumb pageName="Добавить компьютер" />

      <div className="grid grid-cols-1 sm:grid-cols-4">

        <div className="col-span-4">
          {/* <!-- Input Fields --> */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">


            <div className="max-w-full m-4">
              <Tabs aria-label="Tabs example" theme={customTheme}>
                <Tabs.Item active title="Типь орг. техника">
                  <OrgTex ref={editCompyuterRef} program={program} compyuterDetailData={compyuterDetailData} setCompyuterDetailData={setCompyuterDetailData} />
                </Tabs.Item>
                <Tabs.Item title="Программы обеспечение">
                  <PO setProgramNewId={setProgramId} compyuterDetailData={compyuterDetailData}/>
                </Tabs.Item>
                <Tabs.Item title="Программы обеспечение">
                  <PO setProgramNewId={setProgramId} compyuterDetailData={compyuterDetailData}/>
                </Tabs.Item>
              </Tabs>
            </div>

            <div className="flex justify-end border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <button
                type="button"
                onClick={handleSaveClick}
                className="flex items-center justify-center gap-3 rounded-md bg-meta-3 py-2 px-5 text-center font-medium text-white hover:bg-opacity-90 lg:px-5 xl:px-7"
              >
                <TbCloudPlus className="text-2xl" />
                Добовить
              </button>
            </div>


          </div>
        </div >

      </div >

    </>
  );
};

export default AddCompyuter;
