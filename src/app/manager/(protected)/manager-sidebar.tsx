"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  dashboardNavigationItem,
  isManagerPathActive,
  managerNavigationGroups,
} from "./manager-navigation";
import ManagerPushConnect from "./manager-push-connect";

export default function ManagerSidebar() {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();

  const closeMobileMenu = () => {
    if (openMobile) {
      setOpenMobile(false);
    }
  };

  useEffect(() => {
    if (!openMobile) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openMobile]);

  return (
    <Sidebar collapsible="icon" aria-label="관리자화면 메뉴">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="올바름 관리자">
              <Link href="/manager" onClick={closeMobileMenu}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/header-logo-color.svg"
                  alt=""
                  width={162}
                  height={28}
                  className="h-auto w-[10.125rem] max-w-full shrink-0 object-contain group-data-[collapsible=icon]:w-8"
                />
                <span className="sr-only">
                  <span className="truncate font-semibold">올바름 관리자</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>개요</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isManagerPathActive(pathname, dashboardNavigationItem.href)}
                  tooltip={dashboardNavigationItem.label}
                >
                  <Link href={dashboardNavigationItem.href} onClick={closeMobileMenu}>
                    <dashboardNavigationItem.icon aria-hidden="true" />
                    <span>{dashboardNavigationItem.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {managerNavigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>
              <group.icon aria-hidden="true" />
              <span>{group.label}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isManagerPathActive(pathname, item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={closeMobileMenu}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <ManagerPushConnect />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
