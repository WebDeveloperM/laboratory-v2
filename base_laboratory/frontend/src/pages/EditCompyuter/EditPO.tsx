import { useEffect, useState } from 'react';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { TexnologyDataStructure } from '../../types/texnology';

import { Compyuter } from '../../types/compyuters';
import MultySelectTexnologyProgram from '../../components/SelectedGroup/MultySelectTexnologyProgram';
import { useParams } from 'react-router-dom';

type Props = {
  setProgramId: React.Dispatch<React.SetStateAction<number[]>>;
};

export default function EditPO({ setProgramId }: Props) {
  const [data, setData] = useState<TexnologyDataStructure | null>(null);
  const [compyuterDetailData, setCompyuterDetailData] = useState<Compyuter>();
  const { slug } = useParams();
  const [isSubmitted, setIsSubmitted] = useState<boolean | null>(false);
  const [licenseSystemPrograms, setLicenseSystemPrograms] = useState<number[]>([]);
  const [licenseAdditionalPrograms, setLicenseAdditionalPrograms] = useState<number[]>([]);
  const [noLicenseSystemPrograms, setNoLicenseSystemPrograms] = useState<number[]>([]);
  const [noLicenseAdditionalPrograms, setNoLicenseAdditionalPrograms] = useState<number[]>([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!slug) return;

    axioss
      .get(`${BASE_URL}/comp_detail/${slug}`)
      .then((response) => {
        setCompyuterDetailData(response.data);
      })
      .catch((err) => console.log(err));
  }, [slug]);

  useEffect(() => {
    if (!token) return;

    axioss
      .get(`${BASE_URL}/all_texnology/`)
      .then((response) => {
        setData(response.data);
      })
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    const allSelectedProgramIds = [
      ...licenseSystemPrograms,
      ...licenseAdditionalPrograms,
      ...noLicenseSystemPrograms,
      ...noLicenseAdditionalPrograms,
    ];
    setProgramId(allSelectedProgramIds);
  }, [licenseSystemPrograms, licenseAdditionalPrograms, noLicenseSystemPrograms, noLicenseAdditionalPrograms]);


  return (
    <div className="grid grid-cols-1 sm:grid-cols-12">
      <div className="col-span-12 mx-3">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-6 border-r">
            <h2 className="font-semibold">Лицензированный</h2>

            <div className=" bg-white  dark:border-strokedark dark:bg-box mt-3">
              <div className="mr-5">
                <label className="text-gray-700 font-medium mt-2">
                  Системная
                </label>
                {data && (
                  <MultySelectTexnologyProgram
                    label="Системная"
                    selectData={data.program_with_license_and_systemic}
                    selectedTexnologyId={setLicenseSystemPrograms}
                    selectedIdComp={
                      compyuterDetailData?.program_with_license_and_systemic
                    }

                  />
                )}
              </div>
            </div>

            <div className=" bg-white  dark:border-strokedark dark:bg-box mt-3">
              <div className="mr-5">
                <label className="text-gray-700 font-medium mt-2">
                  Дополнительные программы
                </label>

                {data && (
                  <MultySelectTexnologyProgram
                    label="Дополнительные"
                    selectData={data.program_with_license_and_additional}
                    selectedTexnologyId={setLicenseAdditionalPrograms}
                    selectedIdComp={
                      compyuterDetailData?.program_with_license_and_additional
                    }

                  />
                )}
              </div>
            </div>
          </div>
          <div className="col-span-6">
            <h2 className="font-semibold">Не лицензированный</h2>

            <div className=" bg-white  dark:border-strokedark dark:bg-box mt-3">
              <div className="mr-2">
                <label className="text-gray-700 font-medium mt-2">
                  Системная
                </label>
                {data && (
                  <MultySelectTexnologyProgram
                    label="Системная"
                    selectData={data.program_with_no_license_and_systemic}
                    selectedTexnologyId={setNoLicenseSystemPrograms}
                    selectedIdComp={
                      compyuterDetailData?.program_with_no_license_and_systemic
                    }

                  />
                )}
              </div>
            </div>

            <div className=" bg-white  dark:border-strokedark dark:bg-box mt-3">
              <div className="mr-2">
                <label className="text-gray-700 font-medium mt-2">
                  Дополнительные программы
                </label>

                {data && (
                  <MultySelectTexnologyProgram
                    label="Дополнительные"
                    selectData={data.program_with_no_license_and_additional}
                    selectedTexnologyId={setNoLicenseAdditionalPrograms}
                    selectedIdComp={
                      compyuterDetailData?.program_with_no_license_and_additional
                    }

                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
