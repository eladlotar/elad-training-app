// Timezone-safe date parsing.
// new Date('YYYY-MM-DD') parses as UTC midnight, which can shift the calendar
// day (and the weekday name) in local timezones. Parse the parts into a LOCAL
// date instead.
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const [datePart] = dateStr.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
