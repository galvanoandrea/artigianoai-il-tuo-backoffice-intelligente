import { Link, useRouterState } from "@tanstack/react-router";
import { Users, FileText, Settings, Wrench, LayoutDashboard, ShieldCheck, Building2, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  { title: "Agenda", url: "/dashboard/agenda", icon: CalendarDays },
  { title: "Fornitori", url: "/dashboard/fornitori", icon: Building2 },
  { title: "Impostazioni", url: "/dashboard/impostazioni", icon: Settings },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    path === "/dashboard" ? currentPath === path : currentPath.startsWith(path);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      fetch("/api/admin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((r) => setIsAdmin(!!r.isAdmin))
        .catch(() => setIsAdmin(false));
    });
  }, []);

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