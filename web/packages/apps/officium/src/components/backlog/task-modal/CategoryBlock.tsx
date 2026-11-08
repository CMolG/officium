"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { Select } from "@javadaba/ui";

import type { CardDetail, Category, SpikeSubtype } from "../../../lib/backlog/types";
import { CATEGORY_CONFIG, NO_CATEGORY, categoryOptions } from "../../../lib/backlog/category-config";
import { SPIKE_SUBTYPE_CONFIG, SPIKE_SUBTYPE_ORDER } from "../../../lib/backlog/role-config";
import { CategoryInfoButton } from "../CategoryInfoDialog";

export interface CategoryBlockProps {
  detail: CardDetail;
  changeCategory: (next: Category | null) => Promise<void>;
  changeSubtype: (next: SpikeSubtype) => Promise<void>;
}

/** The category picker, its hint and, for a spike, its subtype. */
export function CategoryBlock({ detail, changeCategory, changeSubtype }: CategoryBlockProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Category</h3>
      <div className="flex flex-row items-center gap-2">
        <Select
          aria-label="Category"
          value={detail.category}
          placeholder="No category"
          onChange={(v) => void changeCategory(v === NO_CATEGORY ? null : (v as Category))}
          options={[{ value: NO_CATEGORY, label: "No category" }, ...categoryOptions()]}
          menuWidth={220}
          className="min-w-0 flex-1"
        />
        {/* JAVA-518: the category's contract and its sheet, one press away. */}
        {detail.category && <CategoryInfoButton category={detail.category} />}
      </div>
      {/* JAVA-520: the hint alone; the contract is behind the info button and on the sheet. */}
      {detail.category && (
        <p data-testid="category-hint" className="mt-1.5 text-xs text-[color:var(--jd-muted)]">
          {CATEGORY_CONFIG[detail.category].hint}
        </p>
      )}
      {/* JAVA-391: a spike says which of its two kinds it is, and that picks its roles. */}
      {detail.category === "spike" && (
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Subtype</span>
          <Select
            aria-label="Subtype"
            value={detail.subtype ?? "technical"}
            onChange={(v) => void changeSubtype(v as SpikeSubtype)}
            options={SPIKE_SUBTYPE_ORDER.map((s) => ({ value: s, label: SPIKE_SUBTYPE_CONFIG[s].label, description: SPIKE_SUBTYPE_CONFIG[s].hint }))}
            menuWidth={260}
          />
        </label>
      )}
    </div>
  );
}
