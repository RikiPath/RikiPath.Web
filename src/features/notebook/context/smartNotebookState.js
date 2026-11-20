import { createContext, useContext } from 'react';

export const SmartNotebookContext = createContext(null);

export function useOptionalSmartNotebook() {
  return useContext(SmartNotebookContext);
}
