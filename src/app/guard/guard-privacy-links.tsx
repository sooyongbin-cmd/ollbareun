import Link from "next/link";

export default function GuardPrivacyLinks() {
  return (
    <nav aria-label="개인정보 및 지원" className="flex flex-wrap justify-center gap-x-4 gap-y-2 py-4 text-sm">
      <Link
        className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
        href="/privacy-policy"
        prefetch={false}
      >
        개인정보처리방침
      </Link>
      <a
        className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
        href="mailto:cyberbin@naver.com"
      >
        개인정보·계정 삭제 문의
      </a>
    </nav>
  );
}
