
"use client";


type Props = {
    label: string,
    inputData: string,
    multiline?: boolean,
    wrapperClassName?: string,
    rows?: number
}

export function ModalDataInput({ label, inputData, multiline = false, wrapperClassName = 'col-span-3', rows }: Props) {
    const dynamicRows = Math.max(2, Math.ceil((inputData?.length || 0) / 45));

    return (
        <div className={wrapperClassName}>
            <label className="mb-3 block text-black dark:text-white">
                {label}
            </label>
            {multiline ? (
                <textarea
                    value={inputData ?? ''}
                    disabled
                    readOnly
                    rows={rows ?? dynamicRows}
                    className="w-full rounded-md border-stroke bg-transparent py-1 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary resize-none"
                />
            ) : (
                <input
                    type="text"
                    value={inputData ?? ''}
                    disabled
                    readOnly
                    className="w-full rounded-md border-stroke bg-transparent py-1 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
            )}
        </div>
    );
}
