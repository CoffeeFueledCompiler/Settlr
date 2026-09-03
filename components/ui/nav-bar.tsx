"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/groups/${groupId}`, label: "Trip" },
    { href: `/groups/${groupId}/expenses`, label: "Activity" },
    { href: `/groups/${groupId}/settle`, label: "Settle" },
    { href: "/", label: "Profile" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center bg-base/95 backdrop-blur">
      <ul className="flex w-full max-w-2xl justify-around px-4 py-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`transition-press flex flex-col items-center gap-1 rounded-xl px-4 py-2 font-display text-xs font-semibold ${
                  active ? "shadow-pressed text-slate" : "text-ink/70"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? "bg-slate" : "bg-transparent"}`}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
