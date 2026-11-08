/** The words of the shared toolbar: every control's name, in the design's wording. An app in another language passes its own. */
export interface ToolbarLabels {
  blockType: string;
  paragraph: string;
  heading1: string;
  heading2: string;
  heading3: string;
  heading4: string;
  heading5: string;
  heading6: string;
  font: string;
  fontDefault: string;
  fontSearch: string;
  fontEmpty: string;
  bold: string;
  italic: string;
  underline: string;
  strike: string;
  code: string;
  superscript: string;
  subscript: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  justify: string;
  bulletList: string;
  orderedList: string;
  taskList: string;
  blockquote: string;
  codeBlock: string;
  horizontalRule: string;
  pageBreak: string;
  highlight: string;
  clearFormatting: string;
  link: string;
  linkApply: string;
  linkCancel: string;
  image: string;
  undo: string;
  redo: string;
}

/**
 * The words of Lib-Rich text, in English. Fabula passes its own (its i18n keeps the dock's old wording
 * and its e2e suite reads them), so changing a default here moves every other editor, not Fabula.
 */
export const DEFAULT_TOOLBAR_LABELS: ToolbarLabels = {
  blockType: "Block type",
  paragraph: "Paragraph",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  heading4: "Heading 4",
  heading5: "Heading 5",
  heading6: "Heading 6",
  font: "Font",
  fontDefault: "Default font",
  fontSearch: "Search fonts",
  fontEmpty: "No font matches",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  code: "Inline code",
  superscript: "Superscript",
  subscript: "Subscript",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  justify: "Justify",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  taskList: "Checklist",
  blockquote: "Quote",
  codeBlock: "Code block",
  horizontalRule: "Divider",
  pageBreak: "Page break",
  highlight: "Highlight",
  clearFormatting: "Clear formatting",
  link: "Link",
  linkApply: "Apply link",
  linkCancel: "Cancel link",
  image: "Image",
  undo: "Undo",
  redo: "Redo",
};

/** The shortcut a control's name carries, the way Fabula always wrote it. */
