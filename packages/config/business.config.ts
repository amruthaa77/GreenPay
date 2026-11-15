/**
 * GreenPay Business & Legal Entity Configuration
 * 
 * IMPORTANT:
 * GreenPay is designed and operated as an independent civic research and technological prototype,
 * not an authorized agency of the Bruhat Bengaluru Mahanagara Palike (BBMP) or Greater Bengaluru Authority (GBA),
 * and not a registered commercial corporation.
 * 
 * In compliance with user instructions and Indian DPDP Act 2023 / IT Act standards:
 * - Do NOT invent fake legal entities, dummy CINs, or fictitious registered addresses.
 * - For academic prototype deployments (Render / Vercel / demo), prototype disclosures are clearly labelled.
 * - For commercial deployments, real registered business details are read from environment variables.
 */

export interface BusinessConfig {
  entityType: 'ACADEMIC_PROTOTYPE' | 'COMMERCIAL';
  isAcademicPrototype: boolean;
  legalName: string;
  registeredAddress: string;
  contactEmail: string;
  contactPhone: string;
  grievanceOfficerName: string;
  grievanceOfficerEmail: string;
  cin: string;
  nonAffiliationDeclaration: string;
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

const isCommercial = getEnv('BUSINESS_ENTITY_TYPE').toUpperCase() === 'COMMERCIAL';

export const businessConfig: BusinessConfig = isCommercial
  ? {
      entityType: 'COMMERCIAL',
      isAcademicPrototype: false,
      legalName: getEnv('BUSINESS_LEGAL_NAME'),
      registeredAddress: getEnv('BUSINESS_REGISTERED_ADDRESS'),
      contactEmail: getEnv('BUSINESS_CONTACT_EMAIL'),
      contactPhone: getEnv('BUSINESS_CONTACT_PHONE'),
      grievanceOfficerName: getEnv('BUSINESS_GRIEVANCE_OFFICER_NAME'),
      grievanceOfficerEmail: getEnv('BUSINESS_GRIEVANCE_OFFICER_EMAIL'),
      cin: getEnv('BUSINESS_CIN'),
      nonAffiliationDeclaration:
        'GreenPay is an independent civic research platform. It is NOT affiliated with, authorized by, or an official agency of the Bruhat Bengaluru Mahanagara Palike (BBMP) or Greater Bengaluru Authority (GBA).',
    }
  : {
      entityType: 'ACADEMIC_PROTOTYPE',
      isAcademicPrototype: true,
      legalName: getEnv('BUSINESS_LEGAL_NAME') || 'GreenPay (Academic Research Prototype)',
      registeredAddress:
        getEnv('BUSINESS_REGISTERED_ADDRESS') ||
        'Bengaluru, Karnataka, India (Academic Demonstration Deployment)',
      contactEmail: getEnv('BUSINESS_CONTACT_EMAIL') || 'contact@greenpay.blr',
      contactPhone:
        getEnv('BUSINESS_CONTACT_PHONE') ||
        'Not Applicable (Academic Prototype - Electronic Inquiry Only)',
      grievanceOfficerName:
        getEnv('BUSINESS_GRIEVANCE_OFFICER_NAME') ||
        'Academic Project Lead / Research Supervisor',
      grievanceOfficerEmail:
        getEnv('BUSINESS_GRIEVANCE_OFFICER_EMAIL') ||
        getEnv('BUSINESS_CONTACT_EMAIL') ||
        'contact@greenpay.blr',
      cin:
        getEnv('BUSINESS_CIN') ||
        'NOT APPLICABLE (Non-Commercial Academic Prototype)',
      nonAffiliationDeclaration:
        'GreenPay is an independent civic research and technological prototype for Bengaluru urban solid waste accountability. GreenPay is NOT affiliated with, authorized by, or an official agency of the Bruhat Bengaluru Mahanagara Palike (BBMP) or Greater Bengaluru Authority (GBA).',
    };

export default businessConfig;
