/**
 * Business Configuration Strict Validator
 * 
 * Verifies that business.config.ts has appropriate configuration:
 * - For Academic Prototypes: Verifies clear prototype labeling, valid academic contact email,
 *   absence of invented commercial corporate CINs, and presence of BBMP/GBA non-affiliation notices.
 * - For Commercial Deployments: Verifies real entity values supplied via environment variables,
 *   rejecting empty strings, placeholders, or dummy names.
 */

import { businessConfig, BusinessConfig } from './business.config';
export type { BusinessConfig };

const FORBIDDEN_PATTERNS = [
  /todo/i,
  /example/i,
  /lorem/i,
  /placeholder/i,
  /demo\s*entity/i,
  /test\s*entity/i,
  /sample/i,
  /foo/i,
  /bar/i
];

const FORBIDDEN_EXACT_VALUES = [
  'GreenPay Urban Technologies Private Limited',
  'GreenPay Technologies Pvt Ltd',
  'GreenPay Pvt Ltd',
  'Koramangala, Bengaluru',
  'U72900KA2025PTC000000',
  'admin@example.com',
  '+91 0000000000',
  '+91 9999999999'
];

export function validateBusinessConfig(config: BusinessConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // =========================================================================
  // 1. ACADEMIC PROTOTYPE VALIDATION
  // =========================================================================
  if (config.isAcademicPrototype) {
    // Ensure legalName does not falsely claim to be a registered commercial entity
    const legalName = (config.legalName || '').trim();
    if (!legalName) {
      errors.push("Academic prototype must specify a project name (e.g. 'GreenPay (Academic Research Prototype)').");
    } else if (/private\s*limited|pvt\.?\s*ltd\.?/i.test(legalName)) {
      errors.push(
        `Academic prototype cannot claim to be a registered company ("${legalName}"). Remove corporate suffixes.`
      );
    }

    // Ensure CIN is NOT an invented corporate number
    const cin = (config.cin || '').trim();
    if (!cin || (!cin.includes('NOT APPLICABLE') && !cin.includes('N/A'))) {
      if (/^[LUF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/i.test(cin) || cin === 'U72900KA2025PTC000000') {
        errors.push(
          `Academic prototype must NOT invent a synthetic corporate CIN ("${cin}"). Set to 'NOT APPLICABLE (Non-Commercial Academic Prototype)'.`
        );
      }
    }

    // Ensure contact email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!config.contactEmail || !emailRegex.test(config.contactEmail)) {
      errors.push(`Field 'contactEmail' must be a valid email address: "${config.contactEmail}".`);
    }

    // Ensure non-affiliation notice is present
    if (!config.nonAffiliationDeclaration || !config.nonAffiliationDeclaration.includes('BBMP')) {
      errors.push('Academic prototype must include a non-affiliation declaration clarifying it is not an agency of BBMP/GBA.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // =========================================================================
  // 2. COMMERCIAL REGISTERED ENTITY VALIDATION
  // =========================================================================
  const requiredKeys: (keyof BusinessConfig)[] = [
    'legalName',
    'registeredAddress',
    'contactEmail',
    'contactPhone',
    'grievanceOfficerName',
    'grievanceOfficerEmail',
    'cin'
  ];

  for (const key of requiredKeys) {
    const val = String(config[key] || '').trim();

    if (!val) {
      errors.push(`Missing required field: '${key}' is empty. Set BUSINESS_${key.replace(/([A-Z])/g, '_$1').toUpperCase()} in environment.`);
      continue;
    }

    if (val.length < 3) {
      errors.push(`Field '${key}' is too short (${val.length} chars). Real business value required.`);
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(val)) {
        errors.push(`Field '${key}' contains forbidden placeholder pattern (${pattern}): "${val}".`);
      }
    }

    for (const forbidden of FORBIDDEN_EXACT_VALUES) {
      if (val.toLowerCase() === forbidden.toLowerCase()) {
        errors.push(`Field '${key}' matches prohibited legacy placeholder name: "${val}". Real business credentials required.`);
      }
    }
  }

  // Validate email formats if present
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (config.contactEmail && !emailRegex.test(config.contactEmail)) {
    errors.push(`Field 'contactEmail' is not a valid email address: "${config.contactEmail}".`);
  }
  if (config.grievanceOfficerEmail && !emailRegex.test(config.grievanceOfficerEmail)) {
    errors.push(`Field 'grievanceOfficerEmail' is not a valid email address: "${config.grievanceOfficerEmail}".`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// CLI runner
if (require.main === module || process.argv[1]?.endsWith('validate-business-config.ts')) {
  console.log('Validating GreenPay business & prototype configuration...');
  const result = validateBusinessConfig(businessConfig);

  if (!result.isValid) {
    console.error('\n❌ BUSINESS / PROTOTYPE CONFIG VALIDATION FAILED:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error('\nPlease supply appropriate configuration in your environment variables.\n');
    process.exit(1);
  } else {
    if (businessConfig.isAcademicPrototype) {
      console.log('✅ Academic prototype configuration validated successfully with clear non-affiliation disclosures.');
    } else {
      console.log('✅ Commercial business configuration validated successfully with real entity data.');
    }
    process.exit(0);
  }
}
