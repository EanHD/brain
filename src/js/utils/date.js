/**
 * Date utilities for formatting timestamps
 */

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted relative time string
 */
export function formatDistanceToNow(date) {
  const now = Date.now();
  const then = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date).getTime() 
    : date.getTime();
  
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else if (diffWeek < 4) {
    return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Format a date as a readable string (e.g., "January 15, 2024")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a date with time (e.g., "Jan 15, 2024 3:45 PM")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  const d = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Check if a date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if the date is today
 */
export function isToday(date) {
  const d = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  const today = new Date();
  
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
}

/**
 * Check if a date is yesterday
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if the date is yesterday
 */
export function isYesterday(date) {
  const d = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
}
