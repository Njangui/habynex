import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, isBefore, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyCalendarProps {
  availableFrom?: string | null;
  availableTo?: string | null;
  isAvailable: boolean;
}

const PropertyCalendar = ({ availableFrom, availableTo, isAvailable }: PropertyCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const availableFromDate = availableFrom ? new Date(availableFrom) : null;
  const availableToDate = availableTo ? new Date(availableTo) : null;

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const isDayAvailable = (day: Date) => {
    if (!isAvailable) return false;
    if (isBefore(day, today)) return false;
    
    if (availableFromDate && isBefore(day, availableFromDate)) return false;
    if (availableToDate && isBefore(availableToDate, day)) return false;
    
    return true;
  };

  const isDayInRange = (day: Date) => {
    if (!availableFromDate || !availableToDate) return false;
    return isWithinInterval(day, { start: availableFromDate, end: availableToDate });
  };

  // Get day of week for first day (0 = Sunday, adjust for Monday start)
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Disponibilité</h3>
        </div>
        
        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isAvailable 
            ? "bg-success/10 text-success" 
            : "bg-destructive/10 text-destructive"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isAvailable ? "bg-success" : "bg-destructive"
          }`} />
          {isAvailable ? "Disponible" : "Non disponible"}
        </div>

        {availableFromDate && (
          <p className="text-sm text-muted-foreground mt-2">
            À partir du {format(availableFromDate, "d MMMM yyyy", { locale: fr })}
            {availableToDate && ` jusqu'au ${format(availableToDate, "d MMMM yyyy", { locale: fr })}`}
          </p>
        )}
      </div>

      {/* Calendar */}
      <div className="p-4 bg-card">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevMonth}
            disabled={isSameMonth(currentMonth, today)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for alignment */}
          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Actual days */}
          {days.map((day) => {
            const available = isDayAvailable(day);
            const isToday = isSameDay(day, today);
            const isPast = isBefore(day, today);
            const inRange = isDayInRange(day);

            return (
              <div
                key={day.toISOString()}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-colors ${
                  isPast
                    ? "text-muted-foreground/40"
                    : available
                    ? inRange
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-success/10 text-success hover:bg-success/20"
                    : "text-muted-foreground"
                } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-success/20" />
            <span className="text-xs text-muted-foreground">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-muted" />
            <span className="text-xs text-muted-foreground">Non disponible</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCalendar;
