
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "scheme_ai_token";

export type User = {
  id: string;
  name: string;
  email: string;
};

// An error that remembers the HTTP status (401 = not logged in, etc.)
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// --- Saved login (token) -------------------------------------------------

// "Remember me" ticked  -> saved in localStorage (still logged in after the
//                          browser is closed and opened again).
// "Remember me" unticked -> saved in sessionStorage (logged out when the
//                          browser tab or window is closed).
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string, remember: boolean) {
  clearToken(); // never leave a copy in the other place
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked (private mode): the login just won't be remembered.
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing to clear
  }
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing to clear
  }
}

// --- Requests ------------------------------------------------------------

// Turns the backend's error body into one readable sentence.
// The backend sends either { detail: "text" } or, for form validation
// problems, { detail: [ { loc: [...], msg: "text" } ] }.
function errorMessage(result: unknown): string {
  const detail = (result as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string" && detail) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { loc?: unknown[]; msg?: string };
    const field = String(first.loc?.[first.loc.length - 1] ?? "");
    const label = field
      ? field.charAt(0).toUpperCase() + field.slice(1) + ": "
      : "";
    return label + (first.msg ?? "Please check the details you entered.");
  }

  return "Something went wrong. Please try again.";
}

// Sends data (POST) when `data` is given, otherwise a plain GET.
// Pass `token` for private routes.
async function apiRequest(
  endpoint: string,
  data?: Record<string, unknown>,
  token?: string | null
) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: data ? "POST" : "GET",
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Please check your connection and try again."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(errorMessage(result), response.status);
  }

  return result;
}

export function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  return apiRequest("/register", data);
}

// Logs in, remembers the token, and returns the logged-in user.
export async function loginUser(data: {
  email: string;
  password: string;
}, remember = true): Promise<User> {
  const result = await apiRequest("/login", data);

  if (!result?.access_token || !result?.user) {
    throw new Error("Unexpected response from the server.");
  }

  saveToken(result.access_token, remember);
  return result.user as User;
}

// Asks the backend who the saved token belongs to (throws ApiError 401
// if the token is missing, wrong or expired).
export function getCurrentUser(): Promise<User> {
  return apiRequest("/me", undefined, getToken());
}

export function logoutUser() {
  clearToken();
}

// Asks the backend to email a password reset link. The answer is the same
// whether or not the email has an account (so it cannot be used to find out).
export async function requestPasswordReset(email: string): Promise<string> {
  const result = await apiRequest("/forgot-password", { email });
  return typeof result?.message === "string" ? result.message : "If an account exists for that email, we have sent a link to reset the password.";
}

// Sets a new password using the one-time token from the emailed link.
export async function resetPassword(token: string, password: string): Promise<string> {
  const result = await apiRequest("/reset-password", { token, password });
  return typeof result?.message === "string" ? result.message : "Password updated. You can now log in.";
}

// --- Schemes & eligibility ---------------------------------------------------

export type EligibilityProfile = {
  age: number;
  income: number;
  occupation: string;
  state: string;
  category: string;
  // Optional. Left out when the user chose "Prefer not to say".
  gender?: "Female" | "Male" | "Other";
  area?: "Rural" | "Urban";
  disability?: boolean;
  bpl?: boolean;
  girl_child?: boolean; // has a daughter under 10 years of age
};

// The rules a scheme requires ("All" means no restriction).
export type SchemeCriteria = {
  min_age: number | null; // null = the scheme states no such limit
  max_age: number | null;
  income_limit: number | null;
  occupation: string;
  state: string;
  category: string;
};

