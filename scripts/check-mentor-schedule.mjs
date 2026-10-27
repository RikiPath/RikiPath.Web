import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

globalThis.localStorage = globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { AuthContext } = await server.ssrLoadModule('/src/auth/AuthContext.jsx');
  const { monday, shiftDate, vietnamDate } = await server.ssrLoadModule('/src/utils/mentorSchedule.js');
  const week = monday(1);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const periods = [{ id: 81, mentorId: 2, mentorName: 'Test Mentor', date: week, period: 'Morning' }];
  client.setQueryData(['mentor-week', week], periods);
  client.setQueryData(['admin-mentor-week', week], periods);
  client.setQueryData(['schedule-mentor-directory'], [{ id: 2, name: 'Test Mentor' }]);
  client.setQueryData(['mentor-assigned-slots'], []);
  client.setQueryData(['admin-mentor-slots'], []);
  client.setQueryData(['learner-mentor-bookings'], []);
  client.setQueryData(['admin-mentor-plans'], []);
  const auth = { isAuthenticated: true, isMentor: true, isAdmin: false, isLearner: false,
    user: { userId: 2, fullName: 'Test Mentor' }, roles: ['Mentor'], primaryRole: 'Mentor',
    hasRole: r => r === 'Mentor', hasAnyRole: () => true, logout() {} };
  function render(Component, props = {}) {
    return renderToStaticMarkup(React.createElement(MemoryRouter, null,
      React.createElement(QueryClientProvider, { client }, React.createElement(AuthContext.Provider,
        { value: auth }, React.createElement(Component, props)))));
  }
  const { default: Mentor } = await server.ssrLoadModule('/src/pages/consultation/MentorAvailability.jsx');
  const { default: Admin } = await server.ssrLoadModule('/src/pages/admin/AdminMentorSchedules.jsx');
  const { default: Learner } = await server.ssrLoadModule('/src/pages/consultation/ConsultationCenter.jsx');
  const { default: Plans } = await server.ssrLoadModule('/src/pages/admin/AdminMentorPlans.jsx');
  const { default: Calendar } = await server.ssrLoadModule('/src/pages/admin/AdminMentorScheduleCalendar.jsx');
  const currentWeek = monday();
  const calendarFrom = new Date(`${currentWeek}T00:00:00+07:00`).toISOString();
  const calendarTo = new Date(`${shiftDate(currentWeek, 7)}T00:00:00+07:00`).toISOString();
  client.setQueryData(['admin-mentor-calendar', 2, calendarFrom, calendarTo], [{ id: 901,
    startTime: new Date(`${vietnamDate()}T08:00:00+07:00`).toISOString(),
    endTime: new Date(`${vietnamDate()}T08:50:00+07:00`).toISOString(), status: 'Booked',
    bookings: [{ id: 902, learnerId: 903, learnerName: 'Calendar Learner Fixture', question: 'Saved question fixture', status: 'Assigned', paymentStatus: 'Paid' }] }]);
  const mentor = render(Mentor); assert.match(mentor, /Đăng ký buổi rảnh/);
  assert.equal((mentor.match(/type="checkbox"/g) || []).length, 21);
  const admin = render(Admin, { embedded: true }); assert.match(admin, /Test Mentor/); assert.match(admin, /Công bố lịch tuần/);
  assert.match(render(Learner), /24 tiếng/);
  assert.match(render(Plans), /Giá trọn gói/);
  const calendar = render(Calendar, { mentorId: 2, mentorName: 'Test Mentor', initials: 'TM', onClose() {} });
  assert.match(calendar, /Calendar Learner Fixture/); assert.match(calendar, /Saved question fixture/);
  assert.doesNotMatch(calendar, /Lịch minh họa|Nguyễn Văn Nam|Trần Thị Mai/);
  const emptyCalendar = render(Calendar, { mentorId: 3, mentorName: 'Other Mentor', initials: 'OM', onClose() {} });
  assert.doesNotMatch(emptyCalendar, /Calendar Learner Fixture/);
  client.clear();
  console.log('PASS: mentor registers morning/afternoon with day cards; admin renders real booking details; learner sees cancellation policy.');
} finally { await server.close(); }
