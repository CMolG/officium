import { Text } from "@javadaba/ui";

/**
 * Android twin of `CardFormFrame`. The web embeds Quaestio's fill page in an iframe; there is no
 * WebView seam yet, so for now it says where the form is answered. Replace it with a WebView of the
 * same `fillPath` when the Officium Android port reaches the card panel.
 */
export function CardFormFrame({ fillPath }: { fillPath: string; title: string; onCompleted: () => void; fill?: boolean }) {
  return <Text className="text-sm">Answer this form in your browser at {fillPath}.</Text>;
}
