import { BiometricSecurityConfig } from '../types';

export const DEFAULT_BIOMETRIC_CONFIG: BiometricSecurityConfig = {
  enabled: false,
  registered: false,
  credential: null,
  requireForAccounting: true,
  requireForJournalEntries: true,
  requireForAccountHeads: true,
  requireForBankStatements: true,
  requireForSensitiveExports: true,
  requireForPaymentsOut: true,
  payoutThresholdAmount: 25000, // ₹25,000 threshold for Payment Out vouchers
  sessionUnlockDurationMinutes: 15, // 15-minute grace period before requiring biometric re-prompt
  fallbackPin: '123456',
  fallbackPinHint: 'Default PIN is 123456',
  exemptSuperAdmin: false
};

export const normalizeBiometricConfig = (
  rawConfig?: Partial<BiometricSecurityConfig> | null
): BiometricSecurityConfig => {
  if (!rawConfig) return { ...DEFAULT_BIOMETRIC_CONFIG };

  return {
    enabled: typeof rawConfig.enabled === 'boolean' ? rawConfig.enabled : DEFAULT_BIOMETRIC_CONFIG.enabled,
    registered: typeof rawConfig.registered === 'boolean' ? rawConfig.registered : DEFAULT_BIOMETRIC_CONFIG.registered,
    credential: rawConfig.credential || null,
    requireForAccounting: typeof rawConfig.requireForAccounting === 'boolean' ? rawConfig.requireForAccounting : DEFAULT_BIOMETRIC_CONFIG.requireForAccounting,
    requireForJournalEntries: typeof rawConfig.requireForJournalEntries === 'boolean' ? rawConfig.requireForJournalEntries : DEFAULT_BIOMETRIC_CONFIG.requireForJournalEntries,
    requireForAccountHeads: typeof rawConfig.requireForAccountHeads === 'boolean' ? rawConfig.requireForAccountHeads : DEFAULT_BIOMETRIC_CONFIG.requireForAccountHeads,
    requireForBankStatements: typeof rawConfig.requireForBankStatements === 'boolean' ? rawConfig.requireForBankStatements : DEFAULT_BIOMETRIC_CONFIG.requireForBankStatements,
    requireForSensitiveExports: typeof rawConfig.requireForSensitiveExports === 'boolean' ? rawConfig.requireForSensitiveExports : DEFAULT_BIOMETRIC_CONFIG.requireForSensitiveExports,
    requireForPaymentsOut: typeof rawConfig.requireForPaymentsOut === 'boolean' ? rawConfig.requireForPaymentsOut : DEFAULT_BIOMETRIC_CONFIG.requireForPaymentsOut,
    payoutThresholdAmount: typeof rawConfig.payoutThresholdAmount === 'number' ? rawConfig.payoutThresholdAmount : DEFAULT_BIOMETRIC_CONFIG.payoutThresholdAmount,
    sessionUnlockDurationMinutes: typeof rawConfig.sessionUnlockDurationMinutes === 'number' ? rawConfig.sessionUnlockDurationMinutes : DEFAULT_BIOMETRIC_CONFIG.sessionUnlockDurationMinutes,
    fallbackPin: rawConfig.fallbackPin || DEFAULT_BIOMETRIC_CONFIG.fallbackPin,
    fallbackPinHint: rawConfig.fallbackPinHint || DEFAULT_BIOMETRIC_CONFIG.fallbackPinHint,
    exemptSuperAdmin: typeof rawConfig.exemptSuperAdmin === 'boolean' ? rawConfig.exemptSuperAdmin : DEFAULT_BIOMETRIC_CONFIG.exemptSuperAdmin
  };
};
