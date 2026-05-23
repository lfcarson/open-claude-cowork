'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/cn';

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm h-14',
        className
      )}
    >
      {/* Logo / App name */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">LF</span>
        </div>
        <span className="font-semibold text-sm">LF Cowork</span>
      </div>

      {/* User info */}
      {session?.user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{session.user.email}</p>
          </div>

          <div className="relative group">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? 'User avatar'}
                className="w-8 h-8 rounded-full ring-2 ring-border cursor-pointer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer ring-2 ring-border">
                <span className="text-primary-foreground text-xs font-semibold">{initials}</span>
              </div>
            )}

            {/* Dropdown on hover */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
              <a
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </a>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors w-full text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
