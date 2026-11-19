import { createContext, useContext } from 'react';
import { studyFeatureInfo } from '@/app/guards/studyPlanGate.js';

/** Tooltip / aria reason shown on self-study locked destinations (VI key; JA in locales/ja/learnerScreens.js). */
export const LOCK_REASON = 'Cần gói tự học để mở khóa tính năng này.';

/** Shell-wide unlock controller ({ access, requestUnlock }), provided by StudyUnlockProvider. */
export const UnlockContext = createContext(null);

export function useStudyUnlock() {
  return useContext(UnlockContext);
}

export function plansLinkState(path, featureLabel) {
  return { from: { pathname: path }, requiredFeatureLabel: featureLabel };
}

/** Feature copy for a destination: catalog entry for gated routes, falling back to the nav label. */
export function unlockInfoFor(to, fallbackLabel) {
  const path = String(to || '').split('?')[0];
  const info = studyFeatureInfo(path);
  const generic = info.featureLabel === 'Nội dung tự học';
  return {
    path,
    featureLabel: generic && fallbackLabel ? fallbackLabel : info.featureLabel,
    description: info.description,
  };
}
