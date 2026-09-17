import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../../utils/urls';
import axioss from '../../api/axios';

interface CategoryCount {
    category: string;
    count: number;
}

interface RecentPassport {
    id: number;
    passport_number: string;
    template_name: string;
    template_category: string;
    created_at: string;
}

interface RecentSpravka {
    id: number;
    spravka_number: string;
    issue_date: string;
    created_at: string;
}

interface MonthlyCount {
    month: string;
    passports: number;
    spravki: number;
}

interface DocumentsSummaryData {
    passports: {
        total: number;
        by_category: CategoryCount[];
        recent: RecentPassport[];
    };
    spravki: {
        total: number;
        recent: RecentSpravka[];
    };
    monthly: MonthlyCount[];
}

const formatDate = (value: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ru-RU');
};

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const formatMonth = (value: string) => {
    const [, month] = value.split('-');
    const index = Number(month) - 1;
    return MONTH_LABELS[index] ?? value;
};

const DocumentsSummary: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<DocumentsSummaryData | null>(null);

    useEffect(() => {
        axioss
            .get(`${BASE_URL}/documents-summary/`)
            .then((response) => setData(response.data))
            .catch((err) => console.log(err));
    }, []);

    if (!data) return null;

    const maxMonthly = Math.max(1, ...data.monthly.map((m) => Math.max(m.passports, m.spravki)));

    return (
        <div>
            <div className="mb-3 text-base font-medium text-black dark:text-white text-[20px]">
                Документы — общая сводка
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                    onClick={() => navigate('/pasporta')}
                    className="cursor-pointer rounded-sm border border-stroke bg-white px-5 py-4 shadow-default duration-200 hover:scale-[1.01] dark:border-strokedark dark:bg-boxdark"
                >
                    <div className="flex items-end justify-between">
                        <div>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-300">Паспорта</span>
                            <h4 className="mt-1 text-2xl font-bold text-black dark:text-white">{data.passports.total}</h4>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {data.passports.by_category.map((row) => (
                                <span key={row.category} className="text-xs text-slate-500 dark:text-slate-300">
                                    {row.category}: <span className="font-medium text-black dark:text-white">{row.count}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/spravki')}
                    className="cursor-pointer rounded-sm border border-stroke bg-white px-5 py-4 shadow-default duration-200 hover:scale-[1.01] dark:border-strokedark dark:bg-boxdark"
                >
                    <div className="flex items-end justify-between">
                        <div>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-300">Справки</span>
                            <h4 className="mt-1 text-2xl font-bold text-black dark:text-white">{data.spravki.total}</h4>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-sm border border-stroke bg-white px-5 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-black dark:text-white">Последние паспорта</span>
                        <button
                            type="button"
                            onClick={() => navigate('/pasporta')}
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            Все
                        </button>
                    </div>
                    {data.passports.recent.length === 0 ? (
                        <div className="text-xs text-slate-400">Нет данных</div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {data.passports.recent.map((item) => (
                                <li key={item.id} className="flex items-center justify-between text-sm">
                                    <span className="text-black dark:text-white">
                                        {item.template_name || 'Без шаблона'} {item.passport_number && `№ ${item.passport_number}`}
                                    </span>
                                    <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-sm border border-stroke bg-white px-5 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-black dark:text-white">Последние справки</span>
                        <button
                            type="button"
                            onClick={() => navigate('/spravki')}
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            Все
                        </button>
                    </div>
                    {data.spravki.recent.length === 0 ? (
                        <div className="text-xs text-slate-400">Нет данных</div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {data.spravki.recent.map((item) => (
                                <li key={item.id} className="flex items-center justify-between text-sm">
                                    <span className="text-black dark:text-white">№ {item.spravka_number}</span>
                                    <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="mt-4 rounded-sm border border-stroke bg-white px-5 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="mb-3 text-sm font-medium text-black dark:text-white">Динамика за 6 месяцев</div>
                <div className="flex items-end justify-between gap-3" style={{ height: 120 }}>
                    {data.monthly.map((row) => (
                        <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                            <div className="flex h-[88px] items-end gap-1">
                                <div
                                    title={`Паспорта: ${row.passports}`}
                                    className="w-3 rounded-t bg-primary"
                                    style={{ height: `${(row.passports / maxMonthly) * 88}px` }}
                                />
                                <div
                                    title={`Справки: ${row.spravki}`}
                                    className="w-3 rounded-t bg-meta-3"
                                    style={{ height: `${(row.spravki / maxMonthly) * 88}px` }}
                                />
                            </div>
                            <span className="text-xs text-slate-400">{formatMonth(row.month)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Паспорта
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-sm bg-meta-3" /> Справки
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DocumentsSummary;
