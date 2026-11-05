"use client";

import { Save, Send } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../../playground/modal";
import { Tabs } from "../../../playground/tabs";
import { Disclosure } from "../../../playground/disclosure";
import {
  LifecycleButton,
  fakeAsyncAction,
  usePrefersReducedMotionLabel,
} from "../../../playground/lifecycle-button";
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
  const reducedMotionLabel = usePrefersReducedMotionLabel();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-10">
      <h1 className="text-xl font-semibold text-text">Accessible components playground</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text/70">
          Buttons with a brain (animated lifecycle button)
        </h2>
        <p className="text-sm text-text/70">
          Click either button: each runs a fake async call with a random 500–1500ms delay and
          a 20% failure rate, so you&rsquo;ll see both the success and error paths across a few
          tries. A failed button becomes &ldquo;Retry&rdquo; — clicking it runs the same call
          again. Your system&rsquo;s &ldquo;Reduce motion&rdquo; setting is currently{" "}
          <strong>{reducedMotionLabel}</strong>.
        </p>
        <div className="flex flex-wrap gap-3">
          <LifecycleButton idleLabel="Send message" icon={Send} onPress={fakeAsyncAction} />
          <LifecycleButton
            idleLabel="Save changes"
            loadingLabel="Saving…"
            successLabel="Saved"
            icon={Save}
            onPress={fakeAsyncAction}
          />
        </div>
        <p className="text-xs text-text/60">
          Durations and easing, briefly: hover/press feedback is 150ms ease-out (fast enough to
          feel immediate, slow enough to register as intentional rather than a flicker).
          State-layer crossfades (label/icon swap) are 200ms ease-out — long enough to read as
          a transition, short enough not to make a chat button feel sluggish. The error shake
          and success &ldquo;pop&rdquo; are one-shot 300–400ms keyframes on{" "}
          <code>transform</code> only (translateX / scale), never on layout-affecting
          properties, so they stay off the main thread. The button has a fixed min-width
          instead of animating its width to fit each label — deliberate: the brief&rsquo;s own
          requirements rule out layout-affecting animation, which a width tween is by
          definition, even though the brief&rsquo;s example copy suggests it. All of the above
          collapses to nearly-instant under <code>prefers-reduced-motion</code> via the
          site-wide rule in <code>globals.css</code> — the feedback (label, icon, color) still
          changes, just without the motion. Full writeup in{" "}
          <code>playground/NOTES.md</code>.
        </p>
      </section>

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
