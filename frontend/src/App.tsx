import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  getToken,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  ApiError,
  checkEligibility,
  getSchemes,
  type User,
  type EligibilityProfile,
  type EligibilityResult,
  type NotEligibleView,
  type SchemeCriteria,
  type SchemeView,
} from "./api";

type Page = "home" | "eligibility" | "processing" | "results" | "details" | "login" | "register" | "forgot" | "reset" | "dashboard";
type IconName =
  | "arrow" | "bookmark" | "brain" | "briefcase" | "check" | "chevron" | "clock"
  | "document" | "eye" | "eyeOff" | "filter" | "gift" | "grid" | "heart" | "home" | "income"
  | "info" | "location" | "lock" | "logout" | "menu" | "profile" | "search"
  | "settings" | "shield" | "sparkle" | "user" | "wallet";

const iconPaths: Record<IconName, ReactNode> = {
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  bookmark: <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21V4.8Z" />,
  brain: <><path d="M9.5 4.5A3 3 0 0 0 4 6a3.5 3.5 0 0 0-.3 6.7A3.2 3.2 0 0 0 7 17.5a3 3 0 0 0 5 2.2V5.5a3 3 0 0 0-2.5-3Z" /><path d="M14.5 4.5A3 3 0 0 1 20 6a3.5 3.5 0 0 1 .3 6.7 3.2 3.2 0 0 1-3.3 4.8 3 3 0 0 1-5 2.2M8 9a3 3 0 0 0 4 2.8M16 9a3 3 0 0 1-4 2.8" /></>,
  briefcase: <><path d="M4 7h16v12H4z" /><path d="M9 7V4h6v3M4 12h16M10 12v2h4v-2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  document: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  eyeOff: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /><path d="M3 3l18 18" /></>,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7Z" />,
  gift: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8H8.5a2.5 2.5 0 1 1 3.5-2.3ZM12 8h3.5A2.5 2.5 0 1 0 12 5.7Z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  heart: <path d="M20.8 8.5c0 5.5-8.8 11-8.8 11S3.2 14 3.2 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.8 1.5Z" />,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></>,
  income: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M7 10h.01M17 15h.01M12 10v5M10 11h3a1.5 1.5 0 0 1 0 3h-3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7-.7-1.7.9-2-2.1-2.1-2 .9-1.7-.7-.7-2h-3l-.7 2-1.7.7-2-.9L3 6.1l.9 2-.7 1.7-2 .7v3l2 .7.7 1.7-.9 2L5.1 20l2-.9 1.7.7.7 2h3l.7-2 1.7-.7 2 .9 2.1-2.1-.9-2 .7-1.7Z" /></>,
  shield: <><path d="M12 3 4.5 6v5.3c0 4.7 3.2 8.1 7.5 9.7 4.3-1.6 7.5-5 7.5-9.7V6Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  sparkle: <><path d="m12 2 1.4 5.2L18 10l-4.6 2.8L12 18l-1.4-5.2L6 10l4.6-2.8Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" /><path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z" /></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, type = "button", disabled = false }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost"; icon?: IconName; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return <button type={type} className={`button button-${variant}`} onClick={onClick} disabled={disabled}>{children}{icon && <Icon name={icon} size={18} />}</button>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark"><Icon name="sparkle" size={22} /></span>{!compact && <span><strong>SchemeAI</strong><small>Government Benefits Assistant</small></span>}</div>;
}

function Header({ go, current }: { go: (p: Page) => void; current: Page }) {
  const [open, setOpen] = useState(false);
  const signedIn = useContext(UserContext);
  return <header className="header"><div className="nav-shell">
    <button className="logo-button" onClick={() => go("home")} aria-label="Go home"><Logo /></button>
    <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
      <button className={current === "home" ? "active" : ""} onClick={() => go("home")}>Home</button>
      <button onClick={() => { go("home"); setTimeout(() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }), 0); }}>How it works</button>
      <button onClick={() => go("results")}>Schemes</button>
      <button onClick={() => go("home")}>About</button>
    </nav>
    <div className="nav-actions">
      {signedIn ? <Button variant="primary" onClick={() => go("dashboard")}>Dashboard</Button> : <>
        <Button variant="ghost" onClick={() => go("login")}>Log in</Button>
        <Button variant="primary" onClick={() => go("register")}>Register</Button>
      </>}
    </div>
    <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Open menu"><Icon name="menu" /></button>
  </div></header>;
}

// Who is logged in (null = nobody). The header reads this to show Dashboard or Log in.
const UserContext = createContext<User | null>(null);

// ---- Eligibility form options and helpers ----------------------------------

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// [value sent to the backend, label shown to the user]
const OCCUPATIONS: [string, string][] = [
  ["Student", "Student"],
  ["Farmer", "Farmer"],
  ["Employee", "Salaried employee"],
  ["Self-employed", "Self-employed"],
  ["Unemployed", "Unemployed"],
  ["Other", "Other"],
];

const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];

type FormValues = {
  age: string;
  occupation: string;
  income: string;
  state: string;
  category: string;
  // optional answers; SKIP means the user did not answer
  gender: string;
  area: string;
  disability: string;
  bpl: string;
  girlChild: string;
};

const SKIP = "Prefer not to say";
const emptyForm: FormValues = { age: "", occupation: "", income: "", state: "", category: "", gender: SKIP, area: SKIP, disability: SKIP, bpl: SKIP, girlChild: SKIP };

const occupationLabel = (value: string) => OCCUPATIONS.find(([v]) => v === value)?.[1] ?? value;
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const isAll = (value: string) => value.trim().toLowerCase() === "all";

function toProfile(f: FormValues): EligibilityProfile {
  const profile: EligibilityProfile = { age: Number(f.age), income: Number(f.income), occupation: f.occupation, state: f.state, category: f.category };
  // Optional answers are only sent when the user actually answered.
  if (f.gender === "Female" || f.gender === "Male" || f.gender === "Other") profile.gender = f.gender;
  if (f.area === "Rural" || f.area === "Urban") profile.area = f.area;
  if (f.disability === "Yes" || f.disability === "No") profile.disability = f.disability === "Yes";
  if (f.bpl === "Yes" || f.bpl === "No") profile.bpl = f.bpl === "Yes";
  if (f.girlChild === "Yes" || f.girlChild === "No") profile.girl_child = f.girlChild === "Yes";
  return profile;
}

