"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  FileArchive,
  Home,
  MessageSquare,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getToken } from "@/lib/auth";

function decodeTokenPayload(token: string): { sub?: string } | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/theme-toggle";

const mainItems = [
  { title: "Search", url: "/", icon: Home },
  { title: "Chat", url: "/chat", icon: MessageSquare },
];

const managementItems = [
  { title: "Collections", url: "/dashboard", icon: FolderOpen },
  { title: "Documents", url: "/dashboard/documents", icon: FileText },
  { title: "Files", url: "/dashboard/files", icon: FileArchive },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const token = getToken();
  const payload = token ? decodeTokenPayload(token) : null;
  const userEmail = payload?.sub || null;

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname === url;
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
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

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {userEmail && (
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground truncate">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{userEmail}</span>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem className="flex gap-1">
            <SidebarTrigger className="flex-1" />
            <SidebarMenuButton tooltip="Toggle theme" className="flex-1">
              <ThemeToggle />
            </SidebarMenuButton>
            <SidebarMenuButton tooltip="Sign out" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
