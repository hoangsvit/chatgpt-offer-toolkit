Vendored from https://github.com/starc007/ui-components at 1d7fd243371decc96a3d52cda4e32ed7606311f0. MIT License (see public/beui-LICENSE.txt). Button and AnimatedBadge plus supporting utilities. Only import paths changed. React islands connect to the existing popup controller without changing checkout or account behavior.

ThemeToggle, ActionSwap and theme.css are from the same upstream commit. ThemeToggle imports an extension-local theme adapter instead of next-themes (avoids an inline bootstrap script under MV3 CSP), uses the upstream English default labels without the site localization dependency, and handles canceled view transitions. The upstream color tokens are preserved; popup layout uses local aliases and accessible status text colors.

Input and Switch from the same pinned upstream revision. Input adds nativeUncontrolled for the existing native form controller; Switch is unchanged apart from its import path. ThemeToggle's view-transition CSS is extracted to a bundled local stylesheet and uses an immediate fallback if the browser transition is unavailable. All visible actions use the vendored Button.

Select and its keyboard hooks come from the [BeUI Select registry](https://beui.dev/r/select.json). The extension uses local imports, connects the trigger to the field label, and raises the open menu above adjacent controls.

Tooltip and its positioning and gesture helpers come from the [BeUI Tooltip registry](https://beui.dev/r/tooltip.json) with local import paths.
