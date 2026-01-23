"use client"

import { useCurrentUserProfile } from "@/hooks/use-current-user-profile"
import { CurrentUserAvatar } from "./current-user-avatar"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Settings, User, Shield, Crown, UserCircle } from "lucide-react"
import { LogoutMenuItem } from "./logout-menu-item"
import Link from "next/link"
import { Skeleton } from "./ui/skeleton"
import { Badge } from "./ui/badge"

const roleConfig = {
  admin: {
    icon: Crown,
    label: "Admin",
    variant: "default" as const,
  },
  officer: {
    icon: Shield,
    label: "Officer",
    variant: "secondary" as const,
  },
  member: {
    icon: UserCircle,
    label: "Member",
    variant: "outline" as const,
  },
}

export function SidebarUserFooter() {
  const { profile, loading } = useCurrentUserProfile()

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2 px-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2 px-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  const roleInfo = roleConfig[profile.role]
  const RoleIcon = roleInfo.icon
  const displayName = profile.full_name || profile.username || profile.email?.split('@')[0] || profile.id.slice(0, 8)

  return (
    <div className="flex flex-col gap-2 p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-auto p-2 hover:bg-sidebar-accent"
          >
            <div className="flex-shrink-0">
              <CurrentUserAvatar />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <Badge variant={roleInfo.variant} className="h-5 text-xs px-1.5">
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {roleInfo.label}
                </Badge>
              </div>
              {profile.email ? (
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {profile.email}
                </p>
              ) : profile.username ? (
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  @{profile.username}
                </p>
              ) : null}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {profile.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {profile.email}
                </p>
              )}
              {profile.username && !profile.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  @{profile.username}
                </p>
              )}
              <div className="flex items-center gap-1.5 pt-1">
                <RoleIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{roleInfo.label}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/protected/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <LogoutMenuItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
