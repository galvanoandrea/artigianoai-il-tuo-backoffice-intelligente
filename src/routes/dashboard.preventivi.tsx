import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/dashboard/preventivi")({
  component: PreventiviPage,
});

function PreventiviPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Preventivi</h1>
        <p className="text-muted-foreground text-sm mt-1">Crea e gestisci i tuoi preventivi.</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p>Modulo preventivi in arrivo.</p>
        </CardContent>
      </Card>
    </div>
  );
}