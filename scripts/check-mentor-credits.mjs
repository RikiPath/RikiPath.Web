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
  const { default: Payments } = await server.ssrLoadModule('/src/pages/consultation/MentorPayments.jsx');
  const { default: Checkout } = await server.ssrLoadModule('/src/pages/consultation/ConsultationPayment.jsx');
  const { default: Receipt } = await server.ssrLoadModule('/src/pages/consultation/ConsultationReceipt.jsx');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const future = new Date(Date.now()+86400000*7).toISOString(); const past = new Date(Date.now()-86400000).toISOString();
  const paid = {subscriptionId:11,planName:'Three credits',paymentStatus:'Paid',meetingSessionsIncluded:3,meetingSessionsUsed:1,endDate:future,bookings:[]};
  client.setQueryData(['mentor-purchases'],[paid,{...paid,subscriptionId:12,paymentStatus:'Pending',meetingSessionsUsed:0},{...paid,subscriptionId:13,endDate:past,meetingSessionsUsed:0}]);
  client.setQueryData(['meeting-plans'],[{id:1,name:'One credit',meetingSessionCount:1,durationDays:14,price:1000},{id:3,name:'Three credits',meetingSessionCount:3,durationDays:35,price:3000}]);
  client.setQueryData(['meeting-purchase',11],paid);
  const auth={user:{userId:1},isAuthenticated:true,isLearner:true,roles:['Learner'],primaryRole:'Learner',hasRole:r=>r==='Learner',hasAnyRole:()=>true,logout(){}};
  const render=(Component,path)=>renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(QueryClientProvider,{client},React.createElement(AuthContext.Provider,{value:auth},React.createElement(Component)))));
  const wallet=render(Payments,'/payments/'); assert.match(wallet,/Số lượt còn hạn: 2/); assert.match(wallet,/Đơn #12/); assert.match(wallet,/Đơn #13/);
  const checkout=render(Checkout,'/consultation-payment/'); assert.match(checkout,/Thanh toán PayOS/); assert.doesNotMatch(checkout,/Chưa chọn lịch|Chọn lại lịch/);
  const receipt=render(Receipt,'/consultation-receipt/?subscriptionId=11'); assert.match(receipt,/Thanh toán thành công/); assert.match(receipt,/Lượt tư vấn đã được cộng/); assert.doesNotMatch(receipt,/Tiền đã được ghi nhận nhưng lịch chưa/);
  client.clear(); console.log('PASS: wallet excludes unpaid and expired credits; checkout requires no slot; paid order without booking is successful.');
} finally {await server.close();}
