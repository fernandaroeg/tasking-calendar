import React, { useState, useEffect } from 'react';
import { PenTool, Plus, Search, Trash2, Save, FileText, Check } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import type { Note, UserProfile } from '../../specs/001-project-task-calendar/contracts/firebase-service';
import RichTextEditor from './RichTextEditor';

interface UserNotesProps {
  currentUserProfile: UserProfile;
}

const formatDisplayDateTime = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
};

const UserNotes: React.FC<UserNotesProps> = ({ currentUserProfile }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected note state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Subscribe to user notes from Firestore
  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToUserNotes(currentUserProfile.uid, (loadedNotes) => {
      setNotes(loadedNotes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserProfile.uid]);

  // 2. Sync editor fields when selectedNoteId or notes change
  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;
  useEffect(() => {
    if (selectedNote) {
      setEditorTitle(selectedNote.title);
      setEditorContent(selectedNote.content);
    } else {
      setEditorTitle('');
      setEditorContent('');
    }
  }, [selectedNoteId, selectedNote]);

  // 3. Filter notes based on search query
  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 4. Create new note
  const handleCreateNote = async () => {
    try {
      const newNoteId = await firebaseService.saveUserNote({
        userId: currentUserProfile.uid,
        title: 'Nueva Nota',
        content: ''
      });
      setSelectedNoteId(newNoteId);
    } catch (err) {
      console.error("Error creating note:", err);
    }
  };

  // 5. Save note
  const handleSaveNote = async () => {
    if (!selectedNoteId) return;
    setSaving(true);
    try {
      await firebaseService.saveUserNote({
        id: selectedNoteId,
        userId: currentUserProfile.uid,
        title: editorTitle,
        content: editorContent
      });
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setSaving(false);
    }
  };

  // 6. Delete note
  const handleDeleteNote = async () => {
    if (!selectedNoteId) return;
    if (window.confirm("¿Estás seguro de que deseas eliminar esta nota?")) {
      try {
        await firebaseService.deleteUserNote(selectedNoteId);
        setSelectedNoteId(null);
      } catch (err) {
        console.error("Error deleting note:", err);
      }
    }
  };

  // Check if note has unsaved changes
  const isDirty = selectedNote && (selectedNote.title !== editorTitle || selectedNote.content !== editorContent);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--muted-foreground)' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid hsl(var(--border))', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
        <p style={{ fontWeight: 600 }}>Cargando notas...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel notes-layout-container" style={{ display: 'flex', height: '600px', overflow: 'hidden', padding: 0 }}>
      {/* Sidebar Panel: Notes List (30% width) */}
      <div className="notes-sidebar" style={{ width: '30%', borderRight: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateNote}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <Plus size={18} />
            Nueva Nota
          </button>
          
          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', color: 'hsl(var(--muted-foreground))' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Scrollable Notes List */}
        <div className="notes-list-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', opacity: 0.6, textAlign: 'center' }}>
              <FileText size={32} style={{ marginBottom: '0.5rem', color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sin notas</span>
            </div>
          ) : (
            filteredNotes.map(note => {
              const isActive = note.id === selectedNoteId;
              const textPreview = note.content
                ? note.content.replace(/<[^>]*>/g, '').substring(0, 60) // Remove simple HTML tags for preview
                : 'Sin contenido';
              
              return (
                <div
                  key={note.id}
                  className={`note-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedNoteId(note.id)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid hsl(var(--border) / 0.5)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(255, 106, 82, 0.08)' : 'transparent',
                    borderLeft: '4px solid',
                    borderLeftColor: isActive ? 'hsl(var(--primary))' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? 'hsl(var(--primary))' : 'var(--text-h)' }}>
                      {note.title || 'Nota sin título'}
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.5rem' }}>
                    {textPreview}
                  </p>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', opacity: 0.8 }}>
                    {formatDisplayDateTime(note.updatedAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Panel (70% width) */}
      <div className="notes-editor-panel" style={{ width: '70%', display: 'flex', flexDirection: 'column', height: '100%', background: 'hsl(var(--card))' }}>
        {selectedNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Toolbar */}
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Saving status indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                {saving ? (
                  <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>Guardando...</span>
                ) : isDirty ? (
                  <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>Cambios sin guardar</span>
                ) : (
                  <span style={{ color: '#0d9668', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Check size={14} />
                    Guardado
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDeleteNote}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveNote}
                  disabled={saving || !isDirty}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 1rem' }}
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Note Fields */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <input
                type="text"
                placeholder="Título de la nota..."
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--text-h)',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid hsl(var(--border) / 0.5)'
                }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <RichTextEditor
                  id="note-content"
                  value={editorContent}
                  onChange={setEditorContent}
                  style={{ flex: 1, border: 'none', borderRadius: 0 }}
                  textareaStyle={{ flex: 1, borderTop: 'none', background: 'transparent', padding: '0.5rem 0' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.5, color: 'var(--muted-foreground)', gap: '1rem' }}>
            <PenTool size={64} />
            <h3 style={{ margin: 0, fontWeight: 700 }}>Bloc de Notas Personal</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '300px', textAlign: 'center' }}>
              Selecciona una nota de la lista izquierda para editarla, o haz clic en "Nueva Nota" para crear una.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserNotes;
