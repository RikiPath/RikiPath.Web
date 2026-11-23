import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  BookOpen,
  ChartNoAxesCombined,
  HeartHandshake,
  MessageCircle,
  Minimize2,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { Badge, Button, Input, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  COMPANION_REACTIONS,
  COMPANION_STATES,
  ENCOURAGEMENT_LINES,
  pickRandomMove,
  selectNonRepeatingLine,
} from './companionMachine.js';
import { askSakuraCompanion } from './companionAiAdapter.js';
import { playSakuraChime } from './companionSound.js';
import { resolveFoxPoseConfig } from './fox3dContract.js';
import SakuraFox3DActor from './SakuraFox3DActor.jsx';

const MENU_ITEMS = [
  { id: 'chat', label: 'Trò chuyện với cáo', note: 'Hỏi JLPT, tra từ & mẹo học', Icon: MessageCircle },
  { id: 'recommend', label: 'Gợi ý bài học', note: 'Chọn bước tiếp theo phù hợp', Icon: BookOpen },
  { id: 'progress', label: 'Kiểm tra tiến độ', note: 'Xem mục tiêu, chuỗi & SRS thật', Icon: ChartNoAxesCombined },
  { id: 'encourage', label: 'Động viên mình', note: 'Nhận năng lượng Sakura ngay', Icon: HeartHandshake },
  { id: 'quick-review', label: 'Ôn tập nhanh', note: 'Xem nhanh thẻ SRS đến hạn', Icon: Zap },
  { id: 'play', label: 'Chơi với cáo', note: 'Xoa đầu & Janken tiếng Nhật', Icon: Sparkles },
];

const CHAT_SUGGESTIONS = [
  'Gợi ý bài hôm nay',
  'Kiểm tra tiến độ',
  'Phân biệt は và が',
  'Mẹo nhớ Kanji',
];

const JANKEN_MOVES = [
  { id: 'guu', label: '✊ Guu (Búa)', jp: 'グー' },
  { id: 'choki', label: '✌️ Choki (Kéo)', jp: 'チョキ' },
  { id: 'paa', label: '🖐️ Paa (Bao)', jp: 'パー' },
];

