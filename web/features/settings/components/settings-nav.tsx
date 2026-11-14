"use client";

import {
  CalendarClock,
  HardDrive,
  HardDriveDownload,
  Info,
  KeyRound,
  Languages,
  LayoutPanelTop,
  Lock,
  LockKeyhole,
  MonitorSmartphone,
  PencilLine,
  Search,
  ShieldCheck,
  Smartphone,
  SunMoon,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { isServerless } from "@/lib/local-backend/mode";
import { glidePill, prefersReducedMotion } from "@/lib/motion";
import { onUserScroll } from "@/lib/user-scroll";

const ALL_SECTIONS = [
  { id: "profile", labelKey: "profile", icon: UserRound },
  { id: "appearance", labelKey: "appearance", icon: SunMoon },
  { id: "language", labelKey: "language", icon: Languages },
  { id: "date-time", labelKey: "dateTime", icon: CalendarClock },
  { id: "editor", labelKey: "editor", icon: PencilLine },
  { id: "quick-actions", labelKey: "quickActions", icon: LayoutPanelTop },
  { id: "search", labelKey: "search", icon: Search },
  { id: "token", labelKey: "token", icon: KeyRound },
  { id: "storage", labelKey: "storage", icon: HardDrive },
  { id: "data", labelKey: "data", icon: HardDriveDownload },
  { id: "locks", labelKey: "locks", icon: LockKeyhole },
  { id: "security", labelKey: "security", icon: ShieldCheck },
  { id: "password", labelKey: "password", icon: Lock },
  { id: "phone", labelKey: "phone", icon: Smartphone },
  { id: "devices", labelKey: "devices", icon: MonitorSmartphone },
  { id: "about", labelKey: "about", icon: Info },
] as const;

// Without a server there is no phone sign-in, API token, sign-in security,
// password, device sign-out, storage use or picture search.
const SECTIONS = ALL_SECTIONS.filter(
  (section) =>
    !(
      isServerless &&
      [
        "phone",
        "token",
        "storage",
        "security",
        "password",
        "devices",
        "search",
      ].includes(section.id)
    ),
);

export function SettingsNav() {
  const t = useTranslations("settings.nav");
  const [activeSection, setActiveSection] = React.useState<string>(
    SECTIONS[0].id,
  );
  const activeSectionRef = React.useRef<string>(SECTIONS[0].id);
  const isClickedSectionHeldRef = React.useRef(false);

  const highlight = React.useCallback((id: string) => {
    const prev = activeSectionRef.current;
    if (prev === id) return;
    activeSectionRef.current = id;
    const nav = document.querySelector<HTMLElement>("[data-settings-nav]");
    const from = nav?.querySelector<HTMLElement>(`[data-go="${prev}"]`);
    const to = nav?.querySelector<HTMLElement>(`[data-go="${id}"]`);
    if (nav && from && to && window.matchMedia("(width >= 768px)").matches)
      glidePill(nav, from, to, "rounded-md bg-foreground/6");
    setActiveSection(id);
  }, []);

  // Arriving at a section's link, such as #set-phone from the sidebar: it
  // stays highlighted as if clicked, once the sections above have their
  // height.
  React.useEffect(() => {
    const id = window.location.hash.replace(/^#set-/, "");
    if (!SECTIONS.some((section) => section.id === id)) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        isClickedSectionHeldRef.current = true;
        highlight(id);
        document
          .getElementById(`set-${id}`)
          ?.scrollIntoView({ block: "start" });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlight]);

  React.useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(
      `[data-slot="page-scroll"]`,
    );
    if (!scroller) return;
    const onScroll = () => {
      if (isClickedSectionHeldRef.current) return;
      const scrollerTop = scroller.getBoundingClientRect().top;
      let inView: string = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const sectionEl = document.getElementById(`set-${section.id}`);
        if (
          sectionEl &&
          sectionEl.getBoundingClientRect().top - scrollerTop < 120
        )
          inView = section.id;
      }
      if (
        scroller.scrollTop + scroller.clientHeight >=
        scroller.scrollHeight - 4
      )
        inView = SECTIONS[SECTIONS.length - 1].id;
      highlight(inView);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    const stopWatching = onUserScroll(
      scroller,
      () => {
        isClickedSectionHeldRef.current = false;
      },
      "[data-settings-nav]",
    );
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      stopWatching();
    };
  }, [highlight]);

  return (
    <nav
      data-settings-nav
      aria-label={t("sections")}
      className="sticky top-20 isolate grid gap-px max-md:static max-md:-mx-gutter-phone max-md:flex max-md:gap-1.5 max-md:overflow-x-auto max-md:px-gutter-phone max-md:scrollbar-none"
    >
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#set-${section.id}`}
          data-go={section.id}
          aria-current={activeSection === section.id ? "location" : undefined}
          onClick={(e) => {
            e.preventDefault();
            isClickedSectionHeldRef.current = true;
            highlight(section.id);
            document.getElementById(`set-${section.id}`)?.scrollIntoView({
              behavior: prefersReducedMotion() ? "auto" : "smooth",
              block: "start",
            });
          }}
          className="relative flex h-8.5 items-center gap-2.5 rounded-md px-2.5 font-medium text-muted-foreground text-ui no-underline hover:bg-foreground/6 hover:text-foreground aria-[current=location]:bg-foreground/6 aria-[current=location]:font-semibold aria-[current=location]:text-foreground max-md:h-8 max-md:flex-none max-md:rounded-pill max-md:bg-muted max-md:px-3 [&>svg]:size-4 aria-[current=location]:[&>svg]:text-accent-strong max-md:[&>svg]:hidden"
        >
          <section.icon aria-hidden />
          {t(section.labelKey)}
        </a>
      ))}
    </nav>
  );
}
