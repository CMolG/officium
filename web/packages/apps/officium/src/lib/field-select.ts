/**
 * `@javadaba/ui`'s `Select` sized as a FORM field (JAVA-59): full width, like the `Input` beside it,
 * and 44px tall on a phone (layout floor L3) -- in a toolbar it stays the compact pill it is by
 * default. The chevron at the far end comes from `Select` itself (JAVA-1772). Placement in the
 * parent, which is what `className` on a primitive is for, written once so every form in Officium
 * stacks the same way.
 */
export const FIELD_SELECT = "min-h-11 w-full sm:min-h-9";
