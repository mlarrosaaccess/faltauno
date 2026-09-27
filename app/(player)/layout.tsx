import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { TabBar } from "@/components/TabBar";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="phone">
      <div className="phone-body">{children}</div>
      <Suspense>
        <TabBar />
      </Suspense>
    </div>
  );
}
