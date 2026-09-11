import { useEffect } from 'react';
import { AdminShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function AdminRoles() {
  const { pathname } = useLocation();
  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') { try { fn(); } catch (err) { console.warn(err); } return; }
      return orig(type, fn, opts);
    };
    try {
      // Simple state management and interactive feedback
        const mockUsers = {
          1: { name: 'Takahashi Mayumi', role: 'Chuyên gia tư vấn N3-N1 (Sensei Tokyo)' },
          2: { name: 'Đặng Hoàng Minh', role: 'Tác giả nội dung CMS (Content Lead)' },
          3: { name: 'Lan-san (Nguyễn Hương Lan)', role: 'Học viên JLPT N3 (Active Pathway)' },
          4: { name: 'Vận hành Kỹ thuật', role: 'Quản trị viên hệ thống (SecOps Root)' }
        };
      
        function selectUserRow(id) {
          const user = mockUsers[id];
          if (!user) return;
          const nameElem = document.getElementById('inspectUserName');
          const roleElem = document.getElementById('inspectUserRole');
          if (nameElem && roleElem) {
            nameElem.textContent = user.name;
            roleElem.textContent = user.role;
            showToast('Đang xem cấu hình phân quyền của: ' + user.name);
          }
        }
      
        function showToast(message) {
          const toast = document.getElementById('toastNotification');
          const toastMsg = document.getElementById('toastMsg');
          if (toast && toastMsg) {
            toastMsg.textContent = message;
            toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
            toast.classList.add('translate-y-0', 'opacity-100');
            setTimeout(() => {
              toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
              toast.classList.remove('translate-y-0', 'opacity-100');
            }, 2600);
          }
        }
      
        function saveMatrixAlert() {
          showToast('Đã lưu thành công Ma trận quyền hạn vào Cloud Database.');
        }
      
        // Interactive buttons hooks
        document.getElementById('btnCreateUser')?.addEventListener('click', () => {
          showToast('Mở trình tạo tài khoản & thiết lập mã bảo mật 2FA...');
        });
      
        document.getElementById('btnBatchAssign')?.addEventListener('click', () => {
          showToast('Chọn nhóm học viên hoặc giảng viên để phân vai trò hàng loạt.');
        });
      
        document.getElementById('btnAuditLog')?.addEventListener('click', () => {
          showToast('Đang trích xuất Audit Logs định dạng bảo mật...');
        });
      
        // Client-side quick filter simulation
        const searchInput = document.getElementById('searchInput');
        searchInput?.addEventListener('input', (e) => {
          const term = e.target.value.toLowerCase();
          const rows = document.querySelectorAll('#userTableBody tr');
          rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            if (text.includes(term)) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          });
        });
    } catch (err) { console.warn('Stitch script:', err); }
    document.addEventListener = orig;
  }, []);

  return (
    <AdminShell pathname={pathname} breadcrumb="Vai trò & quyền">
<div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen" data-page="AdminRoles" data-shell-unified="1">

<div className="pl-0"><main className="w-full pt-0 bg-surface px-space-xl py-space-xl"><div className="flex flex-col w-full">
{/*  Subtle decorative ambient blossom field inside bounds  */}
<div className="relative w-full overflow-hidden">
<div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-secondary-container/30 blur-3xl pointer-events-none"></div>
<div className="absolute top-48 left-1/3 w-64 h-64 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none"></div>
{/*  Header Section with Zen Ma Spacing & Asymmetry  */}
<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-2xl">
<div className="flex flex-col max-w-2xl">
<div className="flex items-center gap-space-xs mb-space-xs">
<span className="inline-flex items-center px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm">
<span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-ping"></span>
            RBAC Core 2.4
          </span>
<span className="text-outline font-label-sm text-label-sm">/</span>
<span className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">Bảo mật Học thuật</span>
</div>
<h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
          Quản lý Người dùng & Phân quyền Hệ thống
        </h1>
<p className="font-body-md text-body-md text-on-surface-variant mt-space-xs leading-relaxed">
          Thiết lập vai trò, quyền hạn truy cập dữ liệu học viên và phân chia thẩm quyền kiểm định cho Giảng viên, Biên tập viên & Chuyên gia tư vấn RikiPath.
        </p>
</div>
{/*  Action Buttons Bar  */}
<div className="flex flex-wrap items-center gap-space-xs">
<button className="flex items-center gap-space-xs px-space-md py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg shadow-sm transition-all duration-200" id="btnAuditLog">
<span className="material-symbols-outlined text-[18px] text-on-surface-variant">security_update_good</span>
<span>Nhật ký bảo mật</span>
</button>
<button className="flex items-center gap-space-xs px-space-md py-2.5 rounded-full bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-container font-label-lg text-label-lg shadow-sm transition-all duration-200" id="btnBatchAssign">
<span className="material-symbols-outlined text-[18px]">group_add</span>
<span>Phân vai trò hàng loạt</span>
</button>
<button className="flex items-center gap-space-xs px-space-md py-2.5 rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-[0_6px_20px_rgba(217,75,104,0.35)] hover:bg-primary-container transition-all duration-200 hover:-translate-y-0.5" id="btnCreateUser">
<span className="material-symbols-outlined text-[18px]">person_add</span>
<span>Thêm tài khoản mới</span>
</button>
</div>
</div>
{/*  Metrics Bento Strip  */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-2xl">
{/*  Card 1: Super Admin  */}
<div className="relative p-space-lg rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_4px_20px_-2px_rgba(217,75,104,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(217,75,104,0.12)] transition-all duration-300 group">
<div className="flex items-center justify-between mb-space-sm">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Quản trị viên tối cao</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
</div>
</div>
<div className="flex items-baseline gap-space-xs">
<span className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-surface">3</span>
<span className="font-label-sm text-label-sm text-primary font-semibold">Tài khoản cốt lõi</span>
</div>
<p className="font-body-sm text-body-sm text-outline mt-space-xs">Toàn quyền hệ thống & Root Key</p>
</div>
{/*  Card 2: Content Authors  */}
<div className="relative p-space-lg rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_4px_20px_-2px_rgba(217,75,104,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(217,75,104,0.12)] transition-all duration-300 group">
<div className="flex items-center justify-between mb-space-sm">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Biên tập viên nội dung</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
<span className="material-symbols-outlined text-[18px]">history_edu</span>
</div>
</div>
<div className="flex items-baseline gap-space-xs">
<span className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-surface">28</span>
<span className="font-label-sm text-label-sm text-tertiary font-semibold">+2 trong tháng</span>
</div>
<p className="font-body-sm text-body-sm text-outline mt-space-xs">Kho JLPT N5 - N1 & Thẩm định</p>
</div>
{/*  Card 3: Consultants  */}
<div className="relative p-space-lg rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_4px_20px_-2px_rgba(217,75,104,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(217,75,104,0.12)] transition-all duration-300 group">
<div className="flex items-center justify-between mb-space-sm">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Chuyên gia tư vấn (Sensei)</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
<span className="material-symbols-outlined text-[18px]">co_present</span>
</div>
</div>
<div className="flex items-baseline gap-space-xs">
<span className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-surface">45</span>
<span className="font-label-sm text-label-sm text-tertiary font-semibold">Tokyo & Hà Nội</span>
</div>
<p className="font-body-sm text-body-sm text-outline mt-space-xs">Tư vấn trực tuyến & Sửa ngữ pháp</p>
</div>
{/*  Card 4: Learners  */}
<div className="relative p-space-lg rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_4px_20px_-2px_rgba(217,75,104,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(217,75,104,0.12)] transition-all duration-300 group">
<div className="flex items-center justify-between mb-space-sm">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Học viên hoạt động</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">school</span>
</div>
</div>
<div className="flex items-baseline gap-space-xs">
<span className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-surface">12,480</span>
<span className="font-label-sm text-label-sm text-primary font-semibold">Đang học</span>
</div>
<p className="font-body-sm text-body-sm text-outline mt-space-xs">98.4% định danh qua eKYC/App</p>
</div>
</div>
{/*  Filter & Search Bar  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest/80 backdrop-blur-md shadow-sm mb-space-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
<div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
<div className="relative flex-1">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
<input className="w-full pl-10 pr-space-md py-2 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all" id="searchInput" placeholder="Tìm theo tên học giả, email, mã sensei..." type="text" />
</div>
<div className="flex items-center gap-space-xs">
<select className="px-space-md py-2 bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl focus:outline-none cursor-pointer" id="roleFilter">
<option value="all">Tất cả vai trò</option>
<option value="admin">Quản trị viên (Admin)</option>
<option value="author">Tác giả CMS (Author)</option>
<option value="consultant">Chuyên gia (Consultant)</option>
<option value="student">Học viên (Student)</option>
</select>
<select className="px-space-md py-2 bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl focus:outline-none cursor-pointer" id="statusFilter">
<option value="all">Tất cả trạng thái</option>
<option value="active">Đang hoạt động</option>
<option value="locked">Đã tạm khóa</option>
<option value="pending">Chờ xác thực</option>
</select>
</div>
</div>
<div className="flex items-center justify-end gap-space-xs text-outline font-label-sm text-label-sm">
<span>Hiển thị 4 trên 12,556 tài khoản</span>
<button className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant" title="Tải lại bảng">
<span className="material-symbols-outlined text-[18px]">sync</span>
</button>
</div>
</div>
{/*  Layout Split: User Directory Table (Left 7.5 col) & RBAC Matrix Preview (Right 4.5 col)  */}
<div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
{/*  User Directory Table Card  */}
<div className="xl:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(217,75,104,0.06)] overflow-hidden">
<div className="px-space-lg py-space-md bg-surface-container-low/60 flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[20px]">manage_accounts</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Danh bạ Người dùng & Ủy nhiệm</h2>
</div>
<div className="flex items-center gap-space-xs">
<button className="px-space-sm py-1 rounded-full text-primary hover:bg-primary-fixed font-label-sm text-label-sm transition-colors">Xuất CSV</button>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-high/40 text-on-surface-variant font-label-md text-label-md">
<th className="py-space-sm px-space-md font-semibold">Thành viên</th>
<th className="py-space-sm px-space-md font-semibold">Vai trò & Cấp độ</th>
<th className="py-space-sm px-space-md font-semibold">Phạm vi ủy quyền</th>
<th className="py-space-sm px-space-md font-semibold">Trạng thái</th>
<th className="py-space-sm px-space-md text-right font-semibold">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y-0 text-body-sm" id="userTableBody">
{/*  Row 1: Sensei Tokyo  */}
<tr className="hover:bg-surface-container-low/50 transition-colors group cursor-pointer" onClick="selectUserRow(1)">
<td className="py-space-md px-space-md">
<div className="flex items-center gap-space-sm">
<div className="relative">
<img className="w-10 h-10 rounded-full object-cover shadow-sm" data-alt="Portrait of a modern elegant Japanese female teacher in Kyoto study room, warm morning light, pastel cherry blossoms in background, soft sumi aesthetic, highly sharp focus" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmsYo0pRO7BGhp4BI0FSB9KKFiA3w-x7hC3thhzObU8Lzmf3ExXOmvezgrAQi0RnoatyAUIpTPkBlgCnltsE3NAYuPpx2Qcje8DpwdCJxf9dC1solEv3T0qpgMM5IWwaqpZpnZKiKWIczkWfu5aJbhER-R9-wZeDS0ZpSSjsbdfIdapts9lJHZ16OmXSUhdAZ00F3LFeVaLt16wyuk2IFmp08be7XozvmGO3rClnXlJg0KFyPyJNpe" />
<span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-tertiary ring-2 ring-surface-container-lowest" title="Trực tuyến"></span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-title-md text-title-md text-on-surface font-semibold truncate">Takahashi Mayumi</span>
<span className="font-label-sm text-label-sm text-outline truncate">mayumi.takahashi@rikipath.jp</span>
</div>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1 px-space-xs py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">psychology_alt</span>
                    Sensei Tokyo (N3-N1)
                  </span>
</td>
<td className="py-space-md px-space-md">
<div className="flex flex-col gap-0.5 max-w-xs">
<span className="text-on-surface font-medium">Hồ sơ cấp quyền & 1-on-1 Studio</span>
<span className="text-outline text-label-sm">Chấm bài luận AI, mở phòng tư vấn riêng</span>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                    Đang hoạt động
                  </span>
</td>
<td className="py-space-md px-space-md text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Chỉnh sửa quyền">
<span className="material-symbols-outlined text-[18px]">tune</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  Row 2: Content Author  */}
<tr className="hover:bg-surface-container-low/50 transition-colors group cursor-pointer bg-surface-container-low/20" onClick="selectUserRow(2)">
<td className="py-space-md px-space-md">
<div className="flex items-center gap-space-sm">
<div className="relative">
<img className="w-10 h-10 rounded-full object-cover shadow-sm" data-alt="Portrait of a Vietnamese male educator in modern minimalist office, wearing glasses, soft daylight, warm neutral aesthetic, professional tone" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCv35bRJVIRNwYhpgGjhutEDBJquO10IT9newf0aft8xEm9qrSUwUE5mxsq3_KWZb3BqezfN89SuESDvJ01Bi4m0v44NnKR-nPLUqX8Yh6n4UoDsqSKyw-1_33PBIU3cEthCAOnsAzcX-cUjuRHTuGfuLdd_-TyVH6RJUwW3i-hgB-BFgS7wDWegohItBCW2vcoNXP3UJABC_RTUtG_h9WgLbUE5eh-u3TcbohdkhfaVrrjagnkt2_n" />
<span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-tertiary ring-2 ring-surface-container-lowest"></span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-title-md text-title-md text-on-surface font-semibold truncate">Đặng Hoàng Minh</span>
<span className="font-label-sm text-label-sm text-outline truncate">minh.dh@rikipath.edu.vn</span>
</div>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1 px-space-xs py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">edit_note</span>
                    Tác giả nội dung CMS
                  </span>
</td>
<td className="py-space-md px-space-md">
<div className="flex flex-col gap-0.5 max-w-xs">
<span className="text-on-surface font-medium">Kho học liệu N2 Grammar</span>
<span className="text-outline text-label-sm">Tạo bài giảng, sửa từ vựng, gửi kiểm duyệt</span>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                    Đang hoạt động
                  </span>
</td>
<td className="py-space-md px-space-md text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Chỉnh sửa quyền">
<span className="material-symbols-outlined text-[18px]">tune</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  Row 3: Student Learner  */}
<tr className="hover:bg-surface-container-low/50 transition-colors group cursor-pointer" onClick="selectUserRow(3)">
<td className="py-space-md px-space-md">
<div className="flex items-center gap-space-sm">
<div className="relative">
<img className="w-10 h-10 rounded-full object-cover shadow-sm" data-alt="Portrait of a young Vietnamese female university student, smiling gently, sakura blossom tones, ambient daylight, modern clean Japanese lifestyle photo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9jVkZEZqDOx0KYFTfno64iU9Xu1YxWjOC75syXcaTJbulwdZjUS06P5uw8hOEc36ogadJVipM_zxAxcIf8-EUPVByplMgXNrpJXCGlRwM1KVSr3h4SQqPbfXEAsUGQloWCMcOurCDaDGnfZV0rK7O6qyWeAGL_80r2cqYlh4mVxBYRJ8PbRQ5ct9_CHn-vfSsc5jkGyM_TanmspNxxHVT4xj1E9ATwDMESHpeqsjfSDp_51c9qPYi" />
<span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-outline ring-2 ring-surface-container-lowest"></span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-title-md text-title-md text-on-surface font-semibold truncate">Lan-san (Nguyễn Hương Lan)</span>
<span className="font-label-sm text-label-sm text-outline truncate">lan.huong99@gmail.com</span>
</div>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1 px-space-xs py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">local_florist</span>
                    Học viên JLPT N3
                  </span>
