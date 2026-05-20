import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas-parchment px-5 text-ink font-apple selection:bg-primary/20">
      <section className="w-full max-w-md rounded-[18px] border border-hairline/50 bg-canvas p-8 shadow-sm animate-in fade-in zoom-in duration-500">
        <h1 className="text-[24px] font-semibold tracking-tight text-center mb-8">올바른 관리시스템</h1>
        <div className="grid gap-4">
          <Link className="button-primary text-center" href="/manager">
            관리자
          </Link>
          <Link className="button-secondary text-center" href="/guard">
            경비원
          </Link>
        </div>
      </section>
    </main>
  );
}
