export const CREDENTIALS_SKIP_REASON =
  "Set E2E_DASHBOARD_EMAIL and E2E_DASHBOARD_PASSWORD in e2e/.env.e2e.local";

export function getDashboardCredentials(): {
  email: string;
  password: string;
} | null {
  const email = process.env.E2E_DASHBOARD_EMAIL;
  const password = process.env.E2E_DASHBOARD_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function requireDashboardCredentials(): {
  email: string;
  password: string;
} {
  const creds = getDashboardCredentials();
  if (!creds) {
    throw new Error(
      "E2E_DASHBOARD_EMAIL and E2E_DASHBOARD_PASSWORD are required",
    );
  }
  return creds;
}
