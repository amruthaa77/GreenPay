import { validateBusinessConfig, BusinessConfig } from './validate-business-config';

console.log('Testing business config validator rules...');

// Test 1: Empty config must fail
const emptyConfig: BusinessConfig = {
  legalName: '',
  registeredAddress: '',
  contactEmail: '',
  contactPhone: '',
  grievanceOfficerName: '',
  grievanceOfficerEmail: '',
  cin: ''
};
const res1 = validateBusinessConfig(emptyConfig);
if (res1.isValid) {
  console.error('❌ Test 1 Failed: emptyConfig should not be valid.');
  process.exit(1);
} else {
  console.log('✅ Test 1 Passed: Empty configuration was rejected.');
}

// Test 2: Placeholder names must fail
const placeholderConfig: BusinessConfig = {
  legalName: 'GreenPay Urban Technologies Private Limited',
  registeredAddress: '123 Fake Street, Koramangala',
  contactEmail: 'TODO@example.com',
  contactPhone: '+91 9999999999',
  grievanceOfficerName: 'Lorem Ipsum Officer',
  grievanceOfficerEmail: 'grievance@example.com',
  cin: 'U72900KA2025PTC000000'
};
const res2 = validateBusinessConfig(placeholderConfig);
if (res2.isValid) {
  console.error('❌ Test 2 Failed: placeholderConfig should not be valid.');
  process.exit(1);
} else {
  console.log('✅ Test 2 Passed: Placeholder values, TODO, and prohibited names were rejected.');
}

// Test 3: Real valid credentials must pass
const validConfig: BusinessConfig = {
  legalName: 'Apex Urban Resource Systems LLP',
  registeredAddress: 'No. 42, 80 Feet Road, 4th Block, Bengaluru 560034, Karnataka',
  contactEmail: 'contact@apexurban.in',
  contactPhone: '+91 80 2553 4410',
  grievanceOfficerName: 'Venkatesh Murthy',
  grievanceOfficerEmail: 'grievance@apexurban.in',
  cin: 'AAB-1928'
};
const res3 = validateBusinessConfig(validConfig);
if (!res3.isValid) {
  console.error('❌ Test 3 Failed: validConfig should be valid.', res3.errors);
  process.exit(1);
} else {
  console.log('✅ Test 3 Passed: Valid real entity configuration passes.');
}

console.log('🎉 All business config validator tests passed successfully!');
