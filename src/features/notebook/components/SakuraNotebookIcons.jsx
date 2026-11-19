/**
 * Colorful 2D Sakura SVG Icons designed specifically for RikiPath Smart Notebook V6.5.
 */

export function SakuraNotebookBubbleIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" aria-hidden="true" className={className}>
      <rect x="6" y="4" width="24" height="28" rx="6" fill="#FCEAEF" stroke="#CC4B6B" strokeWidth="1.8" />
      <rect x="6" y="4" width="6.5" height="28" rx="3" fill="#E05A7A" />
      <path d="M16.5 11.5h9M16.5 17h7.5M16.5 22.5h5" stroke="#B53D5C" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="26.5" cy="24.5" r="5" fill="#FFFDF9" stroke="#CC4B6B" strokeWidth="1.5" />
      <path
        d="M26.5 21.8c.8 0 1.4.7 1.4 1.6 0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6c0-.9.6-1.6 1.4-1.6z"
        fill="#E05A7A"
      />
      <circle cx="26.5" cy="24.5" r="1.2" fill="#FDE7EC" />
    </svg>
  );
}

export function SakuraFolderIcon({ open = false, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 7a2 2 0 0 1 2-2h4.2c.6 0 1.1.3 1.5.7L12 7h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        fill={open ? '#FDE7EC' : '#FCEAEF'}
        stroke="#CC4B6B"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {open && (
        <path d="M3.5 11.5h17" stroke="#E05A7A" strokeWidth="1.4" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function SakuraNotePageIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="4" y="3" width="16" height="18" rx="3.5" fill="#FFFDFC" stroke="#E05A7A" strokeWidth="1.6" />
      <path d="M8 8.5h8M8 12.5h8M8 16.5h5" stroke="#B53D5C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
