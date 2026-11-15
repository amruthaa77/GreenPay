import { validateBusinessConfig, BusinessConfig } from './validate-business-config';

console.log('Testing business & prototype config validator rules...');

// Test 1: Empty commercial config must fail
const emptyCommercialConfig: BusinessConfig = {
  entityType: 'COMMERCIAL',
  isAcademicPrototype: false,
  legalName: '',
  registeredAddress: '',
  contactEmail: '',
  contactPhone: '',
  grievanceOfficerName: '',
  grievanceOfficerEmail: '',
  cin: '',
  nonAffiliationDeclaration: ''
};
const res1 = validateBusinessConfig(emptyCommercialConfig);
if (res1.isValid) {
  console.error('❌ Test 1 Failed: emptyCommercialConfig should not be valid.');
  process.exit(1);
} else {
  console.log('✅ Test 1 Passed: Empty commercial configuration was rejected.');
}

// Test 2: Placeholder names for commercial must fail
const placeholderCommercialConfig: BusinessConfig = {
  entityType: 'COMMERCIAL',
  isAcademicPrototype: false,
  legalName: 'GreenPay Urban Technologies Private Limited',
  registeredAddress: '123 Fake Street, Koramangala',
  contactEmail: 'TODO@example.com',
  contactPhone: '+91 9999999999',
  grievanceOfficerName: 'Lorem Ipsum Officer',
  grievanceOfficerEmail: 'grievance@example.com',
  cin: 'U72900KA2025PTC000000',
  nonAffiliationDeclaration: ''
};
const res2 = validateBusinessConfig(placeholderCommercialConfig);
if (res2.isValid) {
  console.error('❌ Test 2 Failed: placeholderCommercialConfig should not be valid.');
  process.exit(1);
} else {
  console.log('✅ Test 2 Passed: Prohibited names and dummy CINs for commercial mode were rejected.');
}

// Test 3: Real valid commercial credentials must pass
const validCommercialConfig: BusinessConfig = {
  entityType: 'COMMERCIAL',
  isAcademicPrototype: false,
  legalName: 'Apex Urban Resource Systems LLP',
  registeredAddress: 'No. 42, 80 Feet Road, 4th Block, Bengaluru 560034, Karnataka',
  contactEmail: 'contact@apexurban.in',
  contactPhone: '+91 80 2553 4410',
  grievanceOfficerName: 'Venkatesh Murthy',
  grievanceOfficerEmail: 'grievance@apexurban.in',
  cin: 'AAB-1928',
  nonAffiliationDeclaration: 'Not affiliated with BBMP.'
};
const res3 = validateBusinessConfig(validCommercialConfig);
if (!res3.isValid) {
  console.error('❌ Test 3 Failed: validCommercialConfig should be valid.', res3.errors);
  process.exit(1);
} else {
  console.log('✅ Test 3 Passed: Valid real commercial entity configuration passes.');
}

// Test 4: Academic prototype configuration must pass
const validPrototypeConfig: BusinessConfig = {
  entityType: 'ACADEMIC_PROTOTYPE',
  isAcademicPrototype: true,
  legalName: 'GreenPay (Academic Research Prototype)',
  registeredAddress: 'Bengaluru, Karnataka, India (Academic Demonstration Deployment)',
  contactEmail: 'research@greenpay.blr',
  contactPhone: 'Not Applicable (Academic Prototype - Electronic Inquiry Only)',
  grievanceOfficerName: 'Academic Project Lead / Research Supervisor',
  grievanceOfficerEmail: 'research@greenpay.blr',
  cin: 'NOT APPLICABLE (Non-Commercial Academic Prototype)',
  nonAffiliationDeclaration: 'GreenPay is an independent civic research and technological prototype. Not affiliated with BBMP or GBA.'
};
const res4 = validateBusinessConfig(validPrototypeConfig);
if (!res4.isValid) {
  console.error('❌ Test 4 Failed: validPrototypeConfig should be valid.', res4.errors);
  process.exit(1);
} else {
  console.log('✅ Test 4 Passed: Academic prototype configuration with clear disclosures passes.');
}

// Test 5: Academic prototype claiming to be a registered corporate or inventing fake CIN must fail
const deceptivePrototypeConfig: BusinessConfig = {
  entityType: 'ACADEMIC_PROTOTYPE',
  isAcademicPrototype: true,
  legalName: 'GreenPay Technologies Private Limited', // Deceptive corporate claim
  registeredAddress: 'Bengaluru',
  contactEmail: 'contact@greenpay.blr',
  contactPhone: 'N/A',
  grievanceOfficerName: 'Lead',
  grievanceOfficerEmail: 'contact@greenpay.blr',
  cin: 'U72900KA2025PTC000000', // Invented synthetic CIN
  nonAffiliationDeclaration: 'Not affiliated with BBMP.'
};
const res5 = validateBusinessConfig(deceptivePrototypeConfig);
if (res5.isValid) {
  console.error('❌ Test 5 Failed: deceptivePrototypeConfig should be rejected.');
  process.exit(1);
} else {
  console.log('✅ Test 5 Passed: Deceptive prototype corporate claim & fake CIN were rejected.');
}

console.log('🎉 All business & prototype validator tests passed successfully!');
