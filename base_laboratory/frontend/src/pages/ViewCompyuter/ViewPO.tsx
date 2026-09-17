import { useEffect, useMemo, useRef, useState } from "react";
import axioss from "../../api/axios";
import { BASE_URL, resolveEmployeeImageUrl } from "../../utils/urls";
import { Link, useParams } from "react-router-dom";
import { GrAddCircle } from "react-icons/gr";
import { FaRegCalendarAlt } from "react-icons/fa";
import { FaFileExcel } from "react-icons/fa";
import { FaFilePdf } from "react-icons/fa";
import * as XLSX from 'xlsx-js-style';
import { toast } from 'react-toastify';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { getStoredFeatureAccess, normalizeRole, isManagerTierRole } from '../../utils/pageAccess';

(pdfMake as any).vfs = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs;

type PpeInfo = {
    id: number;
    name: string;
    size?: string | null;
    type_product: string | null;
    type_product_display?: string | null;
    renewal_months: number;
    is_new?: boolean | null;
};

type ResponsiblePersonInfo = {
    id: number;
    full_name?: string | null;
    position?: string | null;
};

type PPECatalogItem = {
    id: number;
    name?: string | null;
    type_product?: string | null;
    type_product_display?: string | null;
    renewal_months?: number | null;
};

const getCurrentDateInputValue = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return `${day}/${month}/${year}`;
};

const normalizeDateInputValue = (value: string) => value.replace(/[^\d/]/g, '').slice(0, 10);

type ItemDetail = {
    id?: number;
    issued_at?: string | null;
    issued_by_info?: {
        id: number;
        username: string;
        full_name: string;
    } | null;
    ppeproduct?: Array<number | { id: number; name?: string }>;
    ppeproduct_info?: PpeInfo[];
    employee?: {
        id?: number;
        first_name?: string;
        last_name?: string;
        surname?: string;
        tabel_number?: string;
        position?: string;
        gender?: string;
        height?: string;
        clothe_size?: string;
        shoe_size?: string;
        date_of_employment?: string | null;
        date_of_change_position?: string | null;
        department?: {
            name?: string;
            boss_fullName?: string;
        } | null;
        section?: {
            name?: string;
        } | null;
    };
    issue_history?: Array<{
        id: number;
        slug?: string | null;
        image?: string | null;
        signature_image?: string | null;
        warehouse_signature_image?: string | null;
        qr_token?: string | null;
        qr_code_image?: string | null;
        qr_frontend_path?: string | null;
        qr_scan_url?: string | null;
        issued_at?: string | null;
        next_due_date?: string | null;
        is_current?: boolean;
        issued_by_info?: {
            id: number;
            username: string;
            full_name: string;
        } | null;
        ppeproduct_info?: PpeInfo[];
    }>;
    responsible_persons?: ResponsiblePersonInfo[];
    ppe_products?: PPECatalogItem[];
};

