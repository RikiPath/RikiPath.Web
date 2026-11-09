export default function BrandMark({ className = 'h-10 w-auto' }) {
  return (
    <img
      src="/brand-logo.png"
      alt=""
      className={`block shrink-0 object-contain ${className}`}
    />
  );
}
