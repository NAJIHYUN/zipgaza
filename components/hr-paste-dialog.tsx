"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ClipboardPaste, FileSpreadsheet, Check, AlertCircle } from "lucide-react"
import { parseHRData, type ParsedHRRow } from "@/lib/work-calculator"

interface HRPasteDialogProps {
  onApply: (rows: ParsedHRRow[]) => void
}

export function HRPasteDialog({ onApply }: HRPasteDialogProps) {
  const [open, setOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [preview, setPreview] = useState<ParsedHRRow[]>([])
  const [hasPreview, setHasPreview] = useState(false)

  const handleParse = useCallback(() => {
    const parsed = parseHRData(pasteText)
    setPreview(parsed)
    setHasPreview(true)
  }, [pasteText])

  const handleApply = useCallback(() => {
    onApply(preview)
    setPasteText("")
    setPreview([])
    setHasPreview(false)
    setOpen(false)
  }, [preview, onApply])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setPasteText("")
      setPreview([])
      setHasPreview(false)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ClipboardPaste className="w-4 h-4" />
          Paste HR Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Paste HR System Data
          </DialogTitle>
          <DialogDescription>
            Copy your attendance data from the HR system and paste it below. The
            data will be parsed and applied to the time entries.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Paste Data
            </label>
            <Textarea
              placeholder={`Paste tab-separated data from HR system here...\n\nExample format:\n2025-03-03\t09:00:00\t18:00:00\n2025-03-04\t08:30:00\t17:30:00\t반차\n2025-03-05\t\t\t연차`}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value)
                setHasPreview(false)
              }}
              className="min-h-[160px] font-mono text-xs resize-y"
            />
          </div>

          {/* Preview */}
          {hasPreview && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  {preview.length > 0 ? (
                    <>
                      <Check className="w-4 h-4 text-success" />
                      Preview ({preview.length} rows parsed)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      No valid data found
                    </>
                  )}
                </label>
              </div>
              {preview.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          In
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Out
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Leave
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5 font-mono text-foreground">
                            {row.date}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-foreground">
                            {row.clockIn || "—"}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-foreground">
                            {row.clockOut || "—"}
                          </td>
                          <td className="px-3 py-1.5">
                            {row.leaveType !== "none" ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {row.leaveType}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {!hasPreview ? (
            <Button onClick={handleParse} disabled={!pasteText.trim()}>
              Parse Data
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={preview.length === 0}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Apply {preview.length} Entries
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
