"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { useState } from "react";
import AlertModal from "@/components/modals/alert-modal";

export default function Home() {
  const [counselingOpen, setCounselingOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [counselingName, setCounselingName] = useState("");
  const [counselingPhone, setCounselingPhone] = useState("");
  const [counselingNotes, setCounselingNotes] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCounselingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselingName.trim()) {
      setAlertMessage("성함을 입력해 주세요.");
      return;
    }
    if (!counselingPhone.trim()) {
      setAlertMessage("연락처를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setCounselingOpen(false);
      setAlertMessage("상담 신청이 완료되었습니다. 담당자가 빠른 시일 내에 연락드리겠습니다.");
      // Reset form
      setCounselingName("");
      setCounselingPhone("");
      setCounselingNotes("");
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* GNB (Header) */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#006a62" />
              <path d="M9 16L14 21L23 11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-[20px] font-bold text-foreground tracking-tight">올바름</h1>
          </div>

          {/* Consultation Button */}
          <Button
            type="button"
            onClick={() => setCounselingOpen(true)}
            className="bg-foreground hover:bg-black text-white px-5 py-2 rounded-full text-[14px] font-medium transition-colors duration-200"
          >
            상담 신청하기
          </Button>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative h-[560px] md:h-[640px] w-full overflow-hidden bg-foreground flex items-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/lobby_hero.png')` }}
        />
        {/* Dark Scrim */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Content Overlay */}
        <div className="relative max-w-7xl mx-auto px-6 w-full text-white">
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[1.25] tracking-tight max-w-2xl font-sans">
            사람을 향한 신뢰,
            <br />
            공간을 채우는 투명함.
            <br />
            사회적기업 올바름이 함께합니다.
          </h2>
        </div>
      </section>

      {/* Core Features (3 Card Section) */}
      <section className="relative z-10 px-6 -mt-16 md:-mt-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-card rounded-xl p-8 border border-border shadow-[0px_4px_20px_rgba(15,32,39,0.06)] flex flex-col gap-4 hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479L12 21l-6.825-4a12.084 12.084 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h3 className="text-[20px] font-bold text-foreground">체계적인 전문 교육</h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              직무 전문성 향상을 위한 정기적이고 체계적인 커리큘럼을 통해 최상의 서비스를 보장합니다.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-card rounded-xl p-8 border border-border shadow-[0px_4px_20px_rgba(15,32,39,0.06)] flex flex-col gap-4 hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-[20px] font-bold text-foreground">철저한 현장 관리</h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              실시간 모니터링 및 현장 매니저 전담 배치를 통해 공백 없는 시설 관리를 실현합니다.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-card rounded-xl p-8 border border-border shadow-[0px_4px_20px_rgba(15,32,39,0.06)] flex flex-col gap-4 hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-[20px] font-bold text-foreground">낮은 이직률, 안정적 품질</h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              정규직 고용과 우수한 복지를 통해 숙련된 인력을 유지하여 일관된 품질을 제공합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Promotion / Call to Action Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="relative rounded-[24px] bg-primary p-10 md:p-16 text-white shadow-xl overflow-hidden flex flex-col items-center text-center gap-6">
          {/* Subtle Decorative SVGs in Background */}
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-card/5 pointer-events-none animate-pulse" />
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-card/5 pointer-events-none animate-pulse" />

          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight">
            사회적기업 올바름과 함께하면
          </h2>
          <p className="max-w-3xl text-[15px] md:text-[17px] opacity-90 leading-relaxed font-normal">
            사회적기업 제품 우선구매 제도는 공공기관이 사회적기업의 제품을 우선 구매하도록 촉진하는 제도입니다. 올바름과 함께하시면 법정 우선구매 목표 달성에 기여하고 우수한 품질의 서비스와 사회적 가치를 동시에 실현할 수 있습니다.
          </p>
          <Button
            type="button"
            onClick={() => setBenefitsOpen(true)}
            className="bg-foreground hover:bg-black text-white px-8 py-3 rounded-full text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
          >
            혜택 자세히 보기
          </Button>
        </div>
      </section>

      {/* Social Metrics Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 flex flex-col items-center gap-10">
        <div className="text-center space-y-2">
          <h2 className="text-[28px] md:text-[36px] font-bold text-foreground">사회적 가치 측정 지표</h2>
          <p className="text-[16px] text-muted-foreground">우리는 비즈니스를 통해 더 나은 세상을 만듭니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Metric 1 */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-[0px_4px_12px_rgba(15,32,39,0.04)] flex flex-col items-center justify-between text-center gap-6">
            <div className="space-y-2">
              <span className="text-[48px] font-bold text-primary leading-none block">30%+</span>
              <span className="text-foreground text-[16px] font-semibold block">취약계층 고용률</span>
            </div>
            {/* Custom progress bar */}
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: "35%" }} />
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-[0px_4px_12px_rgba(15,32,39,0.04)] flex flex-col items-center justify-between text-center gap-6">
            <div className="space-y-2">
              <span className="text-[48px] font-bold text-primary leading-none block">98%</span>
              <span className="text-foreground text-[16px] font-semibold block">고객 만족도</span>
            </div>
            {/* Custom progress bar */}
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: "98%" }} />
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-[0px_4px_12px_rgba(15,32,39,0.04)] flex flex-col items-center justify-between text-center gap-6">
            <div className="space-y-2">
              <span className="text-[48px] font-bold text-primary leading-none block">S+</span>
              <span className="text-foreground text-[16px] font-semibold block">지역사회 공헌 지표</span>
            </div>
            {/* Stars */}
            <div className="flex gap-1.5 text-primary">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 fill-current animate-pulse" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Column 1 */}
          <div className="space-y-4">
            <h3 className="text-[24px] font-bold text-white">올바름 (All-Barun)</h3>
            <p className="text-muted-foreground text-[14px] leading-relaxed max-w-sm">
              사회적가치를 창출하며 깨끗하고 안전한 공간을 만드는 프리미엄 시설관리 전문 기업입니다.
            </p>
            <div className="text-[14px] text-muted-foreground space-y-1.5 pt-2">
              <p className="font-bold">주식회사 올바름</p>
              <p><span className="font-bold">주소 :</span> 부산광역시 강서구 유통단지1로 41, 118동 222호(대저2동)</p>
              <p><span className="font-bold">대표자 :</span> 윤지욱</p>
              <p><span className="font-bold">연락처 :</span> 051-465-7767</p>
              <p><span className="font-bold">인·지정연도 :</span> 2021</p>
            </div>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-[16px] font-bold text-muted-foreground mb-4">바로가기</h4>
            <div className="flex flex-col gap-2.5 text-[14px]">
              <Link className="hover:text-primary transition-colors" href="/manager">
                관리자
              </Link>
              <Link className="hover:text-primary transition-colors" href="/guard">
                경비원
              </Link>
            </div>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-[16px] font-bold text-muted-foreground mb-4">고객지원</h4>
            <div className="flex flex-col gap-2.5 text-[14px] text-muted-foreground">
              <span className="hover:text-white cursor-pointer transition-colors">이용약관</span>
              <span className="hover:text-white cursor-pointer transition-colors">개인정보처리방침</span>
              <span className="hover:text-white cursor-pointer transition-colors">오시는 길</span>
              <span className="hover:text-white cursor-pointer transition-colors">윤리경영</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="max-w-7xl mx-auto px-6 pt-8 mt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground text-[14px]">
          <p>© 2024 All-Barun Social Enterprise. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">LinkedIn</span>
            <span className="hover:text-white cursor-pointer transition-colors">Instagram</span>
            <span className="hover:text-white cursor-pointer transition-colors">Blog</span>
          </div>
        </div>
      </footer>

      {/* Counseling Application Modal */}
      <Dialog open={counselingOpen} onOpenChange={setCounselingOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>무료상담 신청하기</DialogTitle>
            <DialogDescription>담당자 정보를 남겨주시면 확인 후 연락드리겠습니다.</DialogDescription>
          </DialogHeader>

            <form onSubmit={handleCounselingSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-foreground block">성함 / 담당자명</label>
                <Input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-input focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-[15px]"
                  placeholder="담당자분의 이름을 입력해 주세요."
                  value={counselingName}
                  onChange={(e) => setCounselingName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-foreground block">연락처</label>
                <Input
                  type="tel"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-input focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-[15px]"
                  placeholder="예: 010-1234-5678"
                  value={counselingPhone}
                  onChange={(e) => setCounselingPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-foreground block">문의 및 요청사항 (선택)</label>
                <Textarea
                  className="w-full px-4 py-2.5 rounded-lg border border-input focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-[15px] h-24 resize-none"
                  placeholder="문의하실 시설종류나 요청 내용을 적어주세요."
                  value={counselingNotes}
                  onChange={(e) => setCounselingNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setCounselingOpen(false)}
                  variant="outline"
                  className="w-1/2 py-3 rounded-lg border border-input hover:bg-muted text-muted-foreground font-semibold text-[15px] transition-colors"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold text-[15px] transition-colors"
                >
                  {submitting ? "신청 중..." : "신청 완료"}
                </Button>
              </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Benefits Info Modal */}
      <Dialog open={benefitsOpen} onOpenChange={setBenefitsOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-[500px] flex-col">
          <DialogHeader>
            <DialogTitle>사회적기업 우선구매 혜택 안내</DialogTitle>
            <DialogDescription>사회적기업 제품과 용역을 구매할 때 얻을 수 있는 주요 혜택입니다.</DialogDescription>
          </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              <div className="space-y-2">
                <h3 className="text-[16px] font-bold text-primary">1. 공공기관 법정 의무구매 목표 달성</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  사회적기업 육성법 제12조 및 동법 시행령 제12조에 의거하여, 모든 공공기관은 총 구매액의 일정 비율 이상을 사회적기업의 제품 및 용역 서비스로 구매해야 합니다. 올바름과 연계하시면 당해 목표 실적을 손쉽게 채우실 수 있습니다.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-[16px] font-bold text-primary">2. 공공 입찰 및 수의계약 혜택</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  공공 입찰 적격심사 시 신인도 가점이 부여되며, 지자체 및 공공기관에 따라 소액 수의계약 한도가 상향 적용되는 등의 실무적인 행정 편의와 혜택을 받으실 수 있습니다.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-[16px] font-bold text-primary">3. 기업 ESG 경영 가점 확보</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  사회적 책임을 중시하는 최근 경영 트렌드에 따라, 취약계층 일자리를 제공하고 지역 사회공헌 지표가 우수한 올바름과의 거래를 통해 기업의 친환경(E)·사회적 책임(S)·투명경영(G) 실적 지표를 크게 개선할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-4 flex justify-end">
              <Button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-[15px]"
                type="button"
                onClick={() => setBenefitsOpen(false)}
              >
                닫기
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Alert Modal */}
      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => setAlertMessage("")}
        title="알림"
        description={alertMessage}
      />
    </main>
  );
}
