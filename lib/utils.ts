import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateMemberId(year: number, sequence: number): string {
  return `LSUB-${year}-${sequence.toString().padStart(4, '0')}`
}

export function generateReferenceCode(year: number, month: string, sequence: number): string {
  const monthMap: { [key: string]: string } = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  }
  const monthNum = monthMap[month] || '00'
  return `LSUB-${year}-${monthNum}-${sequence.toString().padStart(4, '0')}`
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[d.getMonth()]
  const day = d.getDate()
  const year = d.getFullYear()
  return `${month} ${day}, ${year}`
}

export function formatMonthYear(month: string, year: number): string {
  const monthMap: { [key: string]: string } = {
    'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr',
    'May': 'May', 'June': 'Jun', 'July': 'Jul', 'August': 'Aug',
    'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
  }
  const shortMonth = monthMap[month] || month
  return `${shortMonth} ${year}`
}

export function getCurrentMonth(): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[new Date().getMonth()]
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}
