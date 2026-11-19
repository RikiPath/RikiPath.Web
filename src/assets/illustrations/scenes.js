export const SCENE_PALETTES = {
  dawn: { sky: ['#FFE9E3', '#FFD6DF', '#F7F0FF'], sun: '#FFC9A8', fuji: '#9C8DB4', fujiShade: '#8476A0', hillFar: '#C9B9D8', hillNear: '#B49BC8', lake: '#F4E4F0', petal: '#F8A8BB', text: 'dark' },
  day: { sky: ['#DDEEFF', '#EFF6FF', '#FFF4F6'], sun: '#FFF3C4', fuji: '#7D97C4', fujiShade: '#6B84B0', hillFar: '#B8D3C7', hillNear: '#8FB9A6', lake: '#E6F1FA', petal: '#F7A1B6', text: 'dark' },
  dusk: { sky: ['#FFD3C2', '#F6A9BC', '#B79AD0'], sun: '#FFE0A6', fuji: '#7C5E8F', fujiShade: '#694D7C', hillFar: '#A57CA0', hillNear: '#8A5F86', lake: '#F2C9D3', petal: '#FFC2D1', text: 'light' },
  night: { sky: ['#1E1B3A', '#2E2A55', '#4A3F72'], sun: '#FFF6DA', fuji: '#3D3866', fujiShade: '#322D58', hillFar: '#2B2750', hillNear: '#221F42', lake: '#3A3563', petal: '#F7B6C8', text: 'light' },
};

export function sceneForHour(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

