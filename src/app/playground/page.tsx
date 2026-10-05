"use client";

import { useState } from "react";
import { Modal } from "../../../playground/modal";
import { Tabs } from "../../../playground/tabs";
import { Disclosure } from "../../../playground/disclosure";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs as ShadcnTabs,
  TabsContent as ShadcnTabsContent,
  TabsList as ShadcnTabsList,
  TabsTrigger as ShadcnTabsTrigger,
} from "@/components/ui/tabs";

const TAB_ITEMS = [
  { id: "profile", label: "Profile", content: <p>Profile panel content.</p> },
  { id: "billing", label: "Billing", content: <p>Billing panel content.</p> },
  { id: "security", label: "Security", content: <p>Security panel content.</p> },
];

/**
 * Live demo page for the three hand-built playground/ components, used for manual and
 * Playwright keyboard-only verification. Not part of the product's nav — reached directly
 * at /playground.
 */
export default function PlaygroundPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-10">
      <h1 className="text-xl font-semibold text-text">Accessible components playground</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text/70">Modal dialog</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-fit rounded bg-main px-4 py-2 text-sm font-medium text-background"
        >
          Open modal
        </button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example modal">
          <p className="mb-4 text-sm text-text/80">
            Focus is trapped inside this dialog. Press Tab/Shift+Tab to cycle, Escape to close.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded border border-main/20 px-3 py-1.5 text-sm text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded bg-main px-3 py-1.5 text-sm text-background"
            >
              Confirm
            </button>
          </div>
        </Modal>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text/70">Tabs</h2>
        <Tabs items={TAB_ITEMS} label="Example tabs" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text/70">Disclosure</h2>
        <Disclosure summary="What does this component do?">
          <p>It shows and hides this panel, with aria-expanded kept in sync on the button.</p>
        </Disclosure>
      </section>

      <hr className="border-main/10" />

      <h1 className="text-xl font-semibold text-text">
        shadcn/ui equivalents (for comparison — see NOTES.md)
      </h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text/70">shadcn Dialog</h2>
        <Dialog>
          <DialogTrigger className="w-fit rounded bg-main px-4 py-2 text-sm font-medium text-background">
            Open shadcn dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>shadcn dialog</DialogTitle>
              <DialogDescription>
                Same Escape-to-close and focus-trap behavior, implemented by Radix.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogTrigger className="rounded border border-main/20 px-3 py-1.5 text-sm text-text">
                Close
              </DialogTrigger>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text/70">shadcn Tabs</h2>
        <ShadcnTabs defaultValue="profile">
          <ShadcnTabsList>
            <ShadcnTabsTrigger value="profile">Profile</ShadcnTabsTrigger>
            <ShadcnTabsTrigger value="billing">Billing</ShadcnTabsTrigger>
            <ShadcnTabsTrigger value="security">Security</ShadcnTabsTrigger>
          </ShadcnTabsList>
          <ShadcnTabsContent value="profile">Profile panel content.</ShadcnTabsContent>
          <ShadcnTabsContent value="billing">Billing panel content.</ShadcnTabsContent>
          <ShadcnTabsContent value="security">Security panel content.</ShadcnTabsContent>
        </ShadcnTabs>
      </section>
    </main>
  );
}
