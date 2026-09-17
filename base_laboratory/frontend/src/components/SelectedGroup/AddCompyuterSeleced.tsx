import { useState, useEffect } from 'react';
import { TexnologyDataStructure } from '../../types/texnology';

type Props = {
  label: string,
  selectData: TexnologyDataStructure,
  setSelectedDepartment: React.Dispatch<React.SetStateAction<number | null>>,
  isSubmitted: boolean | null
}

export default function AddCompyuterSeleced({ label, selectData, setSelectedDepartment, isSubmitted }: Props) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Agar `isSubmitted` true bo‘lsa va hech qanday variant tanlanmagan bo‘lsa, xatolik chiqarish
    if (isSubmitted && !selectedOption) {
      setError("Обязательное поле");
    } else {
      setError(null);
    }
  }, [isSubmitted, selectedOption]);

  const filteredOptions = selectData.departament?.filter((data) =>
    data.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (value: string) => {
    setSelectedOption(value);
    setSelectedDepartment(Number(value));
    setIsDropdownOpen(false);
    setError(null); // Variant tanlanganda xatolikni o‘chirish
  };

  return (
    <div className="relative dropdown-container">
      <label className="mb-3 block text-black dark:text-white">{label}</label>
      <div className="bg-white dark:bg-form-input relative">
        <div
          className={`w-full flex pt-2 appearance-none rounded-md border h-11 px-5 outline-none transition 
            ${error ? "border-red-500" : "border-stroke"} focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input cursor-pointer`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {selectedOption ? selectData.departament?.find(d => d.id === Number(selectedOption))?.name : label}
        </div>
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 bg-white dark:bg-form-input border border-stroke mt-1 rounded-md shadow-lg z-20">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border-b border-gray-300 outline-none"
              placeholder="Поиск..."
              autoFocus
            />
            <div className="max-h-40 overflow-auto">
              {filteredOptions?.map((data) => (
                <div
                  key={data.id}
                  onClick={() => handleSelect(data.id.toString())}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {data.name}
                </div>
              ))}
              {filteredOptions?.length === 0 && <div className="p-2 text-gray-500">Ничего не найдено.</div>}
            </div>
          </div>
        )}
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    </div>
  );
}



