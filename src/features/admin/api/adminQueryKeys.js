import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

/**
 * Centralized React Query keys & cross-domain invalidation helper for Admin Control Center.
 * Keeps KPI counts, lists, schedules, qualifications, policies and cohorts synchronized across views.
 */
export const ADMIN_KEYS = {
  dashboard: ['admin-dashboard'],
  users: ['admin-users', 'all'],
  userDetail: (id) => ['admin-user-detail', Number(id)],
  mentors: ['admin-mentors', 'list'],
  mentorProfiles: ['admin-mentors'],
  mentorVerifications: ['admin-mentor-verifications'],
  mentorQualifications: ['admin-mentor-qualifications'],
  mentorKpis: ['admin-mentor-kpis'],
  pendingSlots: ['admin-pending-slots'],
  teachingProposals: ['admin-teaching-proposals'],
  mentorSlots: ['admin-mentor-slots'],
  mentorCalendar: ['admin-mentor-calendar'],
  mentorTemplates: ['admin-mentor-templates'],
  policyCurrent: ['admin-group-policy-current'],
  policyHistory: ['admin-group-policy-history'],
  policyForPlans: ['admin-group-policy-current-for-plans'],
  cohorts: ['admin-cohorts'],
  coursePlans: ['admin-course-plans-snapshot'],
  subscriptionPlans: ['admin-subscription-plans'],
  auditLogs: ['admin-plans-audit-logs'],
  contentApprovals: ['content-approvals'],
  studyCatalog: ['admin-study-catalog'],
  studyLevels: ['admin-study-catalog-levels'],
  certificateSections: ['certificate-sections'],
};

export function invalidateAdminDomains(queryClient, domains = []) {
  const keys = new Set();
  const add = (...list) => list.forEach((k) => keys.add(k));

  if (domains.includes('users')) {
    add(ADMIN_KEYS.users, ADMIN_KEYS.dashboard, ADMIN_KEYS.mentors, ADMIN_KEYS.mentorProfiles, ADMIN_KEYS.mentorQualifications);
  }
  if (domains.includes('mentors')) {
    add(ADMIN_KEYS.mentors, ADMIN_KEYS.mentorProfiles, ADMIN_KEYS.mentorVerifications, ADMIN_KEYS.mentorQualifications, ADMIN_KEYS.mentorKpis, ADMIN_KEYS.users, ADMIN_KEYS.dashboard);
  }
  if (domains.includes('schedules')) {
    add(ADMIN_KEYS.pendingSlots, ADMIN_KEYS.teachingProposals, ADMIN_KEYS.mentorSlots, ADMIN_KEYS.mentorCalendar, ADMIN_KEYS.dashboard);
  }
  if (domains.includes('policy')) {
    add(ADMIN_KEYS.policyCurrent, ADMIN_KEYS.policyHistory, ADMIN_KEYS.policyForPlans, ADMIN_KEYS.dashboard);
  }
  if (domains.includes('cohorts')) {
    add(ADMIN_KEYS.cohorts, ADMIN_KEYS.coursePlans, ADMIN_KEYS.dashboard);
  }
  if (domains.includes('plans')) {
    add(ADMIN_KEYS.subscriptionPlans, ADMIN_KEYS.coursePlans, ADMIN_KEYS.auditLogs, ['study-plans'], ADMIN_KEYS.dashboard);
  }
  if (domains.includes('content')) {
    add(ADMIN_KEYS.contentApprovals, ADMIN_KEYS.dashboard);
  }
  if (domains.includes('catalog')) {
    add(ADMIN_KEYS.studyCatalog, ADMIN_KEYS.studyLevels, ADMIN_KEYS.certificateSections, ['manual-content-lookups']);
  }

  return Promise.all([
    ...[...keys].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    invalidateSidebarCounters(queryClient),
  ]);
}
