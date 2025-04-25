import Link from "next/link";
import { Gamepad2, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8 bg-muted/30">
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="bg-primary/20 rounded-md p-1 text-primary">
            <Gamepad2 className="h-4 w-4" />
          </div>
          <p>&copy; {new Date().getFullYear()} Game Control Dashboard</p>
        </div>
        <p className="text-xs text-muted-foreground">Built with Supabase</p>
        <div className="flex gap-4 items-center">
          <Link
            href="https://supabase.com/docs"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary font-medium hover:underline underline-offset-4"
          >
            Supabase Docs
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
} 