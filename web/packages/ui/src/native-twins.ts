/*
 * The library pieces that have no Android twin yet (Lib-Android, JAVA-1482): one row per piece, the
 * screens that wait for it, and whether it is only pending or web only by design. The Android
 * template's development gallery lists these (`/dev/twins`); the list is read from here when the
 * development build is made, so the screen has no loading or error state.
 *
 * Each `exports` name is a `notOnAndroid("...")` stub in `index.native.ts`. When a port card writes
 * the twin and swaps the stub, it deletes the row here: `native-twins.test.ts` fails on a row whose
 * names are no longer stubs, so the list cannot say "pending" about a piece that exists.
 */

export interface NativeTwin {
  piece: string;
  /** The names `index.native.ts` stubs for it. */
  exports: readonly string[];
  /** The screens that wait for the twin, in a few words. */
  neededBy: string;
  /** `web-only` is by design: nobody should build it. */
  status: "pending" | "web-only";
}

export const NATIVE_TWINS: readonly NativeTwin[] = [
  { piece: "Toasts", exports: ["toast", "ToastViewport"], neededBy: "Every app", status: "pending" },
  { piece: "Accent surface", exports: ["AccentSurface"], neededBy: "Product pages in the app", status: "pending" },
  { piece: "Account dialog", exports: ["AccountDialog"], neededBy: "The account sheet's full view", status: "pending" },
  {
    piece: "Sidebar fold",
    exports: ["SidebarCollapseToggle", "useSidebarCollapsed", "useYieldSidebar", "SidebarRail", "SidebarBack"],
    neededBy: "Officium and Fabula on tablets",
    status: "pending",
  },
  {
    piece: "Product bar, menu and footer",
    exports: [
      "ProductNavBar", "ProductFooter", "JavadabaMenu", "JavadabaMenuContent", "SubNav", "BarSearch", "MenuGuest",
      "MenuItem", "SectionNav", "SectionHead", "ProductSeal", "SocialGlyph", "JAVADABA_APPS", "useVisibleApps", "visibleApps", "JAVADABA_LINKS",
      "JAVADABA_MENU_LINKS", "JAVADABA_SOCIAL", "DiamondMark", "DiamondButton",
    ],
    neededBy: "Every product page in the app; the template draws its own bar meanwhile",
    status: "pending",
  },
  { piece: "Context menu", exports: ["ContextMenu", "ContextMenuGroup", "ContextMenuItem", "ContextMenuLabel", "ContextMenuRadioGroup", "ContextMenuRadioItem", "ContextMenuSeparator", "ContextMenuSub", "ContextMenuSubContent", "ContextMenuSubTrigger", "ContextMenuCheckboxItem", "LONG_PRESS_MS", "useContextMenuTrigger"], neededBy: "Officium: long press on a card", status: "pending" },
  { piece: "Fields and controls", exports: ["Checkbox", "Radio", "Slider", "PasswordInput", "FieldError", "FieldHelp", "IconButton", "Spinner"], neededBy: "Forms in Quaestio and Tributa", status: "pending" },
  { piece: "Display", exports: ["Avatar", "initialsOf", "Coin", "Glyph", "Note", "EmptyState", "InlineLink", "ListRow", "Table", "NavItem", "NavGroupLabel", "ProgressSteps"], neededBy: "Lists and state screens in every app", status: "pending" },
  { piece: "Floating tray", exports: ["FloatingTray"], neededBy: "Officium: agent work", status: "pending" },
  { piece: "Font picker", exports: ["FontPicker", "fontGroupOf", "fontLabelOf"], neededBy: "Quaestio and Fabula design panels", status: "pending" },
  { piece: "Timeline", exports: ["Filmstrip"], neededBy: "Theatrum: shoot and cut", status: "pending" },
  { piece: "Undo notice", exports: ["UndoNotice", "useUndoNotice"], neededBy: "Every list with a delete", status: "pending" },
  { piece: "Doodle art and divider", exports: ["DoodleArt", "DoodleDivider"], neededBy: "State screens", status: "pending" },
  { piece: "Surface", exports: ["Surface", "accentInk"], neededBy: "Products with their own surface; the template publishes tokens with vars()", status: "pending" },
  { piece: "Command menu and shortcuts", exports: ["CommandMenu", "ShortcutKeys", "ShortcutsSheet"], neededBy: "None: a phone has no keyboard shortcuts", status: "web-only" },
  {
    piece: "Theater",
    exports: ["Theater", "TheaterAmbient", "deferUntilNear", "DEFAULT_LABELS", "THEATER_LABELS_EN", "lazyRegistry", "theaterTarget", "useTheater", "useTheaterScene"],
    neededBy: "None: web only",
    status: "web-only",
  },
];
