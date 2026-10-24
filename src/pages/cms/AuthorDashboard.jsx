import { useEffect } from 'react';
import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function AuthorDashboard() {
  const { pathname } = useLocation();
  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') {
        try { fn(); } catch (err) { console.warn(err); }
        return;
      }
      return orig(type, fn, opts);
    };
    try {
      function switchState(state) {
                  document.getElementById('state-normal').classList.add('hidden');
                  document.getElementById('state-empty').classList.add('hidden');
                  document.getElementById('state-error').classList.add('hidden');
                  document.getElementById('state-loading').classList.add('hidden');
                  
                  document.getElementById('state-' + state).classList.remove('hidden');
              }
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <CmsShell pathname={pathname} breadcrumb="Bảng tác giả">
<div className="bg-surface-container-low flex min-h-screen overflow-x-hidden text-on-surface min-h-screen" data-page="AuthorDashboard" data-shell-unified="1">


{/*  SideNavBar  */}





{/*  Main Content Wrapper  */}


<div className="flex-1 flex flex-col min-h-screen">
{/*  TopNavBar  */}

{/*  Demo State Toggle  */}
<div className="bg-surface-container-highest p-2 flex justify-center gap-4 border-b border-border-base" style={{ background: "#F6F1EE", borderBottom: "1px solid #EADFD9" }}>
<span className="text-sm font-semibold text-on-surface-variant flex items-center">Demo States:</span>
<button className="px-3 py-1 bg-surface rounded text-sm hover:bg-primary-container hover:text-on-primary-container transition-colors" type="button" onClick={() => window.switchState?.('normal')}>Normal</button>
<button className="px-3 py-1 bg-surface rounded text-sm hover:bg-primary-container hover:text-on-primary-container transition-colors" type="button" onClick={() => window.switchState?.('empty')}>Empty</button>
<button className="px-3 py-1 bg-surface rounded text-sm hover:bg-primary-container hover:text-on-primary-container transition-colors" type="button" onClick={() => window.switchState?.('error')}>No Permission</button>
<button className="px-3 py-1 bg-surface rounded text-sm hover:bg-primary-container hover:text-on-primary-container transition-colors" type="button" onClick={() => window.switchState?.('loading')}>Loading</button>
</div>
{/*  Main Canvas  */}
<main className="flex-1 overflow-y-auto p-gutter pb-24 custom-scrollbar">
<div className="flex justify-between items-end mb-6"><div><h2 className="font-headline-lg text-headline-lg mb-1 font-bold" style={{ color: "#2D282A" }}>Author Dashboard</h2><p className="font-body-md text-body-md" style={{ color: "#686265" }}>Manage your content pipeline and review feedback.</p></div><div className="flex gap-3"><button className="flex items-center gap-2 px-4 py-2 font-semibold rounded-xl text-white shadow-sm transition-all hover:opacity-95" style={{ background: "linear-gradient(135deg, #E05A7A 0%, #D44A6B 100%)", boxShadow: "0 4px 14px rgba(224, 90, 122, 0.28)" }}><span className="material-symbols-outlined text-sm">add</span>Create New Lesson</button></div></div>
{/*  Bento Grid Layout  */}
<div className="grid grid-cols-12 gap-gutter">
{/*  Stats Row  */}
<div className="col-span-12 grid grid-cols-4 gap-gutter mb-2"><div className="bg-white rounded-xl p-4 flex flex-col transition-all" style={{ border: "1px solid #EADFD9", boxShadow: "0 4px 16px rgba(45, 40, 42, 0.04)" }}><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2" style={{ color: "#686265" }}><span className="material-symbols-outlined text-sm" style={{ color: "#E05A7A" }}>edit_document</span><span className="font-label-caps text-label-caps uppercase font-semibold">Bản nháp</span></div><span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#FDF2F5", color: "#E05A7A", border: "1px solid #F8BBD0" }}>Draft</span></div><div className="font-headline-lg text-headline-lg font-bold" style={{ color: "#2D282A" }}>12</div></div><div className="bg-white rounded-xl p-4 flex flex-col transition-all" style={{ border: "1px solid #EADFD9", boxShadow: "0 4px 16px rgba(45, 40, 42, 0.04)" }}><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 text-[#D97706]"><span className="material-symbols-outlined text-sm text-[#F59E0B]">pending_actions</span><span className="font-label-caps text-label-caps uppercase font-semibold">Chờ duyệt</span></div><span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold">Pending</span></div><div className="font-headline-lg text-headline-lg font-bold" style={{ color: "#2D282A" }}>5</div></div><div className="bg-white rounded-xl p-4 flex flex-col transition-all" style={{ border: "1px solid #EADFD9", boxShadow: "0 4px 16px rgba(45, 40, 42, 0.04)" }}><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 text-[#E11D48]"><span className="material-symbols-outlined text-sm text-[#E11D48]">error</span><span className="font-label-caps text-label-caps uppercase font-semibold">Bị từ chối</span></div><span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#BE123C] font-bold">Rejected</span></div><div className="font-headline-lg text-headline-lg font-bold" style={{ color: "#2D282A" }}>2</div></div><div className="bg-white rounded-xl p-4 flex flex-col transition-all" style={{ border: "1px solid #EADFD9", boxShadow: "0 4px 16px rgba(45, 40, 42, 0.04)" }}><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 text-[#059669]"><span className="material-symbols-outlined text-sm text-[#10B981]">check_circle</span><span className="font-label-caps text-label-caps uppercase font-semibold">Đã xuất bản</span></div><span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] font-bold">Live</span></div><div className="font-headline-lg text-headline-lg font-bold" style={{ color: "#2D282A" }}>142</div></div></div>
{/*  Recent Activity (Left Column)  */}
<div className="col-span-12 xl:col-span-8 flex flex-col gap-gutter">
<div className="bg-surface border border-border-base rounded-lg p-4 flex-1 shadow-sm" style={{ background: "#FFFFFF", border: "1px solid #EADFD9", borderRadius: "0.75rem", boxShadow: "0 4px 16px rgba(45, 40, 42, 0.04)" }}>
<div className="flex justify-between items-center mb-4 border-b border-border-base pb-2"><h3 className="font-title-sm text-title-sm font-bold" style={{ color: "#2D282A" }}>Recent Editing Activity</h3><button className="text-sm font-semibold hover:underline" style={{ color: "#E05A7A" }}>View All</button></div>
{/*  NORMAL STATE  */}
<div className="space-y-3" id="state-normal">
{/*  Activity Item  */}
<div className="flex items-start gap-4 p-3 rounded hover:bg-surface-container-low transition-colors border border-transparent hover:border-border-base">
<div className="bg-surface-container-high p-2 rounded-lg text-text-secondary flex-shrink-0">
<span className="material-symbols-outlined text-sm">menu_book</span>
</div>
<div className="flex-1 min-w-0">
<h4 className="font-body-md text-body-md font-semibold text-on-surface truncate">N3 Grammar Lesson 14: Causative Passive</h4>
<p className="font-body-sm text-body-sm text-text-secondary mt-1">Edited by You • 2 hours ago</p>
</div>
<div className="flex-shrink-0">
<span className="px-2 py-1 rounded bg-surface-container-highest text-text-secondary font-label-caps text-label-caps">Bản nháp</span>
</div>
<button className="text-text-secondary hover:text-primary"><span className="material-symbols-outlined text-sm">more_vert</span></button>
</div>
<div className="flex items-start gap-4 p-3 rounded hover:bg-surface-container-low transition-colors border border-transparent hover:border-border-base">
<div className="bg-surface-container-high p-2 rounded-lg text-text-secondary flex-shrink-0">
<span className="material-symbols-outlined text-sm">translate</span>
</div>
<div className="flex-1 min-w-0">
<h4 className="font-body-md text-body-md font-semibold text-on-surface truncate">N2 Vocab Set: Business & Office</h4>
<p className="font-body-sm text-body-sm text-text-secondary mt-1">Submitted for review • 5 hours ago</p>
</div>
<div className="flex-shrink-0">
<span className="px-2 py-1 rounded bg-[#FEF0C7] text-accent-orange font-label-caps text-label-caps">Chờ duyệt</span>
</div>
<button className="text-text-secondary hover:text-primary"><span className="material-symbols-outlined text-sm">more_vert</span></button>
</div>
<div className="flex items-start gap-4 p-3 rounded hover:bg-surface-container-low transition-colors border border-transparent hover:border-border-base">
<div className="bg-surface-container-high p-2 rounded-lg text-text-secondary flex-shrink-0">
<span className="material-symbols-outlined text-sm">database</span>
</div>
<div className="flex-1 min-w-0">
<h4 className="font-body-md text-body-md font-semibold text-on-surface truncate">JLPT N4 Reading Comprehension Q-Bank Update</h4>
<p className="font-body-sm text-body-sm text-text-secondary mt-1">Published • 1 day ago</p>
</div>
<div className="flex-shrink-0">
<span className="px-2 py-1 rounded bg-[#D1FADF] text-level-n5 font-label-caps text-label-caps">Đã xuất bản</span>
</div>
<button className="text-text-secondary hover:text-primary"><span className="material-symbols-outlined text-sm">more_vert</span></button>
</div>
</div>
{/*  EMPTY STATE  */}
<div className="hidden flex flex-col items-center justify-center py-12" id="state-empty">
<div className="w-48 h-48 mb-4 bg-surface-container rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-6xl text-text-secondary opacity-50">task</span>
</div>
<h4 className="font-headline-md text-headline-md text-on-surface mb-2">Chưa có nội dung nào cần xử lý</h4>
<p className="font-body-md text-body-md text-text-secondary text-center max-w-sm mb-6">Your workspace is clear. Create a new lesson or import data to get started.</p>
<button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors font-title-sm text-title-sm" style={{ background: "linear-gradient(135deg, #D94B68 0%, #EE6983 100%)", color: "#FFFFFF", borderRadius: "0.75rem", boxShadow: "0 4px 12px rgba(217, 75, 104, 0.25)" }}>
<span className="material-symbols-outlined text-sm">add</span>
                            Create New Content
                        </button>
</div>
{/*  ERROR STATE (Permission Denied)  */}
<div className="hidden flex flex-col items-center justify-center py-12" id="state-error">
<div className="w-16 h-16 mb-4 rounded-full bg-error-container flex items-center justify-center text-error">
<span className="material-symbols-outlined text-3xl">block</span>
</div>
<h4 className="font-headline-md text-headline-md text-on-surface mb-2">Bạn không có quyền truy cập mục này.</h4>
<p className="font-body-md text-body-md text-text-secondary text-center max-w-sm mb-6">Please contact your administrator to request access to this module.</p>
<button className="flex items-center gap-2 px-4 py-2 border border-border-base text-on-surface rounded-lg hover:bg-surface-container transition-colors font-title-sm text-title-sm">
                            Return to Dashboard
                        </button>
</div>
{/*  LOADING STATE  */}
<div className="hidden space-y-3" id="state-loading">
<div className="flex items-start gap-4 p-3 rounded border border-transparent">
<div className="w-9 h-9 rounded-lg bg-surface-container animate-pulse flex-shrink-0"></div>
<div className="flex-1 min-w-0 space-y-2">
<div className="h-4 bg-surface-container rounded animate-pulse w-3/4"></div>
<div className="h-3 bg-surface-container rounded animate-pulse w-1/3"></div>
</div>
<div className="w-16 h-6 rounded bg-surface-container animate-pulse flex-shrink-0"></div>
</div>
<div className="flex items-start gap-4 p-3 rounded border border-transparent">
<div className="w-9 h-9 rounded-lg bg-surface-container animate-pulse flex-shrink-0"></div>
<div className="flex-1 min-w-0 space-y-2">
<div className="h-4 bg-surface-container rounded animate-pulse w-2/3"></div>
<div className="h-3 bg-surface-container rounded animate-pulse w-1/4"></div>
</div>
<div className="w-16 h-6 rounded bg-surface-container animate-pulse flex-shrink-0"></div>
</div>
<div className="flex items-start gap-4 p-3 rounded border border-transparent">
<div className="w-9 h-9 rounded-lg bg-surface-container animate-pulse flex-shrink-0"></div>
<div className="flex-1 min-w-0 space-y-2">
<div className="h-4 bg-surface-container rounded animate-pulse w-4/5"></div>
<div className="h-3 bg-surface-container rounded animate-pulse w-2/5"></div>
</div>
<div className="w-16 h-6 rounded bg-surface-container animate-pulse flex-shrink-0"></div>
</div>
</div>
</div>
</div>
{/*  Right Column (Review & Actions)  */}
<div className="col-span-12 xl:col-span-4 flex flex-col gap-gutter">
{/*  Quick Actions  */}
<div className="bg-surface border border-border-base rounded-lg p-4 shadow-sm" style={{ background: "#FFFFFF", border: "1px solid #EADFD9", borderRadius: "0.75rem", boxShadow: "0 4px 16px rgba(45, 40, 42, 0.04)" }}><h3 className="font-title-sm text-title-sm font-bold mb-4 pb-2 flex items-center justify-between" style={{ color: "#2D282A", borderBottom: "1px solid #EADFD9" }}><span>Quick Actions</span><span className="text-sm" style={{ color: "#E05A7A" }}>🌸</span></h3><div className="grid grid-cols-2 gap-2.5"><button className="flex flex-col items-center justify-center p-3.5 rounded-xl transition-all group" style={{ border: "1px solid #EADFD9", background: "#FFFFFF", color: "#2D282A" }}><div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-all" style={{ background: "#FDF2F5", color: "#E05A7A" }}><span className="material-symbols-outlined text-sm">menu_book</span></div><span className="font-body-sm text-body-sm text-center font-medium">New Lesson</span></button><button className="flex flex-col items-center justify-center p-3.5 rounded-xl transition-all group" style={{ border: "1px solid #EADFD9", background: "#FFFFFF", color: "#2D282A" }}><div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-all" style={{ background: "#FDF2F5", color: "#E05A7A" }}><span className="material-symbols-outlined text-sm">translate</span></div><span className="font-body-sm text-body-sm text-center font-medium">Add Vocab</span></button><button className="flex flex-col items-center justify-center p-3.5 rounded-xl transition-all group" style={{ border: "1px solid #EADFD9", background: "#FFFFFF", color: "#2D282A" }}><div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-all" style={{ background: "#FDF2F5", color: "#E05A7A" }}><span className="material-symbols-outlined text-sm">quiz</span></div><span className="font-body-sm text-body-sm text-center font-medium">New Question</span></button><button className="flex flex-col items-center justify-center p-3.5 rounded-xl transition-all group" style={{ border: "1px solid #EADFD9", background: "#FFFFFF", color: "#2D282A" }}><div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-all" style={{ background: "#FDF2F5", color: "#E05A7A" }}><span className="material-symbols-outlined text-sm">upload_file</span></div><span className="font-body-sm text-body-sm text-center font-medium">Bulk Import</span></button></div></div>
{/*  Review Feedback  */}
<div className="bg-surface border border-border-base rounded-lg p-4 flex-1 shadow-sm" style={{ background: "#FFFFFF", border: "1px solid #EADFD9", borderRadius: "0.75rem", boxShadow: "0 4px 16px rgba(45, 40, 42, 0.04)" }}><div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: "1px solid #EADFD9" }}><h3 className="font-title-sm text-title-sm font-bold flex items-center gap-2" style={{ color: "#2D282A" }}><span className="material-symbols-outlined text-sm" style={{ color: "#E05A7A" }}>notification_important</span>Action Required</h3><span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: "#E05A7A" }}></span></div><div className="space-y-3"><div className="p-3.5 rounded-xl border-l-4" style={{ backgroundColor: "#FDF8FA", borderLeftColor: "#E05A7A", borderTop: "1px solid #F8BBD0", borderRight: "1px solid #F8BBD0", borderBottom: "1px solid #F8BBD0" }}><div className="flex justify-between items-start mb-1"><h4 className="font-body-sm text-body-sm font-semibold" style={{ color: "#2D282A" }}>N5 Kanji Lesson 3</h4><span className="font-label-caps text-label-caps" style={{ color: "#686265" }}>Admin • 2h ago</span></div><p className="font-body-sm text-body-sm mb-2" style={{ color: "#686265" }}>"Example sentences need to be simplified. Some grammar structures used are N4 level."</p><button className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: "#E05A7A" }}>Review Details <span className="material-symbols-outlined text-xs">arrow_forward</span></button></div><div className="p-3.5 rounded-xl border-l-4" style={{ backgroundColor: "#FDF8FA", borderLeftColor: "#E05A7A", borderTop: "1px solid #F8BBD0", borderRight: "1px solid #F8BBD0", borderBottom: "1px solid #F8BBD0" }}><div className="flex justify-between items-start mb-1"><h4 className="font-body-sm text-body-sm font-semibold" style={{ color: "#2D282A" }}>N3 Listening Practice Test 1</h4><span className="font-label-caps text-label-caps" style={{ color: "#686265" }}>Admin • 1d ago</span></div><p className="font-body-sm text-body-sm mb-2" style={{ color: "#686265" }}>"Audio file Q3 is corrupted. Please re-upload the correct MP3."</p><button className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: "#E05A7A" }}>Review Details <span className="material-symbols-outlined text-xs">arrow_forward</span></button></div></div></div>
</div>
</div>
</main>
</div>


    </div>
  
</CmsShell>
);
}
