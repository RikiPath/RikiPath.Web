import {
  GraduationCap,
  Layers,
  Mic,
  PenLine,
  Route,
  Ticket,
  TicketCheck,
} from 'lucide-react';

/**
 * Single source of truth for study plan category & AI credit icons across Plans,
 * Modals (Active Subscriptions, Purchase History, Benefits, Checkout), and Admin Plan Groups.
 *
 * Semantic mapping:
 * - Functional product icons: GraduationCap (Self-study), Mic (Speaking), PenLine (Writing),
 *   Route (Learning Path), Layers (Combo).
 * - AI Credit / quota icons: Ticket (available / purchasable AI credits), TicketCheck (granted / credited).
 */
export const AI_CREDIT_ICON = Ticket;
export const AI_CREDIT_GRANTED_ICON = TicketCheck;

export const PLAN_GROUP_ICONS = {
  study: GraduationCap,
  speaking: Mic,
  writing: PenLine,
  credit: Ticket,
  path: Route,
  combo: Layers,
};

export const PLAN_KIND_ICONS = {
  self_study: GraduationCap,
  speaking: Mic,
  writing: PenLine,
  ai_grading: Ticket,
  learning_path: Route,
  combo: Layers,
};

export function resolvePlanGroupIcon(iconKey) {
  return PLAN_GROUP_ICONS[iconKey] ?? Ticket;
}

export function resolvePlanKindIcon(kind) {
  const normalized = String(kind || '').trim().toLowerCase();
  return PLAN_KIND_ICONS[normalized] ?? GraduationCap;
}
