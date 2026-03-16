import { useState } from "react";
import { TextField } from "../ui/TextField";
import { Button } from "../ui/Button";

export interface LoginFormData {
  email: string;
  password: string;
  timezone?: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
}

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  isLoading?: boolean;
  error?: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string): LoginFormErrors {
  const errors: LoginFormErrors = {};
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email address";
  }
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }
  return errors;
}

export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginFormErrors>({});

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const fieldErrors = validate(email, password);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit({
      email,
      password,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  function handleReset(): void {
    setEmail("");
    setPassword("");
    setErrors({});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <TextField
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(v) => { setEmail(v); setErrors((prev) => ({ ...prev, email: undefined })); }}
        onClear={() => { setEmail(""); setErrors((prev) => ({ ...prev, email: undefined })); }}
        autoComplete="email"
        required
        error={errors.email}
      />
      <TextField
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(v) => { setPassword(v); setErrors((prev) => ({ ...prev, password: undefined })); }}
        onClear={() => { setPassword(""); setErrors((prev) => ({ ...prev, password: undefined })); }}
        autoComplete="current-password"
        required
        error={errors.password}
      />
      <div className="flex items-center gap-3 mt-6">
        <Button
          variant="ghost"
          type="button"
          onClick={handleReset}
          className="flex-1 text-[#94A3B8]"
        >
          Reset
        </Button>
        <Button variant="primary" size="md" type="submit" isLoading={isLoading} className="flex-1">
          Log in
        </Button>
      </div>
    </form>
  );
}
