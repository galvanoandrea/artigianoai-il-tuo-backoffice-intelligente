import { cn } from "@/lib/utils";

/**
 * Logo ArtigianoAI. Il file sta in public/logo.png ed è a tutto quadrato:
 * gli angoli li arrotonda il CSS, così lo stesso asset serve anche come
 * icona della schermata Home (dove è iOS ad applicare la propria maschera).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="ArtigianoAI"
      width={512}
      height={512}
      className={cn("rounded-xl object-cover shadow-glow", className)}
    />
  );
}
