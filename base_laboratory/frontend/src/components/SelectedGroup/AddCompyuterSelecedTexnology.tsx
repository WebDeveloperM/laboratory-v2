



import { useState, useRef, useEffect } from 'react';
import { GenericType } from '../../types/texnology';
import { json } from 'stream/consumers';
import { Compyuter } from '../../types/compyuters';

type Props = {
  label: string;
  selectData: GenericType[];
  selectedIdComp: GenericType | undefined;
  selectedTexnologyId: React.Dispatch<React.SetStateAction<number | null>>
  isSubmitted: boolean | null
  

};

export default function AddCompyuterSelecedTexnology({ label, selectData, selectedIdComp, selectedTexnologyId, isSubmitted }: Props) {

  const [selectedOption, setSelectedOption] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tashqariga bosilganda dropdownni yopish
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  useEffect(() => {
    if (selectedIdComp) {
      const selectedItem = selectData.find((item) => item.id === selectedIdComp.id);
      if (selectedItem) {
        setSelectedOption(selectedItem.name)
        selectedTexnologyId(selectedItem.id)
      }
    }
  }, [selectedIdComp, selectData]);


  // Qidiruv bo‘yicha filtrlangan natijalar
  const filteredOptions = selectData.filter((data) =>
    data.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (value: string, id: number) => {
    setSelectedOption(value);
    setIsDropdownOpen(false);
    selectedTexnologyId(id)

  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="mb-3 block text-black dark:text-white">{label}</label>

      {/* Tanlangan variantni ko'rsatish va dropdownni ochish */}
      <div
        className={`w-full flex pt-2 appearance-none rounded-md border h-[38px] px-5 outline-none transition 
          ${error ? "border-red-500" : "border-stroke"} focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input cursor-pointer`}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {selectedOption || "Выберите значение"}
      </div>

      {isDropdownOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-form-input border border-stroke rounded-md shadow-lg z-20">
          {/* Qidirish inputi */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border-b border-gray-300 outline-none"
            placeholder="Поиск..."
            autoFocus
          />

          {/* Variantlar ro‘yxati */}
          <div className="max-h-40 overflow-auto">
            {filteredOptions.map((data) => (
              <div
                key={data.id}
                onClick={() => handleSelect(data.name, data.id)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {data.name}
              </div>
            ))}
            {filteredOptions.length === 0 && <div className="p-2 text-gray-500">Ничего не найдено.</div>}
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}


