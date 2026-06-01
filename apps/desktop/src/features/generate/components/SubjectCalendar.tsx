type CalendarDay = {
  date: string | null;
  day: number | "";
  generated: boolean;
  active: boolean;
};

type SubjectCalendarProps = {
  monthTitle: string;
  days: CalendarDay[];
  generatedDates: string[];
  onSelectDate: (date: string) => void;
  onResetDate: (date: string) => void;
};

export function SubjectCalendar({ monthTitle, days, generatedDates, onSelectDate, onResetDate }: SubjectCalendarProps) {
  return (
    <aside className="subject-calendar glass-panel" aria-label="科目日历">
      <header className="inspector-header">
        <h2>{monthTitle}</h2>
      </header>
      <div className="mini-calendar">
        {days.map((day, index) => {
          const currentDate = day.date;
          return currentDate ? (
            <button
              aria-label={`${currentDate}${day.generated ? " 已生成" : ""}`}
              className={calendarDayClassName(day)}
              key={currentDate}
              type="button"
              onClick={() => onSelectDate(currentDate)}
            >
              {day.day}
            </button>
          ) : (
            <span className="calendar-day" key={`blank-${index}`} />
          );
        })}
      </div>
      <div className="generated-history">
        <div className="generated-history-title">生成记录</div>
        {generatedDates.length > 0 ? (
          generatedDates.map((date) => (
            <button
              aria-label={`重置 ${date}`}
              className="generated-history-row"
              key={date}
              type="button"
              onClick={() => onResetDate(date)}
            >
              <span>{date}</span>
              <strong>重置</strong>
            </button>
          ))
        ) : (
          <span className="generated-history-empty">暂无记录</span>
        )}
      </div>
    </aside>
  );
}

function calendarDayClassName(day: CalendarDay) {
  return [
    "calendar-day",
    day.active ? "calendar-day-active" : "",
    day.generated ? "calendar-day-generated" : ""
  ]
    .filter(Boolean)
    .join(" ");
}
