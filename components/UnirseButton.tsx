"use client";

import { unirse } from "@/app/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function UnirseButton({ partidoId, full = false }: { partidoId: number; full?: boolean }) {
  return (
    <ActionForm action={unirse} className={full ? "stack" : undefined}>
      <input type="hidden" name="partidoId" value={partidoId} />
      <SubmitButton className={full ? "btn btn-primary" : "btn btn-small"}>Sumarme</SubmitButton>
    </ActionForm>
  );
}
