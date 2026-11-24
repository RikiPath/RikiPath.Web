// One atmosphere for the whole shell: the AppShell calls `useAtmosphere()` once (sky header) and shares the SAME
// object with page content (Dynamic Ground Banner) through this context, so sky and ground read one clock, one
// place, one weather result, one season and one set of display preferences — never a second weather request or a
// device-clock guess.
import { createContext, useContext } from 'react';

export const AtmosphereContext = createContext(null);

/** The shell's shared atmosphere (`useAtmosphere()` result), or null outside an AppShell. */
export function useSharedAtmosphere() {
  return useContext(AtmosphereContext);
}
