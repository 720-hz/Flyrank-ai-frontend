import type { ReactNode } from "react";
import { AccountNav } from "./account-nav";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AccountNav />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
