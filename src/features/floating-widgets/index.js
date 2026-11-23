export { FloatingWidgetProvider } from './FloatingWidgetContext.jsx';
export { useOptionalFloatingWidgets } from './floatingWidgetState.js';
export { default as DraggableFloatingDock } from './DraggableFloatingDock.jsx';
export {
  clampWidgetPosition,
  computeDefaultPositions,
  computeFloatingPanelPlacement,
  DRAG_THRESHOLD_PX,
  EDGE_MARGIN_PX,
  FLOATING_WIDGET_STORAGE_KEY,
  readPersistedPositions,
  rectsOverlapWithGap,
  resolveWidgetCollision,
  WIDGET_GAP_PX,
  writePersistedPositions,
} from './floatingWidgetMath.js';
