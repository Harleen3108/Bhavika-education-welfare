"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Field";

export function ContactForm() {
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "", website: "" },
  });

  const onSubmit = async (values: ContactInput) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Could not send your message. Please try again.");
        return;
      }
      setSent(true);
      reset();
      toast.success("Message sent!");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-green-200 bg-green-50 px-6 py-12 text-center">
        <CheckCircle2 className="text-success" size={48} />
        <h3 className="mt-4 text-xl font-semibold text-ink-900">Thank you!</h3>
        <p className="mt-2 max-w-sm text-ink-600">
          Your message has been received. Our team will get back to you soon.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Honeypot (hidden from users, visible to bots) */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        {...register("website")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} />
        </FormField>
        <FormField label="Subject (optional)" htmlFor="subject" error={errors.subject?.message}>
          <Input id="subject" aria-invalid={!!errors.subject} {...register("subject")} />
        </FormField>
      </div>

      <FormField label="Message" htmlFor="message" required error={errors.message?.message}>
        <Textarea id="message" rows={5} aria-invalid={!!errors.message} {...register("message")} />
      </FormField>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
        {!isSubmitting && <Send size={18} />} Send message
      </Button>
    </form>
  );
}
