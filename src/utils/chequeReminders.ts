import { ChequeRecord, BusinessProfile } from '../types';
import { formatINR, formatDate } from './formatters';

export interface ChequeReturnReason {
  code: string;
  label: string;
  description: string;
  category: 'FUNDS' | 'SIGNATURE' | 'DRAWER_INSTRUCTION' | 'TECHNICAL' | 'INSTRUMENT';
}

export const RBI_CTS_RETURN_REASONS: ChequeReturnReason[] = [
  {
    code: '01',
    label: '01 - Funds Insufficient',
    description: 'Balance in drawer account is insufficient to honor the cheque.',
    category: 'FUNDS'
  },
  {
    code: '02',
    label: '02 - Account Closed',
    description: 'The bank account on which the cheque was drawn is closed.',
    category: 'INSTRUMENT'
  },
  {
    code: '03',
    label: '03 - Payment Stopped by Drawer',
    description: 'Drawer has issued a stop payment instruction to the bank.',
    category: 'DRAWER_INSTRUCTION'
  },
  {
    code: '10',
    label: '10 - Drawer’s Signature Differs',
    description: 'Signature on the cheque does not match bank records.',
    category: 'SIGNATURE'
  },
  {
    code: '11',
    label: '11 - Drawer’s Signature Incomplete / Required',
    description: 'Missing joint signature or authorized signatory stamp.',
    category: 'SIGNATURE'
  },
  {
    code: '20',
    label: '20 - Post-Dated Cheque (Presented Early)',
    description: 'Cheque presented before the date mentioned on the instrument.',
    category: 'INSTRUMENT'
  },
  {
    code: '21',
    label: '21 - Stale / Outdated Cheque (>3 Months)',
    description: 'Cheque presented after the 3-month validity period from cheque date.',
    category: 'INSTRUMENT'
  },
  {
    code: '22',
    label: '22 - Cheque Mutilated / Torn / Illegible',
    description: 'Physical cheque is damaged or MICR strip is unreadable.',
    category: 'TECHNICAL'
  },
  {
    code: '23',
    label: '23 - Amount in Words and Figures Differs',
    description: 'Discrepancy between numeric amount and written words amount.',
    category: 'INSTRUMENT'
  },
  {
    code: '24',
    label: '24 - Alteration / Overwriting Requires Signature',
    description: 'Corrections on payee name/amount not authenticated by drawer.',
    category: 'INSTRUMENT'
  },
  {
    code: '30',
    label: '30 - Account Frozen / Blocked by Order',
    description: 'Bank account is frozen by court/statutory authority or KYC hold.',
    category: 'DRAWER_INSTRUCTION'
  },
  {
    code: '99',
    label: '99 - Other / Technical Clearing Failure',
    description: 'Technical clearing gateway failure or unclassified return.',
    category: 'TECHNICAL'
  }
];

export interface ChequeReminderMetrics {
  dueToday: ChequeRecord[];
  upcomingPdc: ChequeRecord[]; // next 1 to 7 days
  overdueUncleared: ChequeRecord[]; // 8 to 90 days past cheque date
  staleCheques: ChequeRecord[]; // >= 90 days past cheque date
  recentlyBounced: ChequeRecord[];
  totalActionRequiredCount: number;
}

export const getChequeReminderMetrics = (cheques: ChequeRecord[]): ChequeReminderMetrics => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueToday: ChequeRecord[] = [];
  const upcomingPdc: ChequeRecord[] = [];
  const overdueUncleared: ChequeRecord[] = [];
  const staleCheques: ChequeRecord[] = [];
  const recentlyBounced: ChequeRecord[] = [];

  cheques.forEach(chq => {
    if (chq.status === 'BOUNCED') {
      recentlyBounced.push(chq);
      return;
    }

    if (chq.status === 'CLEARED' || chq.status === 'CANCELLED') {
      return;
    }

    const chqDate = new Date(chq.chequeDate);
    chqDate.setHours(0, 0, 0, 0);

    const diffTime = chqDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Due Today
      dueToday.push(chq);
    } else if (diffDays > 0 && diffDays <= 7) {
      // Upcoming Post Dated Cheque within next 7 days
      upcomingPdc.push(chq);
    } else if (diffDays < 0) {
      const daysPast = Math.abs(diffDays);
      if (daysPast >= 90) {
        // Stale Cheque (>90 days)
        staleCheques.push(chq);
      } else if (daysPast >= 3) {
        // Overdue uncleared (>3 days past presentation date)
        overdueUncleared.push(chq);
      }
    }
  });

  const totalActionRequiredCount = 
    dueToday.length + 
    upcomingPdc.length + 
    overdueUncleared.length + 
    staleCheques.length + 
    recentlyBounced.length;

  return {
    dueToday,
    upcomingPdc,
    overdueUncleared,
    staleCheques,
    recentlyBounced,
    totalActionRequiredCount
  };
};

