export default function ManagerLoadingMessage({ className = "" }: { className?: string }) {
  return <p className={`text-[16px] text-ink-muted-48 ${className}`.trim()}>자료조회중입니다...</p>;
}
