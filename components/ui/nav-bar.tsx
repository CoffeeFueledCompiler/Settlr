"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
      {...props}
    />
  );
}

function TripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 22s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  );
}

function ActivityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </IconBase>
  );
}

function SettleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase strokeWidth={2.5} {...props}>
      <path d="M5 13l4 4L19 7" />
    </IconBase>
  );
}

function BalancesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <line x1="5" y1="20" x2="5" y2="11" />
      <line x1="12" y1="20" x2="12" y2="5" />
      <line x1="19" y1="20" x2="19" y2="14" />
    </IconBase>
  );
}

function OffsetsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13" />
      <path d="M17 20l4-4-4-4" />
      <path d="M21 16H8" />
    </IconBase>
  );
}

function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </IconBase>
  );
}

export function NavBar({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/groups/${groupId}`, label: "Trip", Icon: TripIcon },
    { href: `/groups/${groupId}/balances`, label: "Balances", Icon: BalancesIcon },
    { href: `/groups/${groupId}/offsets`, label: "Offsets", Icon: OffsetsIcon },
    { href: `/groups/${groupId}/expenses`, label: "Activity", Icon: ActivityIcon },
    { href: `/groups/${groupId}/settle`, label: "Settle", Icon: SettleIcon },
    { href: "/", label: "Profile", Icon: ProfileIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center bg-base/95 backdrop-blur">
      <ul className="flex w-full max-w-2xl justify-around px-1 py-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`transition-press flex flex-col items-center gap-1 rounded-xl px-2 py-2 font-display text-[10px] font-semibold ${
                  active ? "shadow-pressed text-slate" : "text-ink/70"
                }`}
              >
                <Icon width={18} height={18} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
