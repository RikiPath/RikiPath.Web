import { createContext, useContext } from 'react';

export const FloatingWidgetContext = createContext(null);

export function useOptionalFloatingWidgets() {
  return useContext(FloatingWidgetContext);
}
