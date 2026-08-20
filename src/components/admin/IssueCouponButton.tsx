"use client";

import * as React from "react";
import { TicketPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IssueCouponForm } from "@/components/admin/IssueCouponForm";

/** Opens the admin coupon-issuing form with its own member picker. */
export function IssueCouponButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <TicketPlus size={16} /> Issue coupon
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Issue a coupon to a member">
        <IssueCouponForm onIssued={() => setOpen(false)} />
      </Modal>
    </>
  );
}
