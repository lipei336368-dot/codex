import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

type PreviewCalendarDay = {
  date: string | null;
  day: number | "";
  generated: boolean;
  selected: boolean;
  today: boolean;
};

type PreviewDateCalendarProps = {
  selectedDate: string;
  generatedDates: string[];
  onSelectDate: (date: string) => void;
};

const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

export function PreviewDateCalendar({ selectedDate, generatedDates, onSelectDate }: PreviewDateCalendarProps) {
  const [draftDate, setDraftDate] = useState(selectedDate);
  const selected = parseIsoDate(selectedDate) ?? new Date();
  const generatedDateSet = new Set(generatedDates);
  const calendarDays = buildMonthCalendar(selected, selectedDate, generatedDateSet);
  const monthTitle = `${selected.getFullYear()}年${selected.getMonth() + 1}月`;
  const today = todayIsoDate();

  useEffect(() => {
    setDraftDate(selectedDate);
  }, [selectedDate]);

  function shiftMonth(offset: number) {
    const next = new Date(selected.getFullYear(), selected.getMonth() + offset, 1);
    onSelectDate(todayIsoDate(next));
  }

  return (
    <aside className="preview-date-panel" aria-label="生成日期设置">
      <header className="preview-date-panel-header">
        <CalendarDays size={22} />
        <h3>生成设置</h3>
      </header>

      <label className="preview-date-input-label" htmlFor="preview-publish-date">
        生成日期
      </label>
      <div className="preview-date-row">
        <label className="preview-date-input-shell" htmlFor="preview-publish-date">
          <CalendarDays size={20} />
          <input
            className="preview-date-input"
            id="preview-publish-date"
            type="text"
            inputMode="numeric"
            value={draftDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setDraftDate(nextDate);
              if (/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
                onSelectDate(nextDate);
              }
            }}
            onBlur={() => {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) {
                setDraftDate(selectedDate);
              }
            }}
          />
        </label>
        <button className="preview-today-button" type="button" onClick={() => onSelectDate(today)}>
          今天
        </button>
      </div>

      <div className="preview-calendar-header">
        <button aria-label="上个月" className="preview-calendar-nav" type="button" onClick={() => shiftMonth(-1)}>
          ‹
        </button>
        <strong>{monthTitle}</strong>
        <button aria-label="下个月" className="preview-calendar-nav" type="button" onClick={() => shiftMonth(1)}>
          ›
        </button>
      </div>

      <div className="preview-calendar-weekdays">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="preview-calendar-grid">
        {calendarDays.map((day, index) =>
          day.date ? (
            <button
              aria-label={[
                day.date,
                day.selected ? "已选择" : "",
                day.today ? "今天" : "",
                day.generated ? "已生成" : "未生成"
              ]
                .filter(Boolean)
                .join(" ")}
              className={calendarDayClassName(day)}
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date as string)}
            >
              <span>{day.day}</span>
            </button>
          ) : (
            <span className="preview-calendar-day preview-calendar-day-empty" key={`blank-${index}`} />
          )
        )}
      </div>

      <div className="preview-calendar-legend">
        <span>
          <i className="legend-dot legend-dot-generated" /> 已生成
        </span>
        <span>
          <i className="legend-dot legend-dot-today" /> 今天
        </span>
        <span>
          <i className="legend-dot legend-dot-selected" /> 当前选择
        </span>
      </div>
    </aside>
  );
}

function calendarDayClassName(day: PreviewCalendarDay) {
  return [
    "preview-calendar-day",
    day.generated ? "preview-calendar-day-generated" : "",
    day.today ? "preview-calendar-day-today" : "",
    day.selected ? "preview-calendar-day-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function buildMonthCalendar(date: Date, selectedDate: string, generatedDates: Set<string>) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const today = todayIsoDate();
  const days: PreviewCalendarDay[] = Array.from({ length: leadingBlanks }, () => ({
    date: null,
    day: "",
    generated: false,
    selected: false,
    today: false
  }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = todayIsoDate(new Date(year, month, day));
    days.push({
      date: current,
      day,
      generated: generatedDates.has(current),
      selected: current === selectedDate,
      today: current === today
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ date: null, day: "", generated: false, selected: false, today: false });
  }

  return days;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function todayIsoDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
