"use client"

import * as React from "react"
import {
  Calendar,
  Users,
  BookOpen,
  Settings,
  Shield,
  Home,
  MessageSquare,
  Gamepad2,
  Link as LinkIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { ClientAuthButton } from "@/components/client-auth-button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { SidebarUserFooter } from "@/components/sidebar-user-footer"

// Main navigation items
const mainNavItems = [
  {
    title: "Community Hub",
    url: "/protected",
    icon: Home,
  },
  {
    title: "Events",
    url: "/events",
    icon: Calendar,
  },
  {
    title: "LFG Board",
    url: "/lfg",
    icon: MessageSquare,
  },
  {
    title: "Guides",
    url: "/guides",
    icon: BookOpen,
  },
  {
    title: "Roster",
    url: "/roster",
    icon: Users,
  },
]

// Secondary navigation items
const secondaryNavItems = [
  {
    title: "Integrations",
    url: "/integrations",
    icon: LinkIcon,
  },
  {
    title: "Account",
    url: "/account",
    icon: Settings,
  },
]

// Admin navigation items
const adminNavItems = [
  {
    title: "Admin Panel",
    url: "/protected/admin",
    icon: Shield,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const isAdmin = useIsAdmin()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Gamepad2 className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Jupiter's Girth</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              Community OS
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserFooter />
        <div className="flex items-center justify-center p-2">
          <ThemeSwitcher />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