</td>
<td className="py-space-md px-space-md">
<div className="flex flex-col gap-0.5 max-w-xs">
<span className="text-on-surface font-medium">Gói Sakura Pathway N3</span>
<span className="text-outline text-label-sm">Được phép truy cập kho luyện đề & Mock test</span>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
<span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    Standard Plan
                  </span>
</td>
<td className="py-space-md px-space-md text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Chỉnh sửa quyền">
<span className="material-symbols-outlined text-[18px]">tune</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  Row 4: Tech Ops Admin  */}
<tr className="hover:bg-surface-container-low/50 transition-colors group cursor-pointer bg-surface-container-low/20" onClick="selectUserRow(4)">
<td className="py-space-md px-space-md">
<div className="flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shadow-sm">
                      VT
                    </div>
<div className="flex flex-col min-w-0">
<span className="font-title-md text-title-md text-on-surface font-semibold truncate">Vận hành Kỹ thuật (SecOps)</span>
<span className="font-label-sm text-label-sm text-outline truncate">devops@rikipath.internal</span>
</div>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1 px-space-xs py-1 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">terminal</span>
                    System Admin
                  </span>
</td>
<td className="py-space-md px-space-md">
<div className="flex flex-col gap-0.5 max-w-xs">
<span className="text-on-surface font-medium">Toàn hệ sinh thái Cloud</span>
<span className="text-outline text-label-sm">Cấp phát JWT, cấu hình học phí & Audit DB</span>
</div>
</td>
<td className="py-space-md px-space-md">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                    Đang hoạt động
                  </span>
