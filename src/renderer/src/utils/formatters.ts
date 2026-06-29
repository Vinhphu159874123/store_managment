/**
 * Format number as Vietnamese currency (VND)
 * Example: 1500000 → "1.500.000₫"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0₫'
  return (
    new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(Math.round(amount)) + '₫'
  )
}

/**
 * Format date string to Vietnamese format
 * Example: "2026-06-26 10:30:00" → "26/06/2026 10:30"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr.replace(' ', 'T'))
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    return dateStr
  }
}

/**
 * Format date string to short format
 * Example: "2026-06-26 10:30:00" → "26/06/2026"
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr.replace(' ', 'T'))
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  } catch {
    return dateStr
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Parse Vietnamese currency string to number
 * Example: "1.500.000" → 1500000
 */
export function parseCurrency(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/[^\d]/g, '')
  return parseInt(cleaned, 10) || 0
}
