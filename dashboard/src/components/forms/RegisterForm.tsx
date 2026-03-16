import { useState } from "react";
import { TextField } from "../ui/TextField";
import { Button } from "../ui/Button";

export interface RegisterFormData {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  timezone?: string;
}

interface RegisterFormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void;
  isLoading?: boolean;
  error?: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(
  displayName: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  if (!displayName.trim()) {
    errors.displayName = "Full name is required";
  } else if (displayName.trim().length < 2) {
    errors.displayName = "Name must be at least 2 characters";
  }
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
  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords don't match";
  }
  return errors;
}

export function RegisterForm({
  onSubmit,
  isLoading = false,
  error,
}: RegisterFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const fieldErrors = validate(displayName, email, password, confirmPassword);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit({
      displayName,
      email,
      password,
      confirmPassword,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  function handleReset(): void {
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <TextField
        label="Full name"
        type="text"
        placeholder="Alex Johnson"
        value={displayName}
        onChange={(v) => { setDisplayName(v); setErrors((prev) => ({ ...prev, displayName: undefined })); }}
        onClear={() => { setDisplayName(""); setErrors((prev) => ({ ...prev, displayName: undefined })); }}
        autoComplete="name"
        required
        error={errors.displayName}
      />
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
        placeholder="Min. 8 characters"
        value={password}
        onChange={(v) => { setPassword(v); setErrors((prev) => ({ ...prev, password: undefined })); }}
        onClear={() => { setPassword(""); setErrors((prev) => ({ ...prev, password: undefined })); }}
        autoComplete="new-password"
        required
        error={errors.password}
      />
      <TextField
        label="Confirm password"
        type="password"
        placeholder="Re-enter password"
        value={confirmPassword}
        onChange={(v) => { setConfirmPassword(v); setErrors((prev) => ({ ...prev, confirmPassword: undefined })); }}
        onClear={() => { setConfirmPassword(""); setErrors((prev) => ({ ...prev, confirmPassword: undefined })); }}
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
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
          Create account
        </Button>
      </div>
    </form>
  );
}
