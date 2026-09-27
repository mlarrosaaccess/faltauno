import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { clearSession, readSessionUserId } from "./session";

export async function getSessionUser() {
  const id = await readSessionUserId();
  if (!id) return null;
  return prisma.usuario.findUnique({
    where: { id },
    include: { zonaHabitual: true },
  });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user || user.suspendido) {
    if (user?.suspendido) await clearSession();
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== "admin") redirect("/inicio");
  return user;
}
