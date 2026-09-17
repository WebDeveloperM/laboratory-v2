import React, { ReactNode } from 'react';

interface CardDataStatsProps {
  title: string;
  total: string;
  setSelectKey: (key: string | null) => void;
  clickKey?: string;
  children: ReactNode;
  isLoading?: boolean;
  isActive?: boolean;
  cardClassName?: string;
  titleClassName?: string;
}

const CardDataStats: React.FC<CardDataStatsProps> = ({
  title,
  total,
  setSelectKey,
  clickKey,
  children,
  isLoading = false,
  isActive = false,
  cardClassName,
  titleClassName,
}) => {
  return (
    <div
      onClick={() => !isLoading && setSelectKey(isActive ? null : (clickKey || title))}
      className={`rounded-sm border duration-200 py-4 px-5 shadow-default dark:bg-boxdark ${isActive
          ? 'bg-blue-50 border-primary dark:bg-meta-4 scale-105'
          : `${cardClassName || 'bg-white'} border-stroke dark:border-strokedark`
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 hover:cursor-pointer'
        }`}
    >
      <div className='grid grid-cols-12 justify-between items-center'>
        <div className='col-span-10'>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <h4 className="text-xl font-bold text-black dark:text-white">
                {isLoading ? '...' : total}
              </h4>
              <span className={`text-sm font-medium hover:underline cursor-pointer ${titleClassName || ''}`}>{title}</span>
            </div>
          </div>
        </div>
        <div className='col-span-2'>
          <div className=''>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  );
};

export default CardDataStats;
