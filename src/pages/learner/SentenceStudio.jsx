import { useEffect } from 'react';
import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';

export default function SentenceStudio() {
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
      const writingInput = document.getElementById('writing-input');
          const charCounter = document.getElementById('char-counter');
          const btnSpeak = document.getElementById('btn-speak');
          const btnEvaluate = document.getElementById('btn-evaluate');
          const btnClearText = document.getElementById('btn-clear-text');
          const btnSaveDraft = document.getElementById('btn-save-draft');
          const saveStatus = document.getElementById('save-status');
          const btnCopyNative = document.getElementById('btn-copy-native');
          const copyBtnText = document.getElementById('copy-btn-text');
          const nativeText = document.getElementById('native-text');
          const btnSampleTab = document.getElementById('btn-sample-tab');
      
          // 1. Character Count
          if (writingInput && charCounter) {
            writingInput.addEventListener('input', () => {
              const count = writingInput.value.length;
              charCounter.textContent = count;
              if (count > 200) {
                charCounter.classList.add('text-red-600');
              } else {
                charCounter.classList.remove('text-red-600');
              }
            });
          }
      
          // 2. Keyword inserter helper
          window.insertKeyword = function(keyword) {
            if (writingInput) {
              writingInput.value += (writingInput.value.length > 0 ? ' ' : '') + keyword;
              writingInput.dispatchEvent(new Event('input'));
              writingInput.focus();
            }
          };
      
          // 3. Clear button
          if (btnClearText && writingInput) {
            btnClearText.addEventListener('click', () => {
              if (confirm('Bạn có chắc chắn muốn xóa toàn bộ nội dung văn bản đang soạn?')) {
                writingInput.value = '';
                writingInput.dispatchEvent(new Event('input'));
                writingInput.focus();
              }
            });
          }
      
          // 4. Save Draft
          if (btnSaveDraft && saveStatus) {
            btnSaveDraft.addEventListener('click', () => {
              saveStatus.textContent = 'Đã lưu thủ công vào bản nháp vừa xong';
              setTimeout(() => {
                saveStatus.textContent = 'Đã tự động lưu nháp (15 giây trước)';
              }, 3000);
            });
          }
      
          // 5. Speech synthesis for Japanese text
          if (btnSpeak && writingInput) {
            btnSpeak.addEventListener('click', () => {
              if ('speechSynthesis' in window) {
                const text = writingInput.value || 'こんにちは';
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'ja-JP';
                utter.rate = 0.95;
                window.speechSynthesis.speak(utter);
              }
            });
          }
      
          // 6. Copy native sentence
          if (btnCopyNative && nativeText && copyBtnText) {
            btnCopyNative.addEventListener('click', () => {
              const clean = nativeText.textContent.replace(/["“”]/g, '').trim();
              navigator.clipboard.writeText(clean).then(() => {
                copyBtnText.textContent = 'Đã chép!';
                setTimeout(() => {
                  copyBtnText.textContent = 'Sao chép';
                }, 2000);
              });
            });
          }
      
          // 7. Chấm & Phân tích tức thì simulation
          if (btnEvaluate) {
            btnEvaluate.addEventListener('click', () => {
              const prevContent = btnEvaluate.innerHTML;
              btnEvaluate.disabled = true;
              btnEvaluate.innerHTML = '<span className="material-symbols-outlined text-[18px] animate-spin">sync</span><span>Đang phân tích Haru AI...</span>';
              setTimeout(() => {
                btnEvaluate.innerHTML = prevContent;
                btnEvaluate.disabled = false;
              }, 800);
            });
          }
      
          // 8. Load Sample Tab
          if (btnSampleTab && writingInput) {
            btnSampleTab.addEventListener('click', () => {
              writingInput.value = "今週末のお花見にお誘いいただき、本当にありがとうございます。ただ、月曜日の納品に向けて休日出勤をしなければならないため、残念ながら参加するわけにはいきません。せっかくの機会ですが、皆さんとご一緒できず申し訳ございません。";
              writingInput.dispatchEvent(new Event('input'));
            });
          }
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Viết câu">
<div className="font-sans antialiased min-h-screen flex bg-warm-bg" data-page="SentenceStudio" data-shell-unified="1">


{/*  =================================================================  */}


{/*  1. LEFT SIDEBAR (w-64 fixed desktop navigation)                    */}


{/*  =================================================================  */}





{/*  =================================================================  */}


{/*  2. MAIN LAYOUT WRAPPER (Offset by sidebar w-64)                    */}


{/*  =================================================================  */}


<div className="pl-0 flex-1 flex flex-col min-w-0">
{/*  Top Sticky Header  */}

{/*  Content Container (Targeted 1440px desktop grid canvas)  */}
<main className="w-full max-w-[1440px] mx-auto px-8 py-8 space-y-8">
{/*  =============================================================  */}
{/*  A. HERO TITLE & TARGET LEVEL BANNER                            */}
{/*  =============================================================  */}
<section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white border border-warm-border rounded-2xl p-6 lg:p-8 shadow-subtle relative overflow-hidden">
{/*  Ambient Cherry Blossom accent circle  */}
<div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand-light/60 blur-3xl pointer-events-none"></div>
<div className="space-y-2 max-w-3xl relative z-10">
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-bold uppercase tracking-wider">
<span className="material-symbols-outlined text-[16px]">draw</span>{"Studio Luyện viết Sakurabito • 日本語作文\n          "}</div>
<h1 className="text-3xl font-extrabold text-charcoal tracking-tight">{"Studio Luyện viết Câu & Chấm điểm Tức thì\n          "}</h1>
<p className="text-sm text-charcoal-secondary leading-relaxed">{"Rèn giũa tư duy diễn đạt tiếng Nhật bản xứ theo triết lý "}<span className="font-bold text-charcoal italic">Ma (間)</span>{" kết hợp mô hình AI Haru phân tích kính ngữ và văn phong chuẩn Tokyo Native.\n          "}</p>
</div>
{/*  Target Level Card & Evaluator Status  */}
<div className="flex items-center gap-4 relative z-10">
<div className="px-4 py-3 rounded-xl bg-warm-bg border border-warm-border flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shadow-md shadow-brand/20">
<span className="material-symbols-outlined text-[22px]">school</span>
</div>
<div className="flex flex-col">
<span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">Mục tiêu cấp độ</span>
<span className="text-base font-extrabold text-charcoal">JLPT N3 / Business</span>
</div>
</div>
<div className="hidden sm:flex flex-col gap-1.5">
<div className="px-3 py-1 rounded-full bg-leaf-bg border border-leaf-border text-leaf text-xs font-bold flex items-center gap-1.5 shadow-sm">
<span className="w-2 h-2 rounded-full bg-leaf animate-ping"></span>
<span>AI Evaluator Pro v2.4</span>
</div>
<div className="text-[11px] text-charcoal-muted text-right font-medium flex items-center justify-end gap-1">
<span className="material-symbols-outlined text-[14px] text-brand">bolt</span>{"Phản hồi < 0.8s\n            "}</div>
</div>
</div>
</section>
{/*  =============================================================  */}
{/*  B. PROMPT CARD: ĐỀ BÀI THỰC HÀNH HÔM NAY                      */}
{/*  =============================================================  */}
<section className="bg-white border border-warm-border rounded-2xl p-6 shadow-subtle flex flex-col md:flex-row items-start gap-5">
<div className="w-12 h-12 rounded-xl bg-brand-light text-brand flex-shrink-0 flex items-center justify-center border border-brand-accent/50">
<span className="material-symbols-outlined text-[26px]">assignment</span>
</div>
<div className="space-y-3 flex-1">
<div className="flex flex-wrap items-center gap-2.5">
<span className="px-2.5 py-0.5 rounded-full bg-brand text-white text-[11px] font-bold uppercase tracking-wider">{"Thực hành trọng tâm\n            "}</span>
<span className="text-xs font-semibold text-charcoal-secondary">{"Cấu trúc: "}<strong className="text-brand font-bold">〜わけにはいかない</strong>{" (Không thể nào / Về mặt đạo lý & trách nhiệm không cho phép)\n            "}</span>
</div>
<p className="text-base font-bold text-charcoal leading-relaxed">{"“Hãy viết một đoạn văn ngắn (3-4 câu) bằng tiếng Nhật sử dụng cấu trúc ngữ pháp "}<span className="text-brand underline decoration-brand-accent decoration-2 underline-offset-4">〜わけにはいかない</span>{" để giải thích lý do bạn không thể tham gia tiệc ngắm hoa anh đào (Hanami) cùng đồng nghiệp công ty vào cuối tuần này.”\n          "}</p>
{/*  Keyword suggestions chips  */}
<div className="flex flex-wrap items-center gap-2 pt-1">
<span className="text-xs font-semibold text-charcoal-muted flex items-center gap-1">
<span className="material-symbols-outlined text-[15px]">sell</span>{"Gợi ý từ khóa:\n            "}</span>
<button className="px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-brand-light text-charcoal hover:text-brand border border-warm-border hover:border-brand-accent text-xs font-semibold transition-all" onClick={(e) => { insertKeyword('花見') }}>{"花見 "}<span className="text-[11px] text-charcoal-muted font-normal">(Hanami)</span>
</button>
<button className="px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-brand-light text-charcoal hover:text-brand border border-warm-border hover:border-brand-accent text-xs font-semibold transition-all" onClick={(e) => { insertKeyword('休日出勤') }}>{"休日出勤 "}<span className="text-[11px] text-charcoal-muted font-normal">(Đi làm ngày nghỉ)</span>
</button>
<button className="px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-brand-light text-charcoal hover:text-brand border border-warm-border hover:border-brand-accent text-xs font-semibold transition-all" onClick={(e) => { insertKeyword('参加する') }}>{"参加する "}<span className="text-[11px] text-charcoal-muted font-normal">(Tham gia)</span>
</button>
<button className="px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-brand-light text-charcoal hover:text-brand border border-warm-border hover:border-brand-accent text-xs font-semibold transition-all" onClick={(e) => { insertKeyword('申し訳ございません') }}>{"申し訳ございません "}<span className="text-[11px] text-charcoal-muted font-normal">(Rất xin lỗi)</span>
</button>
</div>
</div>
</section>
{/*  =============================================================  */}
{/*  C. 12-COLUMN WORKSPACE: LEFT EDITOR (7) & RIGHT AI HARU (5)    */}
{/*  =============================================================  */}
<section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
{/*  ===========================================================  */}
{/*  LEFT COLUMN: RICH WRITING WORKSPACE (7 Cols)                 */}
{/*  ===========================================================  */}
<div className="lg:col-span-7 space-y-6">
<div className="bg-white border border-warm-border rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
{/*  Toolbar: Mode Switch + Audio + Character counter  */}
<div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-warm-border/60">
<div className="flex items-center gap-1.5 p-1 rounded-xl bg-warm-bg border border-warm-border">
<button className="px-3 py-1 rounded-lg bg-white text-brand font-bold text-xs shadow-sm" id="btn-kana-tab">{"Romaji → Kana\n                "}</button>
<button className="px-3 py-1 rounded-lg text-charcoal-secondary hover:text-charcoal font-semibold text-xs transition-colors" id="btn-kanji-tab">{"Kanji gợi ý\n                "}</button>
<button className="px-3 py-1 rounded-lg text-charcoal-secondary hover:text-charcoal font-semibold text-xs transition-colors" id="btn-sample-tab">{"Nạp câu mẫu\n                "}</button>
</div>
<div className="flex items-center gap-3">
<button className="w-9 h-9 rounded-xl bg-warm-bg hover:bg-brand-light text-charcoal-secondary hover:text-brand border border-warm-border hover:border-brand-accent flex items-center justify-center transition-all" id="btn-speak" title="Phát âm đoạn văn Nhật">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
<div className="px-3 py-1 rounded-full bg-warm-bg border border-warm-border text-xs font-semibold text-charcoal-secondary">
<span className="text-brand font-bold" id="char-counter">111</span>{" / 200 ký tự\n                "}</div>
</div>
</div>
{/*  Writing Textarea Area  */}
<div className="relative my-4">
<textarea className="w-full bg-warm-bg/40 border border-warm-border rounded-xl p-4 text-base font-medium text-charcoal leading-relaxed placeholder:text-charcoal-muted focus:outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-none font-jp" id="writing-input" placeholder="Hãy gõ câu trả lời của bạn bằng tiếng Nhật tại đây..." rows="7">今週末のお花見にお誘いいただき、本当にありがとうございます。ただ、月曜日の納品に向けて休日出勤をしなければならないため、残念ながら参加するわけにはいきません。せっかくの機会ですが、皆さんとご一緒できず申し訳ございません。</textarea>
{/*  IME Indicator Pill  */}
<div className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-warm-border shadow-sm text-[11px] font-semibold text-charcoal-secondary pointer-events-none">
<span className="material-symbols-outlined text-[14px] text-brand">keyboard</span>
<span>IME Hiragana Active</span>
</div>
</div>
{/*  Quick Japanese Conversion bar  */}
<div className="pt-1 pb-3 flex items-center gap-2 overflow-x-auto text-xs">
<span className="text-charcoal-muted font-bold whitespace-nowrap text-[11px] uppercase tracking-wider">Gợi ý chuyển:</span>
<button className="px-2 py-0.5 rounded bg-warm-bg border border-warm-border hover:border-brand-accent text-charcoal font-medium whitespace-nowrap" onClick={(e) => { insertKeyword('花見') }}>花見 [はなみ]</button>
<button className="px-2 py-0.5 rounded bg-warm-bg border border-warm-border hover:border-brand-accent text-charcoal font-medium whitespace-nowrap" onClick={(e) => { insertKeyword('納品') }}>納品 [のうひん]</button>
<button className="px-2 py-0.5 rounded bg-warm-bg border border-warm-border hover:border-brand-accent text-charcoal font-medium whitespace-nowrap" onClick={(e) => { insertKeyword('休日出勤') }}>休日出勤 [しゅっきん]</button>
<button className="px-2 py-0.5 rounded bg-warm-bg border border-warm-border hover:border-brand-accent text-charcoal font-medium whitespace-nowrap" onClick={(e) => { insertKeyword('恐れ入ります') }}>恐れ入ります</button>
</div>
{/*  Action Bar  */}
<div className="pt-4 border-t border-warm-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
<div className="flex items-center gap-2 text-xs text-charcoal-secondary">
<span className="material-symbols-outlined text-[16px] text-leaf">cloud_done</span>
<span id="save-status">Đã tự động lưu nháp (15 giây trước)</span>
</div>
<div className="flex items-center gap-3 w-full sm:w-auto justify-end">
<button className="px-4 py-2.5 rounded-xl border border-warm-border hover:bg-warm-bg text-charcoal-secondary hover:text-charcoal text-xs font-bold transition-colors flex items-center gap-1.5" id="btn-clear-text">
<span className="material-symbols-outlined text-[17px]">backspace</span>
<span>Xóa bài</span>
</button>
<button className="px-4 py-2.5 rounded-xl border border-warm-border hover:bg-warm-bg text-charcoal-secondary hover:text-charcoal text-xs font-bold transition-colors flex items-center gap-1.5" id="btn-save-draft">
<span className="material-symbols-outlined text-[17px]">bookmark</span>
<span>Lưu bản nháp</span>
</button>
<button className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand/30 hover:shadow-lg transition-all flex items-center gap-2 transform active:scale-95" id="btn-evaluate">
<span className="material-symbols-outlined text-[18px]">auto_awesome</span>
<span>{"Chấm & Phân tích tức thì"}</span>
</button>
</div>
</div>
</div>
{/*  Grammar Reference Cheat Sheet Card  */}
<div className="bg-white border border-warm-border rounded-2xl p-6 shadow-subtle space-y-3">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2 text-charcoal font-bold text-sm">
<div className="w-7 h-7 rounded-lg bg-brand-light text-brand flex items-center justify-center">
<span className="material-symbols-outlined text-[18px]">menu_book</span>
</div>
<span>Cẩm nang ngữ pháp: 〜わけにはいかない</span>
</div>
<span className="text-xs font-bold text-brand bg-brand-light px-2.5 py-0.5 rounded-full">{"JLPT N3 Trọng tâm\n              "}</span>
</div>
<p className="text-xs text-charcoal-secondary leading-relaxed">{"Diễn đạt trạng thái người nói "}<em>rất muốn</em>{" hoặc "}<em>có thể</em>{" làm một hành động, nhưng do các chuẩn mực xã hội, lương tâm, lý do nghề nghiệp hoặc nghĩa vụ bắt buộc mà "}<strong>không thể nào thực hiện được</strong>{". Khác biệt với "}<em>〜できない</em>{" (chỉ năng lực thuần túy).\n            "}</p>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
<div className="p-3 rounded-xl bg-warm-bg border border-warm-border space-y-1">
<span className="text-xs font-bold text-brand block">1. Khẳng định: V-ru + わけにはいかない</span>
<p className="text-[11px] text-charcoal-secondary leading-normal">{"Vì lý do đạo đức, danh dự hay công việc nên "}<strong>KHÔNG THỂ LÀM</strong>{" dù rất muốn.\n                "}</p>
<span className="text-[11px] font-jp text-charcoal font-semibold block pt-0.5">例: 大事な会議だから休むわけにはいかない。</span>
</div>
<div className="p-3 rounded-xl bg-warm-bg border border-warm-border space-y-1">
<span className="text-xs font-bold text-leaf block">2. Phủ định: V-nai + わけにはいかない</span>
<p className="text-[11px] text-charcoal-secondary leading-normal">{"Vì bổn phận và trách nhiệm ràng buộc nên "}<strong>PHẢI LÀM</strong>{" (không thể không làm).\n                "}</p>
<span className="text-[11px] font-jp text-charcoal font-semibold block pt-0.5">例: 頼まれた仕事だから、やらないわけにはいかない。</span>
</div>
</div>
</div>
</div>
{/*  ===========================================================  */}
{/*  RIGHT COLUMN: REAL-TIME AI ANALYSIS CARD (5 Cols)            */}
{/*  ===========================================================  */}
<div className="lg:col-span-5 space-y-6">
<div className="bg-white border border-warm-border rounded-2xl p-6 shadow-card space-y-6 relative overflow-hidden">
{/*  Subtle decorative background gradient  */}
<div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-brand-accent/20 blur-2xl pointer-events-none"></div>
{/*  Sensei Header + Score Badge  */}
<div className="flex items-center justify-between pb-4 border-b border-warm-border/60">
<div className="flex items-center gap-3">
<div className="relative">
<div className="w-12 h-12 rounded-2xl bg-brand-light text-brand border border-brand-accent flex items-center justify-center shadow-sm font-bold">
<span className="material-symbols-outlined text-[26px]">psychology</span>
</div>
<span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-leaf ring-2 ring-white"></span>
</div>
<div>
<div className="flex items-center gap-1.5">
<h3 className="font-extrabold text-charcoal text-base">Haru Sensei AI</h3>
<span className="material-symbols-outlined text-brand text-[17px]" title="Chuyên gia thẩm định đạt chuẩn">verified</span>
</div>
<span className="text-xs text-charcoal-secondary font-medium">Chuyên gia ngôn ngữ • Tokyo Native</span>
</div>
</div>
{/*  Score Pill Badge  */}
<div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-light border border-brand-accent">
<div className="flex flex-col text-right">
<span className="text-[10px] font-extrabold uppercase tracking-wider text-brand">Điểm Haru</span>
<div className="text-2xl font-black text-brand leading-none">{"9.2"}<span className="text-xs font-semibold text-charcoal-secondary">/10</span>
</div>
</div>
<span className="material-symbols-outlined text-brand text-[24px]">workspace_premium</span>
</div>
</div>
{/*  Interactive Highlight Annotation  */}
<div className="space-y-2">
<div className="flex items-center justify-between text-xs">
<span className="font-bold text-charcoal uppercase tracking-wider text-[11px]">Phân tích văn phong trực quan</span>
<span className="text-leaf font-bold flex items-center gap-1">
<span className="w-2 h-2 rounded-full bg-leaf"></span>{"Độ tự nhiên: Rất cao\n                "}</span>
</div>
{/*  Visual Highlighting Container  */}
<div className="p-4 rounded-xl bg-warm-bg border border-warm-border font-jp text-sm text-charcoal leading-relaxed space-y-2">
<p>{"今週末のお花見に"}<span className="bg-leaf-bg text-leaf px-1.5 py-0.5 rounded border border-leaf-border font-medium">お誘いいただき</span>、本当にありがとうございます。ただ、月曜日の納品に向けて<span className="bg-leaf-bg text-leaf px-1.5 py-0.5 rounded border border-leaf-border font-medium">休日出勤をしなければならないため</span>、残念ながら<span className="bg-brand-light text-brand px-1.5 py-0.5 rounded border border-brand-accent font-bold underline decoration-brand decoration-2">参加するわけにはいきません</span>{"。せっかくの機会ですが、皆さんとご一緒できず申し訳ございません。\n                "}</p>
</div>
{/*  Annotation Legend Tags  */}
<div className="flex flex-wrap items-center gap-2 pt-1">
<span className="px-2.5 py-1 rounded-full bg-leaf-bg border border-leaf-border text-leaf text-[11px] font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check_circle</span>{"Kính ngữ trang nhã chuẩn mực\n                "}</span>
<span className="px-2.5 py-1 rounded-full bg-brand-light border border-brand-accent text-brand text-[11px] font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">task_alt</span>{"Áp dụng đúng ngữ cảnh 〜わけにはいかない\n                "}</span>
</div>
</div>
{/*  Detailed Sensei Feedback  */}
<div className="p-4 rounded-xl bg-warm-bg border border-warm-border space-y-2">
<div className="flex items-center gap-2 text-brand font-bold text-xs">
<span className="material-symbols-outlined text-[18px]">troubleshoot</span>
<span>Lời bình chi tiết của Haru</span>
</div>
<p className="text-xs text-charcoal-secondary leading-relaxed">{"Bạn sử dụng cấu trúc "}<strong className="text-charcoal font-semibold">参加するわけにはいきません</strong>{" hoàn toàn chuẩn xác theo tiêu chuẩn ngữ pháp JLPT N3, thể hiện được sự bứt rứt vì công việc ưu tiên. Tuy nhiên, trong văn hóa công ty Nhật Bản (Business Etiquette), bạn có thể nâng cấp sắc thái đuôi câu:\n              "}</p>
<div className="pt-1 pl-2 border-l-2 border-brand space-y-1">
<p className="text-xs text-charcoal leading-snug">{"Thay vì "}<em>いきません</em>{", hãy cân nhắc "}<strong className="text-brand font-semibold">お受けするわけにはまいりません</strong>{" hoặc "}<strong className="text-brand font-semibold">参加いたしかねます</strong>{" để đạt phong thái khiêm nhường chuẩn Business Keigo cấp độ cao.\n                "}</p>
</div>
</div>
{/*  Bản nâng cấp Sakura Native with Copy Button  */}
<div className="p-4 rounded-xl bg-brand-light/50 border border-brand-accent/70 space-y-2.5">
<div className="flex items-center justify-between">
<span className="text-xs font-extrabold text-brand uppercase tracking-wider flex items-center gap-1.5">
<span className="material-symbols-outlined text-[17px]">local_florist</span>{"Bản nâng cấp Sakura Native\n                "}</span>
<button className="text-xs font-bold text-charcoal hover:text-brand transition-colors flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-warm-border shadow-xs" id="btn-copy-native">
<span className="material-symbols-outlined text-[15px]">content_copy</span>
<span id="copy-btn-text">Sao chép</span>
</button>
</div>
<p className="text-sm font-semibold text-charcoal italic font-jp leading-relaxed bg-white/80 p-3 rounded-lg border border-brand-accent/40" id="native-text">{"“納期の都合上、出勤せざるを得ず、心苦しい限りですが今回は参加するわけにはまいりません。”\n              "}</p>
<div className="text-[11px] text-charcoal-secondary leading-relaxed pt-0.5">
<strong className="text-charcoal">Dịch nghĩa tự nhiên:</strong>{" Vì tiến độ bàn giao sản phẩm buộc tôi phải đi làm ngày nghỉ, bản thân vô cùng áy náy nhưng lần này thực sự không thể tham gia cùng mọi người được.\n              "}</div>
</div>
{/*  Gamification / LP Achievement Badge  */}
<div className="p-3.5 rounded-xl bg-leaf-bg border border-leaf-border flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-leaf text-white flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">military_tech</span>
</div>
<div className="flex flex-col">
<span className="text-xs font-bold text-leaf">Đạt chuẩn JLPT N3 Writing Studio</span>
<span className="text-[11px] text-charcoal-secondary">Đã cộng vào thành tích cá nhân</span>
</div>
</div>
<span className="text-sm font-extrabold text-leaf">+25 LP</span>
</div>
</div>
</div>
</section>
{/*  =============================================================  */}
{/*  D. BOTTOM SECTION: RECENT SUBMISSIONS HISTORY                  */}
{/*  =============================================================  */}
<section className="space-y-4 pt-4">
{/*  Section Title & Filter Tools  */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
<span className="material-symbols-outlined text-[16px]">history_edu</span>{"Hồ sơ học tập cá nhân\n            "}</div>
<h2 className="text-xl font-extrabold text-charcoal">{"Nhật ký tiến bộ - Lịch sử nộp bài & Đánh giá gần đây\n            "}</h2>
</div>
<div className="flex items-center gap-2">
<button className="px-3.5 py-1.5 rounded-xl bg-white border border-warm-border hover:border-brand-accent text-charcoal-secondary hover:text-charcoal text-xs font-bold transition-all shadow-subtle flex items-center gap-1.5">
<span className="material-symbols-outlined text-[17px]">filter_list</span>
<span>Lọc theo cấp độ</span>
</button>
<button className="px-3.5 py-1.5 rounded-xl bg-white border border-warm-border hover:border-brand text-brand text-xs font-bold transition-all shadow-subtle flex items-center gap-1">
<span>Xem tất cả (18 bài)</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</button>
</div>
</div>
{/*  3 Recent Cards Grid (Scores: 9.2, 9.8, 8.4)  */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/*  Card 1: Vừa chấm (9.2)  */}
<div className="bg-white border border-warm-border rounded-2xl p-5 shadow-subtle hover:border-brand-accent hover:shadow-card transition-all flex flex-col justify-between group space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between">
<span className="px-2.5 py-0.5 rounded-full bg-brand-light text-brand text-[11px] font-bold">{"N3 Business\n                "}</span>
<span className="text-[11px] text-charcoal-muted flex items-center gap-1 font-medium">
<span className="material-symbols-outlined text-[14px]">schedule</span>{"Hôm nay 09:15\n                "}</span>
</div>
<h3 className="text-base font-bold text-charcoal group-hover:text-brand transition-colors">{"Từ chối tiệc ngắm hoa Hanami\n              "}</h3>
<p className="text-xs text-charcoal-secondary line-clamp-2 font-jp">{"今週末のお花見にお誘いいただき、本当にありがとうございます。ただ、月曜日の納品に向けて休日出勤...\n              "}</p>
<div className="pt-1">
<span className="text-[11px] font-medium bg-warm-bg border border-warm-border px-2 py-0.5 rounded text-charcoal-secondary">{"Ngữ pháp: 〜わけにはいかない\n                "}</span>
</div>
</div>
<div className="pt-3 border-t border-warm-border/60 flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="text-xl font-extrabold text-brand">9.2</span>
<span className="text-[11px] font-bold text-leaf flex items-center">
<span className="material-symbols-outlined text-[15px]">verified</span>{"Đã chấm AI\n                "}</span>
</div>
<a className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5" href="#">{"Xem lại góp ý\n                "}<span className="material-symbols-outlined text-[15px]">chevron_right</span>
</a>
</div>
</div>
{/*  Card 2: Thư cảm ơn thầy giáo (9.8)  */}
<div className="bg-white border border-warm-border rounded-2xl p-5 shadow-subtle hover:border-brand-accent hover:shadow-card transition-all flex flex-col justify-between group space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between">
<span className="px-2.5 py-0.5 rounded-full bg-leaf-bg text-leaf text-[11px] font-bold">{"N3 Học thuật\n                "}</span>
<span className="text-[11px] text-charcoal-muted flex items-center gap-1 font-medium">
<span className="material-symbols-outlined text-[14px]">schedule</span>{"2 ngày trước\n                "}</span>
</div>
<h3 className="text-base font-bold text-charcoal group-hover:text-brand transition-colors">{"Viết thư cảm ơn thầy giáo hướng dẫn\n              "}</h3>
<p className="text-xs text-charcoal-secondary line-clamp-2 font-jp">{"先生の熱心なご指導のおかげで、無事に日本語能力試験N3に合格することができました...\n              "}</p>
<div className="pt-1">
<span className="text-[11px] font-medium bg-warm-bg border border-warm-border px-2 py-0.5 rounded text-charcoal-secondary">{"Ngữ pháp: 〜おかげで\n                "}</span>
</div>
</div>
<div className="pt-3 border-t border-warm-border/60 flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="text-xl font-extrabold text-leaf">9.8</span>
<span className="text-[11px] font-bold text-leaf flex items-center">
<span className="material-symbols-outlined text-[15px]">stars</span>{"Xuất sắc\n                "}</span>
</div>
<a className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5" href="#">{"Xem lại góp ý\n                "}<span className="material-symbols-outlined text-[15px]">chevron_right</span>
</a>
</div>
</div>
{/*  Card 3: Trình bày nguyện vọng phỏng vấn (8.4)  */}
<div className="bg-white border border-warm-border rounded-2xl p-5 shadow-subtle hover:border-brand-accent hover:shadow-card transition-all flex flex-col justify-between group space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between">
<span className="px-2.5 py-0.5 rounded-full bg-warm-bg text-charcoal-secondary text-[11px] font-bold">{"N3 Phỏng vấn\n                "}</span>
<span className="text-[11px] text-charcoal-muted flex items-center gap-1 font-medium">
<span className="material-symbols-outlined text-[14px]">schedule</span>{"5 ngày trước\n                "}</span>
</div>
<h3 className="text-base font-bold text-charcoal group-hover:text-brand transition-colors">{"Trình bày nguyện vọng phỏng vấn việc làm\n              "}</h3>
<p className="text-xs text-charcoal-secondary line-clamp-2 font-jp">{"将来は貴社のようなグローバルな環境で、ITエンジニアとして日本の先端技術力を活かすつもりです...\n              "}</p>
<div className="pt-1">
<span className="text-[11px] font-medium bg-warm-bg border border-warm-border px-2 py-0.5 rounded text-charcoal-secondary">{"Ngữ pháp: 〜つもりです\n                "}</span>
</div>
</div>
<div className="pt-3 border-t border-warm-border/60 flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="text-xl font-extrabold text-charcoal">8.4</span>
<span className="text-[11px] font-bold text-charcoal-secondary flex items-center">
<span className="material-symbols-outlined text-[15px]">check_circle</span>{"Đạt chuẩn\n                "}</span>
</div>
<a className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5" href="#">{"Xem lại góp ý\n                "}<span className="material-symbols-outlined text-[15px]">chevron_right</span>
</a>
</div>
</div>
</div>
</section>
{/*  Footer Info  */}
<footer className="pt-8 pb-12 border-t border-warm-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-charcoal-muted">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px] text-brand">spa</span>
<span>© 2024 RikiPath Nihongo AI Studio. Triết lý Ma (間) trong học thuật tiếng Nhật.</span>
</div>
<div className="flex items-center gap-4">
<a className="hover:text-brand transition-colors" href="#">Điều khoản học tập</a>
<a className="hover:text-brand transition-colors" href="#">Tiêu chuẩn chấm Haru</a>
<a className="hover:text-brand transition-colors" href="#">Hỗ trợ 24/7</a>
</div>
</footer>
</main>
</div>


{/*  Micro-interactions Script  */}





    </div>
  
</LearnerShell>
);
}
