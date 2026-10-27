const unavailable = () => Promise.reject(new Error('Backend chưa có API gói tự học cho học viên.'));

export function getStudyPlans() {
  return unavailable();
}

export function getMySubscription() {
  return unavailable();
}

export function purchaseStudyPlan() {
  return unavailable();
}
