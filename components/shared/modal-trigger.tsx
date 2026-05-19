"use client";

import { useState } from "react";
import { AppModal } from "@/components/shared/app-modal";

type ModalTriggerProps = {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

export function ModalTrigger({ trigger, title, description, children, size = "lg" }: ModalTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>
      <AppModal open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        {children}
      </AppModal>
    </>
  );
}