// Returns a message if something is wrong on this step, otherwise "".
function stepError(step: number, f: FormValues): string {
  if (step === 1) {
    const age = Number(f.age);
    if (f.age.trim() === "" || !Number.isInteger(age) || age < 1 || age > 120) return "Please enter your age in whole years (1 to 120).";
    if (!f.occupation) return "Please select your occupation.";
  }
  if (step === 2) {
    const income = Number(f.income);
    if (f.income.trim() === "" || !Number.isInteger(income) || income < 0) return "Please enter your annual family income as a whole number (0 or more).";
  }
  if (step === 3) {
    if (!f.state) return "Please select your state.";
    if (!f.category) return "Please select your social category.";
  }
  return "";
}

// The first step (1-3) that still has a problem, or 0 if all are fine.
function firstInvalidStep(f: FormValues): number {
  return [1, 2, 3].find((s) => stepError(s, f) !== "") ?? 0;
}

// A missing age or income limit means the scheme states none. Say that, never "0".
function ageText(c: SchemeCriteria): string {
  if (c.min_age !== null && c.max_age !== null) return `Age ${c.min_age} to ${c.max_age} years`;
  if (c.min_age !== null) return `Age ${c.min_age} years or above`;
  if (c.max_age !== null) return `Up to ${c.max_age} years of age`;
  return "No age limit stated";
}

function ageRange(c: SchemeCriteria): string {
  if (c.min_age !== null && c.max_age !== null) return `${c.min_age} to ${c.max_age}`;
  if (c.min_age !== null) return `${c.min_age} or above`;
  if (c.max_age !== null) return `Up to ${c.max_age}`;
  return "No limit stated";
}

// Plain-language lines describing what a scheme requires.
function criteriaLines(c: SchemeCriteria): string[] {
  return [
    ageText(c),
    c.income_limit !== null ? `Annual family income up to ${rupees(c.income_limit)}` : "No income limit stated",
    isAll(c.occupation) ? "Open to all occupations" : `Occupation: ${occupationLabel(c.occupation)}`,
    isAll(c.state) ? "Available in all states" : `Available in ${c.state}`,
    isAll(c.category) ? "Open to all social categories" : `Category: ${c.category}`,
  ];
}

const linkButtonStyle = { textDecoration: "none" } as const;
const errorStyle = { color: "#b42318", fontSize: 12, margin: 0, padding: "0 28px 14px" } as const;
const mutedNote = { color: "var(--muted)", fontSize: 12 } as const;
const listStyle = { margin: "10px 0 0", paddingLeft: 18, listStyleType: "disc", color: "var(--muted)", fontSize: 11, lineHeight: 1.7 } as const;

