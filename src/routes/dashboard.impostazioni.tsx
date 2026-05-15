import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/dashboard/impostazioni")({
  component: ImpostazioniPage,
});

type ProfileForm = {
  nome: string;
  cognome: string;
  nome_azienda: string;
  telefono: string;
  indirizzo: string;
};

function ImpostazioniPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    nome: "",
    cognome: "",
    nome_azienda: "",
    telefono: "",
    indirizzo: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("nome, cognome, nome_azienda, telefono, indirizzo, nome_completo")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        toast.error("Errore nel caricamento del profilo");
      } else if (data) {
        // Fallback: se nome è vuoto ma esiste nome_completo, prova a separare
        let nome = data.nome ?? "";
        let cognome = data.cognome ?? "";
        if (!nome && !cognome && data.nome_completo) {
          const parts = data.nome_completo.trim().split(/\s+/);
          nome = parts[0] ?? "";
          cognome = parts.slice(1).join(" ");
        }
        setForm({
          nome,
          cognome,
          nome_azienda: data.nome_azienda ?? "",
          telefono: data.telefono ?? "",
          indirizzo: data.indirizzo ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const nome_completo = `${form.nome} ${form.cognome}`.trim();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        nome: form.nome.trim() || null,
        cognome: form.cognome.trim() || null,
        nome_completo: nome_completo || null,
        nome_azienda: form.nome_azienda.trim() || null,
        telefono: form.telefono.trim() || null,
        indirizzo: form.indirizzo.trim() || null,
      });
    setSaving(false);
    if (error) {
      toast.error("Errore nel salvataggio", { description: error.message });
    } else {
      toast.success("Modifiche salvate con successo");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Impostazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci i dati del tuo profilo e della tua azienda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
          <CardDescription>Queste informazioni appariranno nei tuoi preventivi.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground text-sm">Caricamento…</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={form.nome} onChange={update("nome")} placeholder="Mario" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome</Label>
                  <Input id="cognome" value={form.cognome} onChange={update("cognome")} placeholder="Rossi" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_azienda">Nome azienda</Label>
                <Input
                  id="nome_azienda"
                  value={form.nome_azienda}
                  onChange={update("nome_azienda")}
                  placeholder="Es. Rossi Impianti S.r.l."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={update("telefono")}
                    placeholder="+39 333 1234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="indirizzo">Indirizzo</Label>
                <Input
                  id="indirizzo"
                  value={form.indirizzo}
                  onChange={update("indirizzo")}
                  placeholder="Via Roma 1, 20100 Milano"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="lg" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvataggio…" : "Salva modifiche"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}