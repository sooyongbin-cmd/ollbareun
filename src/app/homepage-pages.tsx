"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./page.module.css";
import HomepageContactMap from "./homepage-contact-map";
import HomepageFooter from "./homepage-footer";

type ServiceItem = {
  title: string;
  description: string;
  mobileDescription?: ReactNode;
  image: string;
};

const services: ServiceItem[] = [
  {
    title: "근로자 파견",
    description:
      "파견 사업주가 근로자를 고용한 후 사용 사업주의 지휘명령을 받아 근로에 종사하게 하는 전문 서비스. 파견기간 1년 기준, 합의 시 연장.",
    image: "/homepage/service-worker.webp",
  },
  {
    title: "건물 시설물 종합 관리",
    description:
      "각종 설비(전기, 소방, 기계, 가스, 건축)의 철저한 점검을 통한 체계적인 운영관리. 위생관리, 시설보안, 주차관리 통합 제공.",
    image: "/homepage/service-facility.webp",
  },
  {
    title: "방역 · 알콜 소독",
    description:
      "법정 의무소독, 살충소독(ULV·연막), 살균소독. 현재 김해공항 내 전 항공기 검역 및 방역프로세스를 독자 수행 중.",
    mobileDescription: (
      <>
        법정 의무소독, 살충소독(ULV·연막), 살균소독. 현재 김해공항 내{" "}
        <br className={styles.mobileServiceBreak} />
        전 항공기 검역 및 방역프로세스를 독자 수행 중.
      </>
    ),
    image: "/homepage/service-disinfection.webp",
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
  ["T", "Talented", "취약계측 육성을 통한 역걍강화"],
];

const operationSteps = [
  ["01", "준비단계와 목표 설정", "현재 경영상황을 진단하고 추진 배경, 업무 범위, 품질수준, 수행기준을 구체화합니다."],
  ["02", "비용 분석과 계약 협상", "현재 수행수준과 원가를 분석해 개선목표를 세우고, 장애 요소와 대처 시나리오를 준비합니다."],
  ["03", "운영 모니터링과 평가", "관리팀을 중심으로 의사소통 채널, 수행결과 모니터링, 평가 시스템을 구축합니다."],
  ["04", "이슈 대응과 현장 존중", "쟁점사항을 등록·공유·처리하고, 현장직원을 존중하는 관리감독으로 업무 시너지를 만듭니다."],
];

const facilityItems = [
  {
    title: "건물/시설 유지관리",
    text: "전기, 소방, 기계, 가스, 건축 설비의 점검과 운영관리 등 현장 유지에 필요한 업무를 묶어 관리합니다.",
    image: "/homepage/archive/facility-maintenance.svg",
  },
  {
    title: "위생관리",
    text: "상주 청소, 바닥 왁스, 준공 청소 등 철저한 위생 관리로 쾌적한 환경을 유지합니다.",
    image: "/homepage/archive/facility-hygiene.svg",
  },
  {
    title: "시설보안",
    text: "위협 요소를 사전 제거하고, 안전사고 예방과 친절한 응대를 제공합니다.",
    image: "/homepage/archive/facility-security.svg",
  },
  {
    title: "주차관리",
    text: "차량 입·출입 상황 및 주차장 안전과 내부 주차 질서를 확립합니다.",
    image: "/homepage/archive/facility-parking.svg",
  },
];

const socialValues = [
  {
    title: "좋은 일자리 제공",
    text: "취약계층에게 안정된 일자리와 직무 몰입 환경을 제공합니다.",
    image: "/homepage/archive/social-jobs.svg",
  },
  {
    title: "지역사회 활성화",
    text: "영업활동에서 나온 이익을 지역사회에 다시 연결합니다.",
    image: "/homepage/archive/social-community.svg",
  },
  {
    title: "윤리적 시장 확산",
    text: "정직과 투명성을 바탕으로 공정한 거래 문화를 지향합니다.",
    image: "/homepage/archive/social-ethics.svg",
  },
  {
    title: "환경경영시스템 인증",
    text: "ISO 14001 인증으로 신뢰와 비용 절감, ESG 경영을 실현합니다.",
    image: "/homepage/archive/social-environment.svg",
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
      {description ? <span className="text-box">{description}</span> : null}
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <a
      className={`${styles.toTop} ${visible ? styles.toTopVisible : ""}`}
      href="#top"
      aria-label="맨 위로 이동"
    >
      <Image
        src="/homepage/archive/to-top.svg"
        alt=""
        width={71}
        height={71}
        aria-hidden="true"
      />
    </a>
  );
}

function MoreViewIcon({
  circle = "dark",
}: {
  circle?: "dark" | "light" | "client";
}) {
  return (
    <span className={styles.moreViewIcon} data-variant={circle} aria-hidden="true">
      <Image
        src="/homepage/archive/more.svg"
        alt=""
        width={29}
        height={29}
      />
    </span>
  );
}

function ContactSection() {
  return (
    <section id="contact" className={`${styles.section} ${styles.contactSection}`}>
      <div className={styles.contactInner}>
        <HomepageContactMap />
        <div className={styles.contactCopy}>
          <h2>
            <strong>현장 운영</strong>의 <strong>기준</strong>을 세울 때,
            <br />
            <strong>올바름</strong>과 먼저 의논하세요.
          </h2>
          <address>
            <span>
              <Image src="/homepage/archive/contact-address.svg" alt="" width={10} height={15} aria-hidden="true" />
              <strong>ADDRESS</strong>
              <span className={styles.contactValue}>
                부산광역시 강서구 유통단지1로 41, 105동 217・218호
              </span>
            </span>
            <a href="tel:0514657767">
              <Image src="/homepage/archive/contact-phone.svg" alt="" width={12} height={16} aria-hidden="true" />
              <strong>TEL</strong>
              <span className={styles.contactValue}>051-465-7767</span>
            </a>
            <a href="fax:0519617767">
              <Image src="/homepage/archive/contact-fax.svg" alt="" width={12} height={15} aria-hidden="true" />
              <strong>FAX</strong>
              <span className={styles.contactValue}>051-961-7767</span>
            </a>
            <a href="mailto:olbareum@naver.com">
              <Image src="/homepage/archive/contact-email.svg" alt="" width={13} height={9} aria-hidden="true" />
              <strong>e-mail</strong>
              <span className={styles.contactValue}>olbareum@naver.com</span>
            </a>
          </address>
        </div>
      </div>
    </section>
  );
}

function HomeClientPreview() {
  const previewLogos = [
    {
      id: "korean-air",
      name: "대한항공",
      src: "/homepage/figma-client-logo-korean-air.png",
      width: 248,
      height: 39,
    },
    {
      id: "air-busan",
      name: "에어부산",
      src: "/homepage/figma-client-logo-air-busan.png",
      width: 156,
      height: 69,
    },
    {
      id: "busan-police",
      name: "부산경찰청",
      src: "/homepage/figma-client-logo-busan-police.png",
      width: 90,
      height: 90,
    },
    {
      id: "national-health-insurance",
      name: "국민건강보험",
      src: "/homepage/figma-client-logo-national-health-insurance.png",
      width: 161,
      height: 63,
    },
    {
      id: "donga-university",
      name: "동아대학교",
      src: "/homepage/figma-client-logo-donga-university.png",
      width: 192,
      height: 51,
    },
    {
      id: "gyeongnam-technical-high-school",
      name: "경남공업고등학교",
      src: "/homepage/figma-client-logo-gyeongnam-technical-high-school.png",
      width: 218,
      height: 54,
    },
  ] as const;

  return (
    <section className={`${styles.section} ${styles.homeClientSection}`}>
      <div className={styles.clientContent}>
        <div className={styles.clientBody}>
          <SectionHeading
            eyebrow="Client"
            title={
              <>
                <b>성실함</b>과 <b>신뢰</b>로
                <br className={styles.mobileOnlyBreak} />
                단단하게 이어온 파트너
              </>
            }
            description={
              <>
                <span className={styles.desktopOnlyCopy}>
                  철저한 관리와 맞춤형 서비스로 고객이 본업에만 집중할 수 있는
                  <br />
                  최적의 환경을 만들며 함께 성장하는 든든한 파트너가 되겠습니다.
                </span>
                <span className={styles.mobileOnlyCopy}>
                  철저한 관리와 맞춤형 서비스로 고객이 본업에만
                  <br />
                  집중할 수 있는 최적의 환경을 만들며 함께 성장하는
                  <br />
                  든든한 파트너가 되겠습니다.
                </span>
              </>
            }
            align="left"
          />
          <div className={styles.homeClientLogos}>
            {previewLogos.map(({ id, name, src, width, height }) => (
              <div key={id} data-logo={id}>
                <Image src={src} alt={name} width={width} height={height} />
              </div>
            ))}
          </div>
        </div>
        <Link className={styles.moreLink} href="/clients">
          MORE VIEW <MoreViewIcon circle="client" />
        </Link>
      </div>
    </section>
  );
}

export function MainPage() {
  return (
    <main id="top" className={`${styles.site} ${styles.landingPage}`}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <Image
          src="/homepage/hero-lighthouse-figma.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.coverImage}
          aria-hidden="true"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 id="hero-title">
            변함없는 <strong>진심</strong>으로
            <br />더 <strong>올바른 길</strong>을 밝힙니다
          </h1>
        </div>
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
            {[
              ["/homepage/lc_1.svg", "여성기업 확인서"],
              ["/homepage/lc_2.svg", "김해공항세관 등록증"],
              ["/homepage/lc_3.svg", "사회적기업 인증서"],
            ].map(([src, alt]) => (
              <div key={src}>
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="12.5rem"
                />
              </div>
            ))}
          </div>
        </div>
        <Link className={styles.moreLink} href="/about">
          MORE VIEW <MoreViewIcon />
        </Link>
      </section>

      <section className={`${styles.section} ${styles.servicePreview}`}>
        <div className={styles.serviceContent}>
          <div className={styles.serviceBody}>
            <SectionHeading
              eyebrow="Main Service"
              title={
                <>
                  <b>인력, 시설, 위생</b>을
                  <br className={styles.mobileServiceBreak} />
                  따로 보지 않습니다.
                </>
              }
              description={
                <>
                  현장의 성과는 채용, 배치, 안전, 청결, 보고 체계가
                  <br className={styles.mobileServiceBreak} />
                  함께 움직일 때 만들어집니다.
                  <br />
                  올바름은 세 영역을 하나의 운영 시스템으로 연결합니다.
                </>
              }
              align="left"
            />
            <div className={styles.serviceGrid}>
              {services.map(({ title, description, mobileDescription, image }) => (
                <article key={title} className={styles.serviceCard}>
                  <div className={styles.serviceImage}>
                    <Image src={image} alt="" fill sizes="(max-width: 47.5rem) 100vw, 33vw" />
                  </div>
                  <div>
                    <h3>{title}</h3>
                    <p>
                      {mobileDescription ? (
                        <>
                          <span className={styles.desktopOnlyCopy}>{description}</span>
                          <span className={styles.mobileOnlyCopy}>{mobileDescription}</span>
                        </>
                      ) : (
                        description
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <Link className={styles.moreLink} href="/services">
            MORE VIEW <MoreViewIcon circle="light" />
          </Link>
        </div>
      </section>
      <HomeClientPreview />
      <BackToTop />
      <HomepageFooter />
    </main>
  );
}

export function AboutPage() {
  return (
    <main id="top" className={`${styles.site} ${styles.aboutPage}`}>
      <section className={styles.aboutHero}>
        <Image
          src="/homepage/archive/hero-about.jpg"
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
            <strong>지속 가능한 내일</strong>을 가꿉니다.
          </h1>
        </div>
      </section>

      <section id="history" className={`${styles.section} ${styles.companySection}`}>
        <div className={styles.companyInner}>
          <SectionHeading
            eyebrow="SINCE 2018"
            title={
              <>
                <strong>사람</strong>을 향한 <strong>동행</strong>,{" "}
                <br className={`${styles.mobileOnlyBreak} ${styles.companyTitleBreak}`} />
                함께 크는{" "}
                <strong>지역 사회</strong>
              </>
            }
            description={
              <>
                지역사회와 함께 성장하는 사회적기업으로서
                <br />
                근로자 파견, 시설물 관리, 방역·소독까지{" "}
                <br className={`${styles.mobileOnlyBreak} ${styles.companyDescriptionBreak}`} />
                현장의 기준을 바로 세웁니다.
              </>
            }
          />
          <div className={styles.stats}>
            <div><Image src="/homepage/archive/stat-company.svg" alt="" width={31} height={36} aria-hidden="true" /><strong>2018</strong><span>법인 설립</span></div>
            <div><Image src="/homepage/archive/stat-employees.svg" alt="" width={54} height={28} aria-hidden="true" /><strong>26</strong><span>2026 임직원</span></div>
            <div><Image src="/homepage/archive/stat-sales.svg" alt="" width={37} height={34} aria-hidden="true" /><strong>10.3억</strong><span>2025 매출</span></div>
            <div><Image src="/homepage/archive/stat-growth.svg" alt="" width={34} height={34} aria-hidden="true" /><strong>220%</strong><span>2022~25 매출 성장률</span></div>
          </div>
          <div className={styles.historyWrap}>
            <div className={styles.historyImage}>
              <Image src="/homepage/archive/history.jpg" alt="불이 켜진 사무실 건물" fill sizes="(max-width: 47.5rem) 100vw, 42vw" />
              <div><span>HISTORY</span><p>사람 중심의 가치를 심고,<br />지속 가능한 내일을 가꿔갑니다.</p></div>
            </div>
            <ol className={styles.timeline}>
              {history.map(([date, title, detail]) => (
                <li key={date}><time>{date}</time><i /><p><span>{title}</span><span>{detail}</span></p></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="values" className={styles.values}>
        <div className={styles.valuesInner}>
          <SectionHeading
            eyebrow="Core Values"
            title={<strong>B.E.S.T</strong>}
            description={
              <>
                고객감동, 수익 창출, 사회환원, 인재 양성으로{" "}
                <br className={styles.mobileOnlyBreak} />
                지속 가능한 성장을 이루어내는{" "}
                <strong>4가지 핵심 가치</strong>
              </>
            }
          />
          <div className={styles.valueGrid}>
            {values.map(([letter, title, description]) => (
              <article key={letter}>
                <strong>{letter}</strong>
                <span>{title}</span>
                <p className={letter === "B" ? styles.benefitDescription : undefined}>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.socialSection}`}>
        <div className={styles.socialInner}>
          <SectionHeading
            eyebrow="Social Impact"
            title={
              <>
                <strong>이윤</strong>과 <strong>공익</strong>이{" "}
                <br className={styles.mobileOnlyBreak} />
                <strong>같은 방향</strong>으로 흐르게 합니다.
              </>
            }
            description={
              <>
                <span className={styles.desktopOnlyCopy}>
                  올바름은 취약계층에게 안정된 일자리를 제공하고,
                  <br />
                  균등한 교육기회와 복리후생을 통해 직무에 전념할 수 있는 환경을 만듭니다.
                  <br />
                  지역사회 재투자와 사회서비스 확충을 기업 운영의 중요한 기준으로 둡니다.
                </span>
                <span className={styles.mobileOnlyCopy}>
                  올바름은 취약계층에게 안정된 일자리를 제공하고,
                  <br />
                  균등한 교육기회와 복리후생을 통해 직무에 전념할 수 있는
                  <br />{" "}
                  환경을 만듭니다. 지역사회 재투자와 사회서비스 확충을
                  <br />{" "}
                  기업 운영의 중요한
                  <br className={styles.socialMobileNarrowBreak} />{" "}
                  기준으로 둡니다.
                </span>
              </>
            }
          />
          <div className={styles.socialGrid}>
            {socialValues.map(({ title, text, image }) => (
              <article key={title}>
                <Image src={image} alt="" width={42} height={42} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <ContactSection />
      <BackToTop />
      <HomepageFooter />
    </main>
  );
}

export function ServicesPage() {
  return (
    <main id="top" className={`${styles.site} ${styles.servicesPage}`}>
      <section className={styles.serviceHero}>
        <Image src="/homepage/archive/hero-services.jpg" alt="" fill priority sizes="100vw" className={styles.coverImage} />
        <div className={styles.serviceHeroOverlay} />
        <div>
          <h1>
            <strong>전문성</strong>과{" "}
            <strong>체계적 관리</strong>로
            <br />
            최적의 환경을 완성합니다
          </h1>
        </div>
      </section>

      <section id="operation" className={`${styles.section} ${styles.operationSection}`}>
        <div className={styles.serviceSectionInner}>
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
            <Image src="/homepage/archive/operation.jpg" alt="공항 현장에서 일하는 올바름 서비스 전문가" fill sizes="(max-width: 47.5rem) 100vw, 75rem" />
          </div>
          <div className={styles.operationLayout}>
            <h3>
              처음 <strong>진단</strong>부터 <strong>운영 보고</strong>까지
              <br />
              같은 기준으로 움직입니다.
            </h3>
            <ol className={styles.operationSteps}>
              {operationSteps.map(([number, title, description]) => (
                <li className={styles.operationStep} key={number}>
                  <span className={styles.operationBadge} aria-hidden="true">
                    <Image
                      className={styles.operationBadgeRing}
                      src="/homepage/archive/operation-step-ring.svg"
                      alt=""
                      width={97}
                      height={97}
                    />
                    <Image
                      className={styles.operationBadgeFill}
                      src={`/homepage/archive/operation-step-${number}.svg`}
                      alt=""
                      width={95}
                      height={95}
                    />
                    <span className={styles.operationNumber}>{number}</span>
                  </span>
                  <div className={styles.operationCopy}>
                    <h4>{title}</h4>
                    <p>{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="dispatch" className={`${styles.section} ${styles.detailSection} ${styles.dispatchSection}`}>
        <div className={styles.serviceSectionInner}>
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
          <div className={styles.detailBanner}><Image src="/homepage/service-worker.webp" alt="의료 현장에서 근무하는 전문 인력" fill sizes="(max-width: 47.5rem) 100vw, 75rem" /></div>
          <h3 className={styles.detailMessage}>사무관리, 생산·물류, IT·전산, 의료·간병, 콜센터 등<br />필요한 직무에 적합한 인력을 연결합니다.</h3>
          <div className={styles.dispatchDiagram}>
            <Image
              src="/homepage/archive/worker-dispatch.svg"
              alt="파견사업주와 사용사업주는 근로자 파견계약을 맺고, 파견사업주는 파견근로자와 고용계약관계를, 사용사업주는 파견근로자와 지휘 및 명령관계를 맺는 구조"
              width={504}
              height={397}
              sizes="(max-width: 47.5rem) calc(100vw - 2.5rem), 38.75rem"
            />
          </div>
        </div>
      </section>

      <section id="facility" className={`${styles.section} ${styles.facilitySection} ${styles.facilityManagementSection}`}>
        <div className={styles.serviceSectionInner}>
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
          <div className={styles.detailBanner}><Image src="/homepage/archive/facility.jpg" alt="시설 설비를 점검하는 전문 인력" fill sizes="(max-width: 47.5rem) 100vw, 75rem" /></div>
          <h3 className={styles.detailMessage}>전기·소방·기계·가스·건축 설비의 점검과 운영관리,<br />위생관리, 시설보안, 주차관리까지 통합 제공합니다.</h3>
          <div className={styles.facilityGrid}>
            {facilityItems.map(({ title, text, image }) => (
              <article key={title}><Image src={image} alt="" width={46} height={42} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section id="disinfection" className={`${styles.section} ${styles.detailSection} ${styles.disinfectionSection}`}>
        <div className={styles.serviceSectionInner}>
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
          <div className={styles.detailBanner}><Image src="/homepage/archive/disinfection.jpg" alt="항공기 객실에서 방역 작업을 진행하는 전문 인력" fill sizes="(max-width: 47.5rem) 100vw, 75rem" /></div>
          <h3 className={styles.detailMessage}>현장 조건에 맞춘 법정·살충·살균 소독으로<br />대형 건축물과 항공기 검역 현장의 예방 체계를{" "}<br className={styles.mobileOnlyBreak} />지원합니다.</h3>
          <div className={styles.airportCard}>
            <Image
              src="/homepage/airport-card-background.png"
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 480px) 320px, (max-width: 640px) 440px, (max-width: 768px) 500px, 533px"
            />
            <p className={styles.airportCardText}>
              당사는 현재 김해공항 내
              <br />
              전 항공기 검역 및
              <br />
              방역프로세스를 독자 수행중입니다
            </p>
          </div>
        </div>
      </section>
      <BackToTop />
      <HomepageFooter />
    </main>
  );
}

export function ClientsPage() {
  return (
    <main id="top" className={`${styles.site} ${styles.clientsPage}`}>
      <section className={styles.clientHero}>
        <Image src="/homepage/archive/hero-clients.jpg" alt="" fill priority sizes="100vw" className={styles.coverImage} />
        <div className={styles.clientOverlay} />
        <div>
          <h1>
            <strong>경험</strong>이 증명하는 <strong>실력,</strong>
            <br />
            <strong>책임감</strong>으로 보답합니다
          </h1>
        </div>
      </section>
      <section id="client-list" className={`${styles.section} ${styles.clientsSection}`}>
        <SectionHeading
          eyebrow="Client"
          title={<b>고객사</b>}
          description={
            <>
              수많은 현장에서 쌓아온 탄탄한 경험과 전문성을
              <br className={styles.clientsMobileDescriptionBreak} />
              바탕으로,{" "}
              <br className={styles.clientsDesktopDescriptionBreak} />
              고객의 기대를 뛰어넘는 최적의 솔루션을
              <br className={styles.clientsMobileDescriptionBreak} />
              완성합니다.
            </>
          }
        />
        <div className={styles.clientGroups}>
          {clientGroups.map(({ title, logos }) => (
            <div key={title}>
              <h3>{title}</h3>
              <div className={styles.logoGrid}>
                {logos.map(([name, src]) => (
                  <div key={name}><Image src={src} alt={name} fill sizes="11.25rem" /></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <BackToTop />
      <HomepageFooter />
    </main>
  );
}