function TrustItem({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return <div className="trust-item"><span><Icon name={icon} /></span><div><strong>{title}</strong><small>{text}</small></div></div>;
}

function HomePage({ go, onSelect }: { go: (p: Page) => void; onSelect: (s: SchemeView) => void }) {
  const [featured, setFeatured] = useState<SchemeView[] | null>(null);
  const [featuredFailed, setFeaturedFailed] = useState(false);

  // Show real schemes from the database (not made-up examples).
  useEffect(() => {
    let cancelled = false;
    getSchemes()
      .then((all) => { if (!cancelled) setFeatured(all.slice(0, 3)); })
      .catch(() => { if (!cancelled) setFeaturedFailed(true); });
    return () => { cancelled = true; };
  }, []);

  return <><Header go={go} current="home" /><main>
    <section className="hero"><div className="orb orb-one" /><div className="orb orb-two" /><div className="hero-inner">
      <div className="hero-copy">
        <div className="eyebrow"><Icon name="sparkle" size={16} /> Free government scheme eligibility check</div>
        <h1>Find government schemes <span>you’re eligible for.</span></h1>
        <p>Enter a few details and we compare them with the published rules of government schemes—clearly, securely, and in minutes.</p>
        <div className="hero-actions"><Button icon="arrow" onClick={() => go("eligibility")}>Check my eligibility</Button><Button variant="secondary" onClick={() => go("results")}>Explore schemes</Button></div>
        <div className="hero-note"><div className="avatars"><span>AS</span><span>RM</span><span>PK</span></div><p><strong>Free for everyone</strong><br />Join citizens finding the right support</p></div>
      </div>
      <div className="hero-visual">
        <div className="ai-card">
          <div className="ai-card-head"><span className="ai-avatar"><Icon name="brain" size={25} /></span><div><strong>Eligibility Assistant</strong><small>Example preview</small></div><i className="live-dot" /></div>
          <div className="profile-line"><span><Icon name="user" /></span><div><small>Your profile</small><strong>Student · Rajasthan · OBC</strong></div><b>Sample</b></div>
          <div className="scan-area"><div className="scan-ring"><div><Icon name="sparkle" size={30} /><strong>3/3</strong><small>Criteria met</small></div></div></div>
          <div className="match-card"><span><Icon name="document" /></span><div><small>Example match</small><strong>PM YASASVI Scholarship</strong></div><span className="eligible-pill"><Icon name="check" size={13} /> May match</span></div>
        </div>
        <div className="floating-chip chip-one"><Icon name="shield" /><span><strong>Secure sign-in</strong><small>Hashed passwords</small></span></div>
        <div className="floating-chip chip-two"><Icon name="gift" /><span><strong>Example result</strong><small>From your details</small></span></div>
      </div>
    </div></section>

    <section className="trust-strip"><div className="trust-grid">
      <TrustItem icon="brain" title="Rule-based" text="Matched against published rules" />
      <TrustItem icon="profile" title="Personalized" text="Results unique to you" />
      <TrustItem icon="clock" title="Simple process" text="Takes less than 3 minutes" />
      <TrustItem icon="lock" title="Secure information" text="Privacy-first by design" />
    </div></section>

    <section className="section" id="how"><div className="section-heading"><div className="eyebrow">Simple by design</div><h2>From details to benefits in four easy steps</h2><p>No complicated forms or government jargon. We guide you every step of the way.</p></div>
      <div className="steps">
        {[
          ["user", "Enter your details", "Tell us the basics—your age, income, occupation and location."],
          ["brain", "We compare your details", "Your details are checked against each scheme’s published eligibility rules."],
          ["search", "Find matching schemes", "See the schemes in our database whose rules match your details."],
          ["gift", "Understand your benefits", "Get clear reasons, benefits and the right path to apply."],
        ].map(([icon, title, text], index) => <div className="step-card" key={title}><span className="step-num">0{index + 1}</span><div className="step-icon"><Icon name={icon as IconName} /></div><h3>{title}</h3><p>{text}</p>{index < 3 && <i className="step-line" />}</div>)}
      </div>
    </section>

    <section className="section featured"><div className="section-top"><div><div className="eyebrow">Popular opportunities</div><h2>Featured government schemes</h2><p>Explore benefits helping citizens across education, agriculture, livelihoods and more.</p></div><Button variant="secondary" icon="arrow" onClick={() => go("results")}>View all schemes</Button></div>
      {featuredFailed && <p style={{ marginTop: 38, color: "var(--muted)" }}>Schemes could not be loaded right now. Please try again later.</p>}
      {featured && featured.length === 0 && <p style={{ marginTop: 38, color: "var(--muted)" }}>No schemes have been added yet.</p>}
      {featured && featured.length > 0 && <div className="featured-grid">{featured.map((scheme, i) => <article className="scheme-preview" key={scheme.id ?? scheme.name}><div className={`scheme-icon scheme-${(i % 3) + 1}`}><Icon name={i % 3 === 2 ? "income" : "document"} /></div><span className="category">{isAll(scheme.criteria.occupation) ? "All occupations" : occupationLabel(scheme.criteria.occupation)}</span><h3>{scheme.name}</h3><p>{scheme.description ?? `${ageText(scheme.criteria)}.`}</p><div className="benefit-row"><span>Benefit</span><strong>{scheme.benefit}</strong></div><button className="text-link" onClick={() => onSelect(scheme)}>View scheme details <Icon name="arrow" size={17} /></button></article>)}</div>}
    </section>

    <section className="cta-band"><div><span className="cta-icon"><Icon name="sparkle" size={28} /></span><div><h2>Benefits may be waiting for you</h2><p>Answer a few simple questions and we show the government schemes whose rules match your details.</p></div></div><Button icon="arrow" onClick={() => go("eligibility")}>Check eligibility—it's free</Button></section>
  </main><Footer go={go} /></>;
}

function Footer({ go }: { go: (p: Page) => void }) {
  return <footer><div className="footer-main"><div><Logo /><p>Making government benefits simple, accessible and understandable for every Indian citizen.</p><span className="india-note">Made for the people of India</span></div><div><strong>Quick links</strong><button onClick={() => go("eligibility")}>Check eligibility</button><button onClick={() => go("results")}>Browse schemes</button><button>How it works</button></div><div><strong>Support</strong><button>Help centre</button><button>Privacy policy</button><button>Terms of use</button></div><div className="disclaimer"><Icon name="info" /><p><strong>Important disclaimer</strong>SchemeAI is an independent assistance platform and is not affiliated with the Government of India. Always verify details on official portals.</p></div></div><div className="footer-bottom">© 2025 SchemeAI. Built to make public benefits easier to find.<span>English · हिन्दी</span></div></footer>;
}

function Progress({ step }: { step: number }) {
  const labels = ["Personal details", "Financial details", "Location & category", "Review"];
  return <div className="progress-wrap"><div className="progress-top"><span>Step {step} of 4</span><strong>{step * 25}% complete</strong></div><div className="progress-bar"><i style={{ width: `${step * 25}%` }} /></div><div className="progress-labels">{labels.map((label, i) => <span className={i + 1 <= step ? "done" : ""} key={label}><b>{i + 1 < step ? <Icon name="check" size={14} /> : i + 1}</b>{label}</span>)}</div></div>;
}

function Field({ label, help, children, required = true }: { label: string; help?: string; children: ReactNode; required?: boolean }) {
  return <label className="field"><span>{label}{required && <em>*</em>}</span>{children}{help && <small>{help}</small>}</label>;
}

function EligibilityPage({ go, form, setForm, onAnalyze }: { go: (p: Page) => void; form: FormValues; setForm: (f: FormValues) => void; onAnalyze: (p: EligibilityProfile) => void }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const set = (key: keyof FormValues, value: string) => { setForm({ ...form, [key]: value }); setError(""); };
  const next = () => {
    if (step < 4) {
      const problem = stepError(step, form);
      if (problem) { setError(problem); return; }
      setStep(step + 1);
      return;
    }
    const bad = firstInvalidStep(form);
    if (bad) { setStep(bad); setError(stepError(bad, form)); return; }
    onAnalyze(toProfile(form));
  };
  const goStep = (n: number) => { setError(""); setStep(n); };
  const review: [string, string, number][] = [
    ["Age", `${form.age} years`, 1],
    ["Occupation", occupationLabel(form.occupation), 1],
    ["Annual family income", form.income === "" ? "" : rupees(Number(form.income)), 2],
    ["State", form.state, 3],
    ["Category", form.category, 3],
    ["Gender", form.gender, 3],
    ["Area", form.area, 3],
    ["Disability status", form.disability, 3],
    ["BPL household", form.bpl, 3],
    ["Daughter under 10", form.girlChild, 3],
  ];
  return <><Header go={go} current="eligibility" /><main className="app-bg"><div className="form-page">
    <div className="breadcrumb"><button onClick={() => go("home")}>Home</button><Icon name="chevron" size={14} /><span>Check eligibility</span></div>
    <div className="form-title"><div className="form-title-icon"><Icon name="sparkle" /></div><div><h1>Check your scheme eligibility</h1><p>Answer a few simple questions. It takes less than 3 minutes.</p></div></div>
    <Progress step={step} />
    <section className="form-card">
      <div className="form-card-head"><span><Icon name={step === 1 ? "user" : step === 2 ? "income" : step === 3 ? "location" : "check"} /></span><div><small>STEP {step}</small><h2>{step === 1 ? "Let’s start with the basics" : step === 2 ? "Your financial details" : step === 3 ? "Location and category" : "Review your information"}</h2><p>{step === 1 ? "This helps us identify schemes suited to your life stage." : step === 2 ? "Income helps determine financial eligibility thresholds." : step === 3 ? "Many schemes vary by state and social category." : "Confirm that everything looks right before we check your eligibility."}</p></div></div>
      {step === 1 && <div className="form-grid">
        <Field label="What is your age?" help="Enter your age in completed years."><div className="input-wrap"><Icon name="user" /><input value={form.age} onChange={(e) => set("age", e.target.value)} type="number" min="1" max="120" step="1" placeholder="e.g. 21" /></div></Field>
        <Field label="What is your occupation?" help="Choose the option that best describes you."><div className="input-wrap"><Icon name="briefcase" /><select value={form.occupation} onChange={(e) => set("occupation", e.target.value)}><option value="" disabled>Select occupation</option>{OCCUPATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></Field>
      </div>}
      {step === 2 && <div className="form-grid one">
        <Field label="What is your annual family income?" help="Include income from all sources before tax."><div className="input-wrap"><span className="rupee">₹</span><input value={form.income} onChange={(e) => set("income", e.target.value)} type="number" min="0" step="1" placeholder="e.g. 250000" /></div></Field>
        <div className="info-box"><Icon name="info" /><div><strong>Why we ask this</strong><p>Many schemes use annual family income to determine eligibility. An estimate is okay if you don’t know the exact amount.</p></div></div>
      </div>}
      {step === 3 && <div className="form-grid">
        <Field label="Which state do you live in?"><div className="input-wrap"><Icon name="location" /><select value={form.state} onChange={(e) => set("state", e.target.value)}><option value="" disabled>Select your state</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div></Field>
        <Field label="Your social category"><div className="input-wrap"><Icon name="profile" /><select value={form.category} onChange={(e) => set("category", e.target.value)}><option value="" disabled>Select category</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div></Field>
        <Field label="Gender" required={false} help="Optional. Used only for schemes that have a gender rule."><div className="input-wrap"><Icon name="user" /><select value={form.gender} onChange={(e) => set("gender", e.target.value)}><option>Female</option><option>Male</option><option>Other</option><option>{SKIP}</option></select></div></Field>
        <Field label="Where do you live?" required={false} help="Optional. Some schemes are only for rural or urban areas."><div className="input-wrap"><Icon name="location" /><select value={form.area} onChange={(e) => set("area", e.target.value)}><option>Rural</option><option>Urban</option><option>{SKIP}</option></select></div></Field>
        <Field label="Disability status" required={false} help="Optional. Used only for schemes meant for persons with disability."><div className="input-wrap"><Icon name="heart" /><select value={form.disability} onChange={(e) => set("disability", e.target.value)}><option>No</option><option>Yes</option><option>{SKIP}</option></select></div></Field>
        <Field label="Is your family below the poverty line (BPL)?" required={false} help="Optional. Used only for schemes meant for BPL families."><div className="input-wrap"><Icon name="income" /><select value={form.bpl} onChange={(e) => set("bpl", e.target.value)}><option>Yes</option><option>No</option><option>{SKIP}</option></select></div></Field>
        <Field label="Do you have a daughter under 10 years of age?" required={false} help="Optional. Some schemes, like savings accounts for a girl child, are opened by a parent."><div className="input-wrap"><Icon name="heart" /><select value={form.girlChild} onChange={(e) => set("girlChild", e.target.value)}><option>Yes</option><option>No</option><option>{SKIP}</option></select></div></Field>
      </div>}
      {step === 4 && <div className="review-list">
        {review.map(([key, value, target]) => <div key={key}><span>{key}</span><strong>{value}</strong><button onClick={() => goStep(target)}>Edit</button></div>)}
      </div>}
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      <div className="form-actions"><Button variant="secondary" onClick={() => step === 1 ? go("home") : goStep(step - 1)}>Back</Button><div><Button icon="arrow" onClick={next}>{step === 4 ? "Check my eligibility" : "Continue"}</Button></div></div>
    </section>
    <div className="privacy-note"><Icon name="lock" size={18} /><span><strong>Your privacy matters.</strong> Your details are only used to find matching schemes and are not saved to your account.</span></div>
  </div></main></>;
}

function ProcessingPage({ go, profile, onResults }: { go: (p: Page) => void; profile: EligibilityProfile; onResults: (result: EligibilityResult) => void }) {
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Ask the backend which schemes match, then show the results.
  useEffect(() => {
    let cancelled = false;
    setError("");
    checkEligibility(profile)
      .then((result) => { if (!cancelled) onResults(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); });
    return () => { cancelled = true; };
  }, [profile, attempt]);

  return <main className="processing-page"><Logo /><div className="processing-card"><div className="processing-visual"><div className="pulse p1" /><div className="pulse p2" /><span><Icon name="brain" size={44} /></span></div><div className="eyebrow"><Icon name="sparkle" size={15} /> Eligibility check</div><h1>{error ? "We couldn’t check your eligibility" : "Checking your details…"}</h1><p role={error ? "alert" : undefined}>{error || "We’re comparing your details with the eligibility rules of the schemes in our database."}</p>
    {!error && <div className="analysis-steps">
      {["Reading your details", "Checking eligibility rules", "Matching schemes", "Preparing your results"].map((label, i) => <div className={i < 3 ? "complete" : "active"} key={label}><span>{i < 3 ? <Icon name="check" size={16} /> : <i />}</span><p>{label}<small>{i < 3 ? "Completed" : "In progress…"}</small></p></div>)}
    </div>}
    {!error && <div className="processing-bar"><i /></div>}
    {!error && <small>This usually takes a few seconds</small>}
    {error && <Button onClick={() => setAttempt(attempt + 1)}>Try again</Button>}
    {error && <Button variant="secondary" onClick={() => go("eligibility")}>Back to my details</Button>}
  </div><p className="secure-line"><Icon name="shield" size={16} /> Your details are only used to find matching schemes</p></main>;
}

function SchemeCard({ scheme, index, onView }: { scheme: SchemeView; index: number; onView: () => void }) {
  const [why, setWhy] = useState(false);
  const reasons = scheme.reasons ?? [];
  const met = scheme.criteriaMet ?? reasons.length;
  const total = scheme.criteriaTotal ?? met;
  return <article className="result-card"><div className="result-card-main"><div className={`scheme-icon scheme-${(index % 3) + 1}`}><Icon name={index % 3 === 2 ? "income" : "document"} /></div><div className="result-content"><div className="result-badges"><span className="eligible-pill"><Icon name="check" size={13} /> May be eligible</span></div><h2>{scheme.name}</h2>{scheme.department && <small>{scheme.department}</small>}{scheme.description && <p>{scheme.description}</p>}<div className="benefit-box"><span><Icon name="gift" /></span><div><small>Benefit</small><strong>{scheme.benefit}</strong></div></div>{scheme.toVerify && scheme.toVerify.length > 0 && <small style={{ ...mutedNote, display: "block", marginTop: 10 }}>Also confirm {scheme.toVerify.length} other {scheme.toVerify.length === 1 ? "requirement" : "requirements"} we cannot check for you. See details.</small>}<button className="why-button" onClick={() => setWhy(!why)}><Icon name="brain" size={18} /> Why does this scheme match my details?<Icon name="chevron" size={16} /></button>{why && <div className="why-expanded">Each rule listed on the right (age, income, occupation, state and category) was compared with the details you entered. This is a preliminary match, not an official eligibility decision.</div>}</div></div><aside className="match-aside"><div className="match-score"><strong>{met}/{total}</strong><span>met</span></div><small>Criteria matched</small><div className="reason-list"><strong>Why it matches</strong>{reasons.map((r) => <span key={r}><Icon name="check" size={14} />{r}</span>)}</div><Button onClick={onView}>View details</Button>{scheme.official_url ? <a className="button button-secondary" href={scheme.official_url} target="_blank" rel="noopener noreferrer" style={linkButtonStyle}>Official portal <Icon name="arrow" size={16} /></a> : <small>Official link not added yet</small>}</aside></article>;
}

// Schemes the user does not match. Hidden until asked for; each one can show why not.
function NotMatchedSection({ items }: { items: NotEligibleView[] }) {
  const [open, setOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  if (items.length === 0) return null;
  const noun = items.length === 1 ? "scheme" : "schemes";
  return <section style={{ marginTop: 26 }} aria-label="Schemes you do not match">
    <div className="result-heading"><div><h2>Schemes you don’t match</h2><p>Wondering why a scheme is not on your list? You can see the reason for each one.</p></div></div>
    <Button variant="secondary" onClick={() => setOpen(!open)}>{open ? "Hide these schemes" : `Why am I not eligible for the other ${items.length} ${noun}?`}</Button>
    {open && <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
      {items.map((item) => {
        const key = String(item.id ?? item.name);
        const shown = openKeys.includes(key);
        return <article key={key} style={{ border: "1px solid var(--line)", borderRadius: 12, background: "white", padding: "16px 20px" }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{item.name}</h3>
          {item.department && <small style={mutedNote}>{item.department}</small>}
          {item.benefit && <p style={{ ...mutedNote, margin: "8px 0 0" }}>Benefit: {item.benefit}</p>}
          <button className="why-button" aria-expanded={shown} onClick={() => setOpenKeys(shown ? openKeys.filter((k) => k !== key) : [...openKeys, key])}><Icon name="info" size={18} /> {shown ? "Hide reason" : "Why am I not eligible?"}<Icon name="chevron" size={16} /></button>
          {shown && <div className="why-expanded" style={{ fontSize: 12 }}>
            <strong>Why this scheme did not match</strong>
            <ul style={{ ...listStyle, fontSize: 12, color: "inherit" }}>{item.whyNot.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            <p style={{ ...mutedNote, margin: "10px 0 0" }}>This is based only on the details you entered and the rules saved in our database. If your details change, or the official rules have changed, the result may differ. Please check the official portal before deciding.</p>
            {item.official_url && <a href={item.official_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, color: "var(--primary)", fontWeight: 700 }}>Official portal</a>}
          </div>}
        </article>;
      })}
    </div>}
  </section>;
}

function ResultsPage({ go, profile, results, notMatched, onSelect }: { go: (p: Page) => void; profile: EligibilityProfile | null; results: SchemeView[] | null; notMatched: NotEligibleView[]; onSelect: (s: SchemeView) => void }) {
  const [query, setQuery] = useState("");
  const count = results?.length ?? 0;
  const shown = (results ?? []).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <><Header go={go} current="results" /><main className="app-bg"><div className="results-page"><div className="breadcrumb"><button onClick={() => go("home")}>Home</button><Icon name="chevron" size={14} /><span>Your results</span></div>
    {!results ? <section className="results-hero"><div><h1>Check your eligibility first</h1><p>Answer a few simple questions and we will show the schemes that match your details.</p><div style={{ marginTop: 20 }}><Button icon="arrow" onClick={() => go("eligibility")}>Check my eligibility</Button></div></div></section> : <>
    <section className="results-hero"><div><div className="eyebrow light"><Icon name="sparkle" size={15} /> Check complete</div><h1>{count > 0 ? "Schemes that may match your details" : "No matching schemes found"}</h1><p>{count > 0 ? <>We found <strong>{count} {count === 1 ? "scheme" : "schemes"}</strong> whose listed criteria match the details you entered.</> : "None of the schemes currently in our database match the details you entered."}</p>{profile && <div className="profile-summary"><span><Icon name="user" size={17} />Age {profile.age}</span><span>{occupationLabel(profile.occupation)}</span><span>{profile.state}</span><span>{profile.category}</span><button onClick={() => go("eligibility")}>Edit profile</button></div>}</div><div className="found-stat"><strong>{count}</strong><span>{count === 1 ? "scheme" : "schemes"} found<br /><b>for you</b></span></div></section>
    {count > 0 && <div className="filter-row"><div className="search-box"><Icon name="search" /><input placeholder="Search your matches…" aria-label="Search your matches" value={query} onChange={(e) => setQuery(e.target.value)} /></div></div>}
    {count > 0 && <div className="result-heading"><div><h2>Schemes that match your details</h2><p>Based on the age, income, occupation, state and category you entered.</p></div><span><Icon name="info" size={15} /> Eligibility is based on the details you provided</span></div>}
    {count > 0 && shown.length === 0 && <p style={mutedNote}>No schemes match your search.</p>}
    <div className="results-list">{shown.map((scheme, i) => <SchemeCard key={scheme.id ?? scheme.name} scheme={scheme} index={i} onView={() => onSelect(scheme)} />)}</div>
    {count === 0 && <div className="info-box"><Icon name="info" /><div><strong>What you can do</strong><p>Try changing your details. This list only covers the schemes currently in our database, so other schemes may exist on official government portals.</p><div style={{ marginTop: 12 }}><Button variant="secondary" onClick={() => go("eligibility")}>Change my details</Button></div></div></div>}
    <NotMatchedSection items={notMatched} />
    <div className="info-box" style={{ marginTop: 22 }}><Icon name="info" /><div><strong>Preliminary guidance only</strong><p>These results are not an official eligibility decision. Always confirm the rules and apply on the official government portal.</p></div></div>
    </>}
  </div></main></>;
}

function DetailsPage({ go, scheme }: { go: (p: Page) => void; scheme: SchemeView }) {
  const dates = ([["Applications open", scheme.application_start], ["Last date to apply", scheme.last_date]] as [string, string | undefined][]).filter((d): d is [string, string] => Boolean(d[1]));
  const c = scheme.criteria;
  return <><Header go={go} current="results" /><main className="app-bg"><div className="details-page"><div className="breadcrumb"><button onClick={() => go("home")}>Home</button><Icon name="chevron" size={14} /><button onClick={() => go("results")}>Your results</button><Icon name="chevron" size={14} /><span>Scheme details</span></div>
    <section className="detail-hero"><div>{scheme.reasons && <div className="result-badges"><span className="eligible-pill"><Icon name="check" size={13} /> May be eligible</span></div>}<h1>{scheme.name}</h1>{scheme.department && <p>{scheme.department}</p>}<div className="detail-benefit"><Icon name="gift" /><div><small>Benefit</small><strong>{scheme.benefit}</strong></div></div></div><div className="detail-actions">{scheme.official_url ? <a className="button button-primary" href={scheme.official_url} target="_blank" rel="noopener noreferrer" style={linkButtonStyle}>Apply on official portal <Icon name="arrow" size={18} /></a> : <small style={mutedNote}>Official application link not added yet.</small>}</div></section>
    <div className="detail-layout"><article className="detail-content"><section><h2>About this scheme</h2><p>{scheme.description ?? "A detailed description has not been added for this scheme yet. Please check the official government portal."}</p></section><section><h2>Eligibility criteria</h2>{scheme.eligibilityCriteria && <p>As stated by the official source.</p>}<div className="checklist">{(scheme.eligibilityCriteria ?? criteriaLines(c)).map((x) => <div key={x}><span><Icon name="check" size={16} /></span>{x}</div>)}</div></section>
      {scheme.reasons ? <section className="qualify-box"><div className="brain-badge"><Icon name="brain" /></div><div><h2>Why this scheme matches</h2><p>Based on the details you entered, you meet each criterion listed for this scheme. This is preliminary guidance, not an official decision.</p><div className="qualify-tags">{scheme.reasons.map((r) => <span key={r}>{r}</span>)}</div></div></section> : <section><h2>Do you qualify?</h2><p>Enter your details to see whether you match this scheme’s criteria.</p><div style={{ marginTop: 14 }}><Button icon="arrow" onClick={() => go("eligibility")}>Check my eligibility</Button></div></section>}
      {scheme.toVerify && scheme.toVerify.length > 0 && <section><h2>Please confirm these yourself</h2><p>We can only compare the details you entered. These rules need to be checked by you against the official scheme guidelines.</p><ul style={listStyle}>{scheme.toVerify.map((x) => <li key={x}>{x}</li>)}</ul></section>}
      <section><h2>Required documents</h2>{scheme.documents ? <div className="documents">{scheme.documents.map((x) => <div key={x}><Icon name="document" /><span><strong>{x}</strong></span></div>)}</div> : <p>Required documents have not been added yet. Please check the official government portal.</p>}</section>
      <section><h2>How to apply</h2>{scheme.how_to_apply ? <div className="apply-steps">{scheme.how_to_apply.map((x, i) => <div key={x}><b>{i + 1}</b><span>{x}</span></div>)}</div> : <p>Application steps have not been added yet. Please check the official government portal.</p>}</section>
      {scheme.notes && scheme.notes.length > 0 && <section><h2>Good to know</h2><ul style={listStyle}>{scheme.notes.map((x) => <li key={x}>{x}</li>)}</ul></section>}
      <section><div className="info-box"><Icon name="info" /><div><strong>Check the official source</strong><p>SchemeAI is an independent assistance platform. Rules, benefits and dates can change, so always confirm them on the official government portal before applying.</p></div></div></section></article>
      <aside className="detail-side">{dates.length > 0 && <div className="side-card"><h3>Important dates</h3>{dates.map(([label, value]) => <div key={label}><Icon name="clock" /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div>}<div className="side-card"><h3>Scheme overview</h3><dl><div><dt>Age</dt><dd>{ageRange(c)}</dd></div><div><dt>Occupation</dt><dd>{isAll(c.occupation) ? "All" : occupationLabel(c.occupation)}</dd></div><div><dt>State</dt><dd>{isAll(c.state) ? "All states" : c.state}</dd></div><div><dt>Category</dt><dd>{isAll(c.category) ? "All" : c.category}</dd></div></dl></div></aside>
    </div></div></main></>;
}

// A password box with an eye button that shows or hides what you typed.
function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        style={{ border: 0, background: "none", padding: 0, color: "inherit", display: "grid", placeItems: "center" }}
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={18} />
      </button>
    </>
  );
}

function AuthPage({
  type,
  go,
  onLogin,
}: {
  type: "login" | "register";
  go: (p: Page) => void;
  onLogin: (user: User) => void;
}) {
  const login = type === "login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  async function handleSubmit(
    e: import("react").FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!login && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (login) {
        const user = await loginUser({ email, password }, remember);
        onLogin(user);
      } else {
        await registerUser({ name, email, password });
        // Account created: log in right away and open the dashboard.
        try {
          const user = await loginUser({ email, password });
          onLogin(user);
        } catch {
          // The account exists but automatic login failed: ask for a manual login.
          setMessage("Account created successfully! Please log in.");
          go("login");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Logo />
        <div className="auth-message">
          <div className="auth-art">
            <span>
              <Icon name="brain" size={40} />
            </span>
            <div className="auth-scheme s1">
              <Icon name="document" />
              <b>Education support</b>
              <small>Example</small>
            </div>
            <div className="auth-scheme s2">
              <Icon name="income" />
              <b>Financial benefit</b>
              <small>Example</small>
            </div>
          </div>

          <div className="eyebrow light">
            <Icon name="sparkle" size={15} /> Your benefits, simplified
          </div>
          <h1>Discover support designed for your journey.</h1>
          <p>
            One secure account to find government schemes that match
            your details.
          </p>
          <div className="auth-trust">
            <span><Icon name="shield" />Secure by design</span>
            <span><Icon name="sparkle" />Based on your details</span>
          </div>
        </div>
        <small>SchemeAI · Independent eligibility assistance</small>
      </section>

      <section className="auth-form">
        <button className="back-home" onClick={() => go("home")}>
          <Icon name="arrow" size={17} /> Back to home
        </button>

        <div className="auth-form-inner">
          <div className="mobile-logo"><Logo /></div>

          <h1>{login ? "Welcome back" : "Create your account"}</h1>
          <p>
            {login
              ? "Log in to access your saved schemes and personalized dashboard."
              : "Start discovering government schemes you may be eligible for."}
          </p>

          <form onSubmit={handleSubmit}>
            {!login && (
              <Field label="Full name">
                <div className="input-wrap">
                  <Icon name="user" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </Field>
            )}

            <Field label="Email address">
              <div className="input-wrap">
                <Icon name="document" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="input-wrap">
                <Icon name="lock" />
                <PasswordInput
                  placeholder="Enter your password"
                  value={password}
                  onChange={setPassword}
                  autoComplete={login ? "current-password" : "new-password"}
                  minLength={login ? undefined : 8}
                />
              </div>
            </Field>

            {!login && (
              <Field label="Confirm password">
                <div className="input-wrap">
                  <Icon name="lock" />
                  <PasswordInput
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                  />
                </div>
              </Field>
            )}

            {login && (
              <div className="remember-row">
                <label>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                </label>
                <button type="button" onClick={() => go("forgot")}>Forgot password?</button>
              </div>
            )}

            {error && (
              <p role="alert" style={{ color: "#b42318" }}>
                {error}
              </p>
            )}

            {message && (
              <p role="status" style={{ color: "#167647" }}>
                {message}
              </p>
            )}

            <Button type="submit" icon="arrow" disabled={loading}>
              {loading
                ? "Please wait..."
                : login
                  ? "Log in securely"
                  : "Create account"}
            </Button>
          </form>

          <div className="auth-switch">
            {login ? "New to SchemeAI?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => go(login ? "register" : "login")}
            >
              {login ? "Create an account" : "Log in"}
            </button>
          </div>

          <div className="secure-line">
            <Icon name="lock" size={15} />
            Your account information is encrypted and secure
          </div>
        </div>
      </section>
    </main>
  );
}

// ---- Forgot / reset password -------------------------------------------------

// The emailed link looks like  http://localhost:8443/?reset_token=...
function readResetToken(): string | null {
  try {
    const token = new URLSearchParams(window.location.search).get("reset_token");
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
}

function AuthShell({ go, title, intro, children }: { go: (p: Page) => void; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Logo />
        <div className="auth-message">
          <div className="eyebrow light"><Icon name="shield" size={15} /> Account recovery</div>
          <h1>Get back into your account.</h1>
          <p>Reset links work only once and expire after 30 minutes.</p>
        </div>
        <small>SchemeAI · Independent eligibility assistance</small>
      </section>
      <section className="auth-form">
        <button className="back-home" onClick={() => go("login")}><Icon name="arrow" size={17} /> Back to log in</button>
        <div className="auth-form-inner">
          <div className="mobile-logo"><Logo /></div>
          <h1>{title}</h1>
          <p>{intro}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

function ForgotPasswordPage({ go }: { go: (p: Page) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: import("react").FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setSent(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell go={go} title="Forgot your password?" intro="Enter the email you registered with and we will send you a link to choose a new password.">
      {sent ? (
        <>
          <p role="status" style={{ color: "#167647" }}>{sent}</p>
          <p style={mutedNote}>Nothing arrived? Check your spam folder, wait a minute and try again.</p>
          <div style={{ marginTop: 16 }}><Button onClick={() => go("login")}>Back to log in</Button></div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <Field label="Email address">
            <div className="input-wrap">
              <Icon name="document" />
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
          </Field>
          {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
          <Button type="submit" icon="arrow" disabled={loading}>{loading ? "Please wait..." : "Send reset link"}</Button>
        </form>
      )}
    </AuthShell>
  );
}

function ResetPasswordPage({ token, go }: { token: string; go: (p: Page) => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: import("react").FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Your password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      setDone(await resetPassword(token, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell go={go} title="Choose a new password" intro="Pick a password you have not used elsewhere. You will be logged out on all other devices.">
      {done ? (
        <>
          <p role="status" style={{ color: "#167647" }}>{done}</p>
          <div style={{ marginTop: 16 }}><Button icon="arrow" onClick={() => go("login")}>Log in</Button></div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <Field label="New password">
            <div className="input-wrap"><Icon name="lock" /><PasswordInput placeholder="Enter a new password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} /></div>
          </Field>
          <Field label="Confirm new password">
            <div className="input-wrap"><Icon name="lock" /><PasswordInput placeholder="Re-enter the new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" /></div>
          </Field>
          {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
          {error.includes("link") && <p style={mutedNote}><button type="button" className="text-link" onClick={() => go("forgot")}>Request a new reset link</button></p>}
          <Button type="submit" icon="arrow" disabled={loading}>{loading ? "Please wait..." : "Update password"}</Button>
        </form>
      )}
    </AuthShell>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

function Dashboard({ go, user, onLogout, results, profile, onSelect }: { go: (p: Page) => void; user: User; onLogout: () => void; results: SchemeView[] | null; profile: EligibilityProfile | null; onSelect: (s: SchemeView) => void }) {
  const [side, setSide] = useState(false);
  const links: [IconName, string][] = [["grid", "Dashboard"], ["sparkle", "Check eligibility"], ["gift", "Recommended schemes"], ["bookmark", "Saved schemes"], ["profile", "Profile"], ["settings", "Settings"]];
  const matched = results ? results.length : null;
  // Only real numbers are shown. Features that do not exist yet say "Coming soon".
  const stats: [IconName, string, string, string][] = [
    ["gift", matched === null ? "—" : String(matched), "Schemes matched", matched === null ? "Run an eligibility check" : "From your last check"],
    ["bookmark", "—", "Saved schemes", "Coming soon"],
    ["document", "—", "Applications", "Coming soon"],
    ["profile", "—", "Profile complete", "Coming soon"],
  ];
  const onLink = (text: string) => { if (text === "Check eligibility") go("eligibility"); if (text === "Recommended schemes") go("results"); };
  return <main className="dashboard"><aside className={side ? "sidebar open" : "sidebar"}><Logo /><nav>{links.map(([icon, text], i) => <button className={i === 0 ? "active" : ""} key={text} onClick={() => onLink(text)}><Icon name={icon} />{text}</button>)}</nav><div className="side-profile"><span>{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><Icon name="chevron" size={15} /></div><button className="logout" onClick={onLogout}><Icon name="logout" /> Log out</button></aside><section className="dash-main"><header><button className="menu-button" onClick={() => setSide(!side)}><Icon name="menu" /></button><div><h1>Welcome back, {user.name.split(" ")[0]}!</h1><p>Find government schemes that may match your details.</p></div><div className="dash-head-actions"><span>{initials(user.name)}</span></div></header><div className="dash-content">
    <section className="dash-banner"><div><div className="eyebrow light"><Icon name="sparkle" size={15} /> Eligibility assistant</div><h2>{matched === null ? "Find schemes that may match you" : matched === 0 ? "No matching schemes yet" : `You have ${matched} matching ${matched === 1 ? "scheme" : "schemes"}`}</h2><p>{matched === null ? "Answer a few simple questions to see which government schemes may suit you." : "Based on the details you entered in your last eligibility check."}</p><Button onClick={() => go(matched === null ? "eligibility" : "results")}>{matched === null ? "Check my eligibility" : "View my matches"}</Button></div><div className="dash-banner-art"><Icon name="brain" size={54} /></div></section>
    <div className="stats-grid">{stats.map(([icon, num, title, sub]) => <div className="stat-card" key={title}><span><Icon name={icon} /></span><div><strong>{num}</strong><p>{title}</p><small>{sub}</small></div></div>)}</div>
    <section className="dash-section"><div className="section-top"><div><h2>Your matches</h2><p>Schemes that match your last eligibility check</p></div>{results && results.length > 0 && <button className="text-link" onClick={() => go("results")}>View all <Icon name="arrow" size={16} /></button>}</div>{results && results.length > 0 ? <div className="dash-schemes">{results.slice(0, 2).map((s, i) => <article key={s.id ?? s.name}><div className={`scheme-icon scheme-${i + 1}`}><Icon name="document" /></div><div><span className="eligible-pill"><Icon name="check" size={12} /> May be eligible</span><h3>{s.name}</h3>{s.department && <small>{s.department}</small>}<p>{s.benefit}</p></div><button aria-label={`View details of ${s.name}`} onClick={() => onSelect(s)}><Icon name="chevron" /></button></article>)}</div> : <p style={{ ...mutedNote, marginTop: 14 }}>{results ? "No schemes in our database matched your last check." : "You have not run an eligibility check yet."}</p>}</section>
    <div className="dash-columns"><section className="dash-section" style={{ gridColumn: "1 / -1" }}><div className="section-top"><div><h2>Your last eligibility check</h2><p>{profile ? `Age ${profile.age} · ${occupationLabel(profile.occupation)} · ${profile.state} · ${profile.category}` : "Your details will appear here after you run a check."}</p></div><Button variant="secondary" onClick={() => go("eligibility")}>{profile ? "Update my details" : "Check my eligibility"}</Button></div></section></div>
  </div></section></main>;
}

export default function App() {
  // A reset link (?reset_token=...) opens the "choose a new password" page.
  const [resetToken, setResetToken] = useState<string | null>(readResetToken);
  const [page, setPage] = useState<Page>(() => (readResetToken() ? "reset" : "home"));
  const [user, setUser] = useState<User | null>(null);
  // true while we ask the backend whether a saved login is still valid
  const [checking, setChecking] = useState(() => getToken() !== null && readResetToken() === null);
  // Eligibility check: what the user typed, the matches found, and the scheme being viewed.
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [profile, setProfile] = useState<EligibilityProfile | null>(null);
  const [results, setResults] = useState<SchemeView[] | null>(null);
  const [notMatched, setNotMatched] = useState<NotEligibleView[]>([]);
  const [selected, setSelected] = useState<SchemeView | null>(null);
  const go = (next: Page) => {
    if (next !== "reset") setResetToken(null); // the link is single-use; do not keep it around
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Opened from a reset link: forget any old login on this browser and remove
  // the secret token from the address bar so it is not left in the history.
  useEffect(() => {
    if (!resetToken) return;
    logoutUser();
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* not important */ }
  }, []);

  // On first load: if a login was saved earlier, confirm it with the backend.
  useEffect(() => {
    if (resetToken || !getToken()) return;
    let cancelled = false;
    getCurrentUser()
      .then((current) => {
        if (cancelled) return;
        setUser(current);
        setPage("dashboard");
      })
      .catch((err) => {
        // Only forget the login if the backend says it is invalid or expired.
        if (err instanceof ApiError && err.status === 401) logoutUser();
      })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  const handleLogin = (loggedIn: User) => { setUser(loggedIn); go("dashboard"); };
  const handleLogout = () => {
    logoutUser();
    setUser(null);
    // forget the personal details too, in case the computer is shared
    setForm(emptyForm);
    setProfile(null);
    setResults(null);
    setNotMatched([]);
    setSelected(null);
    go("home");
  };
  const handleAnalyze = (p: EligibilityProfile) => { setProfile(p); setResults(null); setNotMatched([]); go("processing"); };
  const handleResults = (result: EligibilityResult) => { setResults(result.eligible); setNotMatched(result.notEligible); go("results"); };
  const handleSelect = (scheme: SchemeView) => { setSelected(scheme); go("details"); };

  const eligibilityPage = <EligibilityPage go={go} form={form} setForm={setForm} onAnalyze={handleAnalyze} />;
  const resultsPage = <ResultsPage go={go} profile={profile} results={results} notMatched={notMatched} onSelect={handleSelect} />;

  const renderPage = () => {
    if (checking) return <main className="processing-page"><Logo /><p>Loading…</p></main>;
    if (page === "eligibility") return eligibilityPage;
    if (page === "processing") return profile ? <ProcessingPage go={go} profile={profile} onResults={handleResults} /> : eligibilityPage;
    if (page === "results") return resultsPage;
    if (page === "details") return selected ? <DetailsPage go={go} scheme={selected} /> : resultsPage;
    if (page === "login" || page === "register") return <AuthPage type={page} go={go} onLogin={handleLogin} />;
    if (page === "forgot") return <ForgotPasswordPage go={go} />;
    if (page === "reset") return resetToken ? <ResetPasswordPage token={resetToken} go={go} /> : <ForgotPasswordPage go={go} />;
    // The dashboard is private: without a verified user, show the login page instead.
    if (page === "dashboard") return user ? <Dashboard go={go} user={user} onLogout={handleLogout} results={results} profile={profile} onSelect={handleSelect} /> : <AuthPage type="login" go={go} onLogin={handleLogin} />;
    return <HomePage go={go} onSelect={handleSelect} />;
  };

  return <UserContext.Provider value={user}>{renderPage()}</UserContext.Provider>;
}
