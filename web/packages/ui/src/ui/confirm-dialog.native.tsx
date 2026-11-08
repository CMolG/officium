import { useId, useState } from "react";
import { View } from "react-native";

import { Button } from "./button.native";
import { promptBlank, useQuestions, type QuestionProps } from "./confirm-dialog.shared";
import { Dialog } from "./dialog.native";
import { DialogContent } from "./dialog-content.native";
import { DialogDescription } from "./dialog-description.native";
import { DialogFooter } from "./dialog-footer.native";
import { DialogHeader } from "./dialog-header.native";
import { DialogTitle } from "./dialog-title.native";
import { Input } from "./input.native";
import { Label } from "./label.native";

/*
 * `useConfirmDialog` on Android (JAVA-247, JAVA-1486): the same promises and options as the web's
 * (`confirm-dialog.shared.tsx` holds them), drawn on the Dialog twin. Back and the sheet's close
 * are the cancel answer, as on the web. There is no form to submit, so the accept button is the
 * submit.
 */

export type { AlertOptions, ConfirmOptions, PromptOptions } from "./confirm-dialog.shared";

export function useConfirmDialog() {
  return useQuestions(QuestionDialog);
}

function QuestionDialog({ pending, open }: QuestionProps) {
  const { kind, options, settle } = pending;
  const [value, setValue] = useState(kind === "prompt" ? (pending.options.defaultValue ?? "") : "");
  const labelId = useId();
  const blank = promptBlank(pending, value);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && settle(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          {options.description ? <DialogDescription>{options.description}</DialogDescription> : null}
        </DialogHeader>
        {kind === "prompt" && (
          <View className="flex flex-col gap-2">
            <Label id={labelId}>{pending.options.label}</Label>
            <Input
              aria-labelledby={labelId}
              value={value}
              placeholder={pending.options.placeholder}
              onChange={(event) => setValue(event.target.value)}
            />
          </View>
        )}
        <DialogFooter>
          {kind !== "alert" && (
            <Button register="ui" variant="ghost" onPress={() => settle(null)}>
              {options.cancelLabel}
            </Button>
          )}
          <Button
            register="ui"
            variant={kind !== "alert" && options.destructive ? "destructive" : "solid"}
            disabled={blank}
            onPress={() => settle(kind === "prompt" ? value.trim() : "")}
          >
            {options.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