</td>
<td className="py-space-md px-space-md text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Chỉnh sửa quyền">
<span className="material-symbols-outlined text-[18px]">tune</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
{/*  Footer Pagination with Subtle Blossom Aesthetics  */}
<div className="p-space-md bg-surface-container-lowest flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant">Trang 1 / 314</span>
<div className="flex items-center gap-space-xxs">
<button className="px-3 py-1 rounded-lg bg-surface-container text-outline hover:text-on-surface font-label-sm text-label-sm">Trước</button>
<button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-bold shadow-sm">1</button>
<button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-label-sm text-label-sm">2</button>
<button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-label-sm text-label-sm">3</button>
<span className="px-1 text-outline">...</span>
<button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-label-sm text-label-sm">314</button>
<button className="px-3 py-1 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm">Sau</button>
</div>
</div>
</div>
{/*  Right Column: Interactive Role Permission Matrix Tabs & Visual Grant Inspector  */}
<div className="xl:col-span-4 flex flex-col gap-space-lg">
{/*  Inspector Card  */}
<div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-[0_4px_20px_-2px_rgba(217,75,104,0.06)] flex flex-col">
<div className="flex items-center justify-between pb-space-sm mb-space-sm">
<div className="flex items-center gap-space-xs">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Ma trận Phân quyền (RBAC)</h3>
</div>
<span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">Live Mode</span>
</div>
<p className="font-body-sm text-body-sm text-outline mb-space-md">
            Chi tiết các nhánh quyền truy xuất, bảo mật và tương tác trên nền tảng dành cho tài khoản đang chọn:
          </p>
{/*  Current Selected Badge Preview  */}
<div className="p-space-sm rounded-xl bg-surface-container-low mb-space-md flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
<span className="material-symbols-outlined text-[20px]">badge</span>
</div>
<div className="flex flex-col">
<span className="font-title-md text-title-md text-on-surface font-bold" id="inspectUserName">Takahashi Mayumi</span>
<span className="font-label-sm text-label-sm text-primary font-semibold" id="inspectUserRole">Chuyên gia tư vấn N3-N1</span>
</div>
</div>
{/*  Permission Matrix Items with Switch State Mimic  */}
<div className="flex flex-col gap-space-sm">
{/*  Perm 1  */}
<div className="p-space-sm rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-between">
<div className="flex items-start gap-space-xs">
<span className="material-symbols-outlined text-primary text-[20px] mt-0.5">visibility</span>
<div className="flex flex-col">
<span className="font-label-lg text-label-lg text-on-surface">Xem dữ liệu cá nhân học viên</span>
<span className="font-body-sm text-body-sm text-outline">Chỉ hồ sơ học viên đăng ký phòng Sensei</span>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input checked className="sr-only peer" type="checkbox" />
<div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
{/*  Perm 2  */}
<div className="p-space-sm rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-between">
<div className="flex items-start gap-space-xs">
<span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">fact_check</span>
<div className="flex flex-col">
<span className="font-label-lg text-label-lg text-on-surface">Quyền duyệt bài & Chấm điểm</span>
<span className="font-body-sm text-body-sm text-outline">Phê chuẩn bài thi Dokkai & Choukai</span>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input checked className="sr-only peer" type="checkbox" />
<div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
{/*  Perm 3  */}
<div className="p-space-sm rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-between">
<div className="flex items-start gap-space-xs">
<span className="material-symbols-outlined text-outline text-[20px] mt-0.5">price_change</span>
<div className="flex flex-col">
<span className="font-label-lg text-label-lg text-on-surface">Cấu hình học phí & Gói tư vấn</span>
<span className="font-body-sm text-body-sm text-outline">Chỉ dành cho Super Admin & Kế toán</span>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input className="sr-only peer" type="checkbox" />
<div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
{/*  Perm 4  */}
<div className="p-space-sm rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-between">
<div className="flex items-start gap-space-xs">
<span className="material-symbols-outlined text-primary text-[20px] mt-0.5">download_for_offline</span>
<div className="flex flex-col">
<span className="font-label-lg text-label-lg text-on-surface">Xuất báo cáo & Dữ liệu lớn</span>
<span className="font-body-sm text-body-sm text-outline">Xuất điểm định dạng mã hóa PGP</span>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input className="sr-only peer" type="checkbox" />
<div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
{/*  Micro Quick Action in Inspector  */}
<div className="mt-space-lg pt-space-md flex items-center gap-space-sm">
<button className="flex-1 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md font-semibold shadow-[0_4px_14px_rgba(217,75,104,0.3)] hover:bg-primary-container transition-all text-center" onClick="saveMatrixAlert()">
              Lưu thay đổi ma trận
            </button>
