import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import { usePagination } from '../../hooks/usePagination.js';
import Pagination from '../../components/Pagination.jsx';
import {
  getConsultationPackages,
  createConsultationPackage,
  updateConsultationPackage,
  togglePackageActive,
} from '../../api/adminConsultantsApi';
import {
  PackagePlus,
  Edit3,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Clock,
  DollarSign,
  X,
  Layers,
} from 'lucide-react';

export default function AdminPackages() {
  const { pathname } = useLocation();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Modals
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    type: 'Meeting',
    price: 150000,
    durationMinutes: 45,
  });

  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [editPackageForm, setEditPackageForm] = useState({
    name: '',
    description: '',
    price: 150000,
    durationMinutes: 45,
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch Packages
  const fetchPackagesList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getConsultationPackages();
      const list = res?.result || (Array.isArray(res) ? res : []);
      setPackages(list);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError(err.message || 'Không thể tải danh sách Package');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagesList();
  }, []);

  // Filter Packages
  const filteredPackages = useMemo(() => {
    if (!searchTerm.trim()) return packages;
    const term = searchTerm.toLowerCase();
    return packages.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.type && p.type.toLowerCase().includes(term))
    );
  }, [packages, searchTerm]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedData: packagesOnPage,
  } = usePagination(filteredPackages, { initialPage: 1, initialPageSize: 5 });

  // Handle Add Package Submit

  const handleAddPackage = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...packageForm,
        price: Number(packageForm.price),
        durationMinutes: Number(packageForm.durationMinutes),
      };
      await createConsultationPackage(payload);
      showToast('Tạo Package mới thành công!', 'success');
      setIsAddPackageOpen(false);
      setPackageForm({
        name: '',
        description: '',
        type: 'Meeting',
        price: 150000,
        durationMinutes: 45,
      });
      fetchPackagesList();
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo Package', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Package Modal
  const openEditPackageModal = (pkg) => {
    setEditingPackageId(pkg.id);
    setEditPackageForm({
      name: pkg.name || '',
      description: pkg.description || '',
      price: pkg.price || 0,
      durationMinutes: pkg.durationMinutes || 30,
    });
    setIsEditPackageOpen(true);
  };

  // Handle Edit Package Submit
  const handleEditPackage = async (e) => {
    e.preventDefault();
    if (!editingPackageId) return;
    setSubmitting(true);
    try {
      const payload = {
        ...editPackageForm,
        price: Number(editPackageForm.price),
        durationMinutes: Number(editPackageForm.durationMinutes),
      };
      await updateConsultationPackage(editingPackageId, payload);
      showToast('Cập nhật thông tin Package thành công!', 'success');
      setIsEditPackageOpen(false);
      fetchPackagesList();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật Package', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Package Active Toggle
  const handleTogglePackageActive = async (pkg) => {
    const nextActive = !pkg.isActive;

    // Optimistic update
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, isActive: nextActive } : p))
    );

    try {
      await togglePackageActive(pkg.id, nextActive);
      showToast(`Đã ${nextActive ? 'bật' : 'tắt'} kích hoạt Package "${pkg.name}"`, 'success');
    } catch (err) {
      // Revert optimistic update
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, isActive: pkg.isActive } : p))
      );
      showToast(err.message || 'Lỗi khi thay đổi trạng thái Package', 'error');
    }
  };

  // Format currency
  const formatPrice = (val) => {
    if (typeof val !== 'number') return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <AdminShell pathname={pathname} breadcrumb="Quản lý Gói tư vấn">
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
              <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                  Quản lý Gói Tư Vấn (Packages)
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Quản lý các gói dịch vụ tư vấn trực tuyến và trả lời câu hỏi chuyên sâu
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchPackagesList();
                showToast('Đã làm mới dữ liệu!', 'success');
              }}
              className="p-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm font-medium"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Làm mới</span>
            </button>

            <button
              onClick={() => setIsAddPackageOpen(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Tạo Package Mới</span>
            </button>
          </div>
        </div>

        {/* Stat Cards Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Tổng Số Packages
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {loading ? '...' : packages.length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Đang Kích Hoạt
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {loading ? '...' : packages.filter((p) => p.isActive).length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Gặp Trực Tuyến (Meeting)
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {loading ? '...' : packages.filter((p) => p.type === 'Meeting').length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Trả Lời Văn Bản (Written)
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {loading ? '...' : packages.filter((p) => p.type === 'WrittenAnswer').length}
              </h3>
            </div>
          </div>
        </div>

        {/* Main Table Container */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Danh Sách Các Gói Tư Vấn</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Cấu hình giá cả, thời lượng và bật/tắt hiển thị gói tư vấn
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm Package (Tên, mô tả, hình thức)..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* TABLE CONTENT */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                <p className="text-sm font-medium">Đang tải danh sách Gói tư vấn...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-rose-600 flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={fetchPackagesList}
                  className="mt-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-200"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                <Layers className="w-10 h-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Không tìm thấy Package nào</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                    <th className="py-3.5 px-6">ID</th>
                    <th className="py-3.5 px-6">Tên Package</th>
                    <th className="py-3.5 px-6">Phân Loại</th>
                    <th className="py-3.5 px-6">Thời Lượng</th>
                    <th className="py-3.5 px-6">Giá Niêm Yết</th>
                    <th className="py-3.5 px-6">Trạng Thái</th>
                    <th className="py-3.5 px-6 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {packagesOnPage.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-gray-400">#{pkg.id}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-gray-900">{pkg.name || 'Gói chưa đặt tên'}</p>
                          <p className="text-xs text-gray-500 line-clamp-1 max-w-xs mt-0.5">
                            {pkg.description || 'Không có mô tả'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {pkg.type === 'Meeting' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            Gặp mặt trực tuyến (Meeting)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Edit3 className="w-3 h-3 text-purple-600" />
                            Trả lời văn bản (Written)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{pkg.durationMinutes || 0} phút</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-rose-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                          <span>{formatPrice(pkg.price)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleTogglePackageActive(pkg)}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl font-medium text-xs transition-all ${pkg.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {pkg.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              <span>Kích hoạt</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                              <span>Tắt</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openEditPackageModal(pkg)}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                          title="Chỉnh sửa thông tin Package"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredPackages.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20]}
              itemLabel="gói tư vấn"
              variant="admin"
            />
          )}
        </div>


        {/* MODAL 1: TẠO PACKAGE MỚI */}
        {isAddPackageOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-purple-600 font-bold">
                  <PackagePlus className="w-5 h-5" />
                  <h3 className="text-lg text-gray-900">Tạo Package Mới</h3>
                </div>
                <button
                  onClick={() => setIsAddPackageOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPackage} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tên Package <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                    placeholder="VD: Tư vấn lộ trình JLPT N2 (45 phút)"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Mô tả gói tư vấn
                  </label>
                  <textarea
                    rows={3}
                    value={packageForm.description}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, description: e.target.value })
                    }
                    placeholder="Mô tả chi tiết quyền lợi và nội dung buổi tư vấn..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phân Loại hình thức tư vấn <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={packageForm.type}
                    onChange={(e) => setPackageForm({ ...packageForm, type: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Meeting">Gặp mặt trực tuyến (Meeting)</option>
                    <option value="WrittenAnswer">Trả lời câu hỏi văn bản (WrittenAnswer)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Giá niêm yết (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      required
                      value={packageForm.price}
                      onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Thời lượng (Phút) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={5}
                      required
                      value={packageForm.durationMinutes}
                      onChange={(e) =>
                        setPackageForm({ ...packageForm, durationMinutes: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddPackageOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang tạo...</span>
                      </>
                    ) : (
                      <>
                        <PackagePlus className="w-4 h-4" />
                        <span>Tạo Package</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CHỈNH SỬA PACKAGE */}
        {isEditPackageOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-purple-600 font-bold">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="text-lg text-gray-900">Cập nhật Package #{editingPackageId}</h3>
                </div>
                <button
                  onClick={() => setIsEditPackageOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditPackage} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tên Package
                  </label>
                  <input
                    type="text"
                    required
                    value={editPackageForm.name}
                    onChange={(e) => setEditPackageForm({ ...editPackageForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Mô tả gói tư vấn
                  </label>
                  <textarea
                    rows={3}
                    value={editPackageForm.description}
                    onChange={(e) =>
                      setEditPackageForm({ ...editPackageForm, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Giá niêm yết (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      required
                      value={editPackageForm.price}
                      onChange={(e) =>
                        setEditPackageForm({ ...editPackageForm, price: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Thời lượng (Phút)
                    </label>
                    <input
                      type="number"
                      min={5}
                      required
                      value={editPackageForm.durationMinutes}
                      onChange={(e) =>
                        setEditPackageForm({ ...editPackageForm, durationMinutes: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditPackageOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Cập nhật</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
