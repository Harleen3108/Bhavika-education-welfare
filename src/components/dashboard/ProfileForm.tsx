"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import type { ProfileDTO } from "@/server/services/user.service";
import { AvatarUploader } from "@/components/dashboard/AvatarUploader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Field";

export function ProfileForm({ profile }: { profile: ProfileDTO }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
      phone: profile.phone,
      city: profile.city,
      bio: profile.bio,
    },
  });

  const onSubmit = async (values: ProfileInput) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.fields) {
          for (const [k, v] of Object.entries(json.fields)) {
            setError(k as keyof ProfileInput, { message: String(v) });
          }
        }
        toast.error(json.error || "Could not save your profile.");
        return;
      }
      if (json.awardedPoints > 0) {
        toast.success(`Profile complete! You earned ${json.awardedPoints} points 🎉`);
      } else {
        toast.success("Profile updated!");
      }
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <div className="space-y-7">
      {/* The photo saves itself the moment it uploads, so it sits outside the
          form — "Save changes" below governs the text fields only. */}
      <AvatarUploader value={profile.avatarUrl} name={profile.name} />

      <hr className="border-ink-100" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} />
          </FormField>
          <FormField label="City" htmlFor="city" error={errors.city?.message}>
            <Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} />
          </FormField>
        </div>

        <FormField label="Bio" htmlFor="bio" error={errors.bio?.message}>
          <Textarea id="bio" rows={4} placeholder="Tell us a little about yourself…" {...register("bio")} />
        </FormField>

        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
