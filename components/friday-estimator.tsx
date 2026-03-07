"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { WeekData } from "@/lib/work-calculator"
import { calculateWorkedMinutes, minutesToHoursStr, parseTime, formatTime } from "@/lib/work-calculator"
import { CalendarClock, ArrowRight } from "lucide-react"

interface FridayEstimatorProps {
  weeks: WeekData[]
  defaultLeaveTime: string
  onDefaultLeaveTimeChange: (time: string) => void
  onUpdateFridayClockIn: (clockIn: string) => void
}

export function FridayEstimator({
  weeks,
  defaultLeaveTime,
  onDefaultLeaveTimeChange,
  onUpdateFridayClockIn,
}: FridayEstimatorProps) {
  // Dynamic required: reduce 8h per weekday holiday
  const allDaysFlat = useMemo(() => weeks.flatMap((w) => w.days), [weeks])
  const REQUIRED = useMemo(() => {
    const holidayReduction = allDaysFlat.reduce((sum, day) => {
      const dayDate = new Date(day.date)
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
      if (!isWeekend && (day.leaveType === "holiday" || day.isHoliday)) {
        return sum + 480
      }
      return sum
    }, 0)
    return Math.max(0, 4800 - holidayReduction)
  }, [allDaysFlat])
  const estimation = useMemo(() => {
    const allDays = allDaysFlat
    // Calculate already worked hours
    let workedMinutes = 0
    let futureWeekdayCount = 0
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    // Find last Friday
    const fridays = allDays.filter(
      (d) => d.dayOfWeek === "금" && !d.isHoliday
    )
    const lastFriday = fridays[fridays.length - 1]

    if (!lastFriday) return null

    for (const day of allDays) {
      if (day.date === lastFriday.date) continue

      const worked = calculateWorkedMinutes(day)
      if (worked > 0) {
        workedMinutes += worked
      } else if (
        !day.isHoliday &&
        day.leaveType === "none" &&
        !day.clockIn &&
        day.date > todayStr &&
        day.date < lastFriday.date
      ) {
        // Future unlogged weekday — estimate using defaultLeaveTime
        // Assume 9:00 in, defaultLeaveTime out
        const outTime = parseTime(defaultLeaveTime)
        if (outTime) {
          const estimatedMinutes =
            outTime.hours * 60 + outTime.minutes - 9 * 60 - 60 // minus 1h break
          workedMinutes += Math.max(0, estimatedMinutes)
          futureWeekdayCount++
        }
      }
    }

    const remainingForFriday = REQUIRED - workedMinutes
    let fridayLeaveTime: string | null = null

    if (lastFriday.clockIn) {
      const inTime = parseTime(lastFriday.clockIn)
      if (inTime && remainingForFriday > 0) {
        let breakMin = 0
        if (remainingForFriday >= 480) breakMin = 60
        else if (remainingForFriday >= 240) breakMin = 30

        const leaveMinutes =
          inTime.hours * 60 + inTime.minutes + remainingForFriday + breakMin
        const leaveH = Math.floor(leaveMinutes / 60)
        const leaveM = leaveMinutes % 60
        fridayLeaveTime = formatTime(leaveH, leaveM)
      }
    }

    return {
      workedMinutes,
      remainingForFriday: Math.max(0, remainingForFriday),
      fridayLeaveTime,
      futureWeekdayCount,
      lastFridayDate: lastFriday.date,
      hasFridayClockIn: !!lastFriday.clockIn,
      isComplete: remainingForFriday <= 0,
    }
  }, [allDaysFlat, defaultLeaveTime, REQUIRED])

  if (!estimation) return null

  return (
    <Card className="border-0 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="w-4 h-4 text-primary" />
          Friday Early Leave Estimator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Default leave time for remaining days */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground shrink-0">
              If I leave at
            </span>
            <Input
              type="text"
              value={defaultLeaveTime}
              onChange={(e) => onDefaultLeaveTimeChange(e.target.value)}
              onBlur={(e) => {
                const parsed = parseTime(e.target.value)
                if (parsed) {
                  onDefaultLeaveTimeChange(
                    formatTime(parsed.hours, parsed.minutes)
                  )
                }
              }}
              className="h-8 w-20 text-sm font-mono text-center"
            />
            <span className="text-sm text-muted-foreground">
              every day (Mon{"\u2013"}Thu)
            </span>
          </div>

          {/* Friday clock-in */}
          {!estimation.isComplete && !estimation.hasFridayClockIn && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm text-muted-foreground shrink-0">
                Friday clock-in
              </span>
              <Input
                type="text"
                placeholder="09:00"
                onChange={(e) => {
                  const parsed = parseTime(e.target.value)
                  if (parsed) {
                    onUpdateFridayClockIn(formatTime(parsed.hours, parsed.minutes))
                  }
                }}
                onBlur={(e) => {
                  const parsed = parseTime(e.target.value)
                  if (parsed) {
                    const formatted = formatTime(parsed.hours, parsed.minutes)
                    e.target.value = formatted
                    onUpdateFridayClockIn(formatted)
                  }
                }}
                className="h-8 w-20 text-sm font-mono text-center"
              />
              <span className="text-xs text-muted-foreground">
                to calculate your leave time
              </span>
            </div>
          )}

          {/* Result */}
          <div className="flex flex-col gap-3">
            {estimation.futureWeekdayCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">
                  Estimate
                </Badge>
                {estimation.futureWeekdayCount} future day(s) estimated at{" "}
                {defaultLeaveTime} leave
              </div>
            )}

            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  Remaining for Friday
                </span>
                <span className="text-lg font-bold text-foreground">
                  {estimation.isComplete
                    ? "0h 0m"
                    : minutesToHoursStr(estimation.remainingForFriday)}
                </span>
              </div>

              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  Can leave at
                </span>
                <span className="text-lg font-bold text-primary">
                  {estimation.isComplete
                    ? "No need to come!"
                    : estimation.fridayLeaveTime
                      ? estimation.fridayLeaveTime
                      : "Enter Friday clock-in"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
