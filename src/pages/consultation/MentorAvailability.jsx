import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client.js";
import { ConsultShell } from "../../components/shells";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(slots) {
  const map = {};
  for (const slot of slots) {
    const day = slot.startTime.slice(0, 10);
    if (!map[day]) map[day] = [];
    map[day].push(slot);
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }
  return map;
}

function SlotCard({ slot }) {
  const booked = slot.isBooked;

  return (
    <div
      className={`relative rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:-translate-y-0.5 ${
        booked
          ? "bg-gradient-to-br from-[#fff4f0] to-[#fde8e8] border-[#f5c6c6] shadow-[0_4px_16px_rgba(217,75,104,0.08)]"
          : "bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] border-[#86efac] shadow-[0_4px_16px_rgba(34,197,94,0.08)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            booked
              ? "bg-[#fee2e2] text-[#b91c1c]"
              : "bg-[#dcfce7] text-[#15803d]"
          }`}
        >
          {booked ? (
            <span className="flex items-center gap-1">
              <Lock size={12} /> Da dat
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} /> Trong
            </span>
          )}
        </span>
        <span className="text-[11px] text-gray-400 font-mono">#{slot.id}</span>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Clock size={16} className="text-gray-500 shrink-0" />
        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
      </div>

      {slot.mentorName && (
        <div className="text-xs text-gray-500">
          Mentor: <span className="font-semibold text-gray-700">{slot.mentorName}</span>
        </div>
      )}

      {booked && (
        <div className="mt-auto pt-2 border-t border-[#f5c6c6]">
          {slot.meetingUrl ? (
            <a
              href={slot.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D94B68] hover:text-[#9E2A4B] transition-colors"
            >
              <Video size={14} />
              Vao phong hop
              <ExternalLink size={12} />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 italic">
              <Video size={14} />
              Link meeting se cap nhat sau
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function MentorAvailability() {
  const { pathname } = useLocation();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchAvailability() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/mentor/availability");
      const list = res?.result ?? (Array.isArray(res) ? res : []);
      setSlots(list);
    } catch (err) {
      setError(err.message || "Khong tai duoc lich kha dung.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAvailability();
  }, []);

  const grouped = groupByDate(slots);
  const sortedDays = Object.keys(grouped).sort();
  const totalSlots = slots.length;
  const bookedSlots = slots.filter((s) => s.isBooked).length;
  const freeSlots = totalSlots - bookedSlots;

  return (
    <ConsultShell pathname={pathname} breadcrumb="Lich kha dung">
      <div
        className="min-h-screen bg-[#FAF7F5] text-gray-900 antialiased"
        data-page="MentorAvailability"
      >
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <Calendar size={24} className="text-[#D94B68]" />
                Lich kha dung cua Mentor
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Xem cac khung gio da dat va con trong cua ban
              </p>
            </div>
            <button
              onClick={fetchAvailability}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Lam moi
            </button>
          </div>

          {!loading && !error && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Tong slots", value: totalSlots, color: "text-gray-800", bg: "bg-white border-gray-200" },
                { label: "Da dat", value: bookedSlots, color: "text-[#b91c1c]", bg: "bg-[#fff4f0] border-[#f5c6c6]" },
                { label: "Con trong", value: freeSlots, color: "text-[#15803d]", bg: "bg-[#f0fdf4] border-[#86efac]" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border p-4 text-center shadow-sm ${s.bg}`}>
                  <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#D94B68]/20 border-t-[#D94B68] animate-spin" />
              <p className="text-sm text-gray-500">Dang tai lich kha dung...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Khong tai duoc du lieu</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <button
                  onClick={fetchAvailability}
                  className="mt-3 text-xs font-semibold text-red-700 underline underline-offset-2 hover:no-underline"
                >
                  Thu lai
                </button>
              </div>
            </div>
          )}

          {!loading && !error && slots.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <Calendar size={48} className="text-gray-300" />
              <p className="text-lg font-semibold text-gray-500">Chua co lich nao</p>
              <p className="text-sm text-gray-400">
                Lich kha dung cua ban se xuat hien o day sau khi duoc tao.
              </p>
            </div>
          )}

          {!loading && !error && sortedDays.length > 0 && (
            <div className="space-y-8">
              {sortedDays.map((day) => (
                <section key={day}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
                      <Calendar size={14} className="text-[#D94B68]" />
                      <span className="text-xs font-bold text-gray-700 capitalize">
                        {formatDate(grouped[day][0].startTime)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {grouped[day].length} slots
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grouped[day].map((slot) => (
                      <SlotCard key={slot.id} slot={slot} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </ConsultShell>
  );
}
