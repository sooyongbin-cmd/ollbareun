import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  Award,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Droplets,
  Lightbulb,
  Mail,
  MapPin,
  Menu,
  ParkingCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wrench,
} from "lucide-react";
import styles from "./page.module.css";

const services = [
  {
    title: "근로자 파견",
    description:
      "사무관리, 생산·물류, IT·전산, 의료·간병 등 필요한 직무에 적합한 인력을 연결하고 체계적으로 관리합니다.",
    image: "/homepage/service-worker.webp",
    icon: UsersRound,
  },
  {
    title: "건물·시설물 종합 관리",
    description:
      "전기·소방·기계·가스·건축 설비의 점검부터 위생, 보안, 주차까지 현장 운영을 통합 제공합니다.",
    image: "/homepage/service-facility.webp",
    icon: Building2,
  },
  {
    title: "방역·소독",
    description:
      "법정 의무소독, 살충·살균소독과 항공기 검역 현장에 맞춘 전문 방역 프로세스를 운영합니다.",
    image: "/homepage/service-disinfection.webp",
    icon: Droplets,
  },
];

const history = [
  ["2018.04", "(주)올바름 설립", "여성기업 인증"],
  ["2021.05", "고용노동부", "사회적기업 지정"],
  ["2022.07", "한국공항공사 등록", "김해공항 세관 등록"],
  ["2023.02", "본점 확장 이전", "자본금 증자"],
  ["2023.06", "근로자파견업", "허가 취득"],
];

const values = [
  ["B", "Benefit", "차별화된 서비스로 고객 감동 극대화"],
  ["E", "Earning", "경쟁력 강화로 건강한 수익 창출"],
  ["S", "Social", "사회 환원을 통한 가치 실현"],
  ["T", "Talented", "취약계층 육성을 통한 역량 강화"],
];

const operationSteps = [
  ["01", "현장 진단", "경영상황과 현장 여건을 진단해 업무 범위와 핵심 과제를 확인합니다."],
  ["02", "목표·기준 설정", "비용, 품질, 안전 기준을 구체화하고 역할과 보고 체계를 설계합니다."],
  ["03", "인력 배치·운영", "직무에 적합한 인력을 배치하고 표준 절차에 따라 현장을 운영합니다."],
  ["04", "점검·개선 보고", "운영 성과와 위험 요소를 정기적으로 점검하고 개선 결과를 공유합니다."],
];

const facilityItems = [
  {
    title: "건물·시설 유지관리",
    text: "전기, 소방, 기계, 가스, 건축 설비의 점검과 운영관리를 한 번에 제공합니다.",
    icon: Wrench,
  },
  {
    title: "위생관리",
    text: "상주 청소, 바닥 왁스, 준공 청소 등 철저한 위생관리로 쾌적함을 유지합니다.",
    icon: Sparkles,
  },
  {
    title: "시설보안",
    text: "위험 요소를 사전에 제거하고 안전사고 예방과 친절한 응대를 제공합니다.",
    icon: ShieldCheck,
  },
  {
    title: "주차관리",
    text: "차량 입·출입과 주차장 안전을 관리해 내부 주차 질서를 확립합니다.",
    icon: ParkingCircle,
  },
];

const socialValues = [
  {
    title: "좋은 일자리 제공",
    text: "취약계층에게 안정된 일자리와 직무 몰입 환경을 제공합니다.",
    icon: BriefcaseBusiness,
  },
  {
    title: "지역사회 활성화",
    text: "영업활동에서 나온 이익을 지역사회에 다시 연결합니다.",
    icon: MapPin,
  },
  {
    title: "윤리적 시장 확산",
    text: "정직과 투명성을 바탕으로 공정한 거래 문화를 지향합니다.",
    icon: Lightbulb,
  },
  {
    title: "환경경영시스템 인증",
    text: "ISO 14001을 기반으로 신뢰와 비용 절감, ESG 경영을 실현합니다.",
    icon: Award,
  },
];

