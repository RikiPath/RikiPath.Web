import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import {
  getAdminMentors,
  createAdminMentor,
  setAdminMentorActive,
  unwrapApiList,
} from '../../api/admin.js';
import {
  UserCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Mail,
  Phone,
  Shield,
  X,
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Check,
  Info,
} from 'lucide-react';

export default function AdminConsultants() {
  const { pathname } = useLocation();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Modals
  const [isAddConsultantOpen, setIsAddConsultantOpen] = useState(false);
  const [consultantForm, setConsultantForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  // Schedule Modal State
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Thứ 2, 6 = Chủ Nhật

  const [submitting, setSubmitting] = useState(false);

  // Days of week generator
  const daysOfWeek = useMemo(() => {
    const days = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMon);

    return days.map((dayName, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      return {
        name: dayName,
        shortName: idx === 6 ? 'CN' : `T${idx + 2}`,
        dateStr: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        fullDate: date,
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  }, []);

  // Mock schedule generator based on consultant ID for display
  const consultantScheduleData = useMemo(() => {
    if (!selectedConsultant) return [];

    // Realistic time slots
    const slots = [
      { time: '08:30 - 09:15', period: 'Sáng' },
      { time: '09:30 - 10:15', period: 'Sáng' },
      { time: '10:30 - 11:15', period: 'Sáng' },
      { time: '14:00 - 14:45', period: 'Chiều' },
      { time: '15:00 - 15:45', period: 'Chiều' },
      { time: '16:00 - 16:45', period: 'Chiều' },
      { time: '19:00 - 19:45', period: 'Tối' },
      { time: '20:00 - 20:45', period: 'Tối' },
    ];

    // Seed mock data for each day
    return daysOfWeek.map((dayObj, dayIdx) => {
      const daySlots = slots.map((s, slotIdx) => {
        // Deterministic status simulation based on consultant id and indices
        const seed = (selectedConsultant.id * 17 + dayIdx * 7 + slotIdx * 3) % 10;
        let status = 'available'; // available, booked, break
        let bookingInfo = null;

        if (seed === 1 || seed === 4 || seed === 7) {
          status = 'booked';
          const studentNames = ['Nguyễn Văn Nam', 'Trần Thị Mai', 'Lê Hoàng Anh', 'Phạm Đức Minh', 'Đỗ Phương Thảo'];
          const packagesList = ['Tư vấn Lộ trình JLPT N2', 'Chiến thuật Đọc hiểu N3', 'Định hướng Du học & Việc làm', 'Khắc phục từ vựng SRS'];
          bookingInfo = {
            studentName: studentNames[(dayIdx + slotIdx) % studentNames.length],
            package: packagesList[(dayIdx + slotIdx) % packagesList.length],
            target: `JLPT N${(slotIdx % 3) + 1}`,
            statusText: slotIdx % 2 === 0 ? 'Đã xác nhận' : 'Hoàn thành',
          };
        } else if (seed === 9) {
          status = 'break';
        }

        return {
          id: `${dayIdx}-${slotIdx}`,
          ...s,
          status,
          bookingInfo,
        };
      });

      return {
        day: dayObj,
        slots: daySlots,
      };
    });
  }, [selectedConsultant, daysOfWeek]);

  // Fetch Consultants
  const fetchConsultantsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminMentors();
      const list = unwrapApiList(res);
      setConsultants(list);
    } catch (err) {
      console.error('Error fetching consultants:', err);
      setError(err.message || 'Không thể tải danh sách Consultant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultantsList();
  }, []);

  // Filter Consultants
  const filteredConsultants = useMemo(() => {
    if (!searchTerm.trim()) return consultants;
    const term = searchTerm.toLowerCase();
    return consultants.filter(
      (c) =>
        (c.firstName && c.firstName.toLowerCase().includes(term)) ||
        (c.lastName && c.lastName.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phoneNumber && c.phoneNumber.toLowerCase().includes(term))
    );
  }, [consultants, searchTerm]);

  // Handle Add Consultant Submit
  const handleAddConsultant = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdminMentor(consultantForm);
      showToast('Thêm Consultant mới thành công!', 'success');
      setIsAddConsultantOpen(false);
      setConsultantForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
      });
      fetchConsultantsList();
    } catch (err) {
      showToast(err.message || 'Lỗi khi thêm Consultant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Consultant Active Toggle
  const handleToggleConsultantActive = async (e, consultant) => {
    e.stopPropagation(); // Stop row click trigger
    const currentActive = consultant.isActive !== undefined ? consultant.isActive : true;
    const nextActive = !currentActive;

    // Optimistic update
    setConsultants((prev) =>
      prev.map((c) => (c.id === consultant.id ? { ...c, isActive: nextActive } : c))
    );

    try {
      await setAdminMentorActive(consultant.id, nextActive);
      showToast(`Đã ${nextActive ? 'kích hoạt' : 'vô hiệu hóa'} Consultant #${consultant.id}`, 'success');
    } catch (err) {
      // Revert optimistic update
      setConsultants((prev) =>
        prev.map((c) => (c.id === consultant.id ? { ...c, isActive: currentActive } : c))
      );
      showToast(err.message || 'Lỗi khi thay đổi trạng thái Consultant', 'error');
    }
  };

  return (
    <AdminShell pathname={pathname} breadcrumb="Quản lý Consultant">
      <div className="bg-[#FAF7F5] min-h-screen p-6 md:p-8 font-sans">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                  Quản lý Consultants
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Quản lý danh sách chuyên gia tư vấn và lịch làm việc / ca trực tư vấn
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchConsultantsList();
                showToast('Đã làm mới dữ liệu!', 'success');
              }}
              className="p-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm font-medium"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Làm mới</span>
            </button>

            <button
              onClick={() => setIsAddConsultantOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Consultant</span>
            </button>
          </div>
        </div>

        {/* Stat Cards Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Tổng Consultants
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {loading ? '...' : consultants.length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email Đã Xác Thực
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {loading ? '...' : consultants.filter((c) => c.isEmailVerified).length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Hoạt Động Kích Hoạt
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {loading
                  ? '...'
                  : consultants.filter((c) => c.isActive !== false).length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Lịch Làm Việc / Tuần
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {consultants.length * 56} Ca
              </h3>
            </div>
          </div>
        </div>

        {/* Main Table Container */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Danh sách Chuyên Gia Tư Vấn</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Nhấp vào hàng bất kỳ để xem chi tiết & Lịch tư vấn tuần này của Consultant
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, email, SĐT Consultant..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          {/* TABLE CONTENT */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                <p className="text-sm font-medium">Đang tải danh sách Consultant...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-rose-600 flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={fetchConsultantsList}
                  className="mt-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-200"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredConsultants.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                <Users className="w-10 h-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Không tìm thấy Consultant nào</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                    <th className="py-3.5 px-6">ID</th>
                    <th className="py-3.5 px-6">Họ và Tên</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Số Điện Thoại</th>
                    <th className="py-3.5 px-6">Xác Thực Email</th>
                    <th className="py-3.5 px-6">Ngày Tạo</th>
                    <th className="py-3.5 px-6 text-center">Lịch Làm Việc</th>
                    <th className="py-3.5 px-6 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {filteredConsultants.map((c) => {
                    const isActive = c.isActive !== undefined ? c.isActive : true;
                    const fullName = [c.lastName, c.firstName].filter(Boolean).join(' ') || 'N/A';
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedConsultant(c)}
                        className="hover:bg-rose-50/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-4 px-6 font-mono text-xs text-gray-400">#{c.id}</td>
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                                {fullName}
                              </p>
                              <p className="text-xs text-gray-400">Chuyên gia tư vấn</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{c.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{c.phoneNumber || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {c.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Đã xác thực
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <XCircle className="w-3.5 h-3.5 text-amber-500" />
                              Chờ xác thực
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-gray-500">
                          {c.createdDate
                            ? new Date(c.createdDate).toLocaleDateString('vi-VN')
                            : 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConsultant(c);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-xs hover:bg-purple-100 transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            <span>Xem Lịch Tuần</span>
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={(e) => handleToggleConsultantActive(e, c)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            title="Bấm để bật/tắt kích hoạt"
                          >
                            {isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-emerald-600" />
                                <span>Hoạt động</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                                <span>Vô hiệu</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MODAL 1: THÊM CONSULTANT MỚI */}
        {isAddConsultantOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-rose-600 font-bold">
                  <UserPlus className="w-5 h-5" />
                  <h3 className="text-lg text-gray-900">Thêm Consultant Mới</h3>
                </div>
                <button
                  onClick={() => setIsAddConsultantOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddConsultant} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={consultantForm.email}
                    onChange={(e) => setConsultantForm({ ...consultantForm, email: e.target.value })}
                    placeholder="consultant@rikipath.vn"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={consultantForm.password}
                    onChange={(e) =>
                      setConsultantForm({ ...consultantForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Họ (Last Name)
                    </label>
                    <input
                      type="text"
                      value={consultantForm.lastName}
                      onChange={(e) =>
                        setConsultantForm({ ...consultantForm, lastName: e.target.value })
                      }
                      placeholder="Nguyễn"
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Tên (First Name)
                    </label>
                    <input
                      type="text"
                      value={consultantForm.firstName}
                      onChange={(e) =>
                        setConsultantForm({ ...consultantForm, firstName: e.target.value })
                      }
                      placeholder="Văn A"
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={consultantForm.phoneNumber}
                    onChange={(e) =>
                      setConsultantForm({ ...consultantForm, phoneNumber: e.target.value })
                    }
                    placeholder="0912345678"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddConsultantOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Thêm Consultant</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: LỊCH LÀM VIỆC CỦA CONSULTANT (SCHEDULE VIEW) */}
        {selectedConsultant && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-rose-500 to-purple-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-xl text-white border border-white/30">
                    {([selectedConsultant.lastName, selectedConsultant.firstName]
                      .filter(Boolean)
                      .join(' ') || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">
                        {[selectedConsultant.lastName, selectedConsultant.firstName]
                          .filter(Boolean)
                          .join(' ') || 'Consultant'}
                      </h3>
                      <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-md">
                        ID #{selectedConsultant.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-white/80 text-xs mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {selectedConsultant.email}
                      </span>
                      {selectedConsultant.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {selectedConsultant.phoneNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedConsultant(null)}
                  className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Day Selector Navigation Bar */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Lịch tư vấn tuần này
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-200/80 shadow-sm">
                  {daysOfWeek.map((dayObj, idx) => {
                    const isSelected = selectedDayIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDayIndex(idx)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${isSelected
                          ? 'bg-rose-600 text-white shadow-md'
                          : dayObj.isToday
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <span className="text-[10px] opacity-80">{dayObj.shortName}</span>
                        <span>{dayObj.dateStr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Body - Time Slots Grid */}
              <div className="p-6 overflow-y-auto flex-1 bg-[#FAF7F5]">
                {/* Active Selected Day Overview Banner */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {daysOfWeek[selectedDayIndex].name} ({daysOfWeek[selectedDayIndex].dateStr})
                      </h4>
                      <p className="text-xs text-gray-500">
                        Chi tiết các ca trực tư vấn trong ngày
                      </p>
                    </div>
                  </div>

                  {/* Slot Status Legends */}
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Trống ({consultantScheduleData[selectedDayIndex]?.slots.filter((s) => s.status === 'available').length})
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      Đã Đặt ({consultantScheduleData[selectedDayIndex]?.slots.filter((s) => s.status === 'booked').length})
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                      Nghỉ
                    </span>
                  </div>
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {consultantScheduleData[selectedDayIndex]?.slots.map((slot) => {
                    const isBooked = slot.status === 'booked';
                    const isAvailable = slot.status === 'available';

                    return (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-2xl border transition-all ${isBooked
                          ? 'bg-white border-rose-200 shadow-sm'
                          : isAvailable
                            ? 'bg-white border-emerald-200/80 shadow-sm hover:border-emerald-400'
                            : 'bg-gray-100/70 border-gray-200 opacity-60'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className={`w-4 h-4 ${isBooked ? 'text-rose-600' : isAvailable ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <span className="font-bold text-gray-900 font-mono text-sm">
                              {slot.time}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isBooked
                              ? 'bg-rose-100 text-rose-700'
                              : isAvailable
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-200 text-gray-600'
                              }`}
                          >
                            {isBooked ? 'Đã đặt hẹn' : isAvailable ? 'Có thể đặt' : 'Tạm nghỉ'}
                          </span>
                        </div>

                        {isBooked && slot.bookingInfo && (
                          <div className="mt-3 pt-3 border-t border-rose-100 bg-rose-50/50 p-3 rounded-xl text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">
                                Học viên: {slot.bookingInfo.studentName}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                                {slot.bookingInfo.target}
                              </span>
                            </div>
                            <p className="text-gray-600 text-xs">
                              Gói: <span className="font-medium text-gray-800">{slot.bookingInfo.package}</span>
                            </p>
                            <p className="text-emerald-700 text-[11px] font-semibold pt-1 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Trạng thái: {slot.bookingInfo.statusText}
                            </p>
                          </div>
                        )}

                        {isAvailable && (
                          <p className="text-xs text-emerald-600 mt-2 font-medium">
                            ✓ Khung giờ sẵn sàng cho học viên đặt lịch
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>Dữ liệu lịch làm việc đồng bộ trực tiếp với hệ thống đặt lịch tư vấn</span>
                </div>
                <button
                  onClick={() => setSelectedConsultant(null)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl text-xs transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
