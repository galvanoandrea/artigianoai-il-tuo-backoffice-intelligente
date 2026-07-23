import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Lock } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/pricing";

function isTrialExpired(approvedAt: string | null | undefined): boolean {
  if (!approvedAt) return false;
  const expiresAt = new Date(approvedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (!error && data && (data as any).approved === false) {
        navigate({ to: "/pending-approval" });
        return;
      }
      const approvedAt = (data as any)?.approved_at ?? null;
      const subscriptionStatus = (data as any)?.subscription_status ?? null;
      setBlocked(subscriptionStatus !== "active" && isTrialExpired(approvedAt));
      setAccessChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, navigate]);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.access_token) return;
      fetch("/api/admin", { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((r) => !cancelled && setIsAdmin(!!r.isAdmin))
        .catch(() => !cancelled && setIsAdmin(false));
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  const userName: string =
    user?.user_metadata?.nome_completo || user?.email?.split("@")[0] || "Utente";
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Disconnesso");
    navigate({ to: "/login" });
  };

  if (loading || !user || !accessChecked) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">Caricamento…</div>
    );
  }

  const showPaywall = blocked && !isAdmin && currentPath !== "/dashboard/impostazioni";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between gap-2 border-b border-border bg-card px-3 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground hidden sm:inline">Backoffice</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 px-2 gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/impostazioni" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profilo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {showPaywall ? <TrialExpiredPaywall /> : <Outlet />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function TrialExpiredPaywall() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="border-destructive/40">
        <CardHeader className="items-center text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Periodo di prova scaduto</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Il periodo di prova gratuito è terminato. Abbonati per continuare a usare ArtigianoAI —
            clienti, preventivi, fatture e tutto il resto.
          </p>
          <Button asChild className="gap-2">
            <Link to="/dashboard/impostazioni">Abbonati ora</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
