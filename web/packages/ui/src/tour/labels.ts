import type { TourLabels } from "./types";

/** The tour's words in English. */
export const TOUR_LABELS_EN: TourLabels = {
  stepOf: (step, total) => `${step} of ${total}`,
  dialogName: (name, step, total) => `${name}, step ${step} of ${total}`,
  end: "End the tour",
  back: "Back",
  next: "Next",
  done: "Done",
  tryIt: "Try it:",
  highlighted: "Highlighted:",
  farewell: "That's the tour. Replay it from Help whenever you like.",
  closeFarewell: "Close",
  replay: "Replay the tour",
};

/**
 * The tour's words in Spanish, for Tributa: every word follows the product. Spanish by decision
 * (Tributa is a Spain-only product), so each line carries the marker the language hook reads.
 */
export const TOUR_LABELS_ES: TourLabels = {
  stepOf: (step, total) => `${step} de ${total}`, // lang:es
  dialogName: (name, step, total) => `${name}, paso ${step} de ${total}`, // lang:es
  end: "Terminar el recorrido", // lang:es
  back: "Atrás", // lang:es
  next: "Siguiente", // lang:es
  done: "Listo", // lang:es
  tryIt: "Pruébalo:", // lang:es
  highlighted: "Resaltado:", // lang:es
  farewell: "Eso es todo. Repite el recorrido desde ¿Dudas? cuando quieras.", // lang:es
  closeFarewell: "Cerrar", // lang:es
  replay: "Repetir el recorrido", // lang:es
};
