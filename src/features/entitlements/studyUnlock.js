import { createContext, useContext } from 'react';
import { studyFeatureInfo } from '@/app/guards/studyPlanGate.js';
import { LOCK_REASON_PLAN } from './featureAccess.js';

/** Default tooltip / aria reason for self-study locked destinations (VI key; JA in locales/ja/learnerScreens.js). */
export const LOCK_REASON = LOCK_REASON_PLAN;

/** Shell-wide unlock controller ({ access, requestUnlock }), provided by StudyUnlockProvider. */
export const UnlockContext = createContext(null);

export function useStudyUnlock() {
  return useContext(UnlockContext);
}

export function plansLinkState(path, featureLabel) {
  return { from: { pathname: path }, requiredFeatureLabel: featureLabel };
}

/**
 * Feature copy for a destination. The label the learner clicked (sidebar / shortcut) wins so the dialog says
 * "Mở khóa Nghe hiểu" for the "Nghe hiểu" item; the route catalog only fills in when no label was given
 * (direct-URL gate).
 */
export function unlockInfoFor(to, fallbackLabel) {
  const path = String(to || '').split('?')[0];
  const info = studyFeatureInfo(path);
  return {
    path,
    featureLabel: fallbackLabel || info.featureLabel,
    description: info.description,
  };
}