export default function ViewPO() {
    const [itemDetailData, setItemDetailData] = useState<ItemDetail | null>(null);
    const [previewImage, setPreviewImage] = useState<{ imageUrl: string; issuedAt?: string | null } | null>(null);
    const [isPdfExporting, setIsPdfExporting] = useState(false);
    const [issuedFromDate, setIssuedFromDate] = useState('');
    const [issuedToDate, setIssuedToDate] = useState('');
    const [productFilterId, setProductFilterId] = useState<number | ''>('');
    const [sizeFilter, setSizeFilter] = useState('');
    const issuedFromInputRef = useRef<HTMLInputElement | null>(null);
    const issuedToInputRef = useRef<HTMLInputElement | null>(null);
    const { slug } = useParams();
    const role = normalizeRole(localStorage.getItem('role'));
    const canViewEmployeePPETab = getStoredFeatureAccess(role).employee_ppe_tab;
    const canExportExcel = getStoredFeatureAccess(role).dashboard_export_excel;
    const canAddItem = role === 'admin' || role === 'it_center' || isManagerTierRole(role);
    const canAddHistory = role === 'admin' || isManagerTierRole(role);

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyProductIds, setHistoryProductIds] = useState<number[]>([]);
    const [historyProductDates, setHistoryProductDates] = useState<Record<number, string>>({});
    const [historySaving, setHistorySaving] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    const [pendingIssue, setPendingIssue] = useState<{ id: number; timeRemainingSeconds: number } | null>(null);

    if (!canViewEmployeePPETab) {
        return (
            <div className="rounded border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                Нет доступа к разделу "Средства защиты".
            </div>
        );
    }

    const resolveImageUrl = (value?: string | null) => resolveEmployeeImageUrl(value);

    const resetHistoryForm = () => {
        setHistoryProductIds([]);
        setHistoryProductDates({});
        setHistoryModalOpen(false);
        setHistorySaving(false);
    };

    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const calculateNextIssueDate = (issuedAt?: string | null, renewalMonths?: number) => {
        if (!issuedAt || renewalMonths === undefined || renewalMonths === null) return '-';
        const date = new Date(issuedAt);
        if (Number.isNaN(date.getTime())) return '-';
        date.setMonth(date.getMonth() + renewalMonths - 1);
        return formatDate(date.toISOString());
    };

    const formatGender = (value?: string | null) => {
        const raw = String(value || '').trim().toUpperCase();
        if (!raw) return '-';
        if (raw === 'M' || raw === 'М') return 'Мужской';
        if (raw === 'F' || raw === 'Ж') return 'Женский';
        return value || '-';
    };

    const findResponsibleByPosition = (positionKeywords: string[]) => {
        const people = itemDetailData?.responsible_persons ?? [];
        if (!people.length) return '-';

        const matched = people.find((person) => {
            const position = String(person.position || '').toLowerCase();
            return positionKeywords.some((keyword) => position.includes(keyword));
        });

        return matched?.full_name || '-';
    };

    const historyGroups = (itemDetailData?.issue_history ?? []).filter(
        (issue) => (issue.ppeproduct_info ?? []).length > 0,
    );

    const historyGroupsWithMeta = useMemo(
        () => historyGroups.map((issue, index) => ({
            ...issue,
            displayNumber: historyGroups.length - index,
        })),
        [historyGroups],
    );

    const filteredHistoryGroups = useMemo(() => {
        if (!issuedFromDate && !issuedToDate) {
            return historyGroupsWithMeta;
        }

        const fromDate = issuedFromDate ? new Date(`${issuedFromDate}T00:00:00`) : null;
        const toDate = issuedToDate ? new Date(`${issuedToDate}T23:59:59`) : null;

        return historyGroupsWithMeta.filter((issue) => {
            if (!issue.issued_at) return false;
            const issuedAt = new Date(issue.issued_at);
            if (Number.isNaN(issuedAt.getTime())) return false;
            if (fromDate && issuedAt < fromDate) return false;
            if (toDate && issuedAt > toDate) return false;
            return true;
        });
    }, [historyGroupsWithMeta, issuedFromDate, issuedToDate]);

    const historyProductOptions = useMemo(() => {
        const map = new Map<number, string>();
        filteredHistoryGroups.forEach((issue) => {
            (issue.ppeproduct_info ?? []).forEach((product) => {
                if (product?.id == null || !product?.name) return;
                if (!map.has(product.id)) {
                    map.set(product.id, product.name);
                }
            });
        });

        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    }, [filteredHistoryGroups]);

    const displayedHistoryGroups = useMemo(() => {
        const normalizedSize = sizeFilter.trim().toLowerCase();

        return filteredHistoryGroups
            .map((issue) => {
                const filteredProducts = (issue.ppeproduct_info ?? []).filter((product) => {
                    if (productFilterId && Number(product.id) !== Number(productFilterId)) {
                        return false;
                    }

                    if (!normalizedSize) {
                        return true;
                    }

                    const productSize = String(product.size || '').toLowerCase();
                    return productSize.includes(normalizedSize);
                });

                return {
                    ...issue,
                    ppeproduct_info: filteredProducts,
                };
            })
            .filter((issue) => (issue.ppeproduct_info ?? []).length > 0);
    }, [filteredHistoryGroups, productFilterId, sizeFilter]);

    const exportFilteredHistoryToExcel = () => {
        const employeeData = itemDetailData?.employee;
        const sortedForExport = [...displayedHistoryGroups].sort((left, right) => {
            const leftTime = left.issued_at ? new Date(left.issued_at).getTime() : Number.POSITIVE_INFINITY;
            const rightTime = right.issued_at ? new Date(right.issued_at).getTime() : Number.POSITIVE_INFINITY;
            return leftTime - rightTime;
        });

        const headers = [
            '№',
            'Фамилия',
            'Имя',
            'Отчество',
            'Табельный номер',
            'Должность',
            'Цех',
            'Отдел',
            'Руководитель цеха',
            'Выдача',
            'Наименование',
            'Размер',
            'Ед. изм.',
            'Срок обновления (мес.)',
            'Дата выдачи',
            'Следующая выдача',
            'Подтверждено',
        ];

        const rawRows = sortedForExport.flatMap((issue) =>
            (issue.ppeproduct_info ?? []).map((product) => ([
                employeeData?.last_name || '-',
                employeeData?.first_name || '-',
                employeeData?.surname || '-',
                employeeData?.tabel_number || '-',
                employeeData?.position || '-',
                employeeData?.department?.name || '-',
                employeeData?.section?.name || '-',
                employeeData?.department?.boss_fullName || '-',
                `#${issue.displayNumber}`,
                product.name || '-',
                product.size || '-',
                product.type_product_display || product.type_product || '-',
                product.renewal_months ?? '-',
                formatDate(issue.issued_at),
                calculateNextIssueDate(issue.issued_at, product.renewal_months),
                issue.image ? `Да (${formatDate(issue.issued_at)})` : 'Нет',
            ])),
        );

        const excelRows = rawRows.map((row, rowIndex) => [rowIndex + 1, ...row]);

        if (!excelRows.length) {
            return;
        }

        try {
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelRows]);
            worksheet['!cols'] = [
                { wch: 6 },
                { wch: 18 },
                { wch: 18 },
                { wch: 20 },
                { wch: 16 },
                { wch: 28 },
                { wch: 20 },
                { wch: 20 },
                { wch: 26 },
                { wch: 12 },
                { wch: 26 },
                { wch: 12 },
                { wch: 12 },
                { wch: 22 },
                { wch: 16 },
                { wch: 18 },
                { wch: 18 },
            ];

            const baseCellStyle = {
                border: {
                    top: { style: 'thin', color: { rgb: 'BFBFBF' } },
                    bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
                    left: { style: 'thin', color: { rgb: 'BFBFBF' } },
                    right: { style: 'thin', color: { rgb: 'BFBFBF' } },
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                    wrapText: true,
                },
            };

            const headerStyle = {
                ...baseCellStyle,
                fill: {
                    fgColor: { rgb: '1F4E78' },
                },
                font: {
                    bold: true,
                    color: { rgb: 'FFFFFF' },
                },
            };

            const totalRows = excelRows.length + 1;
            const totalCols = headers.length;

            for (let row = 0; row < totalRows; row += 1) {
                for (let col = 0; col < totalCols; col += 1) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[cellAddress] as any;
                    if (!cell) continue;
                    cell.s = row === 0 ? headerStyle : baseCellStyle;
                }
            }

            worksheet['!rows'] = [{ hpt: 24 }];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'PPE History');

            const datePart = new Date().toISOString().slice(0, 10);
            const fromPart = issuedFromDate ? issuedFromDate : 'all';
            const toPart = issuedToDate ? issuedToDate : 'all';
            XLSX.writeFile(workbook, `ppe_history_${fromPart}_${toPart}_${datePart}.xlsx`);
            toast.success(`Успешно экспортировано ${excelRows.length} записей в Excel`);
        } catch (error) {
            console.error('Ошибка при экспорте PPE history:', error);
            toast.error('Произошла ошибка при экспорте данных');
        }
    };

    const fileToDataUrl = (file: Blob): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const loadImageAsDataUrl = async (value?: string | null) => {
        if (!value) return null;

        const resolvedUrl = resolveImageUrl(value);
        if (!resolvedUrl) return null;

        try {
            const response = await axioss.get(resolvedUrl, { responseType: 'blob' });
            return await fileToDataUrl(response.data);
        } catch (error) {
            console.log('Не удалось загрузить изображение подписи для PDF:', error);
            return null;
        }
    };

    const exportFilteredHistoryToPdf = async () => {
        const employeeData = itemDetailData?.employee;
        const sortedForExport = [...displayedHistoryGroups].sort((left, right) => {
            const leftTime = left.issued_at ? new Date(left.issued_at).getTime() : Number.POSITIVE_INFINITY;
            const rightTime = right.issued_at ? new Date(right.issued_at).getTime() : Number.POSITIVE_INFINITY;
            return leftTime - rightTime;
        });

        const ppeRows = sortedForExport.flatMap((issue) =>
            (issue.ppeproduct_info ?? []).map((product, index) => ([
                index + 1,
                product.name || '-',
                product.type_product_display || product.type_product || '-',
                product.size || '-',
                String(product.renewal_months ?? '-'),
                formatDate(issue.issued_at),
                calculateNextIssueDate(issue.issued_at, product.renewal_months),
            ])),
        );

        if (!ppeRows.length) {
            toast.warning('Нет данных для экспорта в PDF');
            return;
        }

        setIsPdfExporting(true);

        try {
            const signatureSources = Array.from(new Set(
                sortedForExport
                    .map((issue) => issue.signature_image)
                    .filter((value): value is string => Boolean(value)),
            ));

            const signatureDataBySource = new Map<string, string>();
            await Promise.all(signatureSources.map(async (source) => {
                const dataUrl = await loadImageAsDataUrl(source);
                if (dataUrl) {
                    signatureDataBySource.set(source, dataUrl);
                }
            }));

            const latestIssueWithSignature = [...sortedForExport]
                .reverse()
                .find((issue) => Boolean(issue.signature_image && signatureDataBySource.get(issue.signature_image)));
            const signatureDataUrl = latestIssueWithSignature?.signature_image
                ? signatureDataBySource.get(latestIssueWithSignature.signature_image) || null
                : null;

            const employeeFullName = [employeeData?.last_name, employeeData?.first_name, employeeData?.surname]
                .filter(Boolean)
                .join(' ') || '-';
            const mmXtBossName = findResponsibleByPosition(['boshlig', 'boshliq']);
            const mmXtEngineerName = findResponsibleByPosition(['muhandis']);
            const chiefAccountantName = findResponsibleByPosition(['hisobchi']);

            const issuedCountsByProductId = new Map<number, number>();
            sortedForExport.forEach((issue) => {
                (issue.ppeproduct_info ?? []).forEach((product) => {
                    const productId = Number(product.id);
                    if (!Number.isFinite(productId)) return;
                    issuedCountsByProductId.set(productId, (issuedCountsByProductId.get(productId) || 0) + 1);
                });
            });

            const catalogProducts = itemDetailData?.ppe_products ?? [];
            const normRows = catalogProducts.map((product) => {
                const productId = Number(product.id);
                const issuedCount = Number.isFinite(productId) ? (issuedCountsByProductId.get(productId) || 0) : 0;
                return [
                    String(product.name || '-'),
                    String(product.type_product || '-'),
                    issuedCount > 0 ? String(issuedCount) : '-',
                    `${String(product.renewal_months ?? '-')} oy`,
                ];
            });

            const movementRows = sortedForExport.flatMap((issue) =>
                (issue.ppeproduct_info ?? []).map((product) => ([
                    product.name || '-',
                    formatDate(issue.issued_at),
                    issue.signature_image && signatureDataBySource.get(issue.signature_image)
                        ? { image: signatureDataBySource.get(issue.signature_image), fit: [56, 16], alignment: 'center' }
                        : '-',
                    issue.issued_by_info?.full_name || issue.issued_by_info?.username || '-',
                ])),
            );

            const gridLayout = {
                hLineWidth: () => 0.7,
                vLineWidth: () => 0.7,
                hLineColor: () => '#374151',
                vLineColor: () => '#374151',
                paddingLeft: () => 3,
                paddingRight: () => 3,
                paddingTop: () => 2,
                paddingBottom: () => 2,
            };

            const line = (label: string, value: string) => `${label}${value || '-'}`;
            const currentPageUrl = typeof window !== 'undefined' ? window.location.href : '';

            const documentDefinition: any = {
                pageSize: 'A4',
                pageMargins: [20, 16, 20, 16],
                content: [
                    {
                        stack: [
                            { text: 'SX, MMQ va EBYAT\nAC-ilova asosida', style: 'tinyCenter', margin: [0, 0, 0, 6] },
                            { text: 'Yakka tartibdagi himoya vositalari berishni hisobga olish shakli MB-6', style: 'headerCenter', margin: [0, 0, 0, 3] },
                            { text: '“Buxoro NQIZ” MCHJ', style: 'headerCenter', margin: [0, 0, 0, 6] },
                            {
                                text: 'Yakka tartibdagi himoya (maxsus kiyim, maxsus oyoq kiyim va h.k.) vositalarini berishni hisobga olish shaxsiy varaqasi',
                                style: 'smallCenter',
                                margin: [0, 0, 0, 8],
                            },
                            {
                                columns: [
                                    {
                                        width: '66%',
                                        stack: [
                                            { text: line('Familiyasi: ', employeeData?.last_name || '-'), style: 'lineText' },
                                            { text: line('Ismi: ', employeeData?.first_name || '-'), style: 'lineText' },
                                            { text: line('Otasining ismi: ', employeeData?.surname || '-'), style: 'lineText' },
                                            { text: line('Tabel raqami: ', employeeData?.tabel_number || '-'), style: 'lineText' },
                                            { text: line('Sex: ', employeeData?.department?.name || '-'), style: 'lineText' },
                                            { text: line('Kasbi (lavozimi): ', employeeData?.position || '-'), style: 'lineText' },
                                            { text: line('Ishga kirgan sana: ', formatDate(employeeData?.date_of_employment)), style: 'lineText' },
                                            { text: line("Kasbi (lavozimi)ni o‘zgartirgan sana: ", formatDate(employeeData?.date_of_change_position)), style: 'lineText' },
                                        ],
                                    },
                                    {
                                        width: '34%',
                                        stack: [
                                            { text: line('Jinsi: ', formatGender(employeeData?.gender)), style: 'lineText' },
                                            { text: line("Bo‘yi: ", employeeData?.height || '-'), style: 'lineText' },
                                            { text: line('Kiyim: ', employeeData?.clothe_size || '-'), style: 'lineText' },
                                            { text: line('Poyabzal: ', employeeData?.shoe_size || '-'), style: 'lineText' },
                                        ],
                                    },
                                ],
                                columnGap: 8,
                                margin: [0, 0, 0, 12],
                            },
                            {
                                text: 'Tasdiqlangan me’yor (norma)lar asosida berilishi nazarda tutilgan',
                                style: 'smallCenter',
                                margin: [0, 0, 0, 5],
                            },
                            {
                                table: {
                                    headerRows: 1,
                                    widths: ['43%', '22%', '15%', '20%'],
                                    body: [
                                        [
                                            { text: 'YATHV nomi', alignment: 'center' },
                                            { text: "O‘lchov birligi", alignment: 'center' },
                                            { text: 'Soni', alignment: 'center' },
                                            { text: 'Yaroqlilik muddati', alignment: 'center' },
                                        ],
                                        ...normRows,
                                    ],
                                },
                                layout: gridLayout,
                                margin: [0, 0, 0, 12],
                            },
                            {
                                table: {
                                    widths: [220, 150, '*'],
                                    body: [
                                        [
                                            { text: 'MM va XT guruhi boshlig‘i:', style: 'responsibleLabel' },
                                            { text: '', style: 'responsibleSign' },
                                            { text: mmXtBossName, style: 'responsibleValue' },
                                        ],
                                        [
                                            { text: 'MM va XT guruhi muhandisi:', style: 'responsibleLabel', margin: [0, 8, 0, 0] },
                                            { text: '', style: 'responsibleSign', margin: [0, 8, 0, 0] },
                                            { text: mmXtEngineerName, style: 'responsibleValue', margin: [0, 8, 0, 0] },
                                        ],
                                        [
                                            { text: 'Bosh hisobchi:', style: 'responsibleLabel', margin: [0, 8, 0, 0] },
                                            { text: '', style: 'responsibleSign', margin: [0, 8, 0, 0] },
                                            { text: chiefAccountantName, style: 'responsibleValue', margin: [0, 8, 0, 0] },
                                        ],
                                        [
                                            { text: 'Xodim:', style: 'responsibleLabel', margin: [0, 8, 0, 0] },
                                            signatureDataUrl
                                                ? { image: signatureDataUrl, fit: [150, 42], alignment: 'left', margin: [0, 4, 0, 0] }
                                                : { text: 'imzo', style: 'responsibleSign', margin: [0, 8, 0, 0] },
                                            { text: employeeFullName, style: 'responsibleValue', margin: [0, 8, 0, 0] },
                                        ],
                                    ],
                                },
                                layout: 'noBorders',
                                margin: [0, 0, 0, 2],
                            },
                            {
                                qr: currentPageUrl || 'about:blank',
                                fit: 104,
                                absolutePosition: { x: 471, y: 718 },
                            },
                        ],
                    },
                    {
                        pageBreak: 'before',
                        stack: [
                            { text: 'MB-6 shakli orqa tomoni', style: 'titleCenter', margin: [0, 0, 0, 8] },
                            {
                                table: {
                                    headerRows: 1,
                                    widths: ['35%', '22%', '19%', '24%'],
                                    body: [
                                        [
                                            { text: 'YATHV nomi', alignment: 'center' },
                                            { text: 'Sana', alignment: 'center' },
                                            { text: 'Imzo', alignment: 'center' },
                                            { text: 'Xodim', alignment: 'center' },
                                        ],
                                        ...movementRows,
                                    ],
                                },
                                layout: gridLayout,
                            },
                            {
                                qr: currentPageUrl || 'about:blank',
                                fit: 104,
                                absolutePosition: { x: 471, y: 718 },
                            },
                        ],
                    },
                ],
                defaultStyle: {
                    fontSize: 9,
                },
                styles: {
                    titleCenter: { fontSize: 16, bold: true, alignment: 'center' },
                    headerCenter: { fontSize: 12, bold: true, alignment: 'center' },
                    smallCenter: { fontSize: 10, alignment: 'center' },
                    tinyCenter: { fontSize: 10, alignment: 'center', italics: true },
                    small: { fontSize: 10 },
                    lineText: { fontSize: 10, margin: [0, 0, 0, 3] },
                    responsibleLabel: { fontSize: 11, bold: true },
                    responsibleValue: { fontSize: 12, bold: true },
                    responsibleSign: { fontSize: 11, alignment: 'center', italics: true },
                },
            };

            const datePart = new Date().toISOString().slice(0, 10);
            const fromPart = issuedFromDate || 'all';
            const toPart = issuedToDate || 'all';
            pdfMake.createPdf(documentDefinition).download(`ppe_card_${fromPart}_${toPart}_${datePart}.pdf`);
            toast.success(`PDF успешно сформирован (${ppeRows.length} записей)`);
        } catch (error) {
            console.error('Ошибка при экспорте в PDF:', error);
            toast.error('Произошла ошибка при формировании PDF');
        } finally {
            setIsPdfExporting(false);
        }
    };

    const openDatePicker = (input: HTMLInputElement | null) => {
        if (!input) return;
        const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
        if (typeof pickerInput.showPicker === 'function') {
            pickerInput.showPicker();
            return;
        }
        input.focus();
        input.click();
    };

    const closePreviewModal = () => {
        setPreviewImage(null);
    };

    const tableHeader = (
        <thead>
            <tr className="border-b border-stroke dark:border-strokedark text-left">
                <th className="px-4 py-3 w-16">№</th>
                <th className="px-4 py-3">Наименование</th>
                <th className="px-4 py-3">Размер</th>
                <th className="px-4 py-3">Ед. изм.</th>
                <th className="px-4 py-3">Срок обновления (мес.)</th>
                <th className="px-4 py-3">Дата выдачи</th>
                <th className="px-4 py-3">Следующая выдача</th>
                <th className="px-4 py-3">Face ID</th>
                <th className="px-4 py-3">qr_code</th>
            </tr>
        </thead>
    );

    useEffect(() => {
        if (!slug) return;

        axioss
            .get(`${BASE_URL}/item-view/${slug}`)
            .then(async (response) => {
                const detail = response.data as ItemDetail;
                const hasHistory = Array.isArray(detail.issue_history) && detail.issue_history.length > 0;
                const employeeId = detail.employee?.id;

                if (hasHistory || !employeeId) {
                    setItemDetailData(detail);
                    return;
                }

                try {
                    const allItemsResponse = await axioss.get(
                        `${BASE_URL}/all-items/?employee_id=${employeeId}&no_pagination=true`,
                    );

                    const items = Array.isArray(allItemsResponse.data) ? allItemsResponse.data : [];
                    const fallbackHistory = items
                        .map((item: ItemDetail) => ({
                            id: Number(item.id),
                            slug: (item as any).slug ?? null,
                            image: (item as any).image ?? null,
                            signature_image: (item as any).signature_image ?? null,
                            issued_at: item.issued_at ?? null,
                            next_due_date: (item as any).next_due_date ?? null,
                            is_current: Number(item.id) === Number(detail.id),
                            issued_by_info: item.issued_by_info ?? null,
                            ppeproduct_info: item.ppeproduct_info ?? [],
                        }))
                        .filter((item) => Number.isFinite(item.id));

                    setItemDetailData({
                        ...detail,
                        issue_history: fallbackHistory,
                    });
                } catch (historyError) {
                    console.log(historyError);
                    setItemDetailData(detail);
                }
            })
            .catch((err) => console.log(err));
    }, [slug, historyRefreshKey]);

    // Load active pending issue for this employee to show timer + "Imzolash" button
    useEffect(() => {
        const employeeId = itemDetailData?.employee?.id;
        if (!employeeId) return;

        let cancelled = false;

        axioss
            .get(`${BASE_URL}/pending-issue/employee/${employeeId}/`)
            .then((response) => {
                if (cancelled) return;
                const data = response.data?.pending;
                if (!data || typeof data.id !== 'number') {
                    setPendingIssue(null);
                    return;
                }
                const remaining = Number(data.time_remaining_seconds ?? 0);
                if (!Number.isFinite(remaining) || remaining <= 0) {
                    setPendingIssue(null);
                    return;
                }
                setPendingIssue({ id: data.id, timeRemainingSeconds: remaining });
            })
            .catch(() => {
                setPendingIssue(null);
            });

        return () => {
            cancelled = true;
        };
    }, [itemDetailData?.employee?.id]);

    // Countdown for pending issue timer
    useEffect(() => {
        if (!pendingIssue) return;

        const intervalId = window.setInterval(() => {
            setPendingIssue((prev) => {
                if (!prev) return null;
                const next = prev.timeRemainingSeconds - 1;
                if (next <= 0) return null;
                return { ...prev, timeRemainingSeconds: next };
            });
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [pendingIssue?.id]);

    const historyCatalogProducts = itemDetailData?.ppe_products ?? [];

    const toggleHistoryProduct = (productId: number) => {
        setHistoryProductIds((prev) => {
            if (prev.includes(productId)) {
                setHistoryProductDates((current) => {
                    const next = { ...current };
                    delete next[productId];
                    return next;
                });
                return prev.filter((id) => id !== productId);
            }

            setHistoryProductDates((current) => ({
                ...current,
                [productId]: current[productId] || getCurrentDateInputValue(),
            }));
            return [...prev, productId];
        });
    };

    const setHistoryProductDate = (productId: number, value: string) => {
        setHistoryProductDates((prev) => ({
            ...prev,
            [productId]: value,
        }));
    };

    const handleCreateHistory = async () => {
        if (!slug || historySaving) return;

        if (historyProductIds.length === 0) {
            toast.error('Выберите хотя бы одно средство защиты');
            return;
        }

        const productEntries = historyProductIds.map((productId) => ({
            product_id: productId,
            issued_at: historyProductDates[productId] || '',
        }));

        const missingDateEntry = productEntries.find((entry) => !entry.issued_at);
        if (missingDateEntry) {
            toast.error('Укажите дату выдачи для каждого выбранного СИЗ');
            return;
        }

        setHistorySaving(true);
        try {
            await axioss.post(`${BASE_URL}/item-view/${slug}/history/`, {
                product_entries: productEntries,
            });
            toast.success('История выдачи добавлена');
            resetHistoryForm();
            setHistoryRefreshKey((prev) => prev + 1);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Не удалось добавить историю выдачи');
            setHistorySaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-12">
            <div className="col-span-12 mx-3">
                <div className="rounded-md border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
                    <div className="px-4 py-3 border-b border-stroke dark:border-strokedark flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-semibold">Средства защиты</h2>
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                            <button
                                type="button"
                                onClick={exportFilteredHistoryToPdf}
                                disabled={displayedHistoryGroups.length === 0 || isPdfExporting}
                                className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Скачать PDF"
                                aria-label="Скачать PDF"
                            >
                                {isPdfExporting ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <FaFilePdf className="text-lg" />
                                )}
                            </button>
                            {canExportExcel && (
                                <button
                                    type="button"
                                    onClick={exportFilteredHistoryToExcel}
                                    disabled={displayedHistoryGroups.length === 0}
                                    className="rounded bg-meta-3 px-3 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Скачать Excel"
                                    aria-label="Скачать Excel"
                                >
                                    <FaFileExcel className="text-lg" />
                                </button>
                            )}
                           
                            {canAddHistory ? (
                                <button
                                    type="button"
                                    onClick={() => setHistoryModalOpen(true)}
                                    className="flex items-center justify-center gap-2 rounded-md bg-primary py-2 px-3 text-center text-sm font-medium text-white hover:bg-opacity-90 lg:px-5"
                                >
                                    <GrAddCircle className='text-base' />
                                    Добавить историю
                                </button>
                            ) : null}
                             {canAddItem ? (
                                <Link
                                    to={slug ? `/add-item/${slug}` : '/'}
                                    className="flex items-center justify-center gap-2 rounded-md bg-meta-3 py-2 px-3 text-center text-sm font-medium text-white hover:bg-opacity-90 lg:px-5"
                                >
                                    <GrAddCircle className='text-base' />
                                    Добавить
                                </Link>
                            ) : null}
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="rounded-md border border-stroke dark:border-strokedark p-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex w-full flex-col gap-3 xl:w-1/2 xl:flex-row xl:flex-nowrap">
                                <div className="w-full xl:flex-1">
                                    <select
                                        value={productFilterId}
                                        onChange={(event) => setProductFilterId(event.target.value ? Number(event.target.value) : '')}
                                        className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700 dark:border-strokedark dark:bg-boxdark"
                                    >
                                        <option value="">Все средства защиты</option>
                                        {historyProductOptions.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="w-full xl:flex-1">
                                    <input
                                        type="text"
                                        value={sizeFilter}
                                        onChange={(event) => setSizeFilter(event.target.value)}
                                        placeholder="Фильтр по размеру"
                                        className="h-[42px] w-full rounded border border-stroke bg-white px-3 text-base text-slate-700 dark:border-strokedark dark:bg-boxdark"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProductFilterId('');
                                        setSizeFilter('');
                                    }}
                                    className="h-[42px] w-full rounded border border-stroke bg-white px-6 text-base text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:bg-boxdark dark:hover:bg-boxdark-2 xl:w-auto"
                                >
                                    Сбросить
                                </button>
                            </div>

                            <div className="flex w-full flex-col gap-3 xl:ml-auto xl:w-auto xl:flex-row xl:flex-wrap xl:items-center">
                                <label className="text-sm font-medium">C даты</label>
                                <div className="relative w-full xl:w-auto">
                                    <input
                                        ref={issuedFromInputRef}
                                        type="date"
                                        value={issuedFromDate}
                                        onChange={(event) => setIssuedFromDate(event.target.value)}
                                        className="w-full rounded border px-3 py-2 pr-10 text-sm xl:w-auto"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => openDatePicker(issuedFromInputRef.current)}
                                        className="absolute inset-y-0 right-3 flex items-center text-slate-500"
                                        aria-label="Открыть календарь"
                                    >
                                        <FaRegCalendarAlt />
                                    </button>
                                </div>
                                <label className="text-sm font-medium">По дату</label>
                                <div className="relative w-full xl:w-auto">
                                    <input
                                        ref={issuedToInputRef}
                                        type="date"
                                        value={issuedToDate}
                                        onChange={(event) => setIssuedToDate(event.target.value)}
                                        className="w-full rounded border px-3 py-2 pr-10 text-sm xl:w-auto"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => openDatePicker(issuedToInputRef.current)}
                                        className="absolute inset-y-0 right-3 flex items-center text-slate-500"
                                        aria-label="Открыть календарь"
                                    >
                                        <FaRegCalendarAlt />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIssuedFromDate('');
                                        setIssuedToDate('');
                                    }}
                                    className="w-full rounded border border-stroke px-3 py-2 text-sm hover:bg-slate-50 dark:border-strokedark dark:hover:bg-boxdark-2 xl:w-auto"
                                >
                                    Сбросить фильтр
                                </button>
                            </div>
                        </div>

                        {historyGroups.length > 0 ? (
                            displayedHistoryGroups.length > 0 ? displayedHistoryGroups.map((issue) => (
                                <div
                                    key={`issue-${issue.id}-${issue.displayNumber}`}
                                    className={`rounded-md border border-stroke dark:border-strokedark overflow-hidden ${issue.is_current ? 'ring-1 ring-meta-3/40' : ''}`}
                                >
                                    <div className="px-4 py-2 border-b border-stroke dark:border-strokedark bg-slate-50 dark:bg-boxdark-2 flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-medium text-sm">
                                            Выдача #{issue.displayNumber}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                                            <span>Дата выдачи: {formatDate(issue.issued_at)}</span>
                                            <span>Выдал: </span>
                                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {issue.issued_by_info?.full_name }
                                            </div>
                                            {issue.is_current ? (
                                                <span className="px-2 py-1 rounded bg-meta-3/15 text-meta-3 font-medium">
                                                    Новая выдача
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            {tableHeader}
                                            <tbody>
                                                {(issue.ppeproduct_info ?? []).map((product, productIndex) => (
                                                    <tr
                                                        key={`${issue.id}-${product.id}-${productIndex}`}
                                                        className={`border-b border-stroke dark:border-strokedark ${productIndex % 2 === 0 ? 'bg-white dark:bg-boxdark' : 'bg-slate-50/40 dark:bg-boxdark-2'}`}
                                                    >
                                                        <td className="px-4 py-3">{productIndex + 1}</td>
                                                        <td className="px-4 py-3">{product.name || '-'}</td>
                                                        <td className="px-4 py-3">{product.size || '-'}</td>
                                                        <td className="px-4 py-3">{product.type_product_display || product.type_product || '-'}</td>
                                                        <td className="px-4 py-3">{product.renewal_months ?? '-'}</td>
                                                        <td className="px-4 py-3">{formatDate(issue.issued_at)}</td>
                                                        <td className="px-4 py-3">{calculateNextIssueDate(issue.issued_at, product.renewal_months)}</td>
                                                        {productIndex === 0 ? (
                                                            <>
                                                                <td
                                                                    className="px-4 py-3 align-top"
                                                                    rowSpan={Math.max((issue.ppeproduct_info ?? []).length, 1)}
                                                                >
                                                                    {issue.image ? (
                                                                        <div className="flex flex-col items-start gap-1">
                                                                            <img
                                                                                src={resolveImageUrl(issue.image)}
                                                                                alt="issue_photo"
                                                                                className="h-14 w-14 rounded border object-cover cursor-pointer"
                                                                                onClick={() =>
                                                                                    setPreviewImage({
                                                                                        imageUrl: resolveImageUrl(issue.image),
                                                                                        issuedAt: issue.issued_at,
                                                                                    })
                                                                                }
                                                                            />
                                                                            <div className="text-[11px] text-slate-500 dark:text-slate-300">
                                                                                Проверено: {formatDate(issue.issued_at)}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400">-</span>
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className="px-4 py-3 align-top"
                                                                    rowSpan={Math.max((issue.ppeproduct_info ?? []).length, 1)}
                                                                >
                                                                    {issue.qr_frontend_path ? (
                                                                        <div className="flex flex-col items-start gap-1">
                                                                            {issue.qr_code_image ? (
                                                                                <img
                                                                                    src={resolveImageUrl(issue.qr_code_image)}
                                                                                    alt="issue_qr"
                                                                                    className="h-20 w-20 rounded border object-contain bg-white cursor-pointer"
                                                                                    onClick={() =>
                                                                                        setPreviewImage({
                                                                                            imageUrl: resolveImageUrl(issue.qr_code_image!),
                                                                                            issuedAt: issue.issued_at,
                                                                                        })
                                                                                    }
                                                                                />
                                                                            ) : null}
                                                                            <Link
                                                                                to={issue.qr_frontend_path}
                                                                                className="rounded border border-stroke px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:text-slate-200 dark:hover:bg-boxdark-2"
                                                                            >
                                                                                Открыть
                                                                            </Link>
                                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                                Выдача: {formatDate(issue.issued_at)}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400">-</span>
                                                                    )}
                                                                </td>
                                                            </>
                                                        ) : null}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-md border border-dashed border-stroke dark:border-strokedark px-4 py-8 text-center text-gray-500">
                                    По выбранным фильтрам записи не найдены.
                                </div>
                            )
                        ) : itemDetailData?.ppeproduct_info && itemDetailData.ppeproduct_info.length > 0 ? (
                            <div className="rounded-md border border-stroke dark:border-strokedark overflow-hidden">
                                <div className="px-4 py-2 border-b border-stroke dark:border-strokedark bg-slate-50 dark:bg-boxdark-2 text-sm font-medium">
                                    Последняя выдача
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        {tableHeader}
                                        <tbody>
                                            {itemDetailData.ppeproduct_info.map((row, index) => (
                                                <tr key={row.id} className={`border-b border-stroke dark:border-strokedark ${index % 2 === 0 ? 'bg-white dark:bg-boxdark' : 'bg-slate-50/40 dark:bg-boxdark-2'}`}>
                                                    <td className="px-4 py-3">{index + 1}</td>
                                                    <td className="px-4 py-3">{row.name || '-'}</td>
                                                    <td className="px-4 py-3">{row.size || '-'}</td>
                                                    <td className="px-4 py-3">{row.type_product_display || row.type_product || '-'}</td>
                                                    <td className="px-4 py-3">{row.renewal_months ?? '-'}</td>
                                                    <td className="px-4 py-3">{formatDate(itemDetailData.issued_at)}</td>
                                                    <td className="px-4 py-3">{calculateNextIssueDate(itemDetailData.issued_at, row.renewal_months)}</td>
                                                    <td className="px-4 py-3 text-slate-400">-</td>
                                                    <td className="px-4 py-3 text-slate-400">-</td>
                                                    <td className="px-4 py-3 text-slate-400">-</td>
                                                    <td className="px-4 py-3 text-slate-400">-</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : itemDetailData?.ppeproduct && itemDetailData.ppeproduct.length > 0 ? (
                            <div className="rounded-md border border-stroke dark:border-strokedark overflow-hidden">
                                <div className="px-4 py-2 border-b border-stroke dark:border-strokedark bg-slate-50 dark:bg-boxdark-2 text-sm font-medium">
                                    Последняя выдача
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        {tableHeader}
                                        <tbody>
                                            {itemDetailData.ppeproduct.map((row, index) => (
                                                <tr key={index} className={`border-b border-stroke dark:border-strokedark ${index % 2 === 0 ? 'bg-white dark:bg-boxdark' : 'bg-slate-50/40 dark:bg-boxdark-2'}`}>
                                                    <td className="px-4 py-3">{index + 1}</td>
                                                    <td className="px-4 py-3">
                                                        {typeof row === 'number' ? `ID: ${row}` : row.name || `ID: ${row.id}`}
                                                    </td>
                                                    <td className="px-4 py-3">-</td>
                                                    <td className="px-4 py-3">-</td>
                                                    <td className="px-4 py-3">-</td>
                                                    <td className="px-4 py-3">{formatDate(itemDetailData.issued_at)}</td>
                                                    <td className="px-4 py-3">-</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-stroke dark:border-strokedark px-4 py-8 text-center text-gray-500">
                                СИЗ (средства индивидуальной защиты) ещё не выданы.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {historyModalOpen ? (
                <div className="fixed inset-0 z-99999 flex items-stretch justify-center bg-black/50 px-4 py-0">
                    <div className="flex h-[70vh] w-[80vw] max-w-[80vw] flex-col rounded-md bg-white shadow-2xl dark:bg-boxdark">
                        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
                            <div>
                                <h3 className="text-lg font-semibold text-black dark:text-white">Добавить историю</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                    Выберите СИЗ и укажите дату выдачи для каждого продукта.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={resetHistoryForm}
                                className="rounded border border-stroke px-3 py-2 text-sm hover:bg-slate-50 dark:border-strokedark dark:hover:bg-boxdark-2"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto px-5 py-4">
                            <div>
                                <div className="mb-2 text-sm font-medium text-black dark:text-white">Средства защиты</div>
                                {historyCatalogProducts.length > 0 ? (
                                    <div className="grid max-h-100 grid-cols-1 gap-3 overflow-y-auto rounded border border-stroke p-3 dark:border-strokedark md:grid-cols-2">
                                        {historyCatalogProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className="rounded border border-stroke px-3 py-3 hover:bg-slate-50 dark:border-strokedark dark:hover:bg-boxdark-2"
                                            >
                                                <label className="flex cursor-pointer items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={historyProductIds.includes(product.id)}
                                                        onChange={() => toggleHistoryProduct(product.id)}
                                                        className="mt-1"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-200">
                                                        <span className="block font-medium text-black dark:text-white">{product.name || '-'}</span>
                                                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                                                            {product.type_product_display || product.type_product || '—'}
                                                            {product.renewal_months ? ` • ${product.renewal_months} мес.` : ''}
                                                        </span>
                                                    </span>
                                                </label>
                                                <div className="mt-3">
                                                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Дата выдачи</label>
                                                    <input
                                                        type="text"
                                                        value={historyProductDates[product.id] || ''}
                                                        onChange={(event) => setHistoryProductDate(product.id, normalizeDateInputValue(event.target.value))}
                                                        disabled={!historyProductIds.includes(product.id)}
                                                        placeholder="dd/mm/yyyy"
                                                        inputMode="numeric"
                                                        className="w-full rounded border border-stroke px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-strokedark dark:bg-boxdark-2 dark:disabled:bg-slate-800"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded border border-dashed border-stroke px-3 py-4 text-sm text-slate-500 dark:border-strokedark dark:text-slate-300">
                                        Для сотрудника нет доступных СИЗ.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto flex shrink-0 justify-end gap-3 border-t border-stroke px-5 py-4 dark:border-strokedark">
                            <button
                                type="button"
                                onClick={resetHistoryForm}
                                className="rounded border border-stroke px-4 py-2 text-sm hover:bg-slate-50 dark:border-strokedark dark:hover:bg-boxdark-2"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateHistory}
                                disabled={historySaving || historyCatalogProducts.length === 0}
                                className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {historySaving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {previewImage ? (
                <div
                    className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            closePreviewModal();
                        }
                    }}
                >
                    <div className="w-full max-w-xl rounded-md bg-white p-4 shadow-xl dark:bg-boxdark">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Подтвержденное подписание</h3>
                            <button
                                type="button"
                                onClick={closePreviewModal}
                                className="flex h-6 w-6 items-center justify-center rounded border text-sm leading-none hover:bg-slate-50 dark:hover:bg-boxdark-2"
                                aria-label="Close preview"
                            >
                                ×
                            </button>
                        </div>

                        <div className="rounded border p-2">
                            <img
                                src={previewImage.imageUrl}
                                alt="preview_issue_photo"
                                className="max-h-[70vh] w-full rounded object-contain"
                            />
                        </div>

                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            Проверено: {formatDate(previewImage.issuedAt)}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
