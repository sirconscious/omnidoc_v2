"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  FileArchive,
  Home,
  MessageSquare,
  Upload,
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
  { title: "Upload", url: "/upload", icon: Upload },
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

      <SidebarFooter className="border-t border-border/50 p-2">
        <SidebarMenu>
          {userEmail && (
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">{userEmail}</span>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Toggle theme" asChild>
              <ThemeToggle />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="flex gap-1">
            <SidebarTrigger className="h-9 w-9 border border-border bg-background" />
            <SidebarMenuButton 
              tooltip="Sign out" 
              onClick={handleLogout}
              className="h-9 flex-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
