import { useRef, useEffect, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
// @ts-ignore
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import './styles.css';

interface Props {
  value: string;
  onChange: (content: string) => void;
  editorKey?: number;
  height?: number;
}

const EDITOR_CONFIG = {
  toolbar: {
    items: [
      'undo', 'redo',
      '|', 'heading',
      '|', 'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor',
      '|', 'bold', 'italic', 'underline', 'strikethrough',
      '|', 'subscript', 'superscript',
      '|', 'alignment',
      '|', 'bulletedList', 'numberedList', 'outdent', 'indent',
      '|', 'link', 'insertTable', 'imageUpload',
      '|', 'horizontalLine', 'pageBreak',
    ],
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties'],
  },
  language: 'ru',
};

export default function DocumentEditor({ value, onChange, editorKey, height = 700 }: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // When editorKey changes — update editor content
  useEffect(() => {
    if (editorInstanceRef.current && isReady) {
      const current = editorInstanceRef.current.getData();
      if (current !== value) {
        editorInstanceRef.current.setData(value);
      }
    }
  }, [editorKey]);

  return (
    <div className="doc-editor-wrap">
      {/* Toolbar */}
      <div ref={toolbarRef} className="doc-editor-toolbar" />

      {/* Page area */}
      <div className="doc-editor-container" style={{ minHeight: height }}>
        <CKEditor
          editor={DecoupledEditor}
          data={value}
          config={EDITOR_CONFIG}
          onReady={(editor: any) => {
            editorInstanceRef.current = editor;
            setIsReady(true);

            // Mount toolbar
            if (toolbarRef.current) {
              toolbarRef.current.innerHTML = '';
              toolbarRef.current.appendChild(editor.ui.view.toolbar.element);
            }

            // Style the editable (A4 page)
            const el: HTMLElement | undefined = editor.ui.view.editable?.element;
            if (el) {
              el.style.background = '#ffffff';
              el.style.maxWidth = '794px';
              el.style.minHeight = '1123px';
              el.style.margin = '0 auto';
              el.style.padding = '72px 90px';
              el.style.boxShadow = '0 3px 16px rgba(0,0,0,0.45)';
              el.style.fontFamily = "'Times New Roman', Times, serif";
              el.style.fontSize = '12pt';
              el.style.lineHeight = '1.5';
              el.style.color = '#000';
              el.style.outline = 'none';
              el.style.border = 'none';
              el.style.borderRadius = '0';
            }
          }}
          onChange={(_: any, editor: any) => {
            onChange(editor.getData());
          }}
        />
      </div>
    </div>
  );
}
