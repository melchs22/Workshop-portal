import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api, clearSession, hasSession, saveSession } from "./api";
import type { ApplicationStatus, Booking, GarageProfile, QuoteDraft } from "./types";
import smrFavicon from "./assets/smart-mobility-roadcare-favicon.png";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Needs a quote",
  QUOTED: "Awaiting member",
  ACCEPTED: "Ready to start",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

const STATUS_FILTERS = [
  ["", "All bookings"],
  ["PENDING", "Needs a quote"],
  ["QUOTED", "Awaiting member"],
  ["ACCEPTED", "Ready to start"],
  ["IN_PROGRESS", "In progress"],
  ["COMPLETED", "Completed"],
];

function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Not set";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-MW", options ?? { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatMoney(value: string | number | null | undefined, currency = "MWK") {
  if (value === null || value === undefined || value === "") return "—";
  return `${currency} ${Number(value).toLocaleString("en-MW", { maximumFractionDigits: 0 })}`;
}

function App() {
  const [authenticated, setAuthenticated] = useState(hasSession);
  const [profile, setProfile] = useState<GarageProfile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [profileRetry, setProfileRetry] = useState(0);

  useEffect(() => {
    const expireSession = () => setAuthenticated(false);
    window.addEventListener("smr-session-expired", expireSession);
    return () => window.removeEventListener("smr-session-expired", expireSession);
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setProfile(null);
      setProfileError("");
      return;
    }
    let active = true;
    api.getProfile()
      .then((garage) => {
        if (active) setProfile(garage);
      })
      .catch((error: Error) => {
        if (active) setProfileError(error.message);
      });
    return () => {
      active = false;
    };
  }, [authenticated, profileRetry]);

  function signOut() {
    clearSession();
    setAuthenticated(false);
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/bookings" replace /> : <LoginPage onLogin={() => setAuthenticated(true)} />}
      />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/application-status" element={<ApplicationStatusPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route
        path="/*"
        element={
          authenticated ? (
            <PortalLayout profile={profile} profileError={profileError} onSignOut={signOut}>
              <Routes>
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />
                <Route path="/profile" element={<ProfilePage profile={profile} profileError={profileError} onRetryProfile={() => setProfileRetry((value) => value + 1)} onProfileUpdated={setProfile} />} />
                <Route path="/" element={<Navigate to="/bookings" replace />} />
                <Route path="*" element={<Navigate to="/bookings" replace />} />
              </Routes>
            </PortalLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api.login(username.trim(), password);
      if (session.user.role !== "WORKSHOP" || !session.user.is_approved) {
        throw new Error("This account is not an approved workshop account.");
      }
      saveSession(session);
      onLogin();
      navigate("/bookings", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link className="brand brand-light" to="/login"><BrandLabel /></Link>
        <div className="auth-brand-copy">
          <span className="eyebrow eyebrow-light">SMART MOBILITY ROADCARE</span>
          <h1>Good work deserves a better way to run.</h1>
          <p>One calm place to manage service requests, confirm work, and keep your workshop details up to date.</p>
        </div>
        <div className="brand-footnote"><ShieldCheck size={16} /> Access is provided to ROSAF-approved workshops.</div>
      </section>
      <section className="auth-form-panel">
        <div className="mobile-brand"><Link className="brand" to="/login"><BrandLabel /></Link></div>
        <div className="auth-form-wrap">
          <span className="eyebrow">WORKSHOP ACCESS</span>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with the account ROSAF activated for your service centre.</p>
          {error && <ErrorBanner message={error} />}
          <form onSubmit={submit} className="form-stack">
            <label className="field"><span>Email or username</span><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
            <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="button button-primary button-wide" disabled={busy}>{busy ? <><span className="spinner" /> Signing in</> : <>Sign in <ArrowRight size={17} /></>}</button>
          </form>
          <div className="auth-links">
            <Link to="/set-password">Set up or reset password</Link>
            <Link to="/application-status">Check application status <ArrowRight size={14} /></Link>
            <Link to="/register">Apply to join the workshop network <ArrowRight size={14} /></Link>
          </div>
          <p className="auth-support">Not yet approved? Sign-in access is enabled after your workshop application is reviewed.</p>
        </div>
      </section>
    </main>
  );
}

function SetPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.requestPasswordCode(email.trim());
      setCodeSent(true);
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not request a code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.setPassword(email.trim(), code.trim(), password);
      setMessage(result.message);
      setCodeSent(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not set your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSimplePage>
      <span className="eyebrow">ACCOUNT ACCESS</span>
      <h2>Set up your password</h2>
      <p className="muted">Use the workshop owner email associated with your approved service centre.</p>
      {error && <ErrorBanner message={error} />}
      {message && <SuccessBanner message={message} />}
      {!codeSent ? (
        <form className="form-stack" onSubmit={sendCode}>
          <label className="field"><span>Workshop email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <button className="button button-primary button-wide" disabled={busy}>{busy ? "Sending…" : "Email a setup code"} <ArrowRight size={17} /></button>
        </form>
      ) : (
        <form className="form-stack" onSubmit={confirmPassword}>
          <label className="field"><span>Six-digit code</span><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} minLength={6} maxLength={6} required /></label>
          <label className="field"><span>New password</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
          <button className="button button-primary button-wide" disabled={busy}>{busy ? "Saving…" : "Set password"} <Check size={17} /></button>
          <button className="text-button" type="button" onClick={() => setCodeSent(false)}>Use a different email</button>
        </form>
      )}
      <Link className="back-link" to="/login"><ArrowLeft size={15} /> Back to sign in</Link>
    </AuthSimplePage>
  );
}

function AuthSimplePage({ children }: { children: React.ReactNode }) {
  return (
    <main className="simple-auth-page">
      <Link className="brand" to="/login"><BrandLabel /></Link>
      <section className="simple-auth-card">{children}</section>
      <p className="muted auth-footer">Smart Mobility Roadcare · Malawi</p>
    </main>
  );
}

function ApplicationStatusPage() {
  const [trackingId, setTrackingId] = useState("");
  const [application, setApplication] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const submittedTrackingId = searchParams.get("tracking_id");
    if (submittedTrackingId) {
      setTrackingId(submittedTrackingId);
      void api.getApplicationStatus(submittedTrackingId)
        .then(setApplication)
        .catch((reason: Error) => setError(reason.message));
    }
  }, [searchParams]);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setApplication(null);
    try {
      setApplication(await api.getApplicationStatus(trackingId.trim().toUpperCase()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not find that application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSimplePage>
      <span className="eyebrow">APPLICATION TRACKING</span>
      <h2>Check your application</h2>
      <p className="muted">Enter the tracking ID you received when the service centre application was submitted.</p>
      {error && <ErrorBanner message={error} />}
      <form className="form-stack" onSubmit={search}>
        <label className="field"><span>Application tracking ID</span><input className="tracking-input" value={trackingId} onChange={(event) => setTrackingId(event.target.value)} maxLength={10} required /></label>
        <button className="button button-primary button-wide" disabled={busy}>{busy ? "Checking…" : "Check status"} <ArrowRight size={17} /></button>
      </form>
      {application && <ApplicationCard application={application} />}
      <Link className="back-link" to="/login"><ArrowLeft size={15} /> Back to sign in</Link>
    </AuthSimplePage>
  );
}

const VEHICLE_OPTIONS = [["MOTORCYCLE", "Motorcycle"], ["CAR", "Car"], ["VAN", "Van"], ["TRUCK", "Truck"]];
const SERVICE_OPTIONS = [
  ["ENGINE_REPAIR", "Engine repair"], ["BRAKE_SERVICE", "Brake service"],
  ["ELECTRICAL_DIAGNOSTICS", "Electrical & diagnostics"], ["TIRE_WHEEL", "Tyre & wheel"],
  ["BODY_WORK", "Body work & painting"], ["ROUTINE_SERVICING", "Routine servicing"],
  ["ACCIDENT_REPAIR", "Accident repair"],
];
const DAY_OPTIONS = [["monday", "Mon"], ["tuesday", "Tue"], ["wednesday", "Wed"], ["thursday", "Thu"], ["friday", "Fri"], ["saturday", "Sat"], ["sunday", "Sun"]];
const WORKSHOP_TERMS_URL = (() => {
  const defaultUrl = "https://smartmobilityroadcare.com/terms-and-conditions";
  const configuredUrl = import.meta.env.VITE_WORKSHOP_TERMS_URL?.trim();
  if (!configuredUrl) return defaultUrl;
  try {
    const url = new URL(configuredUrl);
    return url.protocol === "https:" ? url.href : defaultUrl;
  } catch {
    return defaultUrl;
  }
})();

type RegistrationData = {
  name: string;
  garage_type: string;
  years_in_operation: string;
  physical_address: string;
  latitude: string;
  longitude: string;
  operating_hours: Record<string, string>;
  primary_phone: string;
  secondary_phone: string;
  business_email: string;
  owner_name: string;
  owner_national_id: string;
  owner_phone: string;
  owner_email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  tin_tax_id: string;
  vehicle_types: string[];
  services_offered: string[];
  is_price_negotiable: boolean;
  mechanics_count: string;
  lead_mechanic_name: string;
  experience_years: string;
  certifications: string;
  specialized_skills: string;
  warranty_offered: boolean;
  warranty_duration_days: string;
  avg_turnaround_hours: string;
  emergency_service_available: boolean;
  working_days: string[];
  cancellation_policy: string;
  payment_method: string;
  account_holder_name: string;
  account_number: string;
  provider_name: string;
  settlement_preference: string;
  terms_accepted: boolean;
};

type PricingItem = {
  service: string;
  price: string;
};

const INITIAL_REGISTRATION: RegistrationData = {
  name: "", garage_type: "INDIVIDUAL", years_in_operation: "", physical_address: "",
  latitude: "", longitude: "", operating_hours: Object.fromEntries(DAY_OPTIONS.map(([day]) => [day, "Closed"])),
  primary_phone: "", secondary_phone: "", business_email: "", owner_name: "",
  owner_national_id: "", owner_phone: "", owner_email: "", emergency_contact_name: "",
  emergency_contact_phone: "", manager_name: "", manager_phone: "", manager_email: "",
  tin_tax_id: "", vehicle_types: [], services_offered: [],
  is_price_negotiable: false, mechanics_count: "1", lead_mechanic_name: "",
  experience_years: "", certifications: "", specialized_skills: "",
  warranty_offered: false, warranty_duration_days: "", avg_turnaround_hours: "24",
  emergency_service_available: false, working_days: [], cancellation_policy: "",
  payment_method: "MOBILE_MONEY", account_holder_name: "", account_number: "",
  provider_name: "", settlement_preference: "WEEKLY", terms_accepted: false,
};

function pricingInfoFrom(value: GarageProfile["pricing_info"]): PricingItem[] {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("Saved typical pricing could not be read. Contact support before changing your profile.");
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved typical pricing has an unsupported format. Contact support before changing your profile.");
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  const items = entries.map(([service, price]) => {
    if (typeof price !== "string" && typeof price !== "number") {
      throw new Error("Saved typical pricing has an unsupported format. Contact support before changing your profile.");
    }
    return { service, price: String(price) };
  });
  return items.length ? items : [{ service: "", price: "" }];
}

function pricingInfoFromItems(items: PricingItem[]) {
  if (items.some((item) => Boolean(item.service.trim()) !== Boolean(item.price.trim()))) return null;
  const services = items.map((item) => item.service.trim().toLocaleLowerCase()).filter(Boolean);
  if (new Set(services).size !== services.length) return null;
  return Object.fromEntries(
    items
      .filter((item) => item.service.trim() && item.price.trim())
      .map((item) => [item.service.trim(), item.price.trim()]),
  );
}

function RegistrationPage() {
  const [form, setForm] = useState<RegistrationData>(INITIAL_REGISTRATION);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([{ service: "", price: "" }]);
  const [trackingId, setTrackingId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  function setField<K extends keyof RegistrationData>(key: K, value: RegistrationData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "vehicle_types" | "services_offered" | "working_days", value: string) {
    const current = form[key];
    setField(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as RegistrationData[typeof key]);
  }

  function setHours(day: string, value: string) {
    setForm((current) => ({ ...current, operating_hours: { ...current.operating_hours, [day]: value } }));
  }

  function reviewApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.working_days.length || !form.vehicle_types.length || !form.services_offered.length) {
      setError("Select at least one working day, vehicle type, and service.");
      return;
    }
    if (form.working_days.some((day) => {
      const [opening, closing] = form.operating_hours[day]?.split("-") ?? [];
      return !opening || !closing || opening >= closing;
    })) {
      setError("Set valid opening and closing times for every selected working day.");
      return;
    }
    const exterior = files.exterior_photo;
    const interior = files.interior_workshop_photo;
    if (!exterior || !interior) {
      setError("Upload both a workshop exterior photo and an interior workshop photo.");
      return;
    }

    if (!pricingInfoFromItems(pricingItems)) {
      const incomplete = pricingItems.some((item) => Boolean(item.service.trim()) !== Boolean(item.price.trim()));
      setError(incomplete
        ? "Complete both the service and typical price for each pricing line, or remove the empty line."
        : "Each typical pricing service must be listed only once.");
      return;
    }

    setReviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitApplication() {
    setError("");
    const exterior = files.exterior_photo;
    const interior = files.interior_workshop_photo;
    if (!exterior || !interior) {
      setError("Upload both a workshop exterior photo and an interior workshop photo.");
      setReviewing(false);
      return;
    }
    const pricing = pricingInfoFromItems(pricingItems) ?? {};
    const payload = new FormData();
    const scalarFields: Array<keyof RegistrationData> = [
      "name", "garage_type", "years_in_operation", "physical_address", "primary_phone",
      "business_email", "owner_name", "owner_national_id", "owner_phone", "owner_email",
      "cancellation_policy", "payment_method", "account_holder_name", "account_number",
      "provider_name", "settlement_preference",
    ];
    scalarFields.forEach((field) => payload.append(field, String(form[field])));
    const optionalScalars: Array<keyof RegistrationData> = [
      "latitude", "longitude", "secondary_phone", "emergency_contact_name",
      "emergency_contact_phone", "manager_name", "manager_phone", "manager_email",
      "tin_tax_id", "lead_mechanic_name", "experience_years", "specialized_skills",
      "warranty_duration_days",
    ];
    optionalScalars.forEach((field) => {
      const value = form[field];
      if (value !== "") payload.append(field, String(value));
    });
    payload.append("operating_hours", JSON.stringify(form.operating_hours));
    payload.append("working_days", JSON.stringify(form.working_days));
    payload.append("vehicle_types", JSON.stringify(form.vehicle_types));
    payload.append("services_offered", JSON.stringify(form.services_offered));
    payload.append("services_not_offered", "[]");
    payload.append("pricing_info", JSON.stringify(pricing));
    payload.append("certifications", JSON.stringify(form.certifications.split(",").map((value) => value.trim()).filter(Boolean)));
    payload.append("mechanics_count", form.mechanics_count);
    payload.append("avg_turnaround_hours", form.avg_turnaround_hours);
    payload.append("is_price_negotiable", String(form.is_price_negotiable));
    payload.append("warranty_offered", String(form.warranty_offered));
    payload.append("emergency_service_available", String(form.emergency_service_available));
    payload.append("terms_accepted", String(form.terms_accepted));
    payload.append("exterior_photo", exterior);
    payload.append("interior_workshop_photo", interior);
    Object.entries(files).forEach(([name, file]) => {
      if (file && name !== "exterior_photo" && name !== "interior_workshop_photo") payload.append(name, file);
    });

    setBusy(true);
    try {
      const result = await api.registerWorkshop(payload);
      setTrackingId(result.application_tracking_id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit the application.");
    } finally {
      setBusy(false);
    }
  }

  if (trackingId) {
    return <AuthSimplePage>
      <div className="registration-success-icon"><CheckCircle2 size={26} /></div>
      <span className="eyebrow">APPLICATION SUBMITTED</span>
      <h2>Thanks for applying</h2>
      <p className="muted">Your service centre application is now in the review queue. Keep this tracking ID to check progress.</p>
      <div className="tracking-result"><span>Application tracking ID</span><strong>{trackingId}</strong></div>
      <Link className="button button-primary button-wide" to={`/application-status?tracking_id=${trackingId}`}>Check application status <ArrowRight size={16} /></Link>
      <Link className="back-link" to="/login">Back to sign in</Link>
    </AuthSimplePage>;
  }

  if (reviewing) {
    return <RegistrationReviewPage
      form={form}
      files={files}
      pricingItems={pricingItems.filter((item) => item.service.trim() && item.price.trim())}
      error={error}
      busy={busy}
      onEdit={() => { setReviewing(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      onSubmit={submitApplication}
    />;
  }

  return <div className="registration-page">
    <header className="registration-topbar">
      <Link className="brand" to="/login"><BrandLabel /></Link>
      <Link className="back-link" to="/login"><ArrowLeft size={15} /> Already approved? Sign in</Link>
    </header>
    <main className="registration-content">
      <div className="page-heading"><div><span className="eyebrow">ROSAF SERVICE CENTRE NETWORK</span><h1>Apply to become an approved workshop</h1><p>Share your service centre details. ROSAF reviews each application before enabling portal access.</p></div></div>
      {error && <ErrorBanner message={error} />}
      <form className="page-stack" onSubmit={reviewApplication}>
        <section className="panel">
          <div className="panel-heading"><div><h2>1. Workshop details</h2><p>Business identity, location, and contact information.</p></div><div className="icon-tile"><Building2 size={18} /></div></div>
          <div className="form-grid">
            <label className="field"><span>Service centre name</span><input value={form.name} onChange={(event) => setField("name", event.target.value)} required /></label>
            <label className="field"><span>Business type</span><select value={form.garage_type} onChange={(event) => setField("garage_type", event.target.value)}><option value="INDIVIDUAL">Individual / informal</option><option value="REGISTERED">Registered business</option></select></label>
            <label className="field"><span>Years in operation</span><input type="number" min={0} value={form.years_in_operation} onChange={(event) => setField("years_in_operation", event.target.value)} required /></label>
            <label className="field"><span>Business email</span><input type="email" value={form.business_email} onChange={(event) => setField("business_email", event.target.value)} required /></label>
            <label className="field"><span>Primary phone</span><input type="tel" placeholder="+265…" value={form.primary_phone} onChange={(event) => setField("primary_phone", event.target.value)} required /></label>
            <label className="field"><span>Secondary phone <small>optional</small></span><input type="tel" value={form.secondary_phone} onChange={(event) => setField("secondary_phone", event.target.value)} /></label>
            <label className="field field-span"><span>Physical address</span><textarea rows={2} value={form.physical_address} onChange={(event) => setField("physical_address", event.target.value)} required /></label>
            <label className="field"><span>Latitude <small>optional</small></span><input type="number" step="any" value={form.latitude} onChange={(event) => setField("latitude", event.target.value)} /></label>
            <label className="field"><span>Longitude <small>optional</small></span><input type="number" step="any" value={form.longitude} onChange={(event) => setField("longitude", event.target.value)} /></label>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>2. Owner & supporting documents</h2><p>Owner details are used for account activation after approval.</p></div><div className="icon-tile"><ShieldCheck size={18} /></div></div>
          <div className="form-grid">
            <label className="field"><span>Owner full name</span><input value={form.owner_name} onChange={(event) => setField("owner_name", event.target.value)} required /></label>
            <label className="field"><span>National ID number</span><input value={form.owner_national_id} onChange={(event) => setField("owner_national_id", event.target.value)} required /></label>
            <label className="field"><span>Owner phone</span><input type="tel" placeholder="+265…" value={form.owner_phone} onChange={(event) => setField("owner_phone", event.target.value)} required /></label>
            <label className="field"><span>Owner email</span><input type="email" value={form.owner_email} onChange={(event) => setField("owner_email", event.target.value)} required /></label>
            <label className="field"><span>Emergency contact name <small>optional</small></span><input value={form.emergency_contact_name} onChange={(event) => setField("emergency_contact_name", event.target.value)} /></label>
            <label className="field"><span>Emergency contact phone <small>optional</small></span><input type="tel" value={form.emergency_contact_phone} onChange={(event) => setField("emergency_contact_phone", event.target.value)} /></label>
            <FileField label="Workshop exterior photo" required file={files.exterior_photo} onChange={(file) => setFiles((current) => ({ ...current, exterior_photo: file }))} accept="image/*" />
            <FileField label="Workshop interior photo" required file={files.interior_workshop_photo} onChange={(file) => setFiles((current) => ({ ...current, interior_workshop_photo: file }))} accept="image/*" />
            <FileField label="Owner ID front <optional>" file={files.owner_id_front} onChange={(file) => setFiles((current) => ({ ...current, owner_id_front: file }))} accept="image/*" />
            <FileField label="Owner ID back <optional>" file={files.owner_id_back} onChange={(file) => setFiles((current) => ({ ...current, owner_id_back: file }))} accept="image/*" />
            <FileField label="Business registration certificate <optional>" file={files.business_registration_cert} onChange={(file) => setFiles((current) => ({ ...current, business_registration_cert: file }))} />
            <FileField label="Trading licence <optional>" file={files.trading_license} onChange={(file) => setFiles((current) => ({ ...current, trading_license: file }))} />
            <FileField label="Local authority letter <optional>" file={files.local_authority_letter} onChange={(file) => setFiles((current) => ({ ...current, local_authority_letter: file }))} />
            <FileField label="Tools & equipment photo <optional>" file={files.tools_equipment_photo} onChange={(file) => setFiles((current) => ({ ...current, tools_equipment_photo: file }))} accept="image/*" />
            <label className="field"><span>Manager name <small>optional</small></span><input value={form.manager_name} onChange={(event) => setField("manager_name", event.target.value)} /></label>
            <label className="field"><span>Manager phone <small>optional</small></span><input type="tel" value={form.manager_phone} onChange={(event) => setField("manager_phone", event.target.value)} /></label>
            <label className="field"><span>Manager email <small>optional</small></span><input type="email" value={form.manager_email} onChange={(event) => setField("manager_email", event.target.value)} /></label>
            <label className="field"><span>TIN / tax ID <small>optional</small></span><input value={form.tin_tax_id} onChange={(event) => setField("tin_tax_id", event.target.value)} /></label>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>3. Services & schedule</h2><p>Tell members what your team can service and when.</p></div><div className="icon-tile"><Wrench size={18} /></div></div>
          <div className="field"><span>Vehicle types supported</span><ChoiceChips options={VEHICLE_OPTIONS} selected={form.vehicle_types} onToggle={(value) => toggleList("vehicle_types", value)} /></div>
          <div className="field field-spaced"><span>Services offered</span><ChoiceChips options={SERVICE_OPTIONS} selected={form.services_offered} onToggle={(value) => toggleList("services_offered", value)} /></div>
          <div className="form-grid field-spaced">
            <label className="field"><span>Mechanics available</span><input type="number" min={1} value={form.mechanics_count} onChange={(event) => setField("mechanics_count", event.target.value)} required /></label>
            <label className="field"><span>Average turnaround (hours)</span><input type="number" min={1} value={form.avg_turnaround_hours} onChange={(event) => setField("avg_turnaround_hours", event.target.value)} required /></label>
            <label className="field"><span>Lead mechanic <small>optional</small></span><input value={form.lead_mechanic_name} onChange={(event) => setField("lead_mechanic_name", event.target.value)} /></label>
            <label className="field"><span>Experience years <small>optional</small></span><input type="number" min={0} value={form.experience_years} onChange={(event) => setField("experience_years", event.target.value)} /></label>
            <label className="field"><span>Certifications <small>comma-separated, optional</small></span><input value={form.certifications} onChange={(event) => setField("certifications", event.target.value)} /></label>
            <label className="field"><span>Specialized skills <small>optional</small></span><input value={form.specialized_skills} onChange={(event) => setField("specialized_skills", event.target.value)} /></label>
          </div>
          <div className="field field-spaced"><span>Working days</span><ChoiceChips options={DAY_OPTIONS} selected={form.working_days} onToggle={(value) => toggleList("working_days", value)} /></div>
          <div className="hours-grid">{DAY_OPTIONS.map(([day, label]) => {
            const [opening = "", closing = ""] = form.operating_hours[day] === "Closed" ? [] : form.operating_hours[day].split("-");
            const enabled = form.working_days.includes(day);
            return <label className="hours-field" key={day}><span>{label}</span><input aria-label={`${label} opening hours`} disabled={!enabled} required={enabled} type="time" value={opening} onChange={(event) => setHours(day, `${event.target.value}-${closing}`)} /><i>to</i><input aria-label={`${label} closing hours`} disabled={!enabled} required={enabled} type="time" value={closing} onChange={(event) => setHours(day, `${opening}-${event.target.value}`)} /></label>;
          })}</div>
          <PricingEditor items={pricingItems} onChange={setPricingItems} />
          <div className="toggle-grid">
            <ToggleField label="Prices are negotiable" checked={form.is_price_negotiable} onChange={(value) => setField("is_price_negotiable", value)} />
            <ToggleField label="Emergency service" checked={form.emergency_service_available} onChange={(value) => setField("emergency_service_available", value)} />
            <ToggleField label="Warranty offered" checked={form.warranty_offered} onChange={(value) => setField("warranty_offered", value)} />
          </div>
          {form.warranty_offered && <label className="field warranty-field"><span>Warranty duration in days</span><input type="number" min={1} value={form.warranty_duration_days} onChange={(event) => setField("warranty_duration_days", event.target.value)} required /></label>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>4. Settlement & terms</h2><p>Settlement details are visible only to authorized operations staff.</p></div><div className="icon-tile"><ShieldCheck size={18} /></div></div>
          <div className="form-grid">
            <label className="field"><span>Settlement method</span><select value={form.payment_method} onChange={(event) => setField("payment_method", event.target.value)}><option value="MOBILE_MONEY">Mobile money</option><option value="BANK_TRANSFER">Bank transfer</option></select></label>
            <label className="field"><span>Provider or bank name</span><input value={form.provider_name} onChange={(event) => setField("provider_name", event.target.value)} required /></label>
            <label className="field"><span>Account holder name</span><input value={form.account_holder_name} onChange={(event) => setField("account_holder_name", event.target.value)} required /></label>
            <label className="field"><span>Account number</span><input value={form.account_number} onChange={(event) => setField("account_number", event.target.value)} required /></label>
            <label className="field"><span>Settlement preference</span><select value={form.settlement_preference} onChange={(event) => setField("settlement_preference", event.target.value)}><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option></select></label>
            <label className="field field-span"><span>Cancellation policy</span><textarea rows={3} value={form.cancellation_policy} onChange={(event) => setField("cancellation_policy", event.target.value)} required /></label>
          </div>
          <label className="terms-check"><input type="checkbox" checked={form.terms_accepted} onChange={(event) => setField("terms_accepted", event.target.checked)} required /><span>I confirm these details are accurate and agree to the <a href={WORKSHOP_TERMS_URL} target="_blank" rel="noreferrer">Smart Mobility Roadcare Terms & Conditions</a>, including the terms for roadside assistance and service-centre partners.</span></label>
        </section>
        <div className="form-submit-row"><span><ShieldCheck size={15} /> Check every detail before sending your application.</span><button className="button button-primary" disabled={!form.terms_accepted}>Review application <ArrowRight size={16} /></button></div>
      </form>
    </main>
  </div>;
}

function FileField({ label, required = false, accept, file, onChange }: { label: string; required?: boolean; accept?: string; file?: File | null; onChange: (file: File | null) => void }) {
  const previewUrl = useObjectUrl(file?.type.startsWith("image/") ? file : null);
  return <label className="field file-field"><span>{label.replace(" <optional>", "")} {required && <b>*</b>}</span><input type="file" accept={accept} aria-required={required} onChange={(event) => onChange(event.target.files?.[0] ?? null)} /><small>{file?.name ?? (required ? "Required upload" : "Optional upload")}</small>{previewUrl && <img className="file-image-preview" src={previewUrl} alt={`${label.replace(" <optional>", "")} preview`} />}</label>;
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

function PricingEditor({ items, onChange }: { items: PricingItem[]; onChange: React.Dispatch<React.SetStateAction<PricingItem[]>> }) {
  return <div className="pricing-editor field-spaced">
    <div className="pricing-editor-heading">
      <div><strong>Typical pricing</strong><p>Add common services and their usual prices. Leave blank if all work is quoted individually.</p></div>
      <span>Prices in MWK</span>
    </div>
    <div className="pricing-editor-list">
      {items.map((item, index) => <div className="pricing-input-row" key={index}>
        <label className="field"><span>Service</span><input value={item.service} placeholder="e.g. Routine servicing" onChange={(event) => onChange((current) => current.map((entry, row) => row === index ? { ...entry, service: event.target.value } : entry))} /></label>
        <label className="field"><span>Typical price</span><input value={item.price} placeholder="e.g. 25,000" onChange={(event) => onChange((current) => current.map((entry, row) => row === index ? { ...entry, price: event.target.value } : entry))} /></label>
        <button className="icon-button pricing-remove" type="button" aria-label={`Remove pricing line ${index + 1}`} onClick={() => onChange((current) => current.filter((_, row) => row !== index))}><X size={15} /></button>
      </div>)}
    </div>
    <button className="text-button add-line" type="button" onClick={() => onChange((current) => [...current, { service: "", price: "" }])}>+ Add a service price</button>
  </div>;
}

function RegistrationReviewPage({ form, files, pricingItems, error, busy, onEdit, onSubmit }: {
  form: RegistrationData;
  files: Record<string, File | null>;
  pricingItems: PricingItem[];
  error: string;
  busy: boolean;
  onEdit: () => void;
  onSubmit: () => void;
}) {
  const photos = [
    ["Workshop exterior", files.exterior_photo],
    ["Workshop interior", files.interior_workshop_photo],
    ["Tools & equipment", files.tools_equipment_photo],
  ] as const;
  const documents = [
    ["Owner ID front", files.owner_id_front],
    ["Owner ID back", files.owner_id_back],
    ["Business registration certificate", files.business_registration_cert],
    ["Trading licence", files.trading_license],
    ["Local authority letter", files.local_authority_letter],
  ] as const;
  const selectedDays = DAY_OPTIONS.filter(([day]) => form.working_days.includes(day));
  const typeLabel = form.garage_type === "INDIVIDUAL" ? "Individual / informal" : "Registered business";

  return <div className="registration-page">
    <header className="registration-topbar">
      <Link className="brand" to="/login"><BrandLabel /></Link>
      <button className="back-link review-edit-top" type="button" onClick={onEdit}><ArrowLeft size={15} /> Edit application</button>
    </header>
    <main className="registration-content review-content-page">
      <div className="page-heading"><div><span className="eyebrow">APPLICATION CHECK</span><h1>Review your application</h1><p>Check that your workshop details, service prices, and photos are accurate before sending them for review.</p></div></div>
      {error && <ErrorBanner message={error} />}
      <section className="panel review-panel">
        <div className="panel-heading"><div><h2>Workshop details</h2><p>Business identity, location, and main contact information.</p></div><div className="icon-tile"><Building2 size={18} /></div></div>
        <div className="review-detail-grid">
          <ReviewField label="Service centre name" value={form.name} />
          <ReviewField label="Business type" value={typeLabel} />
          <ReviewField label="Years in operation" value={form.years_in_operation} />
          <ReviewField label="Business email" value={form.business_email} />
          <ReviewField label="Primary phone" value={form.primary_phone} />
          <ReviewField label="Secondary phone" value={form.secondary_phone} />
          <ReviewField label="Physical address" value={form.physical_address} wide />
          <ReviewField label="Map coordinates" value={form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : ""} />
        </div>
      </section>
      <section className="panel review-panel">
        <div className="panel-heading"><div><h2>Owner & contacts</h2><p>These details are used for application follow-up and account activation.</p></div><div className="icon-tile"><ShieldCheck size={18} /></div></div>
        <div className="review-detail-grid">
          <ReviewField label="Owner name" value={form.owner_name} />
          <ReviewField label="National ID number" value={form.owner_national_id} />
          <ReviewField label="Owner phone" value={form.owner_phone} />
          <ReviewField label="Owner email" value={form.owner_email} />
          <ReviewField label="Emergency contact" value={form.emergency_contact_name} />
          <ReviewField label="Emergency contact phone" value={form.emergency_contact_phone} />
          <ReviewField label="Manager name" value={form.manager_name} />
          <ReviewField label="Manager phone" value={form.manager_phone} />
          <ReviewField label="Manager email" value={form.manager_email} />
          <ReviewField label="TIN / tax ID" value={form.tin_tax_id} />
        </div>
      </section>
      <section className="panel review-panel">
        <div className="panel-heading"><div><h2>Photos & supporting documents</h2><p>Confirm the images and files attached to this application.</p></div><div className="icon-tile"><FileCheck2 size={18} /></div></div>
        <div className="review-photo-grid">{photos.map(([label, file]) => file && <ReviewPhoto key={label} label={label} file={file} />)}</div>
        {documents.some(([, file]) => file) && <div className="review-document-list">{documents.map(([label, file]) => file && <div key={label}><FileCheck2 size={15} /><span>{label}</span><strong>{file.name}</strong></div>)}</div>}
      </section>
      <section className="panel review-panel">
        <div className="panel-heading"><div><h2>Services, pricing & schedule</h2><p>What the workshop can service and when it is open.</p></div><div className="icon-tile"><Wrench size={18} /></div></div>
        <div className="review-detail-grid">
          <ReviewField label="Vehicles supported" value={form.vehicle_types.map((value) => VEHICLE_OPTIONS.find(([key]) => key === value)?.[1] ?? value).join(", ")} wide />
          <ReviewField label="Services offered" value={form.services_offered.map((value) => SERVICE_OPTIONS.find(([key]) => key === value)?.[1] ?? value).join(", ")} wide />
          <ReviewField label="Mechanics available" value={form.mechanics_count} />
          <ReviewField label="Average turnaround" value={`${form.avg_turnaround_hours} hours`} />
          <ReviewField label="Lead mechanic" value={form.lead_mechanic_name} />
          <ReviewField label="Experience" value={form.experience_years ? `${form.experience_years} years` : ""} />
          <ReviewField label="Certifications" value={form.certifications} />
          <ReviewField label="Specialized skills" value={form.specialized_skills} />
          <ReviewField label="Working days" value={selectedDays.map(([, label]) => label).join(", ")} />
          <ReviewField label="Operating hours" value={selectedDays.map(([day, label]) => `${label}: ${form.operating_hours[day]}`).join(" · ")} wide />
          <ReviewField label="Typical pricing" value={pricingItems.length ? "See service prices below" : "Prices provided on request"} wide />
        </div>
        {pricingItems.length > 0 && <div className="review-pricing-list">{pricingItems.map((item) => <div key={item.service}><span>{item.service}</span><strong>{item.price} MWK</strong></div>)}</div>}
        <div className="review-flags">
          <span>{form.is_price_negotiable ? "Prices are negotiable" : "Prices are fixed"}</span>
          <span>{form.emergency_service_available ? "Emergency service available" : "No emergency service"}</span>
          <span>{form.warranty_offered ? `Warranty offered${form.warranty_duration_days ? ` · ${form.warranty_duration_days} days` : ""}` : "No warranty offered"}</span>
        </div>
        <div className="review-note"><strong>Cancellation policy</strong><p>{form.cancellation_policy}</p></div>
      </section>
      <section className="panel review-panel">
        <div className="panel-heading"><div><h2>Settlement & agreement</h2><p>Settlement details are shared only with authorized operations staff.</p></div><div className="icon-tile"><ShieldCheck size={18} /></div></div>
        <div className="review-detail-grid">
          <ReviewField label="Settlement method" value={form.payment_method === "MOBILE_MONEY" ? "Mobile money" : "Bank transfer"} />
          <ReviewField label="Provider or bank" value={form.provider_name} />
          <ReviewField label="Account holder" value={form.account_holder_name} />
          <ReviewField label="Account number" value={form.account_number} />
          <ReviewField label="Settlement frequency" value={form.settlement_preference === "WEEKLY" ? "Weekly" : "Daily"} />
          <ReviewField label="Terms & conditions" value={form.terms_accepted ? "Accepted" : "Not accepted"} />
        </div>
      </section>
      <div className="review-actions">
        <button className="button button-outline" type="button" onClick={onEdit}><ArrowLeft size={15} /> Edit application</button>
        <button className="button button-primary" type="button" disabled={busy} onClick={onSubmit}>{busy ? "Sending application…" : "Submit application"} <ArrowRight size={16} /></button>
      </div>
    </main>
  </div>;
}

function ReviewField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`review-field${wide ? " review-field-wide" : ""}`}><span>{label}</span><strong>{value.trim() || "Not provided"}</strong></div>;
}

function ReviewPhoto({ label, file }: { label: string; file: File }) {
  const previewUrl = useObjectUrl(file);
  return <figure className="review-photo"><img src={previewUrl} alt={label} /><figcaption><strong>{label}</strong><span>{file.name}</span></figcaption></figure>;
}

function ApplicationCard({ application }: { application: ApplicationStatus }) {
  const stateText: Record<string, string> = {
    SUBMITTED: "Your application is in the queue for review.",
    UNDER_REVIEW: "The ROSAF team is reviewing your service centre details.",
    VERIFIED: "Your service centre is approved. Check your email for account setup instructions.",
    REJECTED: application.rejection_reason || "The application was not approved.",
    SUSPENDED: application.suspension_reason || "The service centre account is currently suspended.",
  };
  return (
    <section className="application-card">
      <div className="application-card-head"><div className="icon-tile"><FileCheck2 size={19} /></div><StatusBadge status={application.verification_status} /></div>
      <h3>{application.name}</h3>
      <p>{stateText[application.verification_status] ?? "Application status updated."}</p>
      <dl className="detail-list">
        <div><dt>Tracking ID</dt><dd>{application.application_tracking_id}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(application.registration_date)}</dd></div>
        <div><dt>Completeness</dt><dd>{Number(application.submission_completeness).toFixed(0)}%</dd></div>
      </dl>
    </section>
  );
}

function PortalLayout({
  children,
  profile,
  profileError,
  onSignOut,
}: {
  children: React.ReactNode;
  profile: GarageProfile | null;
  profileError: string;
  onSignOut: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  function logout() {
    onSignOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="portal-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Link className="brand brand-light sidebar-brand" to="/bookings"><BrandLabel /></Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav">
          <NavLink to="/bookings" onClick={() => setMobileOpen(false)}><LayoutDashboard size={18} /> Overview</NavLink>
          <NavLink to="/profile" onClick={() => setMobileOpen(false)}><Settings2 size={18} /> Service centre profile</NavLink>
        </nav>
        <div className="sidebar-help">
          <div className="sidebar-help-icon"><ShieldCheck size={17} /></div>
          <strong>Need a hand?</strong>
          <p>Ask your ROSAF administrator for help with workshop access or account details.</p>
        </div>
        <button className="sidebar-signout" onClick={logout}><LogOut size={17} /> Sign out</button>
      </aside>
      <div className="portal-main">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workshop</span><ChevronDown size={14} /><strong>Operations</strong></div>
          <div className="topbar-right">
            <div className="topbar-status"><span className={`online-dot ${profileError ? "offline-dot" : !profile ? "connecting-dot" : ""}`} />{profileError ? "API unavailable" : profile ? "Connected" : "Connecting"}</div>
            <div className="user-chip"><div className="user-avatar">{profile?.name?.slice(0, 1).toUpperCase() ?? "W"}</div><div><strong>{profile?.name ?? (profileError ? "Workshop" : "Loading…")}</strong><span>Workshop owner</span></div></div>
          </div>
        </header>
        {profileError && <div className="global-error"><ErrorBanner message={profileError} /></div>}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

function BookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.getBookings(search, status)
      .then((items) => {
        if (active) setBookings(items);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, status, refreshKey]);

  const counts = useMemo(() => ({
    open: bookings.filter((item) => ["PENDING", "QUOTED"].includes(item.status)).length,
    active: bookings.filter((item) => ["ACCEPTED", "IN_PROGRESS"].includes(item.status)).length,
    completed: bookings.filter((item) => item.status === "COMPLETED").length,
  }), [bookings]);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">YOUR WORKSHOP</span><h1>Service overview</h1><p>Keep requests moving and give every member a clear next step.</p></div>
        <button className="button button-outline" onClick={() => setRefreshKey((value) => value + 1)}><Activity size={16} /> Refresh</button>
      </div>
      <div className="stat-grid">
        <StatCard label="Open in results" value={loading ? "—" : counts.open} icon={<ArrowDownLeft size={18} />} tone="orange" />
        <StatCard label="Active in results" value={loading ? "—" : counts.active} icon={<Wrench size={18} />} tone="blue" />
        <StatCard label="Completed in results" value={loading ? "—" : counts.completed} icon={<CheckCircle2 size={18} />} tone="green" />
        <StatCard label="Bookings in results" value={loading ? "—" : bookings.length} icon={<CalendarDays size={18} />} tone="violet" />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Service bookings</h2><p>Member appointments at your service centre.</p></div>
          <span className="results-count">{bookings.length} {bookings.length === 1 ? "booking" : "bookings"}</span>
        </div>
        <div className="list-tools">
          <label className="search-field"><Search size={17} /><input placeholder="Search member or request details" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <select aria-label="Filter bookings by status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_FILTERS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </div>
        {error && <ErrorBanner message={error} />}
        {loading ? <LoadingState label="Loading bookings" /> : error ? null : bookings.length ? (
          <div className="booking-list">
            {bookings.map((booking) => <BookingRow key={booking.id} booking={booking} />)}
          </div>
        ) : (
          <EmptyState icon={<CalendarDays size={21} />} title={search || status ? "No matching bookings" : "No bookings yet"} body={search || status ? "Try another search or status filter." : "New member service requests will appear here when they are submitted."} />
        )}
      </section>
      <p className="page-footnote"><ShieldCheck size={14} /> Workshop bookings are managed separately from roadside assistance requests.</p>
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function BookingRow({ booking }: { booking: Booking }) {
  const mostRecentQuote = booking.quotes[0];
  return (
    <Link to={`/bookings/${booking.id}`} className="booking-row">
      <div className="booking-date"><strong>{formatDate(booking.preferred_date, { day: "2-digit" })}</strong><span>{formatDate(booking.preferred_date, { month: "short" })}</span></div>
      <div className="booking-summary"><div className="booking-title-row"><strong>{serviceLabel(booking.service_category)}</strong><StatusBadge status={booking.status} /></div><span>{booking.rider_name} <i>·</i> {vehicleLabel(booking.vehicle_type)}</span><p>{booking.description}</p></div>
      <div className="booking-meta"><span><Clock3 size={14} /> {booking.preferred_time?.slice(0, 5) ?? "Time flexible"}</span><strong>{mostRecentQuote ? formatMoney(mostRecentQuote.amount, mostRecentQuote.currency) : "Quote needed"}</strong></div>
      <ArrowRight className="booking-arrow" size={18} />
    </Link>
  );
}

function BookingDetailPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!Number.isInteger(bookingId) || bookingId < 1) {
      setError("This booking link is invalid.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    api.getBooking(bookingId)
      .then((record) => {
        if (active) setBooking(record);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, refresh]);

  function updateFromResponse(record: Booking) {
    setBooking(record);
    setRefresh((value) => value + 1);
  }

  return (
    <div className="page-stack">
      <Link className="back-link page-back-link" to="/bookings"><ArrowLeft size={15} /> Back to bookings</Link>
      {loading ? <LoadingState label="Loading booking" /> : error ? <ErrorBanner message={error} /> : booking ? (
        <BookingDetails
          booking={booking}
          onUpdated={updateFromResponse}
          onGone={() => navigate("/bookings")}
        />
      ) : null}
    </div>
  );
}

function BookingDetails({ booking, onUpdated, onGone }: { booking: Booking; onUpdated: (booking: Booking) => void; onGone: () => void }) {
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const newestQuote = booking.quotes[0];

  async function perform(action: "start" | "complete") {
    setBusyAction(action);
    setActionError("");
    try {
      const result = action === "start" ? await api.startBooking(booking.id) : await api.completeBooking(booking.id);
      onUpdated(result);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not update booking.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading detail-page-heading">
        <div><span className="eyebrow">BOOKING #{booking.id}</span><h1>{serviceLabel(booking.service_category)}</h1><p>Created {formatDate(booking.created_at)} · {booking.rider_name}</p></div>
        <StatusBadge status={booking.status} />
      </div>
      <div className="detail-layout">
        <div className="page-stack">
          <section className="panel">
            <div className="panel-heading"><div><h2>Request details</h2><p>Information provided by the member.</p></div><div className="icon-tile"><Wrench size={18} /></div></div>
            <div className="detail-grid">
              <DetailField label="Member" value={booking.rider_name} />
              <DetailField label="Vehicle type" value={vehicleLabel(booking.vehicle_type)} />
              <DetailField label="Requested date" value={formatDate(booking.preferred_date)} />
              <DetailField label="Preferred time" value={booking.preferred_time?.slice(0, 5) ?? "Flexible"} />
              <DetailField label="Service" value={serviceLabel(booking.service_category)} />
              <DetailField label="Request received" value={formatDate(booking.created_at)} />
            </div>
            <div className="description-block"><span>Description</span><p>{booking.description || "No additional details were provided."}</p></div>
            {booking.response_note && <div className="response-note"><strong>Response note</strong><p>{booking.response_note}</p></div>}
          </section>
          <section className="panel">
            <div className="panel-heading"><div><h2>Quote & schedule</h2><p>Set the confirmed date and a clear itemized estimate.</p></div></div>
            {newestQuote ? <QuoteCard quote={newestQuote} /> : <EmptyState compact icon={<FileCheck2 size={19} />} title="No quote sent" body="Create an itemized quote and confirm the appointment date." />}
            {["PENDING", "QUOTED"].includes(booking.status) && (
              <div className="action-row">
                <button className="button button-primary" onClick={() => setQuoteOpen(true)}>{newestQuote ? "Revise quote" : "Create quote"} <ArrowRight size={16} /></button>
                <button className="button button-danger-outline" onClick={() => setDeclineOpen(true)}>Decline request</button>
              </div>
            )}
          </section>
          {booking.invoice && <InvoiceCard invoice={booking.invoice} />}
          {booking.review && <section className="panel"><div className="panel-heading"><div><h2>Member feedback</h2><p>Review submitted after paid completion.</p></div></div><div className="review-content"><strong>{"★".repeat(booking.review.rating)}{"☆".repeat(5 - booking.review.rating)}</strong><p>{booking.review.comment || "No written comment."}</p><span>{formatDate(booking.review.created_at)}</span></div></section>}
        </div>
        <aside className="page-stack detail-aside">
          <section className="panel action-panel">
            <div className="panel-heading"><div><h2>Next action</h2><p>Only valid workflow actions are shown.</p></div></div>
            {actionError && <ErrorBanner message={actionError} />}
            {booking.status === "ACCEPTED" && <><p className="action-hint">The member accepted the quote. Start work when the motorcycle is checked in.</p><button className="button button-primary button-wide" disabled={Boolean(busyAction)} onClick={() => perform("start")}>{busyAction === "start" ? "Starting…" : "Start service"} <ArrowRight size={16} /></button></>}
            {booking.status === "IN_PROGRESS" && <><p className="action-hint">Mark the service complete when the quoted work is finished. This issues the member's invoice.</p><button className="button button-primary button-wide" disabled={Boolean(busyAction)} onClick={() => perform("complete")}>{busyAction === "complete" ? "Completing…" : "Complete service"} <Check size={16} /></button></>}
            {booking.status === "COMPLETED" && <div className="completion-note"><CheckCircle2 size={20} /><div><strong>Service complete</strong><span>Invoice created from the accepted quote.</span></div></div>}
            {["DECLINED", "CANCELLED"].includes(booking.status) && <div className="muted-small">This booking has ended. No further workflow actions are available.</div>}
            {["PENDING", "QUOTED"].includes(booking.status) && <div className="muted-small">Send a quote or decline this request. Work cannot start until the member accepts a quote.</div>}
          </section>
          <section className="panel">
            <div className="panel-heading"><div><h2>Request timeline</h2><p>Current booking state.</p></div></div>
            <div className="timeline">
              <TimelineRow title="Request submitted" date={booking.created_at} active />
              {newestQuote && <TimelineRow title={`Quote #${newestQuote.revision} sent`} date={newestQuote.created_at} active />}
              {booking.status === "IN_PROGRESS" || booking.status === "COMPLETED" ? <TimelineRow title="Service started" date={booking.updated_at} active /> : null}
              {booking.status === "COMPLETED" && <TimelineRow title="Service completed" date={booking.updated_at} active last />}
              {booking.status === "PENDING" && <TimelineRow title="Workshop response" date="" active={false} last />}
            </div>
          </section>
        </aside>
      </div>
      {quoteOpen && <QuoteDialog booking={booking} existingQuote={newestQuote} onClose={() => setQuoteOpen(false)} onSaved={(result) => { setQuoteOpen(false); onUpdated(result); }} />}
      {declineOpen && <DeclineDialog booking={booking} onClose={() => setDeclineOpen(false)} onSaved={(result) => { setDeclineOpen(false); onUpdated(result); onGone(); }} />}
    </div>
  );
}

function QuoteCard({ quote }: { quote: Booking["quotes"][number] }) {
  return (
    <div className="quote-card">
      <div className="quote-head"><div><span className="quote-version">REVISION {quote.revision}</span><strong>{formatMoney(quote.amount, quote.currency)}</strong></div><StatusBadge status={quote.status} /></div>
      <div className="quote-schedule"><CalendarDays size={15} /><span>Confirmed appointment</span><strong>{formatDate(quote.scheduled_date)}{quote.scheduled_time ? ` · ${quote.scheduled_time.slice(0, 5)}` : ""}</strong></div>
      <div className="line-items">
        {quote.line_items.map((item, index) => <div className="line-item" key={`${item.description}-${index}`}><span>{item.description} <small>× {item.quantity}</small></span><strong>{formatMoney(Number(item.unit_amount) * item.quantity, quote.currency)}</strong></div>)}
      </div>
      {quote.response_reason && <p className="quote-response">Member response: {quote.response_reason}</p>}
    </div>
  );
}

function InvoiceCard({ invoice }: { invoice: NonNullable<Booking["invoice"]> }) {
  return (
    <section className="panel">
      <div className="panel-heading"><div><h2>Invoice</h2><p>{invoice.invoice_number}</p></div><StatusBadge status={invoice.status} /></div>
      <div className="invoice-total"><span>Invoice total</span><strong>{formatMoney(invoice.amount, invoice.currency)}</strong></div>
      <p className="invoice-note">Issued {formatDate(invoice.issued_at)}. Payment is collected by the platform; workshop transfers are handled by ROSAF operations.</p>
      {invoice.payments.length > 0 && <div className="payment-list"><span>Payment attempts</span>{invoice.payments.map((payment) => <div key={payment.id}><div><strong>{payment.transaction_reference}</strong><small>{payment.is_excess_payment ? "Excess payment—contact ROSAF operations" : formatDate(payment.created_at)}</small></div><StatusBadge status={payment.status} /></div>)}</div>}
    </section>
  );
}

function QuoteDialog({ booking, existingQuote, onClose, onSaved }: { booking: Booking; existingQuote?: Booking["quotes"][number]; onClose: () => void; onSaved: (booking: Booking) => void }) {
  const [items, setItems] = useState<QuoteDraft[]>(existingQuote?.line_items.map((item) => ({ ...item, unit_amount: String(item.unit_amount) })) ?? [{ description: "", quantity: 1, unit_amount: "" }]);
  const [date, setDate] = useState(existingQuote?.scheduled_date ?? booking.preferred_date);
  const [time, setTime] = useState(existingQuote?.scheduled_time?.slice(0, 5) ?? booking.preferred_time?.slice(0, 5) ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");
  const total = items.reduce((sum, item) => sum + Number(item.unit_amount || 0) * Number(item.quantity || 0), 0);

  function editItem(index: number, patch: Partial<QuoteDraft>) {
    setItems((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (items.some((item) => !item.description.trim() || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || !item.unit_amount.trim() || !Number.isInteger(Number(item.unit_amount)) || Number(item.unit_amount) < 0)) {
      setError("Add a description and valid whole-MWK amount for every line item.");
      return;
    }
    if (total <= 0) {
      setError("The quote total must be greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.submitQuote(booking.id, {
        line_items: items.map((item) => ({ ...item, description: item.description.trim(), quantity: Number(item.quantity), unit_amount: String(Number(item.unit_amount)) })),
        scheduled_date: date,
        scheduled_time: time ? `${time}:00` : null,
      });
      onSaved(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the quote.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={existingQuote ? "Revise service quote" : "Create service quote"} onClose={onClose}>
      <p className="muted modal-intro">The confirmed date must meet the service centre's working schedule. Prices are in whole MWK.</p>
      {error && <ErrorBanner message={error} />}
      <form className="form-stack" onSubmit={submit}>
        <div className="field"><span>Quote line items</span>
          <div className="quote-editor">
            {items.map((item, index) => <div className="quote-edit-row" key={index}>
              <input aria-label="Line item description" placeholder="Labour or part" value={item.description} onChange={(event) => editItem(index, { description: event.target.value })} required />
              <input aria-label="Quantity" type="number" min={1} max={100} value={item.quantity} onChange={(event) => editItem(index, { quantity: Number(event.target.value) })} required />
              <input aria-label="Unit price in MWK" type="number" min={0} step={1} placeholder="MWK" value={item.unit_amount} onChange={(event) => editItem(index, { unit_amount: event.target.value })} required />
              {items.length > 1 && <button className="icon-button remove-item" type="button" aria-label="Remove item" onClick={() => setItems((current) => current.filter((_, position) => position !== index))}><X size={15} /></button>}
            </div>)}
            <button className="text-button add-line" type="button" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unit_amount: "" }])}>+ Add line item</button>
          </div>
        </div>
        <div className="form-columns">
          <label className="field"><span>Confirmed service date</span><input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label className="field"><span>Appointment time <small>optional</small></span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        </div>
        <div className="quote-total-bar"><span>Total estimate</span><strong>{formatMoney(total)}</strong></div>
        <div className="modal-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Sending…" : "Send quote"} <ArrowRight size={15} /></button></div>
      </form>
    </Modal>
  );
}

function DeclineDialog({ booking, onClose, onSaved }: { booking: Booking; onClose: () => void; onSaved: (booking: Booking) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await api.declineBooking(booking.id, reason.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not decline this booking.");
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Decline booking" onClose={onClose}>
    <p className="muted modal-intro">This will notify {booking.rider_name}. Give a clear reason so they know what to do next.</p>
    {error && <ErrorBanner message={error} />}
    <form className="form-stack" onSubmit={submit}>
      <label className="field"><span>Reason for declining</span><textarea rows={4} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
      <div className="modal-actions"><button className="button button-outline" type="button" onClick={onClose}>Keep booking</button><button className="button button-danger" disabled={busy || !reason.trim()}>{busy ? "Sending…" : "Decline request"}</button></div>
    </form>
  </Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><div className="modal-heading"><h2 id="modal-heading">{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button></div>{children}</section></div>;
}

function ProfilePage({ profile, profileError, onRetryProfile, onProfileUpdated }: { profile: GarageProfile | null; profileError: string; onRetryProfile: () => void; onProfileUpdated: (profile: GarageProfile) => void }) {
  const [form, setForm] = useState<GarageProfile | null>(profile);
  const [hoursText, setHoursText] = useState("");
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm(profile);
    setHoursText(JSON.stringify(profile.operating_hours, null, 2));
    try {
      setPricingItems(pricingInfoFrom(profile.pricing_info));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read the saved typical pricing.");
    }
  }, [profile]);

  function setField<K extends keyof GarageProfile>(key: K, value: GarageProfile[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function toggleList(key: "vehicle_types" | "services_offered" | "working_days", value: string) {
    if (!form) return;
    const current = form[key];
    setField(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as GarageProfile[typeof key]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const pricing_info = pricingInfoFromItems(pricingItems);
    if (!pricing_info) {
      const incomplete = pricingItems.some((item) => Boolean(item.service.trim()) !== Boolean(item.price.trim()));
      setError(incomplete
        ? "Complete both the service and typical price for each pricing line, or remove the empty line."
        : "Each typical pricing service must be listed only once.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const operating_hours = JSON.parse(hoursText) as Record<string, string>;
      const updated = await api.updateProfile({
        name: form.name,
        physical_address: form.physical_address,
        primary_phone: form.primary_phone,
        secondary_phone: form.secondary_phone || null,
        business_email: form.business_email,
        operating_hours,
        working_days: form.working_days,
        vehicle_types: form.vehicle_types,
        services_offered: form.services_offered,
        pricing_info,
        is_price_negotiable: form.is_price_negotiable,
        mechanics_count: Number(form.mechanics_count),
        lead_mechanic_name: form.lead_mechanic_name,
        experience_years: form.experience_years === null ? null : Number(form.experience_years),
        certifications: form.certifications,
        specialized_skills: form.specialized_skills,
        warranty_offered: form.warranty_offered,
        warranty_duration_days: form.warranty_duration_days,
        avg_turnaround_hours: Number(form.avg_turnaround_hours),
        emergency_service_available: form.emergency_service_available,
        cancellation_policy: form.cancellation_policy,
      });
      setForm(updated);
      onProfileUpdated(updated);
      setSuccess("Your service centre profile has been saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!form) return profileError ? <div className="page-stack"><ErrorBanner message={profileError} /><button className="button button-outline" onClick={onRetryProfile}>Retry profile load</button></div> : <LoadingState label="Loading workshop profile" />;

  return (
    <div className="page-stack">
      <div className="page-heading"><div><span className="eyebrow">WORKSHOP SETTINGS</span><h1>Service centre profile</h1><p>Keep your public contact details, service schedule, and capabilities accurate.</p></div><StatusBadge status={form.verification_status} /></div>
      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}
      <form className="page-stack" onSubmit={submit}>
        <section className="panel">
          <div className="panel-heading"><div><h2>Business details</h2><p>These details help members identify and contact your workshop.</p></div><div className="icon-tile"><Building2 size={18} /></div></div>
          <div className="form-grid">
            <label className="field"><span>Service centre name</span><input value={form.name} onChange={(event) => setField("name", event.target.value)} required /></label>
            <label className="field"><span>Business email</span><input type="email" value={form.business_email} onChange={(event) => setField("business_email", event.target.value)} required /></label>
            <label className="field"><span>Primary phone</span><input type="tel" value={form.primary_phone} onChange={(event) => setField("primary_phone", event.target.value)} required /></label>
            <label className="field"><span>Secondary phone <small>optional</small></span><input type="tel" value={form.secondary_phone ?? ""} onChange={(event) => setField("secondary_phone", event.target.value || null)} /></label>
            <label className="field field-span"><span>Physical address</span><textarea rows={2} value={form.physical_address} onChange={(event) => setField("physical_address", event.target.value)} required /></label>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Services & capacity</h2><p>Members can request only the vehicle types and services listed here.</p></div><div className="icon-tile"><Wrench size={18} /></div></div>
          <div className="field field-spaced"><span>Supported vehicle types</span><ChoiceChips options={VEHICLE_OPTIONS} selected={form.vehicle_types} onToggle={(value) => toggleList("vehicle_types", value)} /></div>
          <div className="field field-spaced"><span>Services offered</span><ChoiceChips options={SERVICE_OPTIONS} selected={form.services_offered} onToggle={(value) => toggleList("services_offered", value)} /></div>
          <div className="form-grid">
            <label className="field"><span>Mechanics available</span><input type="number" min={1} value={form.mechanics_count} onChange={(event) => setField("mechanics_count", Number(event.target.value))} required /></label>
            <label className="field"><span>Average turnaround (hours)</span><input type="number" min={1} value={form.avg_turnaround_hours} onChange={(event) => setField("avg_turnaround_hours", Number(event.target.value))} required /></label>
            <label className="field"><span>Lead mechanic <small>optional</small></span><input value={form.lead_mechanic_name ?? ""} onChange={(event) => setField("lead_mechanic_name", event.target.value || null)} /></label>
            <label className="field"><span>Years of experience <small>optional</small></span><input type="number" min={0} value={form.experience_years ?? ""} onChange={(event) => setField("experience_years", event.target.value ? Number(event.target.value) : null)} /></label>
          </div>
          <div className="toggle-grid">
            <ToggleField label="Emergency service available" checked={form.emergency_service_available} onChange={(value) => setField("emergency_service_available", value)} />
            <ToggleField label="Prices are negotiable" checked={form.is_price_negotiable} onChange={(value) => setField("is_price_negotiable", value)} />
            <ToggleField label="Warranty offered" checked={form.warranty_offered} onChange={(value) => setField("warranty_offered", value)} />
          </div>
          {form.warranty_offered && <label className="field warranty-field"><span>Warranty duration in days</span><input type="number" min={1} value={form.warranty_duration_days ?? ""} onChange={(event) => setField("warranty_duration_days", event.target.value ? Number(event.target.value) : null)} required /></label>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Working schedule</h2><p>Use the backend's lowercase weekday keys and 24-hour time ranges.</p></div><div className="icon-tile"><CalendarDays size={18} /></div></div>
          <div className="field"><span>Working days</span><ChoiceChips options={DAY_OPTIONS} selected={form.working_days} onToggle={(value) => toggleList("working_days", value)} /></div>
          <label className="field json-editor"><span>Operating hours <small>JSON map, e.g. {"{"}"monday": "08:00-17:00"{"}"}</small></span><textarea rows={7} spellCheck={false} value={hoursText} onChange={(event) => setHoursText(event.target.value)} required /></label>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Pricing & service policy</h2><p>Let members understand what your workshop normally charges and supports.</p></div><div className="icon-tile"><FileCheck2 size={18} /></div></div>
          <PricingEditor items={pricingItems} onChange={setPricingItems} />
          <label className="field field-spaced"><span>Specialized skills <small>optional</small></span><textarea rows={2} value={form.specialized_skills ?? ""} onChange={(event) => setField("specialized_skills", event.target.value || null)} /></label>
          <label className="field field-spaced"><span>Cancellation policy</span><textarea rows={3} value={form.cancellation_policy} onChange={(event) => setField("cancellation_policy", event.target.value)} required /></label>
        </section>
        <div className="form-submit-row"><span><ShieldCheck size={15} /> Changes are recorded in the workshop audit history.</span><button className="button button-primary" disabled={busy}>{busy ? "Saving changes…" : "Save profile"} <Check size={16} /></button></div>
      </form>
    </div>
  );
}

function ChoiceChips({ options, selected, onToggle }: { options: string[][]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="choice-chips">{options.map(([value, label]) => <button type="button" key={value} className={`choice-chip ${selected.includes(value) ? "choice-chip-selected" : ""}`} onClick={() => onToggle(value)}>{selected.includes(value) && <Check size={13} />}{label}</button>)}</div>;
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-field"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-track" /></label>;
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner" role="alert"><X size={16} /><span>{message}</span></div>;
}

function SuccessBanner({ message }: { message: string }) {
  return <div className="success-banner" role="status"><CheckCircle2 size={16} /><span>{message}</span></div>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone = ["VERIFIED", "COMPLETED", "PAID", "SETTLED", "ACCEPTED"].includes(normalized) ? "success"
    : ["PENDING", "SUBMITTED", "QUOTED", "ISSUED", "UNDER_REVIEW", "IN_PROGRESS"].includes(normalized) ? "warning"
    : ["DECLINED", "CANCELLED", "REJECTED", "SUSPENDED", "FAILED"].includes(normalized) ? "danger" : "neutral";
  const label = STATUS_LABELS[normalized] ?? normalized.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
  return <span className={`status-badge status-${tone}`}><span />{label}</span>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="detail-field"><span>{label}</span><strong>{value}</strong></div>;
}

function TimelineRow({ title, date, active, last = false }: { title: string; date: string; active: boolean; last?: boolean }) {
  return <div className={`timeline-row ${last ? "timeline-last" : ""}`}><span className={`timeline-dot ${active ? "timeline-dot-active" : ""}`} /><div><strong>{title}</strong><span>{date ? formatDate(date, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Waiting"}</span></div></div>;
}

function EmptyState({ icon, title, body, compact = false }: { icon: React.ReactNode; title: string; body: string; compact?: boolean }) {
  return <div className={`empty-state ${compact ? "empty-state-compact" : ""}`}><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{body}</p></div>;
}

function LoadingState({ label }: { label: string }) {
  return <div className="loading-state"><span className="spinner spinner-dark" />{label}</div>;
}

function BrandLabel() {
  return <><img className="brand-logo" src={smrFavicon} alt="" /><span className="brand-name">Smart Mobility <em>Roadcare</em><small>WORKSHOP PORTAL</small></span></>;
}

function serviceLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function vehicleLabel(value: string) {
  return value.toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export default App;