<button className="p-2.5 rounded-full bg-surface-container text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" title="Thu hồi tất cả quyền">
<span className="material-symbols-outlined text-[18px]">lock_reset</span>
</button>
</div>
</div>
{/*  Security Activity Stream Widget (Audit Mini)  */}
<div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-[0_4px_20px_-2px_rgba(217,75,104,0.06)]">
<div className="flex items-center justify-between mb-space-sm">
<span className="font-title-md text-title-md text-on-surface font-semibold">Nhật ký truy cập gần nhất</span>
<span className="material-symbols-outlined text-[18px] text-tertiary">verified_user</span>
</div>
<div className="space-y-space-sm">
<div className="flex items-start gap-space-xs text-body-sm">
<span className="w-2 h-2 rounded-full bg-tertiary mt-1.5 shrink-0"></span>
<div className="flex flex-col">
<span className="text-on-surface font-medium">Mayumi Sensei vừa đăng nhập từ Tokyo</span>
<span className="text-outline text-label-sm">IP: 133.242.18.4 • 4 phút trước</span>
</div>
</div>
<div className="flex items-start gap-space-xs text-body-sm">
<span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></span>
<div className="flex flex-col">
<span className="text-on-surface font-medium">Đặng Hoàng Minh xuất bản 14 mục Từ vựng N2</span>
<span className="text-outline text-label-sm">CMS Module #882 • 28 phút trước</span>
</div>
</div>
<div className="flex items-start gap-space-xs text-body-sm">
<span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0"></span>
<div className="flex flex-col">
<span className="text-on-surface font-medium">Kích hoạt khóa học N3 Đột phá cho Lan-san</span>
<span className="text-outline text-label-sm">Auto-grant via Stripe • 1 giờ trước</span>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
{/*  Toast Micro-Interaction Component  */}
<div className="fixed bottom-8 right-8 max-w-sm p-space-md rounded-xl bg-inverse-surface text-inverse-on-surface shadow-2xl backdrop-blur-md transform translate-y-20 opacity-0 pointer-events-none transition-all duration-300 z-50 flex items-center gap-space-sm" id="toastNotification">
<span className="material-symbols-outlined text-tertiary-fixed text-[24px]">check_circle</span>
<div className="flex flex-col">
<span className="font-title-md text-title-md font-bold">Thao tác thành công</span>
<span className="font-body-sm text-body-sm text-surface-dim" id="toastMsg">Đã cập nhật quyền hạn người dùng trên hệ thống.</span>
</div>
</div>
</div>
</main></div>
    </div>
  
</AdminShell>
);
}
