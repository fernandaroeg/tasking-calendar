import React, { useRef, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, id }) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (tagOpen: string, tagClose: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = tagOpen + selectedText + tagClose;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    // Reposition cursor after the inserted tags
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selectedText.length);
    }, 0);
  };

  const handleBold = () => insertTag('<strong>', '</strong>');
  const handleItalic = () => insertTag('<em>', '</em>');
  const handleHeading = () => insertTag('<h3>', '</h3>');
  const handleList = () => insertTag('<ul>\n  <li>', '</li>\n</ul>');

  return (
    <div className="rich-text-editor-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="rich-text-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            type="button" 
            className="rich-text-btn" 
            onClick={handleBold} 
            disabled={mode === 'preview'}
            title="Negrita"
          >
            <strong>B</strong>
          </button>
          <button 
            type="button" 
            className="rich-text-btn" 
            onClick={handleItalic} 
            disabled={mode === 'preview'}
            title="Itálica"
          >
            <em>I</em>
          </button>
          <button 
            type="button" 
            className="rich-text-btn" 
            onClick={handleHeading} 
            disabled={mode === 'preview'}
            title="Encabezado"
          >
            H3
          </button>
          <button 
            type="button" 
            className="rich-text-btn" 
            onClick={handleList} 
            disabled={mode === 'preview'}
            title="Lista de viñetas"
          >
            • Lista
          </button>
        </div>

        {/* Edit / Preview Toggle Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', paddingRight: '0.25rem' }}>
          <button
            type="button"
            className="rich-text-btn"
            style={{ 
              fontWeight: mode === 'edit' ? 700 : 400,
              backgroundColor: mode === 'edit' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px'
            }}
            onClick={() => setMode('edit')}
          >
            Editar
          </button>
          <button
            type="button"
            className="rich-text-btn"
            style={{ 
              fontWeight: mode === 'preview' ? 700 : 400,
              backgroundColor: mode === 'preview' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px'
            }}
            onClick={() => setMode('preview')}
          >
            Vista Previa
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          id={id}
          ref={textareaRef}
          className="rich-text-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe la descripción de la tarea aquí (puedes usar la barra de herramientas para dar formato)..."
        />
      ) : (
        <div
          className="rich-text-textarea"
          style={{ 
            minHeight: '120px', 
            overflowY: 'auto', 
            background: 'transparent',
            padding: '1rem',
            lineHeight: 1.5,
            color: 'hsl(var(--text-h))'
          }}
          dangerouslySetInnerHTML={{ __html: value || '<p style="opacity: 0.5; font-style: italic;">Sin descripción.</p>' }}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
