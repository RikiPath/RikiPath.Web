import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    useNotificationsQuery,
    useUnreadCountQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
    useNotificationSignalR,
} from '../../hooks/useNotification';

export default function NotificationPopover() {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);
    const navigate = useNavigate();

    // Khởi tạo kết nối SignalR
    useNotificationSignalR();

    // Queries & Mutations
    const { data: notificationsData, isLoading } = useNotificationsQuery();
    const { data: unreadData } = useUnreadCountQuery();
    const markAsReadMutation = useMarkAsReadMutation();
    const markAllAsReadMutation = useMarkAllAsReadMutation();

    const notifications = notificationsData?.items || (Array.isArray(notificationsData) ? notificationsData : []);
    const unreadCount = typeof unreadData === 'number'
        ? unreadData
        : (unreadData?.count ?? unreadData?.unreadCount ?? 0);

    // Đóng popover khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event) {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (item) => {
        if (!item.isRead) {
            markAsReadMutation.mutate(item.id);
        }
        setIsOpen(false);
        if (item.linkUrl) {
            navigate(item.linkUrl);
        } else if (item.type === 'CONTENT_APPROVAL_PENDING' || item.type === 'ApprovalRequest') {
            navigate('/admin/content-review');
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            {/* Nút bấm hình quả chuông khớp style AdminShell */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dfbfc1]/45 bg-white text-[#6F6669] shadow-sm hover:text-[#D94B68] transition-colors"
                aria-label="Thông báo"
            >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D94B68] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Frame Popover */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-[22px] border border-[#dfbfc1]/40 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#F5ECEE] px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-extrabold text-[#2D282A]">Thông báo</span>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-[#fff0f5] px-2 py-0.5 text-[11px] font-bold text-[#D94B68]">
                                    {unreadCount} mới
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => markAllAsReadMutation.mutate()}
                                disabled={markAllAsReadMutation.isPending}
                                className="text-[12px] font-semibold text-[#D94B68] hover:text-[#9E2A4B] transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px]">done_all</span>
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* Danh sách thông báo */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F5ECEE] py-1">
                        {isLoading ? (
                            <div className="flex h-32 items-center justify-center text-[13px] text-[#A59B9E]">
                                <span className="animate-spin material-symbols-outlined mr-2 text-[20px]">progress_activity</span>
                                Đang tải...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <span className="material-symbols-outlined text-[36px] text-[#C4B8BA] mb-2">notifications_off</span>
                                <p className="text-[13px] font-medium text-[#A59B9E]">Không có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className={`group flex items-start gap-3 rounded-[14px] p-3 transition-all cursor-pointer ${!item.isRead ? 'bg-[#FFF8F8] hover:bg-[#fff0f5]' : 'bg-transparent hover:bg-gray-50'
                                        }`}
                                >
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[18px] ${!item.isRead ? 'bg-[#ffd9e4] text-[#D94B68]' : 'bg-gray-100 text-[#A59B9E]'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {item.type === 'ApprovalRequest' || item.type === 'CONTENT_APPROVAL_PENDING' ? 'article' : 'notifications'}
                                        </span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-[13px] leading-snug truncate ${!item.isRead ? 'font-bold text-[#2D282A]' : 'font-medium text-[#6F6669]'}`}>
                                                {item.title}
                                            </p>
                                            {!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#D94B68]"></span>}
                                        </div>
                                        <p className="mt-0.5 text-[12px] leading-relaxed text-[#6F6669] line-clamp-2">
                                            {item.message}
                                        </p>
                                        <span className="mt-1 block text-[10px] font-medium text-[#A59B9E]">
                                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#F5ECEE] pt-2 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                navigate('/admin/content-review');
                            }}
                            className="w-full rounded-xl py-2 text-[12px] font-bold text-[#D94B68] hover:bg-[#fff0f5] transition-colors"
                        >
                            Xem tất cả yêu cầu duyệt nội dung
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}