/*
 * @javadaba/ui on Android (JAVA-100, ADR 0015). Metro reaches this file through the `react-native`
 * condition on the package's `.` export; the web's `index.ts` re-exports every web piece, Radix and
 * `react-dom` included, so an Android screen importing from it would bundle the whole web system.
 *
 * It exports EVERY name `index.ts` does (`scripts/test/ui-native-barrel.test.mjs` holds the two to
 * the same list). A piece with a `.native` twin exports the twin; a piece without one is a stub that
 * throws, naming the piece, when it is rendered or called. The first port card that reaches a piece
 * writes its twin and swaps the stub below for the twin's export.
 */

import { notOnAndroid } from "./not-on-android";

// Pieces with an Android twin: the same names and props as the web halves (`*.shared.ts`).
export { Badge } from "./ui/badge.native";
export { Button, buttonVariants } from "./ui/button.native";
export { useConfirmDialog } from "./ui/confirm-dialog.native";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog.native";
export { Input } from "./ui/input.native";
export { Label } from "./ui/label.native";
export { Panel } from "./ui/panel.native";
export { Presence, type PresenceKind } from "./ui/presence.native";
export {
  Popover,
  PopoverAnchor,
  PopoverBody,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover.native";
export { Progress } from "./ui/progress.native";
export { Skeleton } from "./ui/skeleton.native";
export { LoadingRegion } from "./ui/loading-region.native";
export { ScrollArea, ScrollBar } from "./ui/scroll-area.native";
export { Select } from "./ui/select.native";
export { Separator } from "./ui/separator.native";
export { Switch } from "./ui/switch.native";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.native";
export { Text, textClasses } from "./ui/text.native";
export { Textarea } from "./ui/textarea.native";
export { Toggle, toggleVariants } from "./ui/toggle.native";
export { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group.native";
export { withViewTransition } from "./lib/view-transition.native";

// Pure functions with nothing to port.
export { cn } from "./lib/cn";
export { faceLuminance, inkOn } from "./lib/luminance";
export { formatTimecode } from "./ui/filmstrip.shared";
export { TYPE_SCALE, typeClass } from "./lib/type-scale";

// Stubs, by the web module that owns the name.
// surface.tsx
export const Surface = notOnAndroid("Surface");
export const accentInk = notOnAndroid("accentInk");

// ui/menu-unread.ts (a plain store: the diamond's count, JAVA-1621)
export { setMenuUnread, useMenuUnread } from "./ui/menu-unread";

// ui/toast.ts
export const toast = notOnAndroid("toast");

// ui/toast-viewport.tsx
export const ToastViewport = notOnAndroid("ToastViewport");

// theater/Theater.tsx
export const Theater = notOnAndroid("Theater");

// theater/defer-until-near.tsx
export const deferUntilNear = notOnAndroid("deferUntilNear");

// theater/constants.ts
export const DEFAULT_LABELS = notOnAndroid("DEFAULT_LABELS");
export const THEATER_LABELS_EN = notOnAndroid("THEATER_LABELS_EN");
export const lazyRegistry = notOnAndroid("lazyRegistry");
export const theaterTarget = notOnAndroid("theaterTarget");
export const ACCENT_DESK = notOnAndroid("ACCENT_DESK");

// theater/hooks/useTheater.ts
export const useTheater = notOnAndroid("useTheater");
export const useTheaterScene = notOnAndroid("useTheaterScene");

// ui/accent-surface.tsx
export const AccentSurface = notOnAndroid("AccentSurface");

// ui/account-dialog.tsx
export const AccountDialog = notOnAndroid("AccountDialog");

// ui/collapsible-sidebar.tsx
export const SidebarCollapseToggle = notOnAndroid("SidebarCollapseToggle");
export const useSidebarCollapsed = notOnAndroid("useSidebarCollapsed");
export const useYieldSidebar = notOnAndroid("useYieldSidebar");

// ui/command-menu.tsx
export const CommandMenu = notOnAndroid("CommandMenu");

// ui/context-menu-checkbox-item.tsx
export const ContextMenuCheckboxItem = notOnAndroid("ContextMenuCheckboxItem");

// ui/context-menu.tsx
export const ContextMenu = notOnAndroid("ContextMenu");
export const ContextMenuGroup = notOnAndroid("ContextMenuGroup");
export const ContextMenuItem = notOnAndroid("ContextMenuItem");
export const ContextMenuLabel = notOnAndroid("ContextMenuLabel");
export const ContextMenuRadioGroup = notOnAndroid("ContextMenuRadioGroup");
export const ContextMenuRadioItem = notOnAndroid("ContextMenuRadioItem");
export const ContextMenuSeparator = notOnAndroid("ContextMenuSeparator");
export const ContextMenuSub = notOnAndroid("ContextMenuSub");
export const ContextMenuSubContent = notOnAndroid("ContextMenuSubContent");
export const ContextMenuSubTrigger = notOnAndroid("ContextMenuSubTrigger");
export const LONG_PRESS_MS = notOnAndroid("LONG_PRESS_MS");
export const useContextMenuTrigger = notOnAndroid("useContextMenuTrigger");

// ui/filmstrip.tsx
export const Filmstrip = notOnAndroid("Filmstrip");

// ui/floating-tray.tsx
export const FloatingTray = notOnAndroid("FloatingTray");

// ui/font-picker.tsx
export const FontPicker = notOnAndroid("FontPicker");
export const fontGroupOf = notOnAndroid("fontGroupOf");
export const fontLabelOf = notOnAndroid("fontLabelOf");

// ui/product-nav-bar.tsx, product-footer.tsx, javadaba-links.ts, javadaba-menu*.tsx, social-glyph.tsx
export const JAVADABA_APPS = notOnAndroid("JAVADABA_APPS");
/** The session hook tells the launcher who is signed in; Android draws no launcher, so there is nothing to tell. */
export const setLauncherViewer = (_viewer: string): void => {};
export const useVisibleApps = notOnAndroid("useVisibleApps");
export const visibleApps = notOnAndroid("visibleApps");
export const JAVADABA_LINKS = notOnAndroid("JAVADABA_LINKS");
export const JAVADABA_MENU_LINKS = notOnAndroid("JAVADABA_MENU_LINKS");
export const JAVADABA_SOCIAL = notOnAndroid("JAVADABA_SOCIAL");
export const JavadabaMenu = notOnAndroid("JavadabaMenu");
export const JavadabaMenuContent = notOnAndroid("JavadabaMenuContent");
export const ProductFooter = notOnAndroid("ProductFooter");
export const ProductNavBar = notOnAndroid("ProductNavBar");
export const SocialGlyph = notOnAndroid("SocialGlyph");

// ui/avatar.tsx
export const Avatar = notOnAndroid("Avatar");
export const initialsOf = notOnAndroid("initialsOf");

// ui/checkbox.tsx
export const Checkbox = notOnAndroid("Checkbox");

// ui/coin.tsx
export const Coin = notOnAndroid("Coin");

// ui/diamond-button.tsx
export const DiamondButton = notOnAndroid("DiamondButton");

// ui/diamond-mark.tsx
export const DiamondMark = notOnAndroid("DiamondMark");

// ui/empty-state.tsx
export const EmptyState = notOnAndroid("EmptyState");

// ui/field-error.tsx
export const FieldError = notOnAndroid("FieldError");

// ui/field-help.tsx
export const FieldHelp = notOnAndroid("FieldHelp");

// ui/glyph.tsx
export const Glyph = notOnAndroid("Glyph");

// ui/icon-button.tsx
export const IconButton = notOnAndroid("IconButton");

// ui/inline-link.tsx
export const InlineLink = notOnAndroid("InlineLink");

// ui/list-row.tsx
export const ListRow = notOnAndroid("ListRow");

// ui/nav-group-label.tsx
export const NavGroupLabel = notOnAndroid("NavGroupLabel");

// ui/nav-item.tsx
export const NavItem = notOnAndroid("NavItem");

// ui/note.tsx
export const Note = notOnAndroid("Note");

// ui/password-input.tsx
export const PasswordInput = notOnAndroid("PasswordInput");

// ui/progress-steps.tsx
export const ProgressSteps = notOnAndroid("ProgressSteps");

// ui/radio.tsx
export const Radio = notOnAndroid("Radio");

// ui/section-head.tsx
export const SectionHead = notOnAndroid("SectionHead");

// ui/section-nav.tsx
export const SectionNav = notOnAndroid("SectionNav");

// ui/shortcut-keys.tsx
export const ShortcutKeys = notOnAndroid("ShortcutKeys");

// ui/shortcuts-sheet.tsx
export const ShortcutsSheet = notOnAndroid("ShortcutsSheet");

// ui/slider.tsx
export const Slider = notOnAndroid("Slider");

// ui/spinner.tsx
export const Spinner = notOnAndroid("Spinner");

// ui/table.tsx
export const Table = notOnAndroid("Table");

// ui/theater.tsx
export const TheaterAmbient = notOnAndroid("TheaterAmbient");

// ui/undo-notice.tsx
export const UndoNotice = notOnAndroid("UndoNotice");

// ui/use-undo-notice.ts
export const useUndoNotice = notOnAndroid("useUndoNotice");

// Quiet Bento overlays, feedback and shared pieces (Lib-Pieces, Lib-Overlays, Lib-Feedback). The pure
// functions and data are real exports; the pieces are stubs until a port card writes their twin.
export { limitPlaces, MAX_NOT_FOUND_PLACES, notFoundPayload } from "./ui/not-found.shared";
export { breadcrumbJsonLd } from "./ui/breadcrumb.shared";
export { pageRange, pageSlots } from "./ui/pagination.shared";
export { PHONE_COUNTRIES } from "./ui/phone-countries";

// ui/accordion.tsx
export const Accordion = notOnAndroid("Accordion");

// ui/accordion-item.tsx
export const AccordionItem = notOnAndroid("AccordionItem");

// ui/address-input.tsx
export const AddressInput = notOnAndroid("AddressInput");

// ui/alert.tsx
export const Alert = notOnAndroid("Alert");

// ui/avatar-group.tsx
export const AvatarGroup = notOnAndroid("AvatarGroup");

// ui/breadcrumb.tsx
export const Breadcrumb = notOnAndroid("Breadcrumb");

// ui/card.tsx
export const Card = notOnAndroid("Card");

// ui/command-menu-empty.tsx
export const CommandMenuEmpty = notOnAndroid("CommandMenuEmpty");

// ui/dialog-close-button.tsx
export const DialogCloseButton = notOnAndroid("DialogCloseButton");

// ui/error-state.tsx
export const ErrorState = notOnAndroid("ErrorState");

// ui/link-card.tsx
export const LinkCard = notOnAndroid("LinkCard");

// ui/load-more.tsx
export const LoadMore = notOnAndroid("LoadMore");

// ui/not-found.tsx
export const NotFound = notOnAndroid("NotFound");

// ui/number-input.tsx
export const NumberInput = notOnAndroid("NumberInput");

// ui/offline-state.tsx
export const OfflineState = notOnAndroid("OfflineState");

// ui/pagination.tsx
export const Pagination = notOnAndroid("Pagination");

// ui/phone-input.tsx
export const PhoneInput = notOnAndroid("PhoneInput");

// ui/search-input.tsx
export const SearchInput = notOnAndroid("SearchInput");

// ui/selection-bar.tsx
export const SelectionBar = notOnAndroid("SelectionBar");

// ui/sort-head.tsx
export const SortHead = notOnAndroid("SortHead");

// ui/tooltip.tsx
export const TOOLTIP_DELAY_MS = notOnAndroid("TOOLTIP_DELAY_MS");
export const Tooltip = notOnAndroid("Tooltip");

// ui/product-seal.tsx
export const ProductSeal = notOnAndroid("ProductSeal");

// ui/sub-nav.tsx
export const SubNav = notOnAndroid("SubNav");

// ui/bar-search.tsx
export const BarSearch = notOnAndroid("BarSearch");

// ui/menu-guest.tsx
export const MenuGuest = notOnAndroid("MenuGuest");

// ui/menu-item.tsx
export const MenuItem = notOnAndroid("MenuItem");

// ui/sidebar-rail.tsx
export const SidebarRail = notOnAndroid("SidebarRail");

// ui/sidebar-back.tsx
export const SidebarBack = notOnAndroid("SidebarBack");

// ui/doodle-divider.tsx
export const DoodleDivider = notOnAndroid("DoodleDivider");

// ui/doodle-art.tsx
export const DoodleArt = notOnAndroid("DoodleArt");

// ui/save-status.tsx
export const SaveStatus = notOnAndroid("SaveStatus");
export const SAVE_STATUS_LABELS_EN = notOnAndroid("SAVE_STATUS_LABELS_EN");
// ui/echo-icon.tsx
export const EchoIcon = notOnAndroid("EchoIcon");

// ui/echo-shape.tsx
export const EchoShape = notOnAndroid("EchoShape");

// ui/sheet.tsx
export const Sheet = notOnAndroid("Sheet");
export const SheetTrigger = notOnAndroid("SheetTrigger");
export const SheetClose = notOnAndroid("SheetClose");
export const SheetContent = notOnAndroid("SheetContent");
export const SheetTitle = notOnAndroid("SheetTitle");
export const SheetDescription = notOnAndroid("SheetDescription");

// ui/sheet-header.tsx
export const SheetHeader = notOnAndroid("SheetHeader");

// ui/echo-feature.tsx
export const EchoFeature = notOnAndroid("EchoFeature");

// ui/product-top-bar.tsx
export const ProductTopBar = notOnAndroid("ProductTopBar");
