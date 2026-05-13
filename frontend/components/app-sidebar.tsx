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
  Command,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/theme-toggle";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Collections", url: "/dashboard", icon: FolderOpen },
  { title: "Documents", url: "/dashboard/documents", icon: FileText },
  { title: "Files", url: "/dashboard/files", icon: FileArchive },
  { title: "Upload", url: "/upload", icon: Upload },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname === url;
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-14 flex items-center px-4">
        <div className="flex items-center gap-3">
          <Command className="size-5 shrink-0" />
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">OmniDoc</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)} 
                    tooltip={item.title}
                    className="h-9 transition-colors data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 pt-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Toggle theme" asChild className="h-9">
              <ThemeToggle />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Sign out" 
              onClick={handleLogout}
              className="h-9 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="font-medium group-data-[collapsible=icon]:hidden">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="mt-1 pt-1 border-t border-border/40">
            <SidebarTrigger className="size-8 mx-auto hover:bg-accent transition-colors" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
