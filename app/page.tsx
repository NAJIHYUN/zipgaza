"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { SummaryCards } from "@/components/summary-cards"
import { TimeEntryTable } from "@/components/time-entry-table"
import { HRPasteDialog } from "@/components/hr-paste-dialog"
import { FridayEstimator } from "@/components/friday-estimator"
import {
  generateBiweeklyDays,
  calculateAll,
  type WeekData,
  type DayEntry,
  type ParsedHRRow,
} from "@/lib/work-calculator"
import { RotateCcw, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { addDays } from "date-fns"

const STORAGE_KEY = "work-flex-data-v2"

function loadSavedData(): { weeks: WeekData[]; defaultLeaveTime: string } | null {
  if (typeof window === "undefined") return null
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // ignore
  }
  return null
}

function saveData(weeks: WeekData[], defaultLeaveTime: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ weeks, defaultLeaveTime }))
  } catch {
    // ignore
  }
}

export default function WorkFlexPage() {
  const [weeks, setWeeks] = useState<WeekData[]>(() => {
    const saved = loadSavedData()
    return saved?.weeks ?? generateBiweeklyDays()
  })

  const [defaultLeaveTime, setDefaultLeaveTime] = useState(() => {
    const saved = loadSavedData()
    return saved?.defaultLeaveTime ?? "17:00"
  })

  // Auto-save on changes
  useEffect(() => {
    saveData(weeks, defaultLeaveTime)
  }, [weeks, defaultLeaveTime])

  const result = useMemo(
    () => calculateAll(weeks, defaultLeaveTime),
    [weeks, defaultLeaveTime]
  )

  const handleUpdateEntry = useCallback(
    (weekIndex: number, dayIndex: number, field: keyof DayEntry, value: string | number | boolean) => {
      setWeeks((prev) => {
        const next = prev.map((w, wi) => {
          if (wi !== weekIndex) return w
          return {
            ...w,
            days: w.days.map((d, di) => {
              if (di !== dayIndex) return d
              const updated = { ...d, [field]: value }
              // Sync isHoliday when leaveType changes
              if (field === "leaveType") {
                updated.isHoliday = value === "holiday"
              }
              return updated
            }),
          }
        })
        return next
      })
    },
    []
  )

  const handleApplyHRData = useCallback(
    (rows: ParsedHRRow[]) => {
      setWeeks((prev) => {
        return prev.map((week) => ({
          ...week,
          days: week.days.map((day) => {
            const match = rows.find((r) => r.date === day.date)
            if (!match) return day
            return {
              ...day,
              clockIn: match.clockIn || day.clockIn,
              clockOut: match.clockOut || day.clockOut,
              leaveType: match.leaveType !== "none" ? match.leaveType : day.leaveType,
            }
          }),
        }))
      })
    },
    []
  )

  const handleReset = useCallback(() => {
    const newWeeks = generateBiweeklyDays()
    setWeeks(newWeeks)
    setDefaultLeaveTime("17:00")
  }, [])

  const handleUpdateFridayClockIn = useCallback((clockIn: string) => {
    setWeeks((prev) => {
      // Find the last Friday across all weeks
      const allDays = prev.flatMap((w, wi) => w.days.map((d, di) => ({ ...d, wi, di })))
      const fridays = allDays.filter((d) => d.dayOfWeek === "금" && !d.isHoliday)
      const lastFriday = fridays[fridays.length - 1]
      if (!lastFriday) return prev

      return prev.map((w, wi) => {
        if (wi !== lastFriday.wi) return w
        return {
          ...w,
          days: w.days.map((d, di) => {
            if (di !== lastFriday.di) return d
            return { ...d, clockIn }
          }),
        }
      })
    })
  }, [])

  const handleNavigateWeek = useCallback((direction: "prev" | "next") => {
    setWeeks((prev) => {
      const firstDate = new Date(prev[0].days[0].date)
      const offset = direction === "prev" ? -14 : 14
      return generateBiweeklyDays(addDays(firstDate, offset))
    })
  }, [])

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight leading-none">
                Work Flex
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Biweekly Hour Calculator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HRPasteDialog onApply={handleApplyHRData} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Summary Cards */}
        <SummaryCards result={result} />

        {/* Friday Estimator */}
        <FridayEstimator
          weeks={weeks}
          defaultLeaveTime={defaultLeaveTime}
          onDefaultLeaveTimeChange={setDefaultLeaveTime}
          onUpdateFridayClockIn={handleUpdateFridayClockIn}
        />

        {/* Week Navigation & Time Entry */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Time Entries
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateWeek("prev")}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="sr-only">Previous 2 weeks</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateWeek("next")}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="sr-only">Next 2 weeks</span>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="week-0">
            <TabsList className="mb-3">
              <TabsTrigger value="week-0" className="text-xs">
                {weeks[0].weekLabel}
              </TabsTrigger>
              <TabsTrigger value="week-1" className="text-xs">
                {weeks[1].weekLabel}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="week-0">
              <TimeEntryTable
                weekData={weeks[0]}
                weekIndex={0}
                onUpdateEntry={handleUpdateEntry}
              />
            </TabsContent>

            <TabsContent value="week-1">
              <TimeEntryTable
                weekData={weeks[1]}
                weekIndex={1}
                onUpdateEntry={handleUpdateEntry}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Daily breakdown mini-chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Daily Breakdown
          </h3>
          <div className="flex items-end gap-1.5 h-24">
            {result.dailyBreakdown.map((day) => {
              const maxMinutes = 600 // 10h
              const height = Math.min(100, (day.workedMinutes / maxMinutes) * 100)
              const isOvertime = day.workedMinutes > 480
              const isWeekend =
                day.dayOfWeek === "토" || day.dayOfWeek === "일"

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="w-full relative flex items-end" style={{ height: "80px" }}>
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isWeekend
                          ? "bg-muted"
                          : isOvertime
                            ? "bg-warning"
                            : day.workedMinutes > 0
                              ? "bg-primary"
                              : "bg-muted"
                      }`}
                      style={{
                        height: `${Math.max(2, height * 0.8)}%`,
                      }}
                    />
                    {/* 8h reference line */}
                    <div
                      className="absolute w-full border-t border-dashed border-muted-foreground/20"
                      style={{ bottom: `${(480 / maxMinutes) * 80}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {day.dayOfWeek}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
              Normal
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-warning" />
              Overtime
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm border-t border-dashed border-muted-foreground/40" />
              8h line
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-muted-foreground">
          Work Flex Calculator - Data saved locally in your browser
        </footer>
      </div>
    </main>
  )
}
