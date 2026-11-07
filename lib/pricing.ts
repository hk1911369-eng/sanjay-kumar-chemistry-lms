export const ADMISSION_FEE_BDT = 1500;
export const MONTHLY_FEE_BDT = 700;
export const INITIAL_PAYMENT_BDT = ADMISSION_FEE_BDT + MONTHLY_FEE_BDT;

export function currentBangladeshBillingPeriod(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  if (!year || !month) throw new Error('Unable to determine Bangladesh billing month');
  return `${year}-${month}-01`;
}

export function billingMonthEnd(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
