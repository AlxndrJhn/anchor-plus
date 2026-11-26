"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button, IconButton } from "@/components/ui/button";
import { demoBySlug } from "@/lib/demo/demos";
import {
  caretToEnd,
  center,
  clickElement,
  type Fallback,
  findTarget,
  hoverElement,
  leaveElement,
  type Play as PlayContext,
  pressKey,
  type Step,
  Stopped,
  type Target,
  typeCharacter,
} from "@/lib/demo/runner";
import { startDemo, useDemo } from "@/lib/demo/store";
import { type DemoKey, demoKey } from "@/lib/demo/text";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CopyDemoLink } from "./copy-demo-link";

const MOVE_MS = 650;
/** Room between the panel and the edge of the window, as in bottom-4. */
const EDGE_PX = 16;
/** How close the pointer may come to the panel before it moves away. */
const CLEARANCE_PX = 12;
/** The longest wait while hurrying through steps to go back to one. */
const HURRY_MS = 120;

/**
 * Plays the feature demos over the app (see lib/demo): a pointer clicks
 * through the steps while a caption says what happens. Afterwards the notes
 * stay as the demo left them, to try out.
 */
export function DemoPlayer() {
  const router = useRouter();
  const t = useTranslations("demos");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const { slug, status, caption, run, step, paused, waiting, set } = useDemo();
  const [cursor, setCursor] = React.useState<{
    x: number;
    y: number;
    pressed: boolean;
  } | null>(null);
  const [isHidden, setIsHidden] = React.useState(false);
  const [isHurrying, setIsHurrying] = React.useState(false);
  const pathname = usePathname();
  const [isNudgeClosed, setIsNudgeClosed] = React.useState(false);
  // The panel moves to the top of the window while what the pointer goes
  // to is behind it at the bottom, and back down when that is behind it.
  const panel = React.useRef<HTMLElement>(null);
  const [isRaised, setIsRaised] = React.useState(false);
  const raised = React.useRef(false);
  const demo = slug ? demoBySlug(slug) : undefined;

  React.useEffect(() => {
    if (run === 0 || !slug) return;
    const playing = demoBySlug(slug);
    if (!playing) return;
    let stopped = false;
    setIsHidden(false);
    const check = () => {
      const state = useDemo.getState();
      if (stopped || state.run !== run || state.status !== "playing")
        throw new Stopped();
    };
    // Going back replays the steps before the one gone back to, quickly.
    let hurry = false;
    const pause = async (ms: number) => {
      await new Promise((resolve) =>
        setTimeout(resolve, hurry ? Math.min(ms, HURRY_MS) : ms),
      );
      check();
    };
    /** Holds before step `i` while paused, until played on or stepped. */
    const gate = async (i: number) => {
      set({ step: i });
      for (;;) {
        const state = useDemo.getState();
        if (state.advance) break;
        if (!state.paused) break;
        if (!state.waiting) set({ waiting: true });
        await pause(80);
      }
      set({ advance: false, waiting: false });
    };
    let position = {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.6,
    };
    setCursor({ ...position, pressed: false });
    const raise = (up: boolean) => {
      raised.current = up;
      setIsRaised(up);
    };
    /** Moves the panel out of the way of this part of the window. */
    const avoid = (box: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    }) => {
      const element = panel.current;
      if (!element) return;
      const { height, left, right } = element.getBoundingClientRect();
      const covers = (top: number) =>
        box.bottom > top - CLEARANCE_PX &&
        box.top < top + height + CLEARANCE_PX &&
        box.right > left - CLEARANCE_PX &&
        box.left < right + CLEARANCE_PX;
      const bottom = window.innerHeight - EDGE_PX - height;
      const [here, there] = raised.current
        ? [EDGE_PX, bottom]
        : [bottom, EDGE_PX];
      if (covers(here) && !covers(there)) raise(!raised.current);
    };
    const avoidPoint = (x: number, y: number) =>
      avoid({ top: y - 4, bottom: y + 28, left: x - 4, right: x + 28 });
    /** Keeps the caret clear while text is typed where it is. */
    const avoidCaret = () => {
      const selection = window.getSelection();
      const box = selection?.rangeCount
        ? selection.getRangeAt(0).getBoundingClientRect()
        : null;
      if (box && (box.width || box.height)) avoid(box);
    };
    // What the pointer was over: left when it moves on, as a mouse would.
    let touchedTargets: Element[] = [];
    const play: PlayContext = {
      check,
      pause,
      find: (target, timeout) => findTarget(target, check, timeout),
      moveTo: async (element) => {
        for (const touched of touchedTargets)
          if (touched !== element) leaveElement(touched);
        touchedTargets = [element];
        element.scrollIntoView({ block: "nearest", inline: "nearest" });
        avoid(element.getBoundingClientRect());
        position = center(element);
        setCursor({ ...position, pressed: false });
        await pause(MOVE_MS);
      },
      say: (key) => set({ caption: demoKey(playing.slug, `say.${key}`) }),
      go: (path) => router.push(path),
      cursor: (x, y, pressed = false) => {
        avoidPoint(x, y);
        position = { x, y };
        setCursor({ x, y, pressed });
      },
    };
    const press = async () => {
      setCursor({ ...position, pressed: true });
      await pause(140);
      setCursor({ ...position, pressed: false });
    };

    /** How long to look for a control that may not be in this layout. */
    const GLANCE_MS = 900;
    /**
     * The step's control, after opening what hides it on a phone; null when
     * the step is to be skipped or replaced (see Fallback).
     */
    const reach = async (
      target: Target,
      step: Fallback,
    ): Promise<HTMLElement | null> => {
      if (!step.ifShown && !step.reveal?.length && !step.orElse)
        return play.find(target);
      const glance = async () => {
        try {
          return await play.find(target, hurry ? HURRY_MS : GLANCE_MS);
        } catch (error) {
          if (error instanceof Stopped) throw error;
          return null;
        }
      };
      let element = await glance();
      if (!element && step.reveal?.length) {
        for (const opener of step.reveal) {
          const control = await play.find(opener);
          await play.moveTo(control);
          await press();
          clickElement(control);
          await pause(500);
        }
        element = step.orElse ? await glance() : await play.find(target);
      }
      if (element) return element;
      if (step.orElse) await perform(step.orElse);
      else if (!step.ifShown) return play.find(target);
      return null;
    };

    const perform = async (step: Step): Promise<void> => {
      if ("say" in step && step.say) play.say(step.say);
      if ("click" in step) {
        const element = await reach(step.click, step);
        if (!element) return;
        await play.moveTo(element);
        await press();
        clickElement(element);
        await pause(700);
      } else if ("hover" in step) {
        const element = await reach(step.hover, step);
        if (!element) return;
        await play.moveTo(element);
        hoverElement(element);
        await pause(600);
      } else if ("type" in step) {
        if (step.into) {
          const element = await reach(step.into, step);
          if (!element) return;
          await play.moveTo(element);
          await press();
          clickElement(element);
          caretToEnd(element);
          await pause(250);
        }
        avoidCaret();
        for (const character of step.type) {
          typeCharacter(character);
          await pause(character === " " ? 90 : 55);
        }
        await pause(500);
      } else if ("key" in step) {
        pressKey(step.key, step);
        await pause(700);
      } else if ("go" in step) {
        play.go(step.go);
        await pause(1200);
      } else if ("wait" in step) {
        await pause(step.wait);
      } else if ("waitFor" in step) {
        await play.find(step.waitFor, step.timeout ?? 10_000);
      } else if ("run" in step) {
        await step.run(play);
        await pause(500);
      } else if ("say" in step) {
        const words = translate("demos")(
          demoKey(playing.slug, `say.${step.say}`),
        );
        await pause(Math.min(4500, 1400 + words.length * 38));
      }
    };

    void (async () => {
      try {
        const { skipTo } = useDemo.getState();
        setIsHurrying(skipTo > 0);
        router.replace(playing.start);
        // Not hurried: the page shows the notes loaded afresh by then, and
        // a step taken before would act on what was there before.
        await pause(1600);
        hurry = skipTo > 0;
        for (const [i, step] of playing.steps.entries()) {
          if (hurry && i >= skipTo) {
            hurry = false;
            setIsHurrying(false);
          }
          if (hurry) set({ step: i });
          else await gate(i);
          await perform(step);
        }
        set({ status: "done", caption: demoKey(playing.slug, "outro") });
      } catch (error) {
        if (error instanceof Stopped) return;
        console.warn("Demo stopped:", error);
        set({ status: "done", caption: demoKey(playing.slug, "outro") });
      } finally {
        for (const touched of touchedTargets) leaveElement(touched);
        if (!stopped) {
          setCursor(null);
          setIsHurrying(false);
        }
      }
    })();
    return () => {
      stopped = true;
    };
  }, [run, slug, router, set]);

  const isPlaying = status === "playing" || status === "loading";
  const steps = demo?.steps.length ?? 0;

  /**
   * Back to before the step playing, or the one before while paused; a wait
   * shows nothing to go back to, so back past it.
   */
  const stepBack = () => {
    if (!slug || !demo) return;
    let at =
      status === "done" ? steps - 1 : Math.max(0, waiting ? step - 1 : step);
    while (at > 0 && "wait" in demo.steps[at]) at--;
    void startDemo(slug, queryClient, at);
  };
  const stepOn = () => set({ paused: true, advance: true });

  // Back at the bottom for the person's turn, however the demo ended.
  React.useEffect(() => {
    if (isPlaying) return;
    raised.current = false;
    setIsRaised(false);
  }, [isPlaying]);

  // Holds the person's own clicks and keys while the demo plays; the
  // demo's events are not trusted, so they pass.
  React.useEffect(() => {
    if (!isPlaying) return;
    const hold = (e: Event) => {
      const target = e.target as Element | null;
      if (!e.isTrusted || target?.closest?.("[data-demo-player]")) return;
      e.stopPropagation();
      e.preventDefault();
    };
    const types = [
      "pointerdown",
      "pointerup",
      "mousedown",
      "mouseup",
      "click",
      "dblclick",
      "keydown",
      "touchstart",
    ];
    for (const type of types)
      window.addEventListener(type, hold, { capture: true });
    return () => {
      for (const type of types)
        window.removeEventListener(type, hold, { capture: true });
    };
  }, [isPlaying]);

  return (
    <div data-demo-player>
      {cursor && isPlaying && !isHurrying && (
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-[2147483002] transition-transform ease-[cubic-bezier(.3,.7,.3,1)]"
          style={{
            transform: `translate(${cursor.x - 3}px, ${cursor.y - 2}px)`,
            transitionDuration: `${MOVE_MS - 100}ms`,
          }}
        >
          <MousePointer2
            className={cn(
              "size-7 fill-foreground stroke-background stroke-[1.5] drop-shadow-md transition-transform duration-100",
              cursor.pressed && "scale-75",
            )}
          />
          {cursor.pressed && (
            <span className="absolute -top-3 -left-3 size-8 animate-ping rounded-full bg-accent-strong/40" />
          )}
        </div>
      )}
      {status === "idle" && !isNudgeClosed && pathname !== "/demos" && (
        // Above a phone's New note button.
        <section
          aria-label={t("page.title")}
          className="pointer-events-auto fixed bottom-4 left-1/2 z-[2147483001] flex w-[min(560px,calc(100vw-32px))] max-md:bottom-24 -translate-x-1/2 items-center gap-3 rounded-xl bg-popover p-3 pl-4 text-popover-foreground shadow-[0_0_0_1px_var(--border),var(--sh-lg,0_12px_32px_rgb(0_0_0/.25))] animate-pop-up"
        >
          <p className="m-0 min-w-0 flex-1 text-ui leading-snug">
            {t("player.nudge")}
          </p>
          <Button size="sm" asChild>
            <Link href="/demos">
              <Play />
              {t("player.openList")}
            </Link>
          </Button>
          <button
            type="button"
            aria-label={tc("close")}
            onClick={() => setIsNudgeClosed(true)}
            className="grid size-7 flex-none cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-foreground/6"
          >
            <X className="size-4" />
          </button>
        </section>
      )}
      {demo && status !== "idle" && !isHidden && (
        <section
          ref={panel}
          // While it plays, pressing a control here must leave the app as
          // the demo left it: an open menu would close on a press outside
          // it, or on losing focus.
          onPointerDownCapture={(e) => {
            if (!isPlaying) return;
            e.stopPropagation();
          }}
          onMouseDownCapture={(e) => {
            if (!isPlaying) return;
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-live="polite"
          aria-label={t("player.panel")}
          className="pointer-events-auto fixed bottom-4 left-1/2 z-[2147483001] grid w-[min(560px,calc(100vw-32px))] -translate-x-1/2 gap-2.5 transition-transform duration-300 ease-[cubic-bezier(.3,.7,.3,1)] motion-reduce:transition-none rounded-xl bg-popover p-4 text-popover-foreground shadow-[0_0_0_1px_var(--border),var(--sh-lg,0_12px_32px_rgb(0_0_0/.25))]"
          style={
            isRaised
              ? // From bottom-4 to top-4: up by the window less the panel.
                { translate: "-50% calc(100% + 2rem - 100dvh)" }
              : undefined
          }
        >
          <div className="flex items-center gap-2">
            <span className="rounded-pill bg-accent-strong/15 px-2 py-0.5 font-semibold text-accent-ink text-small">
              {isPlaying ? t("player.playing") : t("player.yourTurn")}
            </span>
            <b className="min-w-0 flex-1 truncate font-semibold text-ui">
              {t(demoKey(demo.slug, "title"))}
            </b>
            <CopyDemoLink slug={demo.slug} />
            {!isPlaying && (
              <button
                type="button"
                aria-label={tc("close")}
                onClick={() => setIsHidden(true)}
                className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-foreground/6"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <p className="text-ui leading-snug">
            {isHurrying
              ? t("player.goingBack")
              : caption && t(caption as DemoKey)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5">
              <IconButton
                size="sm"
                label={t("player.previous")}
                title={t("player.previous")}
                disabled={
                  status === "loading" ||
                  isHurrying ||
                  (status === "playing" && step === 0 && waiting)
                }
                onClick={stepBack}
              >
                <ChevronLeft />
              </IconButton>
              {isPlaying && (
                <IconButton
                  size="sm"
                  label={paused ? t("player.play") : t("player.pause")}
                  title={paused ? t("player.play") : t("player.pause")}
                  disabled={isHurrying}
                  onClick={() => set({ paused: !paused })}
                >
                  {paused ? <Play /> : <Pause />}
                </IconButton>
              )}
              {isPlaying && (
                <IconButton
                  size="sm"
                  label={t("player.next")}
                  title={t("player.next")}
                  disabled={isHurrying}
                  onClick={stepOn}
                >
                  <ChevronRight />
                </IconButton>
              )}
              {isPlaying && (
                <span className="px-1.5 text-meta text-muted-foreground tabular-nums">
                  {t("player.progress", {
                    step: Math.min(step + 1, steps),
                    total: steps,
                  })}
                </span>
              )}
            </div>
            {isPlaying ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  set({
                    status: "done",
                    caption: demoKey(demo.slug, "outro"),
                  })
                }
              >
                {t("player.skip")}
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/${demo.slug}`)}
                >
                  <RotateCcw />
                  {t("player.playAgain")}
                </Button>
                <Button variant="quiet" size="sm" asChild>
                  <Link href="/demos" onClick={() => setIsHidden(true)}>
                    <Play />
                    {t("player.all")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
