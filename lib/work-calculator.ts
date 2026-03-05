import { format, startOfWeek, addDays, isWeekend, isBefore, isAfter, isSameDay } from "date-fns"

export interface DayEntry {
  date: string // YYYY-MM-DD
  dayOfWeek: string
  clockIn: string // HH:MM
  clockOut: string // HH:MM
  leaveType: LeaveType
  breakMinutes: number // lunch/dinner break adjustments
  nonWorkMinutes: number // non-work time during office hours
  isHoliday: boolean
}

export type LeaveType =
  | "none"
  | "annual" // 연차 (8h)
  | "half" // 반차 (4h)
  | "quarter" // 반반차 (2h)
  | "holiday" // 공휴일

export interface WeekData {
  weekLabel: string
  days: DayEntry[]
}

export interface CalculationResult {
  totalWorkedMinutes: number
  totalRequiredMinutes: number
  remainingMinutes: number
  overtimeMinutes: number
  dailyBreakdown: {
    date: string
    dayOfWeek: string
    workedMinutes: number
    leaveType: LeaveType
    isHoliday: boolean
  }[]
  fridayLeaveTime: string | null
  progress: number
}

const DAY_NAMES_KR = ["일", "월", "화", "수", "목", "금", "토"]
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function getDayName(date: Date, locale: "kr" | "en" = "kr"): string {
  const names = locale === "kr" ? DAY_NAMES_KR : DAY_NAMES_EN
  return names[date.getDay()]
}

export function createEmptyEntry(date: Date): DayEntry {
  const dateStr = format(date, "yyyy-MM-dd")
  const dayOfWeek = getDayName(date)
  const weekend = isWeekend(date)

  return {
    date: dateStr,
    dayOfWeek,
    clockIn: "",
    clockOut: "",
    leaveType: weekend ? "holiday" : "none",
    breakMinutes: 0,
    nonWorkMinutes: 0,
    isHoliday: weekend,
  }
}

export function generateBiweeklyDays(startDate?: Date): WeekData[] {
  const now = startDate || new Date()
  // Find the Monday of the current biweekly period
  // We assume biweekly periods start on odd weeks of the year
  const monday = startOfWeek(now, { weekStartsOn: 1 })

  const weekNumber = getWeekNumber(monday)
  // If it's an even week, go back one week to get the start of the biweekly period
  const biweekStart = weekNumber % 2 === 0 ? addDays(monday, -7) : monday

  const week1Days: DayEntry[] = []
  const week2Days: DayEntry[] = []

  for (let i = 0; i < 7; i++) {
    week1Days.push(createEmptyEntry(addDays(biweekStart, i)))
  }
  for (let i = 7; i < 14; i++) {
    week2Days.push(createEmptyEntry(addDays(biweekStart, i)))
  }

  return [
    {
      weekLabel: `Week 1 (${format(addDays(biweekStart, 0), "M/d")} - ${format(addDays(biweekStart, 6), "M/d")})`,
      days: week1Days,
    },
    {
      weekLabel: `Week 2 (${format(addDays(biweekStart, 7), "M/d")} - ${format(addDays(biweekStart, 13), "M/d")})`,
      days: week2Days,
    },
  ]
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null

  // Remove all spaces
  const cleaned = timeStr.trim().replace(/\s/g, "")

  // Handle HH:MM:SS format
  const hmsMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (hmsMatch) {
    return { hours: parseInt(hmsMatch[1]), minutes: parseInt(hmsMatch[2]) }
  }

  // Handle HHMM format
  const hmMatch = cleaned.match(/^(\d{3,4})$/)
  if (hmMatch) {
    const padded = cleaned.padStart(4, "0")
    return { hours: parseInt(padded.slice(0, 2)), minutes: parseInt(padded.slice(2)) }
  }

  // Handle single/double digit as hours
  const hMatch = cleaned.match(/^(\d{1,2})$/)
  if (hMatch) {
    return { hours: parseInt(hMatch[1]), minutes: 0 }
  }

  return null
}

export function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function minutesToHoursStr(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : ""
  const absMinutes = Math.abs(totalMinutes)
  const h = Math.floor(absMinutes / 60)
  const m = absMinutes % 60
  return `${sign}${h}h ${m}m`
}

export function minutesToDecimalStr(totalMinutes: number): string {
  return (totalMinutes / 60).toFixed(1)
}

function calculateBreakMinutes(workedMinutes: number): number {
  // For every 4 hours of work, 30 minutes break is deducted
  if (workedMinutes >= 480) return 60 // 8h+ → 1h break
  if (workedMinutes >= 240) return 30 // 4h+ → 30m break
  return 0
}

function getLeaveCredits(leaveType: LeaveType): number {
  switch (leaveType) {
    case "annual":
      return 480 // 8h
    case "half":
      return 240 // 4h
    case "quarter":
      return 120 // 2h
    default:
      return 0
  }
}

export function calculateWorkedMinutes(entry: DayEntry): number {
  if (entry.leaveType === "annual") return 480
  if (entry.isHoliday && !entry.clockIn) return 0

  const inTime = parseTime(entry.clockIn)
  const outTime = parseTime(entry.clockOut)

  if (!inTime || !outTime) {
    return getLeaveCredits(entry.leaveType)
  }

  let totalMin = (outTime.hours * 60 + outTime.minutes) - (inTime.hours * 60 + inTime.minutes)
  if (totalMin < 0) totalMin += 1440 // handle overnight

  // Subtract break for weekdays
  if (!entry.isHoliday) {
    totalMin -= calculateBreakMinutes(totalMin)
  }

  // Subtract additional breaks and non-work time
  totalMin -= entry.breakMinutes
  totalMin -= entry.nonWorkMinutes

  // Add leave credits for partial leaves
  totalMin += getLeaveCredits(entry.leaveType)

  return Math.max(0, totalMin)
}

