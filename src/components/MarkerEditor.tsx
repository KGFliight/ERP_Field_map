import { useState, useEffect } from 'react';
import { useMarkerStore } from '@/stores/markerStore';
import type { MarkerIconType } from '@/types';

const ICON_OPTIONS: { value: MarkerIconType; label: string }[] = [
  { value: 'pin', label: 'Pin' },
  { value: 'flag', label: 'Flag' },
  { value: 'star', label: 'Star' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'camp', label: 'Camp' },
  { value: 'water', label: 'Water' },
  { value: 'vehicle', label: 'Vehicle' },
];

const COLOR_OPTIONS = [
  '#22d3ee', // cyan
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#3b82f6', // blue
  '#ec4899', // pink
  '#ffffff', // white
];

function IconButton({
  icon,
  isSelected,
  color,
  onClick,
}: {
  icon: MarkerIconType;
  isSelected: boolean;
  color: string;
  onClick: () => void;
}) {
  const iconPaths: Record<string, string> = {
    pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    flag: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
    star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    camp: 'M5 12h14M5 12l-2 8h18l-2-8M5 12l7-8 7 8',
    water: 'M12 22c4.97 0 9-3.582 9-8 0-4.418-9-14-9-14S3 9.582 3 14c0 4.418 4.03 8 9 8z',
    vehicle: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
  };

  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all
        ${isSelected ? 'ring-2 ring-white scale-110' : 'hover:bg-white/10'}`}
      style={{ backgroundColor: isSelected ? `${color}30` : undefined }}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke={isSelected ? color : '#9ca3af'}
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[icon]} />
      </svg>
    </button>
  );
}

export function MarkerEditor() {
  const { editingMarker, setEditingMarker, updateMarker, deleteMarker } = useMarkerStore();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [icon, setIcon] = useState<MarkerIconType>('pin');
  const [color, setColor] = useState('#22d3ee');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form when editing marker changes
  useEffect(() => {
    if (editingMarker) {
      setName(editingMarker.name);
      setNotes(editingMarker.notes);
      setIcon(editingMarker.icon);
      setColor(editingMarker.color);
      setShowDeleteConfirm(false);
    }
  }, [editingMarker]);

  if (!editingMarker) return null;

  const handleSave = async () => {
    await updateMarker(editingMarker.id, {
      name: name.trim() || 'Untitled Pin',
      notes: notes.trim(),
      icon,
      color,
    });
    setEditingMarker(null);
  };

  const handleDelete = async () => {
    await deleteMarker(editingMarker.id);
    setEditingMarker(null);
  };

  const handleClose = () => {
    setEditingMarker(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-field-darker rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Edit Marker</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-white/70 text-sm mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marker name"
              className="w-full px-3 py-2 bg-white/5 rounded-lg text-white placeholder-white/40
                       focus:outline-none focus:ring-2 focus:ring-field-accent/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white/70 text-sm mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 rounded-lg text-white placeholder-white/40
                       focus:outline-none focus:ring-2 focus:ring-field-accent/50 resize-none"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-white/70 text-sm mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => (
                <IconButton
                  key={opt.value}
                  icon={opt.value}
                  isSelected={icon === opt.value}
                  color={color}
                  onClick={() => setIcon(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-white/70 text-sm mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all
                    ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-field-darker scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Coordinates (readonly) */}
          <div>
            <label className="block text-white/70 text-sm mb-1">Coordinates</label>
            <div className="text-white/50 text-sm font-mono">
              {editingMarker.latitude.toFixed(6)}, {editingMarker.longitude.toFixed(6)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 space-y-3">
          {showDeleteConfirm ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-medium
                         hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 px-4 rounded-xl bg-field-danger text-white font-semibold
                         hover:bg-field-danger/90 transition-colors"
              >
                Delete
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-3 px-4 rounded-xl bg-white/10 text-field-danger font-medium
                           hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 px-4 rounded-xl bg-field-accent text-field-darker font-semibold
                           hover:bg-field-accent/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
