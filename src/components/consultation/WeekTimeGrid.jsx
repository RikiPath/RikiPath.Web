import { Link } from 'react-router-dom';

const HOUR_HEIGHT = 52;

function minutePart(value) {
  const minute = Number(value);
  return Number.isFinite(minute) ? minute : 0;
}

function minutesOf(event) {
  const start = event.startHour * 60 + minutePart(event.startMinute);
  let end = event.endHour * 60 + minutePart(event.endMinute);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

const tones = {
  ghost: 'border border-dashed border-[#E4D5DC] bg-white/70 text-[#B09AA4] hover:bg-[#FCF4F8]',
  selected: 'border-l-4 border-[#AD3155] bg-[#FCE8F0] text-[#8B2344]',
  open: 'border-l-4 border-[#2F6B45] bg-[#E7F6EC] text-[#1E5C36]',
  booked: 'border-l-4 border-[#7A3E98] bg-[#F4E9F8] text-[#5C2E73]',
  pending: 'border-l-4 border-[#C47B16] bg-[#FFF6E8] text-[#8A5A10]',
  session: 'border-l-4 border-[#AD3155] bg-[#FDE8F0] text-[#8E2948]',
};

function overlaps(a, b) {
  const left = minutesOf(a);
  const right = minutesOf(b);
  return left.start < right.end && right.start < left.end;
}

function layoutEvents(events, stackOverlaps) {
  const sorted = [...events].sort((a, b) => minutesOf(a).start - minutesOf(b).start || minutesOf(a).end - minutesOf(b).end);
  const placed = [];
  sorted.forEach((event) => {
    const overlapping = placed.filter((item) => overlaps(item, event));
    if (stackOverlaps) {
      placed.push({ ...event, row: overlapping.length, col: 0 });
      return;
    }
    const used = new Set(overlapping.map((item) => item.col));
    let col = 0;
    while (used.has(col)) col += 1;
    placed.push({ ...event, col, row: 0 });
  });
  return placed.map((event) => {
    const cluster = placed.filter((item) => overlaps(item, event));
    if (!stackOverlaps) {
      return { ...event, cols: Math.max(...cluster.map((item) => item.col)) + 1, rows: 1 };
    }
    const rows = Math.max(...cluster.map((item) => item.row)) + 1;
    return {
      ...event,
      cols: 1,
      rows,
      stackStart: Math.min(...cluster.map((item) => minutesOf(item).start)),
      stackEnd: Math.max(...cluster.map((item) => minutesOf(item).end)),
    };
  });
}

function EventBlock({ event, startHour, hourHeight }) {
  const { start, end } = minutesOf(event);
  const stacked = event.rows > 1;
  const spanStart = stacked ? event.stackStart : start;
  const spanEnd = stacked ? event.stackEnd : end;
  const span = ((spanEnd - spanStart) / 60) * hourHeight;
  const slice = stacked ? span / event.rows : span;
  const top = ((spanStart - startHour * 60) / 60) * hourHeight + (stacked ? event.row * slice : 0) + 1;
  const height = Math.max(slice - 2, 22);
  const width = `calc(${100 / event.cols}% - 6px)`;
  const left = `calc(${(event.col / event.cols) * 100}% + 3px)`;
  const className = `absolute overflow-hidden rounded-lg px-2 py-1 text-left leading-tight ${event.className || tones[event.tone] || tones.selected} ${event.onClick || event.href ? 'cursor-pointer' : ''}`;
  const style = { top, height, width, left, zIndex: Math.max(event.z || 1, 1) + 5 };
  const body = (
    <>
      <span className="block truncate text-[12px] font-semibold tracking-tight">{event.title}</span>
      {height >= 32 && event.detail ? <span className="mt-0.5 block truncate text-[10px] font-medium opacity-70">{event.detail}</span> : null}
    </>
  );
  if (event.href) {
    return (
      <Link to={event.href} className={className} style={style}>
        {body}
      </Link>
    );
  }
  if (event.onClick) {
    return (
      <button type="button" disabled={event.disabled} onClick={event.onClick} className={`${className} disabled:cursor-default`} style={style}>
        {body}
      </button>
    );
  }
  return (
    <div className={className} style={style}>
      {body}
    </div>
  );
}

export default function WeekTimeGrid({
  days,
  events = [],
  startHour = 8,
  endHour = 22,
  nowKey,
  nowMinutes,
  stackOverlaps = false,
}) {
  const bounds = events.reduce((range, event) => {
    const { start, end } = minutesOf(event);
    return {
      start: Math.min(range.start, Math.floor(start / 60)),
      end: Math.max(range.end, Math.ceil(end / 60)),
    };
  }, { start: startHour, end: endHour });
  const firstHour = Math.max(0, Math.min(bounds.start, 23));
  const lastHour = Math.max(firstHour + 1, Math.min(bounds.end, 24));
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);
  const height = hours.length * HOUR_HEIGHT;
  const showNow = nowKey && nowMinutes >= firstHour * 60 && nowMinutes <= lastHour * 60;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E6E0E4] bg-white">
      <div className="min-w-[860px]">
        <div className="grid border-b border-[#E6E0E4]" style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}>
          <div />
          {days.map((day) => (
            <div key={day.key} className="border-l border-[#F0E7EC] px-2 py-2 text-center">
              <p className="text-[11px] uppercase tracking-wide text-[#A08B96]">{day.name}</p>
              <p className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-semibold ${day.today ? 'bg-[#AD3155] text-white' : 'text-[#49353F]'}`}>
                {day.date}
              </p>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}>
          <div className="relative" style={{ height }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-2 text-[11px] leading-none text-[#B09AA4]"
                style={{ top: (hour - firstHour) * HOUR_HEIGHT + 10 }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.key} className={`relative overflow-hidden border-l border-[#F0E7EC] ${day.today ? 'bg-[#FFF8FB]' : ''}`} style={{ height }}>
              {hours.map((hour) => (
                <div key={hour} className="pointer-events-none absolute inset-x-0 z-0 h-px bg-[#F3EDF0]" style={{ top: (hour - firstHour) * HOUR_HEIGHT }} />
              ))}
              {showNow && day.key === nowKey ? (
                <div className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-[#AD3155]" style={{ top: ((nowMinutes - firstHour * 60) / 60) * HOUR_HEIGHT }}>
                  <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#AD3155]" />
                </div>
              ) : null}
              {layoutEvents(events.filter((event) => event.dayKey === day.key), stackOverlaps).map((event) => (
                <EventBlock key={event.id} event={event} startHour={firstHour} hourHeight={HOUR_HEIGHT} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
