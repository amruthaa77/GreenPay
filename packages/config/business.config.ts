/**
 * GreenPay Business & Legal Entity Configuration
 * 
 * IMPORTANT:
 * In compliance with user instructions and Indian DPDP Act 2023 / IT Act standards:
 * Do NOT invent fake legal entities, CINs, or fictitious addresses.
 * All values are read from environment variables or supplied by the legal owner.
 * 
 * The build validator (validate-business-config.ts) strictly fails the build
 * if any field is empty, contains "TODO", "example", "lorem", or previous placeholder names.
 */

export interface BusinessConfig {
  legalName: string;
  registeredAddress: string;
  contactEmail: string;
  contactPhone: string;
  grievanceOfficerName: string;
  grievanceOfficerEmail: string;
  cin: string;
}

const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const viteEnv = (import.meta as any).env;
      return viteEnv[`VITE_${key}`] || viteEnv[key] || '';
    }
  } catch {}
  return '';
};

export const businessConfig: BusinessConfig = {
  legalName: getEnv('BUSINESS_LEGAL_NAME'),
  registeredAddress: getEnv('BUSINESS_REGISTERED_ADDRESS'),
  contactEmail: getEnv('BUSINESS_CONTACT_EMAIL'),
  contactPhone: getEnv('BUSINESS_CONTACT_PHONE'),
  grievanceOfficerName: getEnv('BUSINESS_GRIEVANCE_OFFICER_NAME'),
  grievanceOfficerEmail: getEnv('BUSINESS_GRIEVANCE_OFFICER_EMAIL'),
  cin: getEnv('BUSINESS_CIN'),
};

export default businessConfig;
