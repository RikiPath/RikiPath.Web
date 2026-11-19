import { createContext, useContext } from 'react';

/** Session context; the value is provided by <AuthProvider> (AuthContext.jsx). */
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
