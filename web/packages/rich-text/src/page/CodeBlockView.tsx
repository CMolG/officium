"use client";

import { CodeBlock } from "@tiptap/extension-code-block";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

import { Select } from "@javadaba/ui";

import { MermaidDiagram } from "../MermaidDiagram";
import { CODE_LANGUAGES } from "./block-items";

/**
 * A code block in a page (JAVA-796): its language is picked from the page schema's list, `text`
 * first, and a Mermaid block shows the diagram under its source as it is written. A language the
 * list does not know (an agent wrote it) is kept and offered as it is, never rewritten.
 */
function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = String(node.attrs.language || "text");
  const known = (CODE_LANGUAGES as readonly string[]).includes(language);
  const options = [...CODE_LANGUAGES, ...(known ? [] : [language])].map((value) => ({ value, label: value }));
  return (
    <NodeViewWrapper className="jd-code-block flex flex-col gap-1">
      <div contentEditable={false} className="flex flex-row justify-end">
        <Select
          value={language}
          onChange={(value) => updateAttributes({ language: value })}
          options={options}
          aria-label="Code language"
          disabled={!editor.isEditable}
          menuWidth={160}
          className="h-8 w-32 text-xs pointer-coarse:h-11"
        />
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" className={`language-${language}`} />
      </pre>
      {language === "mermaid" && node.textContent.trim() && (
        <div contentEditable={false} aria-label="Diagram preview" role="group">
          <MermaidDiagram source={node.textContent} />
        </div>
      )}
    </NodeViewWrapper>
  );
}

/** StarterKit's code block with the view above: same name, same Markdown, so the schema is unchanged. */
export const PageCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
