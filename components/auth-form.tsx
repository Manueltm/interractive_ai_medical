import React, { FormEvent } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    action(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 px-4 sm:px-16"
    >
      <div className="flex flex-col gap-2">
        <Label
          className="font-normal text-zinc-600 dark:text-zinc-400"
          htmlFor="email"
        >
          Email Address
        </Label>

        <Input
          autoComplete="email"
          autoFocus
          className="bg-muted text-md md:text-sm"
          defaultValue={defaultEmail}
          id="email"
          name="email"
          placeholder="user@acme.com"
          required
          suppressHydrationWarning={true}
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          className="font-normal text-zinc-600 dark:text-zinc-400"
          htmlFor="password"
        >
          Password
        </Label>

        <Input
          className="bg-muted text-md md:text-sm"
          id="password"
          name="password"
          required
          suppressHydrationWarning={true}
          type="password"
        />
      </div>

      {children}
    </form>
  );
}