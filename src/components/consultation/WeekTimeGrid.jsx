import { Link } from 'react-router-dom';

const HOUR_HEIGHT = 52;

function minutesOf(event) {
  return {
    start: event.startHour * 60 + (event.startMinute || 0),
    end: event.endHour * 60 + (event.endMinute || 0),
  };
}

const tones = {
  ghost: 'border border-dashed border-[#E4D5DC] bg-white/70 text-[#B09AA4] hover:bg-[#FCF4F8]',
  selected: 'border-l-4 border-[#AD3155] bg-[#FCE8F0] text-[#8B2344]',
  open: 'border-l-4 border-[#2F6B45] bg-[#E7F6EC] text-[#1E5C36]',
  booked: 'border-l-4 border-[#7A3E98] bg-[#F4E9F8] text-[#5C2E73]',
  pending: 'border-l-4 border-[#C47B16] bg-[#FFF6E8] text-[#8A5A10]',
  session: 'border-l-4 border-[#AD3155] bg-[#AD3155] text-white',
};

function EventBlock({ event, startHour, hourHeight }) {
  const { start, end } = minutesOf(event);
  const top = ((start - startHour * 60) / 60) * hourHeight;
  const height = Math.max(((end - start) / 60) * hourHeight - 2, 22);
  const className = `absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-4 ${tones[event.tone] || tones.selected} ${event.onClick || event.href ? 'cursor-pointer' : ''}`;
  const style = { top, height, zIndex: event.z || 1 };
  const body = (
    <>
      <span className="block truncate font-semibold">{event.title}</span>
      {height >= 36 && event.detail ? <span className="block truncate opacity-80">{event.detail}</span> : null}
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
}) {
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const height = hours.length * HOUR_HEIGHT;
  const showNow = nowKey && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

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
                className="absolute right-2 -translate-y-1/2 text-[11px] text-[#B09AA4]"
                style={{ top: (hour - startHour) * HOUR_HEIGHT }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.key} className={`relative border-l border-[#F0E7EC] ${day.today ? 'bg-[#FFF8FB]' : ''}`} style={{ height }}>
              {hours.map((hour) => (
                <div key={hour} className="absolute inset-x-0 border-t border-[#F3EDF0]" style={{ top: (hour - startHour) * HOUR_HEIGHT }} />
              ))}
              {showNow && day.key === nowKey ? (
                <div className="absolute inset-x-0 z-20 border-t-2 border-[#AD3155]" style={{ top: ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT }}>
                  <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#AD3155]" />
                </div>
              ) : null}
              {events.filter((event) => event.dayKey === day.key).map((event) => (
                <EventBlock key={event.id} event={event} startHour={startHour} hourHeight={HOUR_HEIGHT} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
