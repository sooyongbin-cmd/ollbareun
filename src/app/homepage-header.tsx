"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

type MenuKey = "about" | "services" | "clients";

const menuColumns = [
  {
    key: "about" as const,
    label: "올바름 소개",
    href: "/about",
    items: [
      ["연혁", "/about#history"],
      ["핵심가치", "/about#values"],
      ["contact us", "/about#contact"],
    ],
  },
  {
    key: "services" as const,
    label: "서비스",
    href: "/services",
    items: [
      ["운영 체계", "/services#operation"],
      ["근로자 파견", "/services#dispatch"],
      ["건물·시설물 종합 관리", "/services#facility"],
      ["방역·소독", "/services#disinfection"],
    ],
  },
  {
    key: "clients" as const,
    label: "고객사",
    href: "/clients",
    items: [["고객사", "/clients#client-list"]],
  },
];

function HeaderBrand() {
  return (
    <span className={`${styles.brand} ${styles.brandInverse}`}>
      <span className={styles.brandMark} aria-hidden="true">
        <Image
          className={styles.brandSymbolOne}
          src="/homepage/figma-icons/brand-symbol-1.svg"
          alt=""
          width={10}
          height={17}
        />
        <Image
          className={styles.brandSymbolTwo}
          src="/homepage/figma-icons/brand-symbol-2.svg"
          alt=""
          width={17}
          height={25}
        />
        <Image
          className={styles.brandSymbolThree}
          src="/homepage/figma-icons/brand-symbol-3.svg"
          alt=""
          width={22}
          height={30}
        />
      </span>
      <span className={styles.brandName}>주식회사 올바름</span>
    </span>
  );
}

export default function HomepageHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeMenu: MenuKey | null = pathname.startsWith("/about")
    ? "about"
    : pathname.startsWith("/services")
      ? "services"
      : pathname.startsWith("/clients")
        ? "clients"
        : null;

  useEffect(() => {
    const updateHeader = () => {
      setIsScrolled(window.scrollY > 40);
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

  const closeMenusAfterNavigation = () => {
    window.setTimeout(closeMenus, 0);
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
        <Link href="/" aria-label="올바름 홈페이지 처음으로" onClick={closeMenus}>
          <HeaderBrand />
        </Link>
        <p className={styles.certification}>고용노동부 지정 사회적기업 / 여성기업</p>

        <nav className={styles.desktopNav} aria-label="주요 메뉴">
          {menuColumns.map((menu) => (
            <Link
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
            </Link>
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
        inert={!openMenu}
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
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenusAfterNavigation}
                  tabIndex={openMenu ? 0 : -1}
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <nav
        id="homepage-mobile-menu"
        className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileMenuOpen : ""}`}
        aria-label="모바일 주요 메뉴"
        inert={!mobileOpen}
      >
        <div className={styles.mobileMenuInner}>
          {menuColumns.map((column) => (
            <section key={column.key}>
              <Link
                className={styles.mobileMenuTitle}
                href={column.href}
                onClick={closeMenusAfterNavigation}
              >
                {column.label}
              </Link>
              <div>
                {column.items.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenusAfterNavigation}
                    tabIndex={mobileOpen ? 0 : -1}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </nav>
    </header>
  );
}
