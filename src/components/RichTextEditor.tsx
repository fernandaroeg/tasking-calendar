import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  textareaStyle?: React.CSSProperties;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, id, disabled = false, style, textareaStyle }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isEditing = useRef(false);

  // Sync value from prop to contentEditable div
  useEffect(() => {
    if (editorRef.current && !isEditing.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isEditing.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleBlur = () => {
    isEditing.current = false;
  };

  const format = (command: string, val: string = '') => {
    if (disabled) return;
    document.execCommand(command, false, val);
    handleInput();
  };

  const handleBold = () => format('bold');
  const handleItalic = () => format('italic');
  const handleUnderline = () => format('underline');
  const handleStrikethrough = () => format('strikeThrough');
  const handleList = () => format('insertUnorderedList');

  return (
    <div className="rich-text-editor-container" style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {!disabled && (
        <div className="rich-text-toolbar" style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem', alignItems: 'center' }}>
          <button 
            type="button" 
            className="rich-text-btn" 
            onMouseDown={(e) => { e.preventDefault(); handleBold(); }}
            title="Negrita"
            style={{ fontWeight: 700 }}
          >
            B
          </button>
          <button 
            type="button" 
            className="rich-text-btn" 
            onMouseDown={(e) => { e.preventDefault(); handleItalic(); }}
            title="Itálica"
            style={{ fontStyle: 'italic' }}
          >
            I
          </button>
          <button 
            type="button" 
            className="rich-text-btn" 
            onMouseDown={(e) => { e.preventDefault(); handleUnderline(); }}
            title="Subrayado"
            style={{ textDecoration: 'underline' }}
          >
            U
          </button>
          <button 
            type="button" 
            className="rich-text-btn" 
            onMouseDown={(e) => { e.preventDefault(); handleStrikethrough(); }}
            title="Tachado"
            style={{ textDecoration: 'line-through' }}
          >
            S
          </button>
          <button 
            type="button" 
            className="rich-text-btn" 
            onMouseDown={(e) => { e.preventDefault(); handleList(); }}
            title="Lista de viñetas"
          >
            • Lista
          </button>
        </div>
      )}

      <div
        id={id}
        ref={editorRef}
        contentEditable={!disabled}
        className="rich-text-textarea"
        style={{ 
          minHeight: '120px', 
          overflowY: 'auto', 
          background: disabled ? 'rgba(28, 28, 28, 0.03)' : '#ffffff',
          padding: '1rem',
          lineHeight: 1.5,
          color: 'hsl(var(--text))',
          outline: 'none',
          borderTop: disabled ? '1px solid hsl(var(--border))' : 'none',
          borderRadius: disabled ? '8px' : '0',
          ...textareaStyle
        }}
        onInput={handleInput}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default RichTextEditor;
