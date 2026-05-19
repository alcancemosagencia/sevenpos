"use client";

import { AppModal } from "@/components/shared/app-modal";

type PremiumModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
};

export function PremiumModal({ open, title, description, children, onClose, className }: PremiumModalProps) {
  return (
    <AppModal open={open} title={title} description={description} onClose={onClose} size="lg" className={className}>
      {children}
    </AppModal>
  );
}
