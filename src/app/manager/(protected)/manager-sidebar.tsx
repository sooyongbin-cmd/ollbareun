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
  findManagerNavigation,
  managerNavigationGroups,
} from "./manager-navigation";
import ManagerPushConnect from "./manager-push-connect";
import { usePasskeyFeatureEnabled } from "@/components/passkey-feature-provider";

export default function ManagerSidebar() {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();
  const passkeyEnabled = usePasskeyFeatureEnabled();
  const currentNavigation = findManagerNavigation(pathname);

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
                  src="/icons/logo_only_color.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 object-contain"
                />
                <span className="grid flex-1 text-left leading-tight">
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
                  isActive={currentNavigation.item.href === dashboardNavigationItem.href}
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
                {group.items.filter((item) => passkeyEnabled || item.href !== "/manager/system/passkeys").map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentNavigation.item.href === item.href}
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
