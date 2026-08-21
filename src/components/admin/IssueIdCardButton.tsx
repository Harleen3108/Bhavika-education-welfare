"use client";

import * as React from "react";
import { IdCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IssueIdCardForm } from "@/components/admin/IssueIdCardForm";

/** Opens the admin ID-card issuing form with its own member picker. */
export function IssueIdCardButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <IdCard size={16} /> Issue ID card
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Issue an ID card to a member">
        <IssueIdCardForm onIssued={() => setOpen(false)} />
      </Modal>
    </>
  );
}
