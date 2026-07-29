"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

type MenuKey = "about" | "services" | "clients";

const menuColumns = [
  {
    key: "about" as const,
    label: "올바름 소개",
    href: "#about",
    items: [
      ["연혁", "#history"],
      ["핵심가치", "#values"],
      ["contact us", "#contact"],
    ],
  },
  {
    key: "services" as const,
    label: "서비스",
    href: "#services",
    items: [
      ["운영 체계", "#operation"],
      ["근로자 파견", "#dispatch"],
      ["건물·시설물 종합 관리", "#facility"],
      ["방역·소독", "#disinfection"],
    ],
  },
  {
    key: "clients" as const,
    label: "고객사",
    href: "#clients",
    items: [["고객사", "#clients"]],
  },
];

function HeaderBrand() {
  return (
    <span className={`${styles.brand} ${styles.brandInverse}`}>
      <span className={styles.brandMark} aria-hidden="true">
        <span />
      </span>
      <span className={styles.brandName}>주식회사 올바름</span>
    </span>
  );
}

function getActiveMenu(): MenuKey | null {
  const scrollPosition = window.scrollY + window.innerHeight * 0.28;
  const sections: Array<[MenuKey, HTMLElement | null]> = [
    ["about", document.getElementById("about")],
    ["services", document.getElementById("services")],
    ["clients", document.getElementById("clients")],
  ];

  let active: MenuKey | null = null;
  for (const [key, section] of sections) {
    if (section && section.offsetTop <= scrollPosition) {
      active = key;
    }
  }
  return active;
}

export default function HomepageHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const updateHeader = () => {
      setIsScrolled(window.scrollY > 40);
      setActiveMenu(getActiveMenu());
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const closeMenus = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  return (
    <header
      className={`${styles.header} ${isScrolled ? styles.headerScrolled : ""} ${
        openMenu || mobileOpen ? styles.headerMenuOpen : ""
      }`}
      onMouseLeave={() => setOpenMenu(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpenMenu(null);
        }
      }}
    >
      <div className={styles.headerInner}>
        <a href="#top" aria-label="올바름 홈페이지 처음으로" onClick={closeMenus}>
          <HeaderBrand />
        </a>
        <p className={styles.certification}>고용노동부 지정 사회적기업 / 여성기업</p>

        <nav className={styles.desktopNav} aria-label="주요 메뉴">
          {menuColumns.map((menu) => (
            <a
              key={menu.key}
              href={menu.href}
              className={`${styles.desktopNavItem} ${
                (openMenu ?? activeMenu) === menu.key ? styles.desktopNavItemActive : ""
              }`}
              aria-expanded={openMenu === menu.key}
              onMouseEnter={() => setOpenMenu(menu.key)}
              onFocus={() => setOpenMenu(menu.key)}
              onClick={() => setOpenMenu(null)}
            >
              {menu.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={mobileOpen}
          aria-controls="homepage-mobile-menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <div
        className={`${styles.megaMenu} ${openMenu ? styles.megaMenuOpen : ""}`}
        aria-hidden={!openMenu}
        onMouseEnter={() => {
          if (!openMenu) setOpenMenu(activeMenu ?? "about");
        }}
      >
        <div className={styles.megaMenuInner}>
          <div aria-hidden="true" />
          {menuColumns.map((column) => (
            <div
              key={column.key}
              className={`${styles.megaMenuColumn} ${
                openMenu === column.key ? styles.megaMenuColumnActive : ""
              }`}
            >
              {column.items.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={closeMenus}
                  tabIndex={openMenu ? 0 : -1}
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <nav
        id="homepage-mobile-menu"
        className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileMenuOpen : ""}`}
        aria-label="모바일 주요 메뉴"
        aria-hidden={!mobileOpen}
      >
        <div className={styles.mobileMenuInner}>
          {menuColumns.map((column) => (
            <section key={column.key}>
              <a className={styles.mobileMenuTitle} href={column.href} onClick={closeMenus}>
                {column.label}
              </a>
              <div>
                {column.items.map(([label, href]) => (
                  <a key={href} href={href} onClick={closeMenus} tabIndex={mobileOpen ? 0 : -1}>
                    {label}
                  </a>
                ))}
              </div>
            </section>
          ))}
          <div className={styles.mobileSystemLinks}>
            <Link href="/manager" onClick={closeMenus}>
              관리자 시스템
            </Link>
            <Link href="/guard" onClick={closeMenus}>
              근무자 시스템
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
