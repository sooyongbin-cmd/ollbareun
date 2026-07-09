import LoadingBoard from "@/components/loading-board";

export default function ManagerLoadingMessage({ className = "" }: { className?: string }) {
  return <LoadingBoard className={className} />;
}
