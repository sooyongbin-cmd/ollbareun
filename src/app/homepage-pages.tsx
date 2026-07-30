import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUp,
  Award,
  BriefcaseBusiness,
  Building2,
  Droplets,
  Lightbulb,
  MapPin,
  ParkingCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wrench,
} from "lucide-react";
import styles from "./page.module.css";
import HomepageHeader from "./homepage-header";

const services = [
  {
    title: "근로자 파견",
    description:
      "파견 사업주가 근로자를 고용한 후 사용 사업주의 지휘명령을 받아 근로에 종사하게 하는 전문 서비스. 파견기간 1년 기준, 합의 시 연장.",
    image: "/homepage/service-worker.webp",
    icon: UsersRound,
  },
  {
    title: "건물 시설물 종합 관리",
    description:
      "각종 설비(전기, 소방, 기계, 가스, 건축)의 철저한 점검을 통한 체계적인 운영관리. 위생관리, 시설보안, 주차관리 통합 제공.",
    image: "/homepage/service-facility.webp",
    icon: Building2,
  },
  {
    title: "방역 · 알콜 소독",
    description:
      "법정 의무소독, 살충소독(ULV·연막), 살균소독. 현재 김해공항 내 전 항공기 검역 및 방역프로세스를 독자 수행 중.",
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
  ["B", "Benefit", "차별화된 서비스로 고객감동 극대화"],
  ["E", "Earning", "경쟁력 강화로 수익 창출"],
  ["S", "Social", "사회 환원을 통한 가치 실현"],
  ["T", "Talented", "취약계층 육성을 통한 역량강화"],
];

const operationSteps = [
  ["01", "준비단계와 목표 설정", "현재 경영상황을 진단하고 추진 배경, 업무 범위, 품질수준, 수행기준을 구체화합니다."],
  ["02", "준비단계와 목표 설정", "현재 경영상황을 진단하고 추진 배경, 업무 범위, 품질수준, 수행기준을 구체화합니다."],
  ["03", "준비단계와 목표 설정", "현재 경영상황을 진단하고 추진 배경, 업무 범위, 품질수준, 수행기준을 구체화합니다."],
  ["04", "준비단계와 목표 설정", "현재 경영상황을 진단하고 추진 배경, 업무 범위, 품질수준, 수행기준을 구체화합니다."],
];

const facilityItems = [
  {
    title: "건물·시설 유지관리",
    text: "전기, 소방, 기계, 가스, 건축 설비의 점검과 운영관리 등 현장 유지에 필요한 업무를 묶어 관리합니다.",
    icon: Wrench,
  },
  {
    title: "위생관리",
    text: "상주 청소, 바닥 왁스, 준공 청소 등 철저한 위생 관리로 쾌적한 환경을 유지합니다.",
    icon: Sparkles,
  },
  {
    title: "시설보안",
    text: "위협 요소를 사전 제거하고, 안전사고 예방과 친절한 응대를 제공합니다.",
    icon: ShieldCheck,
  },
  {
    title: "주차관리",
    text: "차량 입·출입 상황 및 주차장 안전과 내부 주차 질서를 확립합니다.",
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
    text: "ISO 14001 인증으로 신뢰와 비용 절감, ESG 경영을 실현합니다.",
    icon: Award,
  },
];

const clientGroups = [
  {
    title: "공공기관",
    logos: [
      ["한국해양수산연수원", "/homepage/client-logo-maritime.png"],
      ["부산박물관", "/homepage/client-logo-busan-museum.png"],
      ["한국토지주택공사", "/homepage/client-logo-lh.png"],
      ["외교부", "/homepage/client-logo-ministry.png"],
      ["국민건강보험공단", "/homepage/client-logo-nhis.png"],
      ["부산광역시 지사도서관", "/homepage/client-logo-jisa-library.png"],
      ["부산정보산업진흥원", "/homepage/client-logo-bipa.png"],
      ["부산시설공단", "/homepage/client-logo-bisco.png"],
      ["부산환경공단", "/homepage/client-logo-beco.png"],
      ["부산광역시경찰청", "/homepage/client-logo-police.png"],
    ],
  },
  {
    title: "교육기관",
    logos: [
      ["동아대학교", "/homepage/client-logo-donga.png"],
      ["부산과학체험관", "/homepage/client-logo-science-center.png"],
      ["동해중학교", "/homepage/client-logo-donghae-middle.png"],
      ["대덕여자고등학교", "/homepage/client-logo-daeduk-girls.png"],
      ["금정중학교", "/homepage/client-logo-geumjeong-middle.png"],
      ["경남공업고등학교", "/homepage/client-logo-technical-high.png"],
      ["명지초등학교", "/homepage/client-logo-myungji-elementary.png"],
      ["녹색어머니중앙회", "/homepage/client-logo-green-mothers.png"],
    ],
  },
  {
    title: "항공사",
    logos: [
      ["대한항공", "/homepage/client-logo-korean-air.png"],
      ["진에어", "/homepage/client-logo-jinair.png"],
      ["제주항공", "/homepage/client-logo-jeju-air.png"],
      ["이스타항공", "/homepage/client-logo-eastar.png"],
      ["에어부산", "/homepage/client-logo-airbusan.png"],
      ["티웨이항공", "/homepage/client-logo-tway.png"],
      ["에어코리아", "/homepage/client-logo-airkorea.png"],
      ["중국동방항공", "/homepage/client-logo-china-eastern.png"],
      ["에어차이나", "/homepage/client-logo-air-china.png"],
      ["싱가포르항공", "/homepage/client-logo-singapore.png"],
    ],
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
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

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <strong>올바름 소개</strong>
          <Link href="/about#history">연혁</Link>
          <Link href="/about#values">성장 현황</Link>
          <Link href="/about#contact">Contact Us</Link>
        </div>
        <div>
          <strong>서비스</strong>
          <Link href="/services#dispatch">근로자 파견</Link>
          <Link href="/services#facility">시설물 관리</Link>
          <Link href="/services#disinfection">방역소독</Link>
        </div>
        <div>
          <strong>고객사</strong>
          <Link href="/clients#client-list">공공기관</Link>
          <Link href="/clients#client-list">항공사</Link>
          <Link href="/clients#client-list">교육기관</Link>
        </div>
        <div>
          <strong>연결</strong>
          <Link href="/manager">관리자</Link>
          <Link href="/guard">근무자</Link>
        </div>
        <div>
          <strong>문의</strong>
          <a href="tel:0514657767">T.051-465-7767</a>
          <a href="tel:0519617767">F.051-961-7767</a>
          <a href="mailto:olbareum@naver.com">olbareum@naver.com</a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>
          부산광역시 강서구 유통단지1로 41, 105동 217·218호 · 대표이사 윤지욱 ·
          사업자등록번호213-87-01208
        </p>
        <p>©2026 주식회사 올바름. All rights reserved.</p>
      </div>
    </footer>
  );
}

function BackToTop() {
  return (
    <a className={styles.toTop} href="#top" aria-label="맨 위로 이동">
      <ArrowUp aria-hidden="true" />
    </a>
  );
}

function ContactSection() {
  return (
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
        <h2>
          <strong>현장 운영</strong>의 <strong>기준</strong>을 세울 때,
          <br />
          <strong>올바름</strong>과 먼저 의논하세요.
        </h2>
        <address>
          <span>
            <strong>ADDRESS</strong>
            부산광역시 강서구 유통단지1로 41, 105동 217·218호
          </span>
          <a href="tel:0514657767">
            <strong>TEL</strong>
            051-465-7767
          </a>
          <a href="fax:0519617767">
            <strong>FAX</strong>
            051-961-7767
          </a>
          <a href="mailto:olbareum@naver.com">
            olbareum@naver.com
          </a>
        </address>
      </div>
    </section>
  );
}

function HomeClientPreview() {
  const previewLogos = [
    [
      "대한항공",
      "/homepage/client-logo-korean-air.png",
      "https://www.koreanair.com/",
    ],
    [
      "부산경찰청",
      "/homepage/client-logo-police.png",
      "https://www.bspolice.go.kr/",
    ],
    [
      "동아대학교",
      "/homepage/client-logo-donga.png",
      "https://www.donga.ac.kr/",
    ],
    [
      "에어부산",
      "/homepage/client-logo-airbusan.png",
      "https://www.airbusan.com/",
    ],
    [
      "국민건강보험",
      "/homepage/client-logo-nhis.png",
      "https://www.nhis.or.kr/",
    ],
    [
      "경남공업고등학교",
      "/homepage/client-logo-technical-high.png",
      "https://school.busanedu.net/knt-h/main.do",
    ],
  ] as const;

  return (
    <section className={`${styles.section} ${styles.homeClientSection}`}>
      <SectionHeading
        eyebrow="Client"
        title={
          <>
            <b>성실함</b>과 <b>신뢰</b>로 단단하게 이어온 파트너
          </>
        }
        description={
          <>
            철저한 관리와 맞춤형 서비스로 고객이 본업에만 집중할 수 있는
            <br />
            최적의 환경을 만들며 함께 성장하는 든든한 파트너가 되겠습니다.
          </>
        }
        align="left"
      />
      <div className={styles.homeClientLogos}>
        {previewLogos.map(([name, src, href]) => (
          <div key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} 공식 홈페이지 새 창에서 열기`}
            >
              <Image src={src} alt={name} fill sizes="220px" />
            </a>
          </div>
        ))}
      </div>
      <Link className={styles.moreLink} href="/clients">
        MORE VIEW <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

export function MainPage() {
  return (
    <main id="top" className={styles.site}>
      <HomepageHeader />
      <section className={styles.hero} aria-labelledby="hero-title">
        <video
          className={styles.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/homepage/hero-lighthouse.webp"
          aria-hidden="true"
        >
          <source src="/homepage/hero-lighthouse_moving.mp4" type="video/mp4" />
        </video>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 id="hero-title">
            변함없는 <strong>진심</strong>으로
            <br />더 <strong>올바른 길</strong>을 밝힙니다
          </h1>
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
            title={
              <>
                <b>신뢰</b>와 <b>성실</b>로
                <br />
                <b>더 좋은 일터</b>를 만듭니다
              </>
            }
            description={
              <>
                우수한 서비스와 일자리 창출로 지역사회와 함께
                <br />
                지속 성장하는 사회적기업입니다.
              </>
            }
            align="left"
          />
          <div className={styles.certificateImages} aria-label="보유 인증서">
            {[1, 2, 3].map((number) => (
              <div key={number}>
                <Image
                  src={`/homepage/certificate-${number}.webp`}
                  alt={number === 1 ? "여성기업 확인서" : number === 2 ? "근로자파견사업 허가증" : "사회적기업 인증서"}
                  fill
                  sizes="200px"
                />
              </div>
            ))}
          </div>
        </div>
        <Link className={styles.moreLink} href="/about">
          MORE VIEW <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className={`${styles.section} ${styles.servicePreview}`}>
        <SectionHeading
          eyebrow="Main Service"
          title={
            <>
              <b>인력, 시설, 위생</b>을 따로 보지 않습니다.
            </>
          }
          description={
            <>
              현장의 성과는 채용, 배치, 안전, 청결, 보고 체계가 함께 움직일 때 만들어집니다.
              <br />
              올바름은 세 영역을 하나의 운영 시스템으로 연결합니다.
            </>
          }
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
        <Link className={styles.moreLink} href="/services">
          MORE VIEW <ArrowRight aria-hidden="true" />
        </Link>
      </section>
      <HomeClientPreview />
      <BackToTop />
      <Footer />
    </main>
  );
}

export function AboutPage() {
  return (
    <main id="top" className={styles.site}>
      <HomepageHeader />
      <section className={styles.aboutHero}>
        <Image
          src="/homepage/about-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.coverImage}
        />
        <div className={styles.aboutOverlay} />
        <div>
          <h1>
            <strong>사람 중심</strong>의 <strong>가치</strong>를 심고,
            <br />
            <strong>지속 가능한 내일</strong>을 가꿔갑니다.
          </h1>
        </div>
      </section>

      <section id="history" className={`${styles.section} ${styles.companySection}`}>
        <SectionHeading
          eyebrow="SINCE 2018"
          title={
            <>
              <strong>사람</strong>을 향한 <strong>동행</strong>, 함께 크는{" "}
              <strong>지역 사회</strong>
            </>
          }
          description={
            <>
              지역사회와 함께 성장하는 사회적기업으로서
              <br />
              근로자 파견, 시설물 관리, 방역·소독까지 현장의 기준을 바로 세웁니다.
            </>
          }
        />
        <div className={styles.stats}>
          <div><Building2 aria-hidden="true" /><strong>2018</strong><span>법인 설립</span></div>
          <div><UsersRound aria-hidden="true" /><strong>26</strong><span>2026 임직원</span></div>
          <div><Award aria-hidden="true" /><strong>10.3억</strong><span>2025 매출</span></div>
          <div><TrendingUp aria-hidden="true" /><strong>220%</strong><span>2022~25 매출 성장률</span></div>
        </div>
        <div className={styles.historyWrap}>
          <div className={styles.historyImage}>
            <Image src="/homepage/history-building.webp" alt="불이 켜진 사무실 건물" fill sizes="(max-width: 760px) 100vw, 42vw" />
            <div><span>HISTORY</span><p>사람 중심의 가치를 심고,<br />지속 가능한 내일을 가꿔갑니다.</p></div>
          </div>
          <ol className={styles.timeline}>
            {history.map(([date, title, detail]) => (
              <li key={date}><time>{date}</time><i /><p><span>{title}</span><span>{detail}</span></p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="values" className={styles.values}>
        <SectionHeading
          eyebrow="Core Values"
          title={<strong>B.E.S.T</strong>}
          description={
            <>
              고객감동, 수익 창출, 사회환원, 인재 양성으로 지속 가능한 성장을 이루어내는{" "}
              <strong>4가지 핵심 가치</strong>
            </>
          }
        />
        <div className={styles.valueGrid}>
          {values.map(([letter, title, description]) => (
            <article key={letter}><strong>{letter}</strong><span>{title}</span><p>{description}</p></article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.socialSection}`}>
        <SectionHeading
          eyebrow="Social Impact"
          title={
            <>
              <strong>이윤</strong>과 <strong>공익</strong>이 <strong>같은 방향</strong>으로
              흐르게 합니다.
            </>
          }
          description={
            <>
              올바름은 취약계층에게 안정된 일자리를 제공하고,
              <br />
              균등한 교육기회와 복리후생을 통해 직무에 전념할 수 있는 환경을 만듭니다.
              <br />
              지역사회 재투자와 사회서비스 확충을 기업 운영의 중요한 기준으로 둡니다.
            </>
          }
        />
        <div className={styles.socialGrid}>
          {socialValues.map(({ title, text, icon: Icon }) => (
            <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>
      <ContactSection />
      <BackToTop />
      <Footer />
    </main>
  );
}

export function ServicesPage() {
  return (
    <main id="top" className={styles.site}>
      <HomepageHeader />
      <section className={styles.serviceHero}>
        <Image src="/homepage/airport-hero.webp" alt="" fill priority sizes="100vw" className={styles.coverImage} />
        <div className={styles.serviceHeroOverlay} />
        <div>
          <h1>
            <strong>현장</strong>을 아는 <strong>전문성</strong>과{" "}
            <strong>체계적 관리</strong>로
            <br />
            최적의 환경을 완성합니다
          </h1>
        </div>
      </section>

      <section id="operation" className={`${styles.section} ${styles.operationSection}`}>
        <SectionHeading
          eyebrow="Operation System"
          title={<b>운영 체계</b>}
          description={
            <>
              아웃소싱은 인력 파견을 넘어 목표·비용·품질·리스크 관리가
              <br />
              함께 설계되어야 현장이 흔들리지 않습니다.
            </>
          }
        />
        <div className={styles.teamImage}>
          <Image src="/homepage/service-team.webp" alt="공항 현장에서 일하는 올바름 서비스 전문가" fill sizes="(max-width: 760px) 100vw, 1200px" />
        </div>
        <div className={styles.operationLayout}>
          <h3>
            처음 <strong>진단</strong>부터 <strong>운영 보고</strong>까지
            <br />
            같은 기준으로 움직입니다.
          </h3>
          <ol>
            {operationSteps.map(([number, title, description]) => (
              <li key={number}><strong>{number}</strong><div><h4>{title}</h4><p>{description}</p></div></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="dispatch" className={`${styles.section} ${styles.detailSection}`}>
        <SectionHeading
          eyebrow="Worker Dispatch"
          title={<b>근로자 파견</b>}
          description={
            <>
              고용과 사용이 분리된 체계적인 인력 운영을 통해
              <br />
              기업의 경영 효율성을 극대화합니다.
            </>
          }
        />
        <div className={styles.detailBanner}><Image src="/homepage/service-worker.webp" alt="의료 현장에서 근무하는 전문 인력" fill sizes="(max-width: 760px) 100vw, 1200px" /></div>
        <h3 className={styles.detailMessage}>사무관리, 생산·물류, IT·전산, 의료·간병, 콜센터 등<br />필요한 직무에 적합한 인력을 연결합니다.</h3>
        <div className={styles.dispatchDiagram}>
          <p>근로자 파견계약<br /><span>(지휘권 임대)</span></p>
          <div className={styles.dispatchFlow}>
            <div><BriefcaseBusiness aria-hidden="true" /><strong>파견사업주</strong></div><ArrowRight aria-hidden="true" />
            <div><UsersRound aria-hidden="true" /><strong>파견근로자</strong></div><ArrowRight aria-hidden="true" />
            <div><Building2 aria-hidden="true" /><strong>사용사업주</strong></div>
          </div>
          <div className={styles.dispatchRelations}>
            <span>고용계약관계</span>
            <span>지휘 / 명령관계</span>
          </div>
        </div>
      </section>

      <section id="facility" className={`${styles.section} ${styles.facilitySection}`}>
        <SectionHeading
          eyebrow="Facility Management"
          title={<b>건물·시설물 종합 관리</b>}
          description={
            <>
              보이지 않는 곳까지 세심하게, 빈틈없는 시설 관리로
              <br />
              공간의 품격을 높입니다.
            </>
          }
        />
        <div className={styles.detailBanner}><Image src="/homepage/service-facility.webp" alt="시설 설비를 점검하는 전문 인력" fill sizes="(max-width: 760px) 100vw, 1200px" /></div>
        <h3 className={styles.detailMessage}>전기·소방·기계·가스·건축 설비의 점검과 운영관리,<br />위생관리, 시설보안, 주차관리까지 통합 제공합니다.</h3>
        <div className={styles.facilityGrid}>
          {facilityItems.map(({ title, text, icon: Icon }) => (
            <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section id="disinfection" className={`${styles.section} ${styles.detailSection}`}>
        <SectionHeading
          eyebrow="Certified Disinfection"
          title={<b>방역·소독</b>}
          description={
            <>
              전문적인 진단과 맞춤형 방역 시스템,
              <br />
              누구나 안심하고 머물 수 있는 공간을 약속합니다.
            </>
          }
        />
        <div className={styles.detailBanner}><Image src="/homepage/service-disinfection.webp" alt="항공기 객실에서 방역 작업을 진행하는 전문 인력" fill sizes="(max-width: 760px) 100vw, 1200px" /></div>
        <h3 className={styles.detailMessage}>현장 조건에 맞춘 법정·살충·살균 소독으로<br />대형 건축물과 항공기 검역 현장의 예방 체계를 지원합니다.</h3>
        <div className={styles.airportCard}>
          <Image src="/homepage/plane.webp" alt="" fill sizes="600px" />
          <p>당사는 현재 김해공항 내<br />전 항공기 검역 및<br />방역프로세스를 독자 수행중입니다</p>
        </div>
      </section>
      <BackToTop />
      <Footer />
    </main>
  );
}

export function ClientsPage() {
  return (
    <main id="top" className={styles.site}>
      <HomepageHeader />
      <section className={styles.clientHero}>
        <Image src="/homepage/client-hero.webp" alt="" fill priority sizes="100vw" className={styles.coverImage} />
        <div className={styles.clientOverlay} />
        <div>
          <h1>
            성공적인 <strong>경험</strong>이 증명하는 <strong>실력,</strong>
            <br />
            더 깊어진 <strong>책임감</strong>으로 보답합니다
          </h1>
        </div>
      </section>
      <section id="client-list" className={`${styles.section} ${styles.clientsSection}`}>
        <SectionHeading
          eyebrow="Client"
          title={<b>고객사</b>}
          description={
            <>
              수많은 현장에서 쌓아온 탄탄한 경험과 전문성을 바탕으로,
              <br />
              고객의 기대를 뛰어넘는 최적의 솔루션을 완성합니다.
            </>
          }
        />
        <div className={styles.clientGroups}>
          {clientGroups.map(({ title, logos }) => (
            <div key={title}>
              <h3>{title}</h3>
              <div className={styles.logoGrid}>
                {logos.map(([name, src]) => (
                  <div key={name}><Image src={src} alt={name} fill sizes="180px" /></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <BackToTop />
      <Footer />
    </main>
  );
}
