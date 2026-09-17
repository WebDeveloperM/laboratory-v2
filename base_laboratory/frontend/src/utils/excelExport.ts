import { Compyuter } from '../types/compyuters';
import * as XLSX from 'xlsx-js-style';

export const exportToExcel = (data: Compyuter[], filename: string = 'computers') => {
  if (!data || data.length === 0) {
    throw new Error('Нет данных для экспорта');
  }

  const formatProductCell = (product: any) => {
    const name = String(product?.name || '').trim();
    const size = String(product?.size || '').trim();
    if (!name) return '';
    return size ? `${name} (${size})` : name;
  };

  const formatDate = (value: unknown) => {
    if (!value) return '—';
    const parsed = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return String(value);
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const buildIssueCells = (item: any) => {
    const issueHistory = Array.isArray(item?.issue_history) ? item.issue_history : [];

    if (issueHistory.length > 0) {
      const orderedIssues = [...issueHistory].reverse();
      return orderedIssues.map((issue: any) => {
        const products = Array.isArray(issue?.ppeproduct_info) ? issue.ppeproduct_info : [];
        const productText = products
          .map((product: any) => formatProductCell(product))
          .filter(Boolean)
          .join(', ');

        const issueDate = issue?.issued_at ? formatDate(issue.issued_at) : '';
        if (!issueDate) return productText;
        if (!productText) return issueDate;
        return `${issueDate} — ${productText}`;
      });
    }

    const currentProducts = Array.isArray(item?.ppeproduct_info) ? item.ppeproduct_info : [];
    const currentIssueText = currentProducts
      .map((product: any) => formatProductCell(product))
      .filter(Boolean)
      .join(', ');

    const currentIssueDate = item?.issued_at ? formatDate(item.issued_at) : '';
    const currentIssueCell = currentIssueDate
      ? (currentIssueText ? `${currentIssueDate} — ${currentIssueText}` : currentIssueDate)
      : currentIssueText;

    return currentIssueCell ? [currentIssueCell] : [];
  };

  const maxIssueCount = data.reduce((max, item) => {
    const issueCells = buildIssueCells(item as any).filter(Boolean);
    return Math.max(max, issueCells.length);
  }, 0);

  const baseHeaders = [
    '№',
    'Фамилия',
    'Имя',
    'Отчество',
    'Табельный номер',
    'Должность',
    'Цех',
    'Отдел',
    'Руководитель цеха',
    'Рост',
    'Размер одежды',
    'Размер обуви',
    'Дата приема на работу',
    'Дата последнего изменения должности',
    'Выдал',
    'Дата выдачи',
  ];

  const issueHeaders = Array.from({length: maxIssueCount}, (_, idx) => `Выдача #${idx + 1}`);
  const headers = [...baseHeaders, ...issueHeaders];

  const excelRows = data.map((item, index) => {
    const issues = buildIssueCells(item as any).filter(Boolean);

    const paddedProducts = [
      ...issues,
      ...Array.from({length: Math.max(0, maxIssueCount - issues.length)}, () => ''),
    ];

    return [
      index + 1,
      (item as any)?.employee?.last_name || '',
      (item as any)?.employee?.first_name || '',
      (item as any)?.employee?.surname || '',
      (item as any)?.employee?.tabel_number || '',
      (item as any)?.employee?.position || '',
      (item as any)?.employee?.department?.name || '',
      (item as any)?.employee?.section?.name || '',
      (item as any)?.employee?.department?.boss_fullName || '',
      (item as any)?.employee?.height || '',
      (item as any)?.employee?.clothe_size || '',
      (item as any)?.employee?.shoe_size || '',
      formatDate((item as any)?.employee?.date_of_employment),
      formatDate((item as any)?.employee?.date_of_change_position),
      (item as any)?.issued_by_info?.full_name || (item as any)?.issued_by_info?.username || '',
      formatDate((item as any)?.issued_at),
      ...paddedProducts,
    ];
  });

  try {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelRows]);

    const baseCols = [
      { wch: 5 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 30 },
      { wch: 24 },
      { wch: 20 },
      { wch: 28 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
    ];

    const issueCols = Array.from({length: maxIssueCount}, () => ({wch: 24}));
    worksheet['!cols'] = [...baseCols, ...issueCols];

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const fullFilename = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fullFilename);

  } catch (error) {
    console.error('Ошибка при создании Excel файла:', error);
    throw new Error('Не удалось создать файл для экспорта');
  }
};
