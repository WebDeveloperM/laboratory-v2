import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
// @ts-ignore
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

export interface ExcelEditorHandle {
  getData: () => string[][];
  setData: (data: string[][]) => void;
}

export interface ExcelColumn {
  title: string;
  width?: number;
  readOnly?: boolean;
  type?: 'text' | 'numeric' | 'checkbox' | 'dropdown';
  source?: string[];
  wordWrap?: boolean;
}

interface Props {
  columns: ExcelColumn[];
  data: string[][];
  height?: number;
  minSpareRows?: number;
  onChange?: (data: string[][]) => void;
  /** Return a CSS style string for a cell (e.g. 'background-color:#dc2626;color:#fff;') to
   *  highlight it, or a falsy value to leave/clear it. Re-evaluated on every change. */
  getCellStyle?: (rowData: string[], rowIndex: number, colIndex: number) => string | undefined | null;
}

// Column index -> spreadsheet letter (0 -> 'A', 1 -> 'B', ..., 25 -> 'Z', 26 -> 'AA', ...)
const columnLetter = (colIndex: number): string => {
  let n = colIndex + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - rem) / 26);
  }
  return name;
};
const cellRef = (colIndex: number, rowIndex: number): string => `${columnLetter(colIndex)}${rowIndex + 1}`;

const ExcelEditor = forwardRef<ExcelEditorHandle, Props>(
  ({ columns, data, height = 400, minSpareRows = 1, onChange, getCellStyle }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);
    const getCellStyleRef = useRef(getCellStyle);
    getCellStyleRef.current = getCellStyle;

    const applyCellStyles = (rows: string[][]) => {
      const fn = getCellStyleRef.current;
      if (!fn || !instanceRef.current) return;
      try {
        const styleMap: Record<string, string> = {};
        rows.forEach((rowData, rowIndex) => {
          columns.forEach((_, colIndex) => {
            styleMap[cellRef(colIndex, rowIndex)] = fn(rowData, rowIndex, colIndex) || '';
          });
        });
        instanceRef.current.setStyle(styleMap, null, null, true);
      } catch (err) {
        console.error('ExcelEditor: failed to apply cell styles', err);
      }
    };

    useEffect(() => {
      if (!containerRef.current) return;

      const initData = data.length > 0
        ? data
        : [Array(columns.length).fill('')];

      instanceRef.current = jspreadsheet(containerRef.current, {
        data: initData,
        columns,
        minSpareRows,
        tableOverflow: true,
        tableHeight: `${height}px`,
        columnSorting: false,
        allowInsertColumn: false,
        allowDeleteColumn: false,
        onchange: () => {
          if (!instanceRef.current) return;
          const newData = instanceRef.current.getData();
          applyCellStyles(newData);
          if (onChange) onChange(newData);
        },
        ondeleterow: () => {
          if (!instanceRef.current) return;
          const newData = instanceRef.current.getData();
          applyCellStyles(newData);
          if (onChange) onChange(newData);
        },
      });

      applyCellStyles(initData);

      return () => {
        if (instanceRef.current) {
          // jspreadsheet destroy
          try { instanceRef.current.destroy(containerRef.current, true); } catch (_) {}
          instanceRef.current = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      getData: () => instanceRef.current?.getData() ?? [],
      setData: (newData: string[][]) => {
        if (instanceRef.current) instanceRef.current.setData(newData);
      },
    }));

    return (
      <div style={{ border: '1px solid #d0d5dd', borderRadius: 4, overflow: 'hidden' }}>
        <div ref={containerRef} />
      </div>
    );
  }
);

ExcelEditor.displayName = 'ExcelEditor';
export default ExcelEditor;
