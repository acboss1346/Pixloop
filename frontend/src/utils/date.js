/**
 * Safely parses any date value, with special normalization for MySQL datetime/timestamp
 * string formats to ensure compatibility across all browsers (including Safari/Firefox).
 */
export const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  
  // Try default constructor
  let d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  
  // Handle MySQL space separation: "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
  if (typeof dateVal === 'string') {
    const normalized = dateVal.replace(' ', 'T');
    d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;
  }
  
  return new Date();
};
