import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user?.rol === "admin") redirect("/admin");
  if (user) redirect("/inicio");

  return (
    <div className="phone phone-top">
      <Link className="back" href="/">
        ← FaltaUno
      </Link>
      <h1>Ya tengo cuenta</h1>
      <ActionForm action={login} className="stack">
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required placeholder="tu@email.com" />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <SubmitButton>Entrar</SubmitButton>
      </ActionForm>
    </div>
  );
}
