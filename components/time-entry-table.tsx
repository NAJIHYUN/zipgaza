"use client"

import { useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { DayEntry, LeaveType, WeekData } from "@/lib/work-calculator"
import { calculateWorkedMinutes, minutesToHoursStr, parseTime, formatTime } from "@/lib/work-calculator"
import { format, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"

interface TimeEntryTableProps {
  weekData: WeekData
  weekIndex: number
  onUpdateEntry: (weekIndex: number, dayIndex: number, field: keyof DayEntry, value: string | number | boolean) => void
}

export function TimeEntryTable({ weekData, weekIndex, onUpdateEntry }: TimeEntryTableProps) {
  const today = new Date()

  const handleTimeBlur = useCallback(
    (dayIndex: number, field: "clockIn" | "clockOut", value: string) => {
      const parsed = parseTime(value)
      if (parsed) {
        onUpdateEntry(weekIndex, dayIndex, field, formatTime(parsed.hours, parsed.minutes))
      }
    },
    [weekIndex, onUpdateEntry]
  )

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{weekData.weekLabel}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px] text-xs">Date</TableHead>
            <TableHead className="w-[60px] text-xs text-center">Day</TableHead>
            <TableHead className="w-[100px] text-xs">Clock In</TableHead>
            <TableHead className="w-[100px] text-xs">Clock Out</TableHead>
            <TableHead className="w-[120px] text-xs">Leave Type</TableHead>
            <TableHead className="w-[80px] text-xs text-center">Break</TableHead>
            <TableHead className="w-[90px] text-xs text-right">Worked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weekData.days.map((day, dayIndex) => {
            const isToday = isSameDay(new Date(day.date), today)
            const worked = calculateWorkedMinutes(day)
            const isWeekend = day.dayOfWeek === "토" || day.dayOfWeek === "일"

            return (
              <TableRow
                key={day.date}
                className={cn(
                  "transition-colors",
                  isToday && "bg-primary/5 hover:bg-primary/8",
                  isWeekend && "bg-muted/20 hover:bg-muted/30",
                )}
              >
                <TableCell className="text-xs font-medium text-foreground">
                  <div className="flex items-center gap-1.5">
                    {format(new Date(day.date), "M/d")}
                    {isToday && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 leading-none">
                        Today
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-center">
                  <span
                    className={cn(
                      "font-medium",
                      isWeekend ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {day.dayOfWeek}
                  </span>
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    placeholder="09:00"
                    value={day.clockIn}
                    onChange={(e) =>
                      onUpdateEntry(weekIndex, dayIndex, "clockIn", e.target.value)
                    }
                    onBlur={(e) => handleTimeBlur(dayIndex, "clockIn", e.target.value)}
                    className="h-8 text-xs font-mono w-full"
                    disabled={day.leaveType === "annual"}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    placeholder="18:00"
                    value={day.clockOut}
                    onChange={(e) =>
                      onUpdateEntry(weekIndex, dayIndex, "clockOut", e.target.value)
                    }
                    onBlur={(e) => handleTimeBlur(dayIndex, "clockOut", e.target.value)}
                    className="h-8 text-xs font-mono w-full"
                    disabled={day.leaveType === "annual"}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={day.leaveType}
                    onValueChange={(val) =>
                      onUpdateEntry(weekIndex, dayIndex, "leaveType", val as LeaveType)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Normal</SelectItem>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="half">Half Day</SelectItem>
                      <SelectItem value="quarter">Quarter Day</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    placeholder="0"
                    value={day.breakMinutes || ""}
                    onChange={(e) =>
                      onUpdateEntry(
                        weekIndex,
                        dayIndex,
                        "breakMinutes",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="h-8 text-xs w-16 mx-auto text-center"
                    min={0}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "text-xs font-mono font-medium",
                      worked > 0 ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {worked > 0 ? minutesToHoursStr(worked) : "—"}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
