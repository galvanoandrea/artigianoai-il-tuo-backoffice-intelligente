import { Link, useRouterState } from "@tanstack/react-router";
import { Users, FileText, Settings, Wrench, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Panoramica", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clienti", url: "/dashboard/clienti", icon: Users },
  { title: "Preventivi", url: "/dashboard/preventivi", icon: FileText },
  { title: "Impostazioni", url: "/dashboard/impostazioni", icon: Settings },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    path === "/dashboard" ? currentPath === path : currentPath.startsWith(path);
  const checkFn = useServerFn(checkIsAdmin);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkFn().then((r) => setIsAdmin(!!r.isAdmin)).catch(() => setIsAdmin(false));
  }, [checkFn]);

  const menuItems = isAdmin
    ? [...items, { title: "Admin", url: "/dashboard/admin", icon: ShieldCheck }]
    : items;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent grid place-items-center shadow-glow shrink-0">
            <Wrench className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-bold text-base text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            ArtigianoAI
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-11 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}