import { useTrainingStore } from '@/stores/trainingStore';

const COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#ffffff', label: 'White' },
];

export function DrawingTools() {
  const {
    isDrawingMode,
    setDrawingMode,
    isDeleteMode,
    setDeleteMode,
    drawingStrokes,
    selectedStrokeId,
    currentDrawingColor,
    setDrawingColor,
    undoLastStroke,
    deleteStroke,
    clearAllDrawings,
  } = useTrainingStore();

  const handleDeleteClick = () => {
    if (isDeleteMode && selectedStrokeId) {
      deleteStroke(selectedStrokeId);
    } else {
      setDeleteMode(!isDeleteMode);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drawing controls row */}
      <div className="flex items-center gap-2">
        {/* Pencil toggle */}
        <button
          onClick={() => setDrawingMode(!isDrawingMode)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all touch-manipulation active:scale-95 ${
            isDrawingMode
              ? 'bg-amber-500 text-amber-950'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm font-medium">Draw</span>
        </button>

        {/* Undo button */}
        <button
          onClick={undoLastStroke}
          disabled={drawingStrokes.length === 0}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors 
                     touch-manipulation active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo last stroke"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          disabled={drawingStrokes.length === 0}
          className={`p-2 rounded-lg transition-colors touch-manipulation active:scale-95 
                     disabled:opacity-30 disabled:cursor-not-allowed ${
            isDeleteMode
              ? 'bg-red-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isDeleteMode ? (selectedStrokeId ? 'Delete selected' : 'Tap a line to select') : 'Delete mode'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* Clear all */}
        <button
          onClick={clearAllDrawings}
          disabled={drawingStrokes.length === 0}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors 
                     touch-manipulation active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear all drawings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setDrawingColor(color.value)}
              className={`w-7 h-7 rounded-full transition-all touch-manipulation ${
                currentDrawingColor === color.value
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-field-darker scale-110'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Status indicators */}
      {isDrawingMode && (
        <div className="text-center py-1.5 px-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
          <span className="text-amber-300 text-sm">
            Draw on the map with your finger or mouse
          </span>
        </div>
      )}

      {isDeleteMode && (
        <div className="text-center py-1.5 px-3 bg-red-500/20 rounded-lg border border-red-500/30">
          <span className="text-red-300 text-sm">
            {selectedStrokeId 
              ? 'Tap delete again to remove the selected line' 
              : 'Tap on a line to select it for deletion'}
          </span>
        </div>
      )}
    </div>
  );
}
