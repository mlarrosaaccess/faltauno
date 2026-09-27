"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {state?.error && <p className="msg msg-error">{state.error}</p>}
      {state?.ok && <p className="msg msg-ok">{state.ok}</p>}
      {children}
    </form>
  );
}
