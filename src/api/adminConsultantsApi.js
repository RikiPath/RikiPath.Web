import { api } from './client.js';

const missing = (name) => () => Promise.reject(new Error(`Backend không có API ${name}.`));

export const createConsultant = missing('consultant');
export const getConsultants = missing('consultant');
export const toggleConsultantActive = missing('consultant');
export const createConsultationPackage = missing('gói consultant');
export const getConsultationPackages = missing('gói consultant');
export const updateConsultationPackage = missing('gói consultant');
export const togglePackageActive = missing('gói consultant');
