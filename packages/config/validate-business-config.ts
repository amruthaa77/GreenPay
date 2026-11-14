/**
 * Business Configuration Strict Validator
 * 
 * Verifies that business.config.ts has real values supplied via environment variables
 * and contains NO empty strings, TODOs, placeholder names, or lorem ipsum.
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
    const val = (config[key] || '').trim();

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
  console.log('Validating GreenPay business configuration...');
  const result = validateBusinessConfig(businessConfig);

  if (!result.isValid) {
    console.error('\n❌ BUSINESS CONFIG VALIDATION FAILED:');
    console.error('The application build cannot proceed until real legal and business values are provided.');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error('\nPlease supply real business details via environment variables in your .env file or deployment pipeline.\n');
    process.exit(1);
  } else {
    console.log('✅ Business configuration validated successfully with real entity data.');
    process.exit(0);
  }
}
