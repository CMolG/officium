/** What the picker shows and reports: `value` is the draft icon ("" for none), a Lucide id or one emoji. */
export interface PickerProps {
  value: string;
  onPick: (icon: string) => void;
}

/** One cell of a grid: the glyph is drawn, the label is its accessible name. */
export interface GridOption {
  id: string;
  label: string;
  glyph: React.ReactNode;
}
