/*
 * @javadaba/ui — Javadaba's design system.
 *
 * Mandatory inside `packages/apps/*` (user decision, 2026-08-08); opt-in for external
 * apps. The why, the scales, and the surface contract are in
 * `doc://contracts/design-system`.
 *
 * Fonts are imported separately (`@javadaba/ui/fonts`) because they drag in
 * `next/font`, and that only makes sense in the root layout of a Next app.
 */

// The surface: what publishes the tokens for everything hanging off it.
export { Surface, accentInk, type SurfaceKind, type SurfaceAccent, type SurfaceProps } from "./surface";

// System pieces.
export * from "./ui/button";
export * from "./ui/panel";
// The glass strip docked at the bottom of a surface (JAVA-119).
export * from "./ui/floating-tray";
export * from "./ui/badge";
export * from "./ui/accent-surface";
export * from "./ui/theater";
// The scene player: miniapps looping inside a window. Contract in `./theater/MINIAPP_CONTRACT.md`.
export * from "./theater/Theater";
export * from "./theater/defer-until-near";
// The chrome a product wears. NOT the company's: `javadaba-landing` keeps its own.
export { ProductNavBar, type ProductNavBarProps } from "./ui/product-nav-bar";
export { ProductFooter, type ProductFooterProps } from "./ui/product-footer";
export { JAVADABA_SOCIAL, SocialGlyph, type ProductSocialLink, type SocialNetwork } from "./ui/social-glyph";
export {
  JAVADABA_APPS,
  JAVADABA_LINKS,
  JAVADABA_MENU_LINKS,
  type ProductAppLink,
  type ProductNavLink,
} from "./ui/javadaba-links";
export { setLauncherViewer, useVisibleApps, visibleApps } from "./ui/launcher-audience";
export { JavadabaMenu } from "./ui/javadaba-menu";
export { JavadabaMenuContent } from "./ui/javadaba-menu-content";
export type { JavadabaMenuContentProps, JavadabaMenuProps } from "./ui/javadaba-menu-parts";
// The bar's third level, its search entry, and the menu's guest card and rows.
export * from "./ui/sub-nav";
export * from "./ui/bar-search";
export * from "./ui/menu-guest";
export * from "./ui/menu-item";
export * from "./ui/section-nav";
// A product page's section opener: accent rule, kicker, display title (JAVA-952).
export * from "./ui/section-head";
// Where a string lives on both runtimes (ADR 0015): `text.native.tsx` on Android.
export * from "./ui/text";
// A shortcut drawn as keycaps for this keyboard (JAVA-799).
export * from "./ui/shortcut-keys";
export * from "./ui/shortcuts-sheet";
export * from "./ui/command-menu";
// A sidebar's fold to an icon rail, remembered per browser (JAVA-117).
export * from "./ui/collapsible-sidebar";

