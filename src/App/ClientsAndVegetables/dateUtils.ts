import { type QuotationDay } from "./types"

const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

export const getDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(date.getDate() + days)
  return nextDate
}

export const parseSalesDate = (date: string) => {
  if (!date) {
    return null
  }

  const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return getDateOnly(parsedDate)
}

export const formatQuotationDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export const parseQuotationDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export const sortQuotationDaysByDate = (days: QuotationDay[]) => {
  return [...days].sort(
    (firstDay, secondDay) => parseQuotationDate(firstDay.key).getTime() - parseQuotationDate(secondDay.key).getTime(),
  )
}

export const formatShortDate = (date: Date) => {
  return date.toLocaleDateString("fr-CA", { day: "numeric", month: "long" })
}

export const formatCalendarMonth = (date: Date) => {
  return date.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })
}

export const getRollingQuotationDays = (today: Date) => {
  return Array.from({ length: 32 }, (_, index): QuotationDay => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)

    return {
      key: formatQuotationDate(date),
      label: index === 0 ? "Aujourd'hui" : index === 1 ? "Demain" : index === 2 ? "Apres-demain" : dayNames[date.getDay()],
      shortDate: formatShortDate(date),
    }
  }).reverse()
}

export const getPastDays = (today: Date) => {
  return Array.from({ length: 1 }, (_, index): QuotationDay => {
    const date = new Date(today)
    date.setDate(today.getDate() - 1 - index)

    return {
      key: formatQuotationDate(date),
      label: index === 0 ? "Hier" : dayNames[date.getDay()],
      shortDate: formatShortDate(date),
    }
  })
}

export const getQuotationDay = (dateKey: string, todayKey: string): QuotationDay => {
  const date = parseQuotationDate(dateKey)
  const today = parseQuotationDate(todayKey)
  const dayDifference = Math.round((getDateOnly(date).getTime() - getDateOnly(today).getTime()) / 86_400_000)

  return {
    key: dateKey,
    label:
      dayDifference === 0
        ? "Aujourd'hui"
        : dayDifference === 1
          ? "Demain"
          : dayDifference === 2
            ? "Apres-demain"
            : dayDifference === -1
              ? "Hier"
              : dayNames[date.getDay()],
    shortDate: formatShortDate(date),
  }
}

export const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

export const addMonths = (date: Date, months: number) => {
  const nextDate = new Date(date)
  nextDate.setMonth(date.getMonth() + months, 1)
  return getMonthStart(nextDate)
}

export const getCalendarDays = (monthDate: Date) => {
  const monthStart = getMonthStart(monthDate)
  const firstCalendarDate = new Date(monthStart)
  const mondayFirstOffset = (monthStart.getDay() + 6) % 7
  firstCalendarDate.setDate(monthStart.getDate() - mondayFirstOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate)
    date.setDate(firstCalendarDate.getDate() + index)
    return date
  })
}

