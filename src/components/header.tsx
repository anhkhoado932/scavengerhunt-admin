import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export function Header() {
  return (
    <header className="border-b shadow-sm bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-2xl mx-auto flex h-16 items-center justify-center py-3">
        <Link href="/" className="flex items-center space-x-2">
          <div className="bg-primary rounded-md p-1.5 text-primary-foreground">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl">
            Game Control Dashboard
          </span>
        </Link>
      </div>
    </header>
  );
} 