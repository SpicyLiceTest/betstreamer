import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(
    date || {
      from: new Date(2024, 0, 20),
      to: addDays(new Date(2024, 0, 20), 20),
    }
  )

  const handleDateChange = (newDate: DateRange | undefined) => {
    setInternalDate(newDate)
    onDateChange?.(newDate)
  }

  const displayDate = date || internalDate

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !displayDate && "text-muted-foreground"
            )}
            data-testid="button-date-range"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDate?.from ? (
              displayDate.to ? (
                <>
                  {format(displayDate.from, "LLL dd, y")} -{" "}
                  {format(displayDate.to, "LLL dd, y")}
                </>
              ) : (
                format(displayDate.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={displayDate?.from}
            selected={displayDate}
            onSelect={handleDateChange}
            numberOfMonths={2}
            data-testid="calendar-date-range"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}