export function calculateAll(weeks: WeekData[], defaultLeaveTime: string = "17:00"): CalculationResult {
  const BASE_REQUIRED = 4800 // 80 hours in minutes
  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")

  // Reduce required hours for holidays on weekdays (non-weekend days marked as holiday)
  const allEntries = weeks.flatMap((w) => w.days)
  const holidayReduction = allEntries.reduce((sum, day) => {
    const dayDate = new Date(day.date)
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
    if (!isWeekend && (day.leaveType === "holiday" || day.isHoliday)) {
      return sum + 480 // subtract 8h per holiday weekday
    }
    return sum
  }, 0)
  const totalRequiredMinutes = Math.max(0, BASE_REQUIRED - holidayReduction)

  const dailyBreakdown = weeks.flatMap((week) =>
    week.days.map((day) => ({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      workedMinutes: calculateWorkedMinutes(day),
      leaveType: day.leaveType,
      isHoliday: day.isHoliday,
    }))
  )

  const totalWorkedMinutes = dailyBreakdown.reduce((sum, d) => sum + d.workedMinutes, 0)
  const remainingMinutes = Math.max(0, totalRequiredMinutes - totalWorkedMinutes)
  const overtimeMinutes = Math.max(0, totalWorkedMinutes - totalRequiredMinutes)
  const progress = Math.min(100, (totalWorkedMinutes / totalRequiredMinutes) * 100)

  // Calculate Friday leave time
  let fridayLeaveTime: string | null = null

  // Find the last Friday in the 2-week period
  const allDays = weeks.flatMap((w) => w.days)
  const fridays = allDays.filter((d) => d.dayOfWeek === "금" && !d.isHoliday)

  if (fridays.length > 0) {
    const lastFriday = fridays[fridays.length - 1]
    const lastFridayDate = new Date(lastFriday.date)

    // Calculate hours that will be worked Mon-Thu of that week assuming leaving at defaultLeaveTime
    // Find the week the last Friday belongs to
    const fridayWeek = weeks.find((w) => w.days.some((d) => d.date === lastFriday.date))
    if (fridayWeek) {
      let projectedTotal = 0

      // Sum all already-entered days
      for (const day of allDays) {
        const dayDate = new Date(day.date)
        if (day.date === lastFriday.date) continue // Skip Friday itself

        if (isBefore(dayDate, lastFridayDate)) {
          const worked = calculateWorkedMinutes(day)
          if (worked > 0) {
            projectedTotal += worked
          } else if (!day.isHoliday && day.leaveType === "none" && !day.clockIn) {
            // Future weekday with no entry: assume default 8h
            if (isSameDay(dayDate, today) || isAfter(dayDate, today)) {
              projectedTotal += 480
            }
          }
        }
      }

      // How much is needed on Friday
      const neededOnFriday = totalRequiredMinutes - projectedTotal

      if (neededOnFriday > 0 && lastFriday.clockIn) {
        const inTime = parseTime(lastFriday.clockIn)
        if (inTime) {
          // Add break time
          let breakMin = 0
          if (neededOnFriday >= 480) breakMin = 60
          else if (neededOnFriday >= 240) breakMin = 30

          const leaveMinutes = inTime.hours * 60 + inTime.minutes + neededOnFriday + breakMin
          const leaveH = Math.floor(leaveMinutes / 60)
          const leaveM = leaveMinutes % 60
          fridayLeaveTime = formatTime(leaveH, leaveM)
        }
      } else if (neededOnFriday <= 0) {
        fridayLeaveTime = "Already complete!"
      }
    }
  }

  return {
    totalWorkedMinutes,
    totalRequiredMinutes,
    remainingMinutes,
    overtimeMinutes,
    dailyBreakdown,
    fridayLeaveTime,
    progress,
  }
}

// Parse HR system paste data
export interface ParsedHRRow {
  date: string
  clockIn: string
  clockOut: string
  leaveType: LeaveType
}

export function parseHRData(text: string): ParsedHRRow[] {
  const lines = text.trim().split("\n")
  const results: ParsedHRRow[] = []

  for (const line of lines) {
    const parts = line.split("\t").map((p) => p.trim())
    if (parts.length < 2) continue

    // Try to parse various formats
    // Format: date \t clockIn \t clockOut \t leaveType?
    // Or: date \t clockIn \t clockOut
    let date = ""
    let clockIn = ""
    let clockOut = ""
    let leaveType: LeaveType = "none"

    // Try to find a date-like field
    for (const part of parts) {
      if (part.match(/^\d{4}[-/.]\d{2}[-/.]\d{2}/)) {
        date = part.replace(/[/.]/g, "-").slice(0, 10)
      } else if (part.match(/^\d{1,2}:\d{2}/) && !clockIn) {
        clockIn = part.slice(0, 5)
      } else if (part.match(/^\d{1,2}:\d{2}/) && clockIn) {
        clockOut = part.slice(0, 5)
      } else if (part.includes("연차") || part.includes("Annual")) {
        leaveType = "annual"
      } else if (part.includes("반반차") || part.includes("Quarter")) {
        leaveType = "quarter"
      } else if (part.includes("반차") || part.includes("Half")) {
        leaveType = "half"
      }
    }

    if (date) {
      results.push({ date, clockIn, clockOut, leaveType })
    }
  }

  return results
}