// One scheme, in the shape the pages use. Optional details (description,
// official link, documents ...) exist only when real data was added to the
// database, so the pages must never invent them.
export type SchemeView = {
  id: number | null;
  name: string;
  benefit: string;
  criteria: SchemeCriteria;
  reasons?: string[]; // only for schemes returned by the eligibility check
  criteriaMet?: number;
  criteriaTotal?: number;
  department?: string;
  description?: string;
  official_url?: string;
  documents?: string[];
  how_to_apply?: string[];
  eligibilityCriteria?: string[]; // the rules as written by the official source
  toVerify?: string[]; // rules this tool cannot check; the user must confirm them
  notes?: string[];
  application_start?: string;
  last_date?: string;
};

// A scheme the user does NOT match, with the reasons why.
export type NotEligibleView = {
  id: number | null;
  name: string;
  benefit: string;
  department?: string;
  official_url?: string;
  whyNot: string[];
};

export type EligibilityResult = {
  eligible: SchemeView[];
  notEligible: NotEligibleView[];
};

// A number, or null when the database has none (never turn a missing limit into 0).
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
// Lists such as ["OBC", "EBC"] become "OBC, EBC".
const label = (v: unknown) =>
  Array.isArray(v) ? v.join(", ") : typeof v === "string" && v.trim() ? v : "All";
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const list = (v: unknown) =>
  Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string")
    ? (v as string[])
    : undefined;

// Only allow web links, so a bad value in the database can never become a
// "javascript:" link.
const link = (v: unknown) => {
  const value = text(v);
  return value && /^https?:\/\//i.test(value) ? value : undefined;
};

function toSchemeView(raw: Record<string, any>): SchemeView {
  const c = raw.criteria ?? raw;
  return {
    id: typeof raw.scheme_id === "number" ? raw.scheme_id : typeof raw.id === "number" ? raw.id : null,
    name: String(raw.scheme_name ?? raw.name ?? ""),
    benefit: String(raw.benefit ?? ""),
    criteria: {
      min_age: num(c.min_age),
      max_age: num(c.max_age),
      income_limit: num(c.income_limit),
      occupation: label(c.occupation),
      state: label(c.state),
      category: label(c.category),
    },
    reasons: list(raw.reasons),
    criteriaMet: typeof raw.criteria_met === "number" ? raw.criteria_met : undefined,
    criteriaTotal: typeof raw.criteria_total === "number" ? raw.criteria_total : undefined,
    department: text(raw.department),
    description: text(raw.description),
    official_url: link(raw.official_url),
    documents: list(raw.documents),
    how_to_apply: list(raw.how_to_apply),
    eligibilityCriteria: list(raw.eligibility_criteria),
    toVerify: list(raw.to_verify) ?? list(raw.other_requirements),
    notes: list(raw.notes),
    application_start: text(raw.application_start),
    last_date: text(raw.last_date),
  };
}

function toNotEligibleView(raw: Record<string, any>): NotEligibleView {
  return {
    id: typeof raw.id === "number" ? raw.id : null,
    name: String(raw.scheme_name ?? raw.name ?? ""),
    benefit: String(raw.benefit ?? ""),
    department: text(raw.department),
    official_url: link(raw.official_url),
    whyNot: list(raw.why_not) ?? [],
  };
}

// Asks the backend which schemes match the given details, and for the
// schemes that do not match, why not.
export async function checkEligibility(
  profile: EligibilityProfile
): Promise<EligibilityResult> {
  const result = await apiRequest("/check-eligibility", profile);

  if (!Array.isArray(result?.eligible_schemes)) {
    throw new Error("Unexpected response from the server.");
  }

  return {
    eligible: result.eligible_schemes.map(toSchemeView),
    // an older backend does not send this list; show none rather than fail
    notEligible: Array.isArray(result.not_eligible_schemes)
      ? result.not_eligible_schemes.map(toNotEligibleView)
      : [],
  };
}

// All schemes in the database (public).
export async function getSchemes(): Promise<SchemeView[]> {
  const result = await apiRequest("/schemes");

  if (!Array.isArray(result)) {
    throw new Error("Unexpected response from the server.");
  }

  return result.map(toSchemeView);
}
