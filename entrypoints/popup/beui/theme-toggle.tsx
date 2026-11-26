"use client";

import { Moon, Sun } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "./extension-theme";
import { type ComponentPropsWithoutRef, useEffect, useState } from "react";
import { ActionSwapIcon } from "./action-swap";
import { cn } from "./utils";
import { Tooltip } from "./tooltip";

export type ThemeVariant = "rectangle" | "circle" | "circle-blur" | "blinds";

export type RectStart =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "bottom-up";

/** English defaults. Override per instance with `labels`, or app-wide with `LocaleProvider`. */
export const themeToggleMessages = {
  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",
};

export type ThemeToggleMessages = typeof themeToggleMessages;

export interface ThemeToggleProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children" | "onClick"> {
  /** Animation variant. Default: "rectangle". */
  variant?: ThemeVariant;
  /** Origin direction for the reveal. Default: "bottom-up". */
  start?: RectStart;
  iconClassName?: string;
  /** Override any built-in string. */
  labels?: Partial<ThemeToggleMessages>;
}


// View transitions animate in CSS, not motion springs, so easing here is
// either EASE_OUT_CSS or a keyword. The circle variants keep the Material
// standard curve because their reveal expands symmetrically rather than
// decelerating. Durations differ per variant to match native OS mode switches.

const RECT_FROM: Record<RectStart, string> = {
  "top-left":    "inset(0 100% 100% 0)",
  "top-right":   "inset(0 0 100% 100%)",
  "bottom-left": "inset(100% 100% 0 0)",
  "bottom-right":"inset(100% 0 0 100%)",
  center:        "inset(50% 50% 50% 50%)",
  "bottom-up":   "inset(100% 0 0 0)",
};

const CIRCLE_ORIGIN: Record<RectStart, string> = {
  "top-left":    "0% 0%",
  "top-right":   "100% 0%",
  "bottom-left": "0% 100%",
  "bottom-right":"100% 100%",
  center:        "50% 50%",
  "bottom-up":   "50% 100%",
};

export function useThemeToggle({
  variant = "rectangle",
  start = "bottom-up",
}: { variant?: ThemeVariant; start?: RectStart } = {}) {
  const { setTheme, resolvedTheme } = useTheme();
  const reduce = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";

    if (reduce || typeof document.startViewTransition !== "function") {
      setTheme(next);
      return;
    }

    const root = document.documentElement;

    if (variant === "rectangle") {
      root.style.setProperty("--beui-vt-from", RECT_FROM[start]);
      root.dataset.beuiVt = "rect";
    } else if (variant === "blinds") {
      // Slats sweep the whole viewport; there is no origin point to set.
      root.dataset.beuiVt = "blinds";
    } else {
      root.style.setProperty("--beui-vt-origin", CIRCLE_ORIGIN[start]);
      root.dataset.beuiVt = variant;
    }

    try {
      const vt = document.startViewTransition(() => setTheme(next));
      void vt.finished.catch(() => {}).finally(() => { delete root.dataset.beuiVt; });
    } catch {
      delete root.dataset.beuiVt;
      setTheme(next);
    }
  };

  return { isDark, mounted, toggle };
}

export function ThemeToggle({
  variant = "rectangle",
  start = "bottom-up",
  className,
  iconClassName,
  labels,
  ...rest
}: ThemeToggleProps) {
  const t = { ...themeToggleMessages, ...labels };
  const { isDark, mounted, toggle } = useThemeToggle({ variant, start });
  const label = t[mounted && isDark ? "switchToLight" : "switchToDark"];

  return (
    <Tooltip content={label} side="bottom"><button
      type="button"
      aria-label={label}
      onClick={toggle}
      className={cn("flex items-center justify-center", className)}
      {...rest}
    >
      {mounted ? (
        <ActionSwapIcon
          value={isDark ? "dark" : "light"}
          animation="blur"
          className={iconClassName}
        >
          {isDark ? (
            <Sun className={iconClassName} />
          ) : (
            <Moon className={iconClassName} />
          )}
        </ActionSwapIcon>
      ) : (
        <span className={iconClassName} aria-hidden="true" />
      )}
    </button></Tooltip>
  );
}
