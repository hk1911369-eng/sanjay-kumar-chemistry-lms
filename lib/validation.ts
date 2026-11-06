/** Normalize Bangladesh mobile numbers to the local 01XXXXXXXXX form. */
export function normalizeBangladeshMobile(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}