function formatFormattedReply(text) {
  return String(text || '').split('\n').map((line, lineIdx) => {
    const tokens = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={lineIdx} className={lineIdx > 0 ? 'mt-1' : undefined}>
        {tokens.map((part, idx) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={idx} className="font-semibold text-rp-text">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={idx}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

export default function RikiInteractivePanel({
  initialView = 'menu',
  stats = {},
  companionState,
  companionReaction,
  prefs,
  onSetState,
  onTriggerReaction,
  onToggleSound,
  onToggleProactiveMute,
  onMinimize,
  onResetPosition,
  onClose,
}) {
  const { tr, locale } = useLocale();
  const [view, setView] = useState(initialView);
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-msg',
      role: 'riki',
      text: stats.targetLevel
        ? `Konbanwa / Konnichiwa! Mình là Riki — bạn đồng hành JLPT ${stats.targetLevel} của bạn. Hôm nay mình hỗ trợ gì cho bạn nha?`
        : 'Chào bạn! Mình là Riki — bạn đồng hành học tiếng Nhật của bạn. Bạn muốn hỏi JLPT, tra từ vựng hay xem gợi ý học hôm nay?',
      actions: [],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [flippedCard, setFlippedCard] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [jankenResult, setJankenResult] = useState(null);
  const [cheerMessage, setCheerMessage] = useState('');
  const recentCheersRef = useRef([]);
  const chatBottomRef = useRef(null);
  const msgSeqRef = useRef(1);

  useEffect(() => {
    if (view === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, view]);

  async function submitChatQuery(textToSend) {
    const query = String(textToSend || inputValue).trim();
    if (!query || chatBusy) return;
    setInputValue('');
    setView('chat');

    const userMsg = { id: `u-${msgSeqRef.current++}`, role: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    onSetState(COMPANION_STATES.THINKING);
    setChatBusy(true);
    playSakuraChime('pop', prefs.soundEnabled);

    try {
      const response = await askSakuraCompanion({
        query,
        stats,
        history: messages.slice(-6),
        locale,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `r-${msgSeqRef.current++}`,
          role: 'riki',
          text: response.text,
          actions: response.actions || [],
        },
      ]);
      onSetState(response.state || COMPANION_STATES.SPEAKING);
      if (response.state === COMPANION_STATES.CELEBRATING) {
        onTriggerReaction(COMPANION_REACTIONS.JUMPING);
        playSakuraChime('celebrate', prefs.soundEnabled);
      }
    } finally {
      setChatBusy(false);
    }
  }

  function handleMenuSelect(itemId) {
    playSakuraChime('tap', prefs.soundEnabled);

    if (itemId === 'chat') {
      onSetState(COMPANION_STATES.SPEAKING);
      setView('chat');
      return;
    }
    if (itemId === 'recommend') {
      void submitChatQuery('Gợi ý bài học hôm nay');
      return;
    }
    if (itemId === 'progress') {
      void submitChatQuery('Kiểm tra tiến độ');
      return;
    }
    if (itemId === 'encourage') {
      const picked = selectNonRepeatingLine(ENCOURAGEMENT_LINES, recentCheersRef.current);
      if (picked) {
        recentCheersRef.current = [...recentCheersRef.current.slice(-3), picked.id];
        setCheerMessage(picked.text);
      }
      onSetState(COMPANION_STATES.CELEBRATING);
      onTriggerReaction(COMPANION_REACTIONS.JUMPING);
      playSakuraChime('celebrate', prefs.soundEnabled);
      setView('encourage');
      return;
    }
    if (itemId === 'quick-review') {
      setFlippedCard(false);
      setReviewIndex(0);
      onSetState(COMPANION_STATES.LISTENING);
      setView('quick-review');
      return;
    }
    if (itemId === 'play') {
      setJankenResult(null);
      onSetState(COMPANION_STATES.HOVER);
      onTriggerReaction(COMPANION_REACTIONS.WAVING);
      setView('play');
    }
  }

  function handleActionChip(actionItem) {
    if (!actionItem) return;
    if (actionItem.action === 'recommend') void submitChatQuery('Gợi ý bài học hôm nay');
    else if (actionItem.action === 'progress') void submitChatQuery('Kiểm tra tiến độ');
    else if (actionItem.action === 'encourage') handleMenuSelect('encourage');
    else if (actionItem.action === 'quick-review') handleMenuSelect('quick-review');
    else if (actionItem.action === 'play') handleMenuSelect('play');
  }

  function handlePlayJanken(playerMove) {
    const rikiPick = pickRandomMove(JANKEN_MOVES);
    let outcome = 'draw';
    if (
      (playerMove.id === 'guu' && rikiPick.id === 'choki') ||
      (playerMove.id === 'choki' && rikiPick.id === 'paa') ||
      (playerMove.id === 'paa' && rikiPick.id === 'guu')
    ) {
      outcome = 'win';
    } else if (playerMove.id !== rikiPick.id) {
      outcome = 'lose';
    }

    const line =
      outcome === 'win'
        ? `Yatta! Bạn ra ${playerMove.jp} thắng Riki (${rikiPick.jp}) rồi! Chúc mừng nha!`
        : outcome === 'draw'
          ? `Aiko desho! Cả hai cùng ra ${rikiPick.jp} nè, thử lại ván nữa nhé!`
          : `Hihi Riki ra ${rikiPick.jp} thắng xíu rồi! Bấm thêm ván nữa phục thù đi nào!`;

    setJankenResult({ playerMove, rikiPick, outcome, line });
    if (outcome === 'win') {
      onSetState(COMPANION_STATES.CELEBRATING);
      onTriggerReaction(COMPANION_REACTIONS.JUMPING);
      playSakuraChime('celebrate', prefs.soundEnabled);
    } else {
      onSetState(COMPANION_STATES.SPEAKING);
      onTriggerReaction(COMPANION_REACTIONS.WAVING);
      playSakuraChime('pop', prefs.soundEnabled);
    }
  }

  const srsItems = Array.isArray(stats.srsItems) ? stats.srsItems : [];
  const activeSrsCard = srsItems.length > 0 ? srsItems[reviewIndex % srsItems.length] : null;

  return (
    <section
      role="dialog"
      aria-label={tr('Cáo Sakura Riki')}
      className="riki-bubble-enter pointer-events-auto flex w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-rp-brand-border bg-rp-surface shadow-[0_24px_54px_-20px_rgba(140,42,74,0.28),0_4px_12px_rgba(20,24,35,0.08)]"
    >
      {/* Compact Header with Live Rig Preview + Controls */}
      <header className="flex items-center justify-between gap-2 border-b border-rp-line bg-white px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {view !== 'menu' && (
            <button
              type="button"
              onClick={() => {
                setView('menu');
                onSetState(COMPANION_STATES.IDLE);
              }}
              aria-label={tr('Quay lại menu Riki')}
              className="rp-focus inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          <SakuraFox3DActor
            state={companionState}
            reaction={companionReaction}
            size={40}
            interactive={false}
          />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-rp-text">
              {tr('Riki · Bạn đồng hành Sakura')}
            </p>
            <p className="truncate text-[11px] text-rp-brand-strong">
              {companionState === COMPANION_STATES.IDLE && stats.targetLevel
                ? `${tr('Mục tiêu')} JLPT ${stats.targetLevel}`
                : tr(resolveFoxPoseConfig(companionState).statusLabel)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleSound}
            title={prefs.soundEnabled ? tr('Tắt âm thanh Riki') : tr('Bật âm thanh Riki')}
            aria-label={prefs.soundEnabled ? tr('Tắt âm thanh Riki') : tr('Bật âm thanh Riki')}
            className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            {prefs.soundEnabled ? <Volume2 aria-hidden="true" className="h-3.5 w-3.5" /> : <VolumeX aria-hidden="true" className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggleProactiveMute}
            title={prefs.mutedProactive ? tr('Bật lời chào tự động') : tr('Tắt lời chào tự động')}
            aria-label={prefs.mutedProactive ? tr('Bật lời chào tự động') : tr('Tắt lời chào tự động')}
            className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            {prefs.mutedProactive ? <BellOff aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" /> : <Bell aria-hidden="true" className="h-3.5 w-3.5" />}
          </button>
          {onResetPosition && (
            <button
              type="button"
              onClick={onResetPosition}
              title={tr('Đặt lại vị trí')}
              aria-label={tr('Đặt lại vị trí')}
              className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onMinimize}
            title={tr('Thu gọn linh vật')}
            aria-label={tr('Thu gọn linh vật')}
            className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            <Minimize2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title={tr('Đóng')}
            aria-label={tr('Đóng')}
            className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Body Views */}
      <div className="max-h-[min(420px,62vh)] overflow-y-auto p-3.5">
        {view === 'menu' && (
          <div className="space-y-3">
            {/* Real Backend Snapshot Pill Bar (zero fake numbers) */}
            {(stats.targetLevel || Number.isFinite(stats.streakDays) || Number.isFinite(stats.dueCards)) && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-rp-line bg-rp-bg-2/70 px-2.5 py-2 text-[11px]">
                {stats.targetLevel && (
                  <Badge tone="brand" size="sm" icon={false}>JLPT {stats.targetLevel}</Badge>
                )}
                {Number.isFinite(stats.streakDays) && (
                  <Badge tone="warning" size="sm" icon={false}>{stats.streakDays} {tr('ngày liên tiếp')}</Badge>
                )}
                {Number.isFinite(stats.dueCards) && (
                  <Badge tone="info" size="sm" icon={false}>{stats.dueCards} {tr('thẻ SRS')}</Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {MENU_ITEMS.map(({ id, label, note, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleMenuSelect(id)}
                  className="rp-focus group flex flex-col items-start gap-1.5 rounded-xl border border-rp-line bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-rp-brand-border hover:bg-rp-brand-tint/35"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rp-brand-tint text-rp-brand-strong transition-colors group-hover:bg-rp-brand group-hover:text-white">
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold text-rp-text">{tr(label)}</span>
                  <span className="line-clamp-2 text-[11px] leading-4 text-rp-text-muted">{tr(note)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="space-y-3">
            <div className="space-y-2.5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cx(
                    'flex flex-col gap-1.5',
                    msg.role === 'user' ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cx(
                      'max-w-[90%] rounded-2xl px-3 py-2 text-[12.5px] leading-5',
                      msg.role === 'user'
                        ? 'bg-rp-brand-pressed text-white'
                        : 'border border-rp-line bg-rp-bg-2/85 text-rp-text-2',
                    )}
                  >
                    {formatFormattedReply(msg.text)}
                  </div>
                  {msg.role === 'riki' && msg.actions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.actions.map((act) =>
                        act.to ? (
                          <Link
                            key={act.label}
                            to={act.to}
                            onClick={onClose}
                            className="rp-focus inline-flex items-center gap-1 rounded-full border border-rp-brand-border bg-white px-2.5 py-1 text-[11px] font-semibold text-rp-brand-strong transition-colors hover:bg-rp-brand-tint"
                          >
                            {tr(act.label)}
                            <ArrowRight aria-hidden="true" className="h-3 w-3" />
                          </Link>
                        ) : (
                          <button
                            key={act.label}
                            type="button"
                            onClick={() => handleActionChip(act)}
                            className="rp-focus inline-flex items-center gap-1 rounded-full border border-rp-line bg-white px-2.5 py-1 text-[11px] font-semibold text-rp-text transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/40"
                          >
                            {tr(act.label)}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ))}
              {chatBusy && (
                <p className="text-[11px] font-medium text-rp-brand-strong">{tr('Riki đang tra cứu & trả lời…')}</p>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {CHAT_SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={chatBusy}
                  onClick={() => void submitChatQuery(chip)}
                  className="rp-focus rounded-full border border-rp-line bg-rp-bg-2 px-2.5 py-1 text-[11px] font-medium text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/45 hover:text-rp-brand-strong disabled:opacity-50"
                >
                  {tr(chip)}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'encourage' && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center pt-1">
              <SakuraFox3DActor state={COMPANION_STATES.ENCOURAGING} reaction={companionReaction} size={104} />
            </div>
            <p className="rounded-xl border border-rp-brand-border bg-white p-3 text-[13px] font-medium leading-6 text-rp-text">
              {cheerMessage}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="sm" icon={HeartHandshake} onClick={() => handleMenuSelect('encourage')}>
                {tr('Nghe câu cổ vũ khác')}
              </Button>
              <Button as={Link} to="/lessons/" onClick={onClose} variant="secondary" size="sm">
                {tr('Học ngay thôi')}
              </Button>
            </div>
          </div>
        )}

        {view === 'quick-review' && (
          <div className="space-y-3">
            {activeSrsCard ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-rp-text-muted">
                  <span>{tr('Thẻ SRS thực tế đang đến hạn')}</span>
                  <span className="tabular-nums font-semibold">{reviewIndex % srsItems.length + 1}/{srsItems.length}</span>
                </div>
                <div className="rounded-xl border border-rp-brand-border bg-rp-bg-2/70 p-4 text-center">
                  <p lang="ja" className="text-xl font-bold text-rp-text">
                    {activeSrsCard.word || activeSrsCard.kanji || activeSrsCard.term || activeSrsCard.front || '—'}
                  </p>
                  {activeSrsCard.reading && (
                    <p lang="ja" className="mt-1 text-xs text-rp-text-muted">{activeSrsCard.reading}</p>
                  )}
                  {flippedCard && (
                    <p className="mt-3 border-t border-rp-line pt-2.5 text-sm font-medium text-rp-brand-strong">
                      {activeSrsCard.meaning || activeSrsCard.meaningVi || activeSrsCard.back || activeSrsCard.personalNote || tr('Xem chi tiết trong phiên SRS')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  {!flippedCard ? (
                    <Button variant="primary" size="sm" onClick={() => setFlippedCard(true)} className="flex-1">
                      {tr('Xem nghĩa')}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setFlippedCard(false);
                        setReviewIndex((i) => i + 1);
                        onTriggerReaction(COMPANION_REACTIONS.WAVING);
                      }}
                      className="flex-1"
                    >
                      {tr('Thẻ tiếp theo')}
                    </Button>
                  )}
                  <Button as={Link} to="/daily-srs/" onClick={onClose} variant="primary" size="sm" iconRight={ArrowRight}>
                    {tr('Mở SRS đầy đủ')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="rounded-xl border border-rp-line bg-rp-bg-2/60 p-3 text-[13px] leading-5 text-rp-text-2">
                  {tr('Tuyệt vời! Bạn không còn thẻ SRS nào đang đến hạn lúc này.')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button as={Link} to="/kanji-notebook/?tab=vocab-bank" onClick={onClose} variant="primary" size="sm">
                    {tr('Khám phá từ vựng mới')}
                  </Button>
                  <Button as={Link} to="/daily-srs/" onClick={onClose} variant="secondary" size="sm">
                    {tr('Kiểm tra hàng đợi SRS')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'play' && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <SakuraFox3DActor state={companionState} reaction={companionReaction} size={108} />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSetState(COMPANION_STATES.HOVER);
                  onTriggerReaction(COMPANION_REACTIONS.JUMPING);
                  playSakuraChime('greet', prefs.soundEnabled);
                  setJankenResult({ line: 'Hihi, nhột tai Riki quá! Đuôi vẫy tít luôn rồi nè!' });
                }}
              >
                {tr('Xoa đầu Riki')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSetState(COMPANION_STATES.CELEBRATING);
                  onTriggerReaction(COMPANION_REACTIONS.WAVING);
                  playSakuraChime('celebrate', prefs.soundEnabled);
                  setJankenResult({ line: 'Oishii! Bánh Sakura mochi ngon tuyệt, cảm ơn bạn nhiều nha!' });
                }}
              >
                {tr('Tặng bánh Sakura')}
              </Button>
            </div>

            <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3 space-y-2">
              <p className="text-xs font-bold text-rp-text">{tr('Chơi Oẳn tù tì tiếng Nhật (Janken)')}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {JANKEN_MOVES.map((move) => (
                  <button
                    key={move.id}
                    type="button"
                    onClick={() => handlePlayJanken(move)}
                    className="rp-focus rounded-lg border border-rp-line bg-white px-2.5 py-1.5 text-xs font-semibold text-rp-text transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/40"
                  >
                    {move.label}
                  </button>
                ))}
              </div>
              {jankenResult?.line && (
                <p className="pt-1 text-xs font-medium text-rp-brand-strong">{jankenResult.line}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Composer Footer (when in chat or menu for quick typing) */}
      {view === 'chat' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitChatQuery(inputValue);
          }}
          className="flex items-center gap-2 border-t border-rp-line bg-white px-3 py-2.5"
        >
          <Input
            value={inputValue}
            onFocus={() => onSetState(COMPANION_STATES.LISTENING)}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={tr('Hỏi Riki về JLPT hoặc gõ từ Kana…')}
            aria-label={tr('Hỏi Riki')}
            disabled={chatBusy}
            className="h-9 flex-1 text-xs"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={Send}
            disabled={!inputValue.trim() || chatBusy}
            aria-label={tr('Gửi câu hỏi cho Riki')}
          />
        </form>
      )}
    </section>
  );
}
