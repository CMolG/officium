"use client";

import { ICON_LIVE } from "../icons";
import { useTheater } from "../hooks/useTheater";

export interface TheaterChipsProps {
  productChip: boolean;
  liveBadge: boolean;
}

/** The chips on the desk above the window, on frosted glass: the product (left) and the live badge (right). */
export function TheaterChips({ productChip, liveBadge }: TheaterChipsProps) {
  const { product, labels } = useTheater();
  const showProduct = productChip && product != null;
  if (!showProduct && !liveBadge) return null;
  return (
    <div className="theater__top">
      {showProduct ? (
        <span className="theater__chip">
          {product.icon}
          <span>
            {product.name.toUpperCase()}
            <span>.</span>
          </span>
        </span>
      ) : (
        <span />
      )}
      {liveBadge ? (
        <span className="theater__chip">
          {ICON_LIVE}
          {labels.live}
        </span>
      ) : null}
    </div>
  );
}