// Radix primitives (shadcn), now resolved against the surface tokens.
export * from "./ui/progress";
export * from "./ui/skeleton";
export * from "./ui/loading-region";
// A timeline whose segment widths are seconds (JAVA-1290).
export * from "./ui/filmstrip";
export { formatTimecode, type FilmstripSegment, type FilmstripState } from "./ui/filmstrip.shared";
export * from "./ui/input";
export * from "./ui/textarea";
export * from "./ui/label";
export * from "./ui/field-help";
export * from "./ui/field-error";
export * from "./ui/password-input";
export * from "./ui/checkbox";
export * from "./ui/radio";
export * from "./ui/icon-button";
export * from "./ui/spinner";
// The small stroked shapes the controls draw themselves with (tick, status shapes, eye, chevron).
export * from "./ui/glyph";
// Quiet Bento display pieces (Lib-Controls, Lib-Display): notices, people, money, lists, tables, nav.
export * from "./ui/note";
export * from "./ui/avatar";
export * from "./ui/coin";
export * from "./ui/table";
export * from "./ui/list-row";
export * from "./ui/nav-item";
export * from "./ui/nav-group-label";
export * from "./ui/inline-link";
export * from "./ui/diamond-mark";
export * from "./ui/diamond-button";
export * from "./ui/empty-state";
export * from "./ui/progress-steps";
export * from "./ui/separator";
export * from "./ui/slider";
export * from "./ui/switch";
export * from "./ui/tabs";
export * from "./ui/dialog";
export * from "./ui/confirm-dialog";
export * from "./ui/use-undo-notice";
export * from "./ui/undo-notice";
// The system's enter and exit for a layer that is not a Radix piece (JAVA-1660).
export * from "./ui/presence";
// Transient news: non-blocking, one line each, stacked with the newest in front (JAVA-1620). A reversible action in place is UndoNotice's.
export { toast, type ToastAction, type ToastLabels, type ToastOptions, type ToastVariant } from "./ui/toast";
export { ToastViewport, type ToastViewportProps } from "./ui/toast-viewport";
export { setMenuUnread, useMenuUnread } from "./ui/menu-unread";
export * from "./ui/account-dialog";
export * from "./ui/popover";
export * from "./ui/font-picker";
export * from "./ui/context-menu";
export * from "./ui/context-menu-checkbox-item";
export * from "./ui/toggle";
export * from "./ui/toggle-group";
export * from "./ui/scroll-area";
export * from "./ui/select";
// Echo (Library 17): a solid copy of an icon or a whole object, in its own color, turned behind it.
export * from "./ui/echo-icon";
export * from "./ui/echo-shape";

export { cn } from "./lib/cn";
// The type scale (display-xl .. caption) as classes.
export { TYPE_SCALE, typeClass, type TypeRole } from "./lib/type-scale";
// Motion: layout changes and shared elements. The contract is `doc://contracts/design-system/motion`.
export { withViewTransition } from "./lib/view-transition";
export { faceLuminance, inkOn } from "./lib/luminance";

// Quiet Bento overlays, feedback and shared pieces (Lib-Pieces, Lib-Overlays, Lib-Feedback).
export * from "./ui/dialog-close-button";
export * from "./ui/command-menu-empty";
export * from "./ui/tooltip";
export * from "./ui/alert";
export * from "./ui/error-state";
export * from "./ui/offline-state";
export * from "./ui/not-found";
export * from "./ui/not-found.shared";
export * from "./ui/card";
export * from "./ui/link-card";
export * from "./ui/avatar-group";
export * from "./ui/sort-head";
export * from "./ui/selection-bar";
export * from "./ui/accordion";
export * from "./ui/accordion-item";
export * from "./ui/breadcrumb";
export * from "./ui/breadcrumb.shared";
export * from "./ui/pagination";
export * from "./ui/pagination.shared";
export * from "./ui/load-more";
export * from "./ui/search-input";
export * from "./ui/number-input";
export * from "./ui/phone-input";
export * from "./ui/phone-countries";
export * from "./ui/address-input";

// Quiet Bento chrome (Lib-Chrome): the seal a product or a tool wears wherever the chrome names it.
export * from "./ui/product-seal";
export * from "./ui/sidebar-rail";
export * from "./ui/sidebar-back";
// The line under a page's last section, and the stage a doodle stands on (Lib-Chrome).
export * from "./ui/doodle-divider";
export * from "./ui/doodle-art";

// Where autosave stands, in words (Lib-Calendar): the six states of `useAutosave`.
export * from "./ui/save-status";

// The bottom sheet, and the aside it becomes on a large screen (Acct-Frames).
export * from "./ui/sheet";
export * from "./ui/sheet-header";

// A product's feature icon in the product's own echo color (Library 17, echo_feature).
export * from "./ui/echo-feature";

// The bar Oleum and Oeconomicis share: wordmark, places inline, search, the Javadaba menu; and its phone twin (Ole-Page, Oec-Page).
export * from "./ui/product-top-bar";
export type { TopBarTrail } from "./ui/top-bar-phone";
