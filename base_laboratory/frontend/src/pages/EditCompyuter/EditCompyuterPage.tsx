import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import { Tabs } from 'flowbite-react';
import EditCompyuter from './EditCompyuter.tsx';
import EditPo from './EditPO.tsx';
import { IoIosSave } from 'react-icons/io';
import { useState, useRef } from 'react';

const EditCompyuterPage = () => {
  const [program, setProgramId] = useState<number[]>([]);
  const editCompyuterRef = useRef<{ submit: () => void }>(null);


  const handleSaveClick = () => {
    if (editCompyuterRef.current) {
      editCompyuterRef.current.submit();
    }
  };

  const customTheme = {
    tablist: {
      tabitem: {
        base: 'p-4',
        active: {
          on: 'border-b-2 border-red-500',
          off: 'border-transparent',
        },
      },
    },
  };

  if (!isAuthenticated()) {
    return <Navigate to="/auth/signin" />;
  }
  return (
    <>
      <Breadcrumb pageName="Редактирование компьютер" />

      <div className="grid grid-cols-1 sm:grid-cols-4">
        <div className="col-span-4">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="max-w-full m-4">
              <Tabs aria-label="Tabs example" theme={customTheme}>
                <Tabs.Item active title="Типь орг. техника">
                  <EditCompyuter ref={editCompyuterRef} program={program} />
                </Tabs.Item>
                <Tabs.Item title="Программы обеспечение">
                  <EditPo setProgramId={setProgramId}  />
                </Tabs.Item>
              </Tabs>
            </div>

            <div className="flex justify-end border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <button
                type="button"
                onClick={handleSaveClick}
                className="flex items-center justify-center gap-3 rounded-md bg-meta-3 py-2 px-5 text-center font-medium text-white hover:bg-opacity-90 lg:px-5 xl:px-7"
              >
                <IoIosSave className="text-2xl" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditCompyuterPage;
