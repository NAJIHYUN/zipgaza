"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { CalculationResult } from "@/lib/work-calculator"
import { minutesToHoursStr } from "@/lib/work-calculator"
import { Clock, Timer, LogOut, TrendingUp } from "lucide-react"

interface SummaryCardsProps {
  result: CalculationResult
}

export function SummaryCards({ result }: SummaryCardsProps) {
  const {
    totalWorkedMinutes,
    totalRequiredMinutes,
    remainingMinutes,
    overtimeMinutes,
    fridayLeaveTime,
    progress,
  } = result

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <Card className="border-0 bg-card shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Biweekly Progress
            </span>
            <span className="text-sm font-semibold text-foreground">
              {progress.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {minutesToHoursStr(totalWorkedMinutes)} worked
            </span>
            <span className="text-xs text-muted-foreground">
              {minutesToHoursStr(totalRequiredMinutes)} required
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Worked Hours */}
        <Card className="border-0 bg-card shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Worked
              </span>
            </div>
            <div className="text-xl font-bold text-foreground tracking-tight">
              {minutesToHoursStr(totalWorkedMinutes)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(totalWorkedMinutes / 60).toFixed(1)}h total
            </div>
          </CardContent>
        </Card>

        {/* Hours Left */}
        <Card className="border-0 bg-card shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
                <Timer className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Remaining
              </span>
            </div>
            <div className="text-xl font-bold text-foreground tracking-tight">
              {remainingMinutes > 0
                ? minutesToHoursStr(remainingMinutes)
                : "Done!"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {remainingMinutes > 0
                ? `${(remainingMinutes / 60).toFixed(1)}h to go`
                : "Requirement met"}
            </div>
          </CardContent>
        </Card>

        {/* Friday Leave Time */}
        <Card className="border-0 bg-card shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10">
                <LogOut className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Friday Leave
              </span>
            </div>
            <div className="text-xl font-bold text-foreground tracking-tight">
              {fridayLeaveTime || "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {fridayLeaveTime
                ? fridayLeaveTime === "Already complete!"
                  ? "No work needed"
                  : "Estimated time"
                : "Enter Friday clock-in"}
            </div>
          </CardContent>
        </Card>

        {/* Overtime */}
        <Card className="border-0 bg-card shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning/10">
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Overtime
              </span>
            </div>
            <div className="text-xl font-bold text-foreground tracking-tight">
              {overtimeMinutes > 0
                ? minutesToHoursStr(overtimeMinutes)
                : "0h 0m"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {overtimeMinutes > 0
                ? `${(overtimeMinutes / 60).toFixed(1)}h extra`
                : "No overtime yet"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
