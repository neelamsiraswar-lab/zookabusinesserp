import { SessionTimeoutConfig } from '../types';

export const DEFAULT_SESSION_TIMEOUT_CONFIG: SessionTimeoutConfig = {
  enabled: true,
  timeoutMinutes: 30, // 30 minutes default
  action: 'logout',
  showWarningModal: true,
  warningSeconds: 60, // 60-second warning countdown before auto logout
  exemptAdmin: false,
};

export interface TimeoutPresetOption {
  minutes: number;
  label: string;
  badge?: string;
  description: string;
  recommended?: boolean;
}

export const TIMEOUT_PRESETS: TimeoutPresetOption[] = [
  {
    minutes: 5,
    label: '5 Minutes',
    badge: 'High Security',
    description: 'Best for shared retail POS counters, high-traffic billing terminals, and public kiosks.',
  },
  {
    minutes: 15,
    label: '15 Minutes',
    badge: 'Banking Standard',
    description: 'Strict financial compliance (PCI DSS / RBI guidelines standard for accounting apps).',
  },
  {
    minutes: 30,
    label: '30 Minutes',
    badge: 'Recommended',
    description: 'Ideal balance between productivity and enterprise accounting data security.',
    recommended: true,
  },
  {
    minutes: 60,
    label: '1 Hour',
    badge: 'Standard Shift',
    description: 'Standard office workstation policy allowing uninterrupted multi-tasking.',
  },
  {
    minutes: 120,
    label: '2 Hours',
    badge: 'Extended Working',
    description: 'Suitable for dedicated single-user office desktop computers.',
  },
  {
    minutes: 240,
    label: '4 Hours',
    badge: 'Half Day',
    description: 'Long duration for continuous warehouse and inventory management tasks.',
  },
  {
    minutes: 480,
    label: '8 Hours',
    badge: 'Full Workday',
    description: 'Keeps staff logged in across a full standard business working shift.',
  },
];

export const normalizeSessionTimeoutConfig = (
  config?: Partial<SessionTimeoutConfig> | null
): SessionTimeoutConfig => {
  const base = DEFAULT_SESSION_TIMEOUT_CONFIG;
  if (!config) return base;

  const validMinutes = typeof config.timeoutMinutes === 'number' && config.timeoutMinutes > 0
    ? Math.min(Math.max(Math.round(config.timeoutMinutes), 1), 1440)
    : base.timeoutMinutes;

  const validWarningSeconds = typeof config.warningSeconds === 'number' && config.warningSeconds >= 5
    ? Math.min(Math.max(Math.round(config.warningSeconds), 5), 300)
    : base.warningSeconds;

  const validAction = config.action === 'lock' ? 'lock' : 'logout';

  return {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : base.enabled,
    timeoutMinutes: validMinutes,
    action: validAction,
    showWarningModal: typeof config.showWarningModal === 'boolean' ? config.showWarningModal : base.showWarningModal,
    warningSeconds: validWarningSeconds,
    exemptAdmin: typeof config.exemptAdmin === 'boolean' ? config.exemptAdmin : base.exemptAdmin,
  };
};
