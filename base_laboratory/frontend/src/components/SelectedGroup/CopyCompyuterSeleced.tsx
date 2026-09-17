import {useState, useRef, useEffect} from 'react';
import {Compyuter} from '../../types/compyuters';

type Props = {
    label: string,
    compyuterData: Compyuter[],
    setSelectedCopyuterId: React.Dispatch<React.SetStateAction<string | null>>
};

export default function CopyCompyuterSelected({label, compyuterData, setSelectedCopyuterId}: Props) {
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

    // Dropdown tashqarisiga bosilganda yopish uchun ref
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Qidiruv bo‘yicha filtrlangan variantlar
    const filteredOptions = compyuterData?.filter((data) =>
        data?.departament?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data?.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data?.warehouse_manager?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data?.type_compyuter?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Variant tanlash
    const handleSelect = (value: string, slug: string) => {
        setSelectedOption(value);
        setSelectedCopyuterId(slug);
        setIsDropdownOpen(false);
    };

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

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="mb-3 block text-black dark:text-white">{label}</label>

            {/* Tanlangan variantni ko'rsatish va dropdownni ochish */}
            <div
                className="w-full appearance-none rounded-md border border-stroke bg-white dark:bg-form-input px-5 py-2 cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
                {selectedOption ? compyuterData.find(d => d.id === Number(selectedOption))?.departament?.name : label}
            </div>

            {/* Dropdown menyusi */}
            {isDropdownOpen && (
                <div
                    className="absolute left-0 right-0 bg-white dark:bg-form-input border border-stroke mt-1 rounded-md shadow-lg z-20">

                    {/* Qidirish inputi */}
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border-b border-gray-300 outline-none"
                        placeholder="Поиск..."
                        autoFocus
                    />

                    {/* Variantlar */}
                    <div className="max-h-40 overflow-auto">
                        {filteredOptions.map((data) => (
                            <div
                                key={data.id}
                                onClick={() => handleSelect(data.id.toString(), data.slug)}
                                className="px-4 py-2 cursor-pointer flex justify-between hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                                {data?.departament?.name} | {data?.user} | {data?.warehouse_manager?.name} | {data?.type_compyuter?.name}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && <div className="p-2 text-gray-500">Ничего не найдено.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}


