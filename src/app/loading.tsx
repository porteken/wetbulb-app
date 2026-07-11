import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2
          aria-label="Loading"
          className="size-8 animate-spin text-primary"
        />
        <p className="text-base text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