/**
 * Pre-formats a professional WhatsApp / SMS message for cheque reminders
 */
export const generateChequeWhatsAppText = (
  cheque: ChequeRecord,
  business: BusinessProfile,
  reminderType: 'DUE_TODAY' | 'UPCOMING_PDC' | 'BOUNCED' | 'CLEARANCE_NOTICE'
): string => {
  const companyName = business.tradeName || business.name || 'Our Company';
  const amountStr = formatINR(cheque.amount);
  const formattedDate = formatDate(cheque.chequeDate);

  if (reminderType === 'BOUNCED') {
    const reasonText = cheque.bouncedReason || 'Technical / Insufficient Funds';
    const penaltyNotice = cheque.bouncedPenaltyFee 
      ? `\n*Bank Return Charges:* ${formatINR(cheque.bouncedPenaltyFee)}` 
      : '';

    return (
      `*URGENT: Cheque Return Notice - ${companyName}*\n\n` +
      `Dear ${cheque.payeeName || 'Sir/Madam'},\n\n` +
      `This is to inform you that Cheque *#${cheque.chequeNumber}* for *${amountStr}* dated *${formattedDate}* drawn on *${cheque.bankName}* has been returned unpaid by the bank.\n\n` +
      `*Reason for Return:* ${reasonText}${penaltyNotice}\n` +
      (cheque.bouncedMemoRef ? `*Bank Return Memo Ref:* ${cheque.bouncedMemoRef}\n` : '') +
      `\nKindly arrange the payment of *${amountStr}* urgently via immediate IMPS/NEFT/UPI or issue a fresh replacement cheque to avoid any ledger disruptions.\n\n` +
      `*Bank Transfer Details:*\n` +
      `A/C Name: ${business.tradeName || companyName}\n` +
      `A/C No: ${business.accountNumber || 'Provided on invoice'}\n` +
      `IFSC: ${business.ifscCode || ''}\n` +
      `Bank: ${business.bankName || ''}\n\n` +
      `Thank you,\n` +
      `*${companyName}*\n` +
      `Contact: ${business.phone || business.email || ''}`
    );
  }

  if (reminderType === 'DUE_TODAY') {
    const isMoneyIn = cheque.chequeType === 'PAYMENT_IN';
    return (
      `*Cheque Notification: Due for Clearance Today*\n\n` +
      `Dear ${cheque.payeeName || 'Sir/Madam'},\n\n` +
      `This is a gentle reminder that Cheque *#${cheque.chequeNumber}* of *${amountStr}* (${cheque.bankName}) is dated *Today (${formattedDate})*.\n\n` +
      (isMoneyIn 
        ? `We are depositing this cheque today for bank clearing.` 
        : `Please ensure sufficient funds are maintained in your account for smooth clearance.`) +
      `\n\nFor any queries, feel free to connect with us.\n\n` +
      `Regards,\n` +
      `*${companyName}*`
    );
  }

  if (reminderType === 'UPCOMING_PDC') {
    return (
      `*Reminder: Upcoming Post-Dated Cheque (PDC)*\n\n` +
      `Dear ${cheque.payeeName || 'Sir/Madam'},\n\n` +
      `This is a friendly reminder regarding Cheque *#${cheque.chequeNumber}* for *${amountStr}* (${cheque.bankName}) scheduled for *${formattedDate}*.\n\n` +
      `Kindly ensure sufficient account balance prior to presentation.\n\n` +
      `Regards,\n` +
      `*${companyName}*`
    );
  }

  // Clearance Notice
  return (
    `*Payment Realization & Cheque Cleared Confirmation*\n\n` +
    `Dear ${cheque.payeeName || 'Sir/Madam'},\n\n` +
    `We are pleased to confirm that Cheque *#${cheque.chequeNumber}* for *${amountStr}* dated *${formattedDate}* has been successfully cleared by ${cheque.bankName}.\n` +
    (cheque.clearanceReference ? `*Bank UTR/Ref:* ${cheque.clearanceReference}\n` : '') +
    `\nYour account ledger has been updated accordingly.\n\n` +
    `Thank you for your business!\n` +
    `*${companyName}*`
  );
};
