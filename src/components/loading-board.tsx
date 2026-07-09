/* eslint-disable @next/next/no-img-element */

type LoadingBoardProps = {
  className?: string;
  label?: string;
};

export default function LoadingBoard({
  className = "",
  label = "자료를 불러오는 중입니다.",
}: LoadingBoardProps) {
  const hasCustomSize = /\b(?:h-|min-h-|max-h-|w-|min-w-|max-w-)/.test(className);
  const sizeClassName = hasCustomSize ? "" : "min-h-[64px] min-w-[64px]";

  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={`inline-flex items-center justify-center ${sizeClassName} ${className}`.trim()}
      role="status"
    >
      <img alt="" aria-hidden="true" className="h-full max-h-16 min-h-6 w-auto object-contain" src="/loading_board.gif" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
