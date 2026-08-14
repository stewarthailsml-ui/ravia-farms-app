"use client";

import { InputHTMLAttributes, useState } from "react";

// Password field with a show/hide toggle. Typing a password blind is the most
// common cause of a "my password isn't working" report, so every password entry
// in the app (sign-in, invite set-password) uses this rather than a bare
// <input type="password">.
type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // pr-12 keeps the typed value from running underneath the toggle button.
        className={`w-full p-3 pr-12 bg-[#1a1a1a] border border-hairline rounded-lg text-white outline-none transition-colors focus:border-primary ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // tabIndex -1 keeps Tab going straight from the field to the submit
        // button, so the toggle never sits in the middle of the sign-in flow.
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-muted hover:text-white transition-colors"
      >
        <i className={visible ? "fas fa-eye-slash" : "fas fa-eye"} />
      </button>
    </div>
  );
}