const clientGroups = [
  {
    title: "공공기관",
    logos: [
      ["한국해양수산연수원", "/homepage/logo-maritime.webp"],
      ["부산박물관", "/homepage/logo-busan-museum.webp"],
      ["부산정보산업진흥원", "/homepage/logo-bipa.webp"],
      ["외교부", "/homepage/logo-ministry.webp"],
      ["부산지방경찰청", "/homepage/logo-police.webp"],
    ],
  },
  {
    title: "교육기관",
    logos: [
      ["동아대학교", "/homepage/logo-donga.webp"],
      ["경남공업고등학교", "/homepage/logo-technical.webp"],
      ["금정중학교", "/homepage/logo-school-2.webp"],
      ["명지초등학교", "/homepage/logo-school-4.webp"],
      ["대덕여자고등학교", "/homepage/logo-school-5.webp"],
    ],
  },
  {
    title: "항공사",
    logos: [
      ["대한항공", "/homepage/logo-koreanair.webp"],
      ["에어부산", "/homepage/logo-airbusan.webp"],
      ["진에어", "/homepage/logo-jinair.webp"],
      ["이스타항공", "/homepage/logo-eastar.webp"],
      ["에어코리아", "/homepage/logo-airkorea.webp"],
      ["싱가포르항공", "/homepage/logo-singapore.webp"],
      ["중국동방항공", "/homepage/logo-china-eastern.webp"],
      ["에어차이나", "/homepage/logo-air-china.webp"],
    ],
  },
];

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`${styles.brand} ${inverse ? styles.brandInverse : ""}`}>
      <span className={styles.brandMark} aria-hidden="true">
        <span />
      </span>
      <span className={styles.brandName}>주식회사 올바름</span>
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`${styles.sectionHeading} ${align === "left" ? styles.alignLeft : ""}`}>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <span>{description}</span> : null}
    </div>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a href="#top" aria-label="올바름 홈페이지 처음으로">
          <Brand inverse />
        </a>
        <p className={styles.certification}>고용노동부 지정 사회적기업 / 여성기업</p>
        <nav className={styles.desktopNav} aria-label="주요 메뉴">
          <a href="#about">올바름 소개</a>
          <a href="#services">서비스</a>
          <a href="#clients">고객사</a>
          <a className={styles.inquiryLink} href="#contact">
            문의하기
          </a>
        </nav>
        <details className={styles.mobileNav}>
          <summary aria-label="메뉴 열기">
            <Menu aria-hidden="true" />
          </summary>
          <div>
            <a href="#about">올바름 소개</a>
            <a href="#services">서비스</a>
            <a href="#clients">고객사</a>
            <a href="#contact">문의하기</a>
            <Link href="/manager">관리자 시스템</Link>
            <Link href="/guard">근무자 시스템</Link>
          </div>
        </details>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <Brand />
          <p>현장의 기준을 바로 세우는 사람 중심의 운영 파트너</p>
        </div>
        <div>
          <strong>올바름 소개</strong>
          <a href="#about">연혁</a>
          <a href="#values">성장 현황</a>
          <a href="#contact">Contact Us</a>
        </div>
        <div>
          <strong>서비스</strong>
          <a href="#dispatch">근로자 파견</a>
          <a href="#facility">시설물 관리</a>
          <a href="#disinfection">방역·소독</a>
        </div>
        <div>
          <strong>업무 시스템</strong>
          <Link href="/manager">관리자</Link>
          <Link href="/guard">근무자</Link>
          <a href="/docs/documents/">운영 문서</a>
        </div>
        <div>
          <strong>문의</strong>
          <a href="tel:0514657767">T. 051-465-7767</a>
          <a href="tel:0519617767">F. 051-961-7767</a>
          <a href="mailto:olbareum@naver.com">olbareum@naver.com</a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>
          부산광역시 강서구 유통단지1로 41, 105동 217·218호 · 대표이사 윤지욱 ·
          사업자등록번호 213-87-01208
        </p>
        <p>© 2026 주식회사 올바름. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main id="top" className={styles.site}>
      <Header />

      <section className={styles.hero} aria-labelledby="hero-title">
        <Image
          src="/homepage/hero-lighthouse.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.coverImage}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p>사람과 공간을 위한 운영 파트너</p>
          <h1 id="hero-title">
            변함없는 진심으로
            <br />더 <strong>올바른 길</strong>을 밝힙니다
          </h1>
          <a href="#services" className={styles.heroButton}>
            서비스 알아보기 <ArrowRight aria-hidden="true" />
          </a>
        </div>
        <a className={styles.scrollCue} href="#trust" aria-label="다음 내용 보기">
          <span>SCROLL</span>
          <i />
        </a>
      </section>

      <section id="trust" className={`${styles.section} ${styles.trustSection}`}>
        <div className={styles.splitIntro}>
          <SectionHeading
            eyebrow="OLBAREUM is"
            title={"신뢰와 성실로\n더 좋은 일터를 만듭니다"}
            description="우수한 서비스와 일자리 창출로 지역사회와 함께 지속 성장하는 사회적기업입니다."
            align="left"
          />
          <div className={styles.certificateCards} aria-label="보유 인증">
            <article>
              <CheckCircle2 aria-hidden="true" />
              <span>사회적기업 인증</span>
              <strong>고용노동부</strong>
            </article>
            <article>
              <Award aria-hidden="true" />
              <span>근로자파견사업 허가</span>
              <strong>부산지방고용노동청</strong>
            </article>
            <article>
              <ShieldCheck aria-hidden="true" />
              <span>여성기업 확인</span>
              <strong>중소벤처기업부</strong>
            </article>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.servicePreview}`}>
        <SectionHeading
          eyebrow="Main Service"
          title="인력, 시설, 위생을 따로 보지 않습니다."
          description="채용, 배치, 안전, 청결, 보고 체계가 함께 움직이는 하나의 운영 시스템을 제공합니다."
          align="left"
        />
        <div className={styles.serviceGrid}>
          {services.map(({ title, description, image, icon: Icon }) => (
            <article key={title} className={styles.serviceCard}>
              <div className={styles.serviceImage}>
                <Image src={image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" />
              </div>
              <div>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
        <a className={styles.moreLink} href="#services">
          MORE VIEW <ArrowRight aria-hidden="true" />
        </a>
      </section>

      <section id="about" className={styles.aboutHero}>
        <Image
          src="/homepage/about-hero.webp"
          alt=""
          fill
          sizes="100vw"
          className={styles.coverImage}
        />
        <div className={styles.aboutOverlay} />
        <div>
          <p>ABOUT OLBAREUM</p>
          <h2>
            사람 중심의 가치를 심고,
            <br />지속 가능한 내일을 가꿔갑니다.
          </h2>
        </div>
      </section>

      <section className={`${styles.section} ${styles.companySection}`}>
        <SectionHeading
          eyebrow="SINCE 2018"
          title="사람을 향한 동행, 함께 크는 지역사회"
          description="지역사회와 함께 성장하는 사회적기업으로서 근로자 파견, 시설물 관리, 방역·소독까지 현장의 기준을 바로 세웁니다."
        />
        <div className={styles.stats}>
          <div>
            <Building2 aria-hidden="true" />
            <strong>2018</strong>
            <span>법인 설립</span>
          </div>
          <div>
            <UsersRound aria-hidden="true" />
            <strong>26명</strong>
            <span>2026 임직원</span>
          </div>
          <div>
            <Award aria-hidden="true" />
            <strong>10.3억 원</strong>
            <span>2025 매출</span>
          </div>
          <div>
            <TrendingUp aria-hidden="true" />
            <strong>220%</strong>
            <span>2022–2025 매출 성장률</span>
          </div>
        </div>
        <div className={styles.historyWrap}>
          <div className={styles.historyImage}>
            <Image
              src="/homepage/history-building.webp"
              alt="불이 켜진 사무실 건물"
              fill
              sizes="(max-width: 760px) 100vw, 42vw"
            />
            <div>
              <span>HISTORY</span>
              <p>사람 중심의 가치를 심고 지속 가능한 내일을 가꿔갑니다.</p>
            </div>
          </div>
          <ol className={styles.timeline}>
            {history.map(([date, title, detail]) => (
              <li key={date}>
                <time>{date}</time>
                <i />
                <p>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="values" className={styles.values}>
        <SectionHeading
          eyebrow="Core Values"
          title="B.E.S.T"
          description="고객 감동, 수익 창출, 사회 환원, 인재 양성으로 지속 가능한 성장을 이루는 네 가지 핵심 가치"
        />
        <div className={styles.valueGrid}>
          {values.map(([letter, title, description]) => (
            <article key={letter}>
              <strong>{letter}</strong>
              <span>{title}</span>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.socialSection}`}>
        <SectionHeading
          eyebrow="Social Impact"
          title="이윤과 공익이 같은 방향으로 흐르게 합니다."
          description="안정된 일자리와 균등한 교육기회를 제공하고 지역사회 재투자와 사회서비스 확충을 기업 운영의 중요한 기준으로 둡니다."
        />
        <div className={styles.socialGrid}>
          {socialValues.map(({ title, text, icon: Icon }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className={styles.serviceHero}>
        <Image
          src="/homepage/airport-hero.webp"
          alt=""
          fill
          sizes="100vw"
          className={styles.coverImage}
        />
        <div className={styles.serviceHeroOverlay} />
        <div>
          <p>SERVICE</p>
          <h2>
            현장을 아는 전문성과 체계적 관리로
            <br />최적의 환경을 완성합니다
          </h2>
        </div>
      </section>

      <section className={`${styles.section} ${styles.operationSection}`}>
        <SectionHeading
          eyebrow="Operation System"
          title="처음 진단부터 운영 보고까지 같은 기준으로 움직입니다."
          description="목표·비용·품질·리스크 관리가 함께 설계되어야 현장이 흔들리지 않습니다."
        />
        <div className={styles.teamImage}>
          <Image
            src="/homepage/service-team.webp"
            alt="공항 현장에서 일하는 올바름 서비스 전문가"
            fill
            sizes="(max-width: 760px) 100vw, 1200px"
          />
        </div>
        <div className={styles.operationLayout}>
          <h3>
            진단부터 개선까지,
            <br />현장의 기준을 세웁니다.
          </h3>
          <ol>
            {operationSteps.map(([number, title, description]) => (
              <li key={number}>
                <strong>{number}</strong>
                <div>
                  <h4>{title}</h4>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="dispatch" className={`${styles.section} ${styles.detailSection}`}>
        <SectionHeading
          eyebrow="Worker Dispatch"
          title="근로자 파견"
          description="고용과 사용이 분리된 체계적인 인력 운영을 통해 기업의 경영 효율성을 극대화합니다."
        />
        <div className={styles.detailBanner}>
          <Image
            src="/homepage/service-worker.webp"
            alt="의료 현장에서 근무하는 전문 인력"
            fill
            sizes="(max-width: 760px) 100vw, 1200px"
          />
        </div>
        <h3 className={styles.detailMessage}>
          사무관리, 생산·물류, IT·전산, 의료·간병, 콜센터 등
          <br />필요한 직무에 적합한 인력을 연결합니다.
        </h3>
        <div className={styles.dispatchFlow}>
          <div>
            <BriefcaseBusiness aria-hidden="true" />
            <strong>파견사업주</strong>
          </div>
          <ArrowRight aria-hidden="true" />
          <div>
            <UsersRound aria-hidden="true" />
            <strong>파견근로자</strong>
          </div>
          <ArrowRight aria-hidden="true" />
          <div>
            <Building2 aria-hidden="true" />
            <strong>사용사업주</strong>
          </div>
        </div>
      </section>

      <section id="facility" className={`${styles.section} ${styles.facilitySection}`}>
        <SectionHeading
          eyebrow="Facility Management"
          title="건물·시설물 종합 관리"
          description="보이지 않는 곳까지 세심하게, 빈틈없는 시설 관리로 공간의 품격을 높입니다."
        />
        <div className={styles.detailBanner}>
          <Image
            src="/homepage/service-facility.webp"
            alt="시설 설비를 점검하는 전문 인력"
            fill
            sizes="(max-width: 760px) 100vw, 1200px"
          />
        </div>
        <h3 className={styles.detailMessage}>
          전기·소방·기계·가스·건축 설비의 점검과 운영관리,
          <br />위생관리, 시설보안, 주차관리까지 통합 제공합니다.
        </h3>
        <div className={styles.facilityGrid}>
          {facilityItems.map(({ title, text, icon: Icon }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="disinfection" className={`${styles.section} ${styles.detailSection}`}>
        <SectionHeading
          eyebrow="Certified Disinfection"
          title="방역·소독"
          description="전문적인 진단과 맞춤형 방역 시스템으로 누구나 안심하고 머물 수 있는 공간을 약속합니다."
        />
        <div className={styles.detailBanner}>
          <Image
            src="/homepage/service-disinfection.webp"
            alt="항공기 객실에서 방역 작업을 진행하는 전문 인력"
            fill
            sizes="(max-width: 760px) 100vw, 1200px"
          />
        </div>
        <h3 className={styles.detailMessage}>
          현장 조건에 맞춘 법정·살충·살균 소독으로
          <br />대형 건축물과 항공기 검역 현장의 예방 체계를 지원합니다.
        </h3>
        <div className={styles.airportCard}>
          <Image src="/homepage/plane.webp" alt="" fill sizes="600px" />
          <p>
            당사는 현재 김해공항 내
            <br />전 항공기 검역 및 방역 프로세스를
            <br />독자 수행 중입니다.
          </p>
        </div>
      </section>

      <section id="clients" className={styles.clientHero}>
        <Image
          src="/homepage/client-hero.webp"
          alt=""
          fill
          sizes="100vw"
          className={styles.coverImage}
        />
        <div className={styles.clientOverlay} />
        <div>
          <p>CLIENT</p>
          <h2>
            성공적인 경험이 증명하는 실력,
            <br />더 깊어진 책임감으로 보답합니다.
          </h2>
        </div>
      </section>

      <section className={`${styles.section} ${styles.clientsSection}`}>
        <SectionHeading
          eyebrow="Client"
          title="성실함과 신뢰로 단단하게 이어온 파트너"
          description="수많은 현장에서 쌓아온 경험과 전문성을 바탕으로 고객의 기대를 뛰어넘는 최적의 솔루션을 완성합니다."
        />
        <div className={styles.clientGroups}>
          {clientGroups.map(({ title, logos }) => (
            <div key={title}>
              <h3>{title}</h3>
              <div className={styles.logoGrid}>
                {logos.map(([name, src]) => (
                  <div key={name}>
                    <Image src={src} alt={name} fill sizes="180px" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className={`${styles.section} ${styles.contactSection}`}>
        <div className={styles.map}>
          <Image
            src="/homepage/location-map.webp"
            alt="부산광역시 강서구 올바름 본사 위치 지도"
            fill
            sizes="(max-width: 760px) 100vw, 60vw"
          />
          <span aria-hidden="true">
            <MapPin />
          </span>
        </div>
        <div className={styles.contactCopy}>
          <p>CONTACT US</p>
          <h2>
            현장 운영의 기준을 세울 때,
            <br />올바름과 먼저 의논하세요.
          </h2>
          <address>
            <span>
              <MapPin aria-hidden="true" />
              부산광역시 강서구 유통단지1로 41, 105동 217·218호
            </span>
            <a href="tel:0514657767">
              <Phone aria-hidden="true" />
              051-465-7767
            </a>
            <a href="mailto:olbareum@naver.com">
              <Mail aria-hidden="true" />
              olbareum@naver.com
            </a>
          </address>
          <a className={styles.contactButton} href="mailto:olbareum@naver.com">
            상담 문의하기 <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <a className={styles.toTop} href="#top" aria-label="맨 위로 이동">
        <ArrowUp aria-hidden="true" />
      </a>

      <Footer />
    </main>
  );
}
