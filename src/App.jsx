import { useState } from "react";

// ================== QUICK CONFIG ==================
const BUSINESS_NAME = "Bin Wash Guyz";
const WHATSAPP_NUMBER = "+447533247375"; // international format
const BOOKING_EMAIL = "binwashguyz@gmail.com"; // email for enquiries
const PHONE_NUMBER = "07533247375"; // business phone number
const BIN_OPTIONS = ["Household", "Recycling", "Food"];

// ==================================================

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#000000] text-[#f0e0b0]">
      <Header onBook={() => setOpen(true)} />
      <Hero />
      <Sections />
      <CTA />
      <Footer />
      <MobileActionBar onBook={() => setOpen(true)} />
      {open && <BookingModal onClose={() => setOpen(false)} />}
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header({ onBook }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-[#000000]/70 backdrop-blur border-b border-[#103010]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-12 h-12 rounded" />
        </div>
        <div className="font-extrabold tracking-wide text-xl text-[#f0e0b0]">
          {BUSINESS_NAME}
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#services" className="hover:text-white">Services</a>
          <a href="#benefits" className="hover:text-white">Benefits</a>
          <a href="#why" className="hover:text-white">Why Us</a>
          <a href="#contact" className="hover:text-white">Contact</a>
          <button
            onClick={onBook}
            className="ml-2 px-4 py-2 rounded-2xl bg-[#e07010] text-black font-bold shadow hover:brightness-110"
          >
            Book
          </button>
        </nav>

        <button
          className="md:hidden p-2 rounded-xl border border-[#103010] text-[#f0e0b0]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[#103010] bg-[#001820]">
          <div className="max-w-6xl mx-auto px-4 py-3 grid gap-3 text-sm">
            <a href="#services" className="py-2 border-b border-white/5">Services</a>
            <a href="#benefits" className="py-2 border-b border-white/5">Benefits</a>
            <a href="#why" className="py-2 border-b border-white/5">Why Us</a>
            <a href="#contact" className="py-2">Contact</a>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#003040] via-transparent to-transparent opacity-60" />
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 grid md:grid-cols-2 gap-10 items-center">
        <div className="relative order-1 md:order-2">
          <div className="absolute -inset-6 bg-[#103010] blur-3xl opacity-40 rounded-full" />
          <img
            src="/logo.png"
            alt={BUSINESS_NAME}
            className="relative w-full max-w-md mx-auto drop-shadow-2xl"
          />
        </div>

        <div className="order-2 md:order-1">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white">
            Fresh, Sanitised <span className="text-[#e07010]">Wheelie Bins</span>
          </h1>

          <p className="mt-4 text-lg text-[#f0e0b0]">
            We deep clean, sanitise, and deodorise your household wheelie bins right at your
            doorstep throughout{" "}
            {/* Belfast with tooltip + orange colour */}
            <span className="relative inline-block group">
              <span
                className="text-[#e07010] font-bold underline decoration-dotted cursor-help focus:outline-none"
                tabIndex={0}
                aria-describedby="areas-tooltip"
              >
                Belfast
              </span>
              {/* Tooltip */}
              <span
                role="tooltip"
                id="areas-tooltip"
                className="pointer-events-none absolute left-1/2 z-10 mt-2 w-max max-w-xs -translate-x-1/2 rounded-xl border border-[#103010] bg-[#001820] px-3 py-2 text-sm text-[#f0e0b0] shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Areas We Cover: BT4, BT5, BT6, BT8, BT16, BT18
                {/* little pointer */}
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-[#001820]" />
              </span>
            </span>
            . Using eco-friendly methods and professional equipment, we remove dirt, germs, and
            odours that simple rinsing can’t. The result is spotless, hygienic bins with no mess,
            no hassle, and no harmful chemicals.
          </p>
        </div>
      </div>
    </section>
  );
}



/* ---------------- Sections ---------------- */
function Sections() {
  return (
    <>
      <section id="services" className="bg-[#001820] border-y border-[#103010]">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-3xl font-extrabold text-white">Services</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {[
              { title: "Household Wheelie Bins", desc: "Standard clean, disinfect and deodorize for general waste, recycling and food bins." },
              { title: "Regular Routes", desc: "All Cleans are on a Four Weekly Schedule, £6 per Bin" },
              { title: "Day Your Bin is Emptied", desc: "All bins are cleaned on the day they are emptied, by your local council." },
            ].map((c) => (
              <div key={c.title} className="p-6 rounded-2xl bg-[#003040] text-[#f0e0b0] border border-[#103010] shadow">
                <h3 className="font-bold text-white text-lg">{c.title}</h3>
                <p className="mt-2 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-3xl font-extrabold text-white">Why clean your bins?</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6 text-sm">
            {[
              { t: "Kills germs", d: "Removes bacteria build-up and harmful pathogens." },
              { t: "Odour control", d: "Deodorizes and leaves a fresh scent, even in hot weather." },
              { t: "Pest deterrent", d: "Discourages flies, maggots, foxes and rodents." },
            ].map((b) => (
              <div key={b.t} className="p-6 rounded-2xl bg-[#103010] text-[#f0e0b0] border border-[#306030]/40">
                <div className="text-[#e07010] font-extrabold">{b.t}</div>
                <p className="mt-2">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="bg-[#001820] border-y border-[#103010]">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-3xl font-extrabold text-white">Why {BUSINESS_NAME}?</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6 items-center">
            <ul className="space-y-3 text-[#f0e0b0]">
              {[
                "Professional equipment & detergents",
                "Efficient, local, friendly service",
                "Reliable, cleaned on the day the bins are emptied",
                "Simple booking over WhatsApp or email",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-[#e07010]" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <div className="p-6 rounded-2xl bg-[#003040] border border-[#103010]">
              <blockquote className="text-lg text-white">
                “Bins smell amazing and look brand new. Quick, reliable and great value.”
              </blockquote>
              <div className="mt-2 text-sm text-[#f0e0b0]">— Happy customer</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <Contact />
    </>
  );
}

/* ---------------- Contact (updated fields) ---------------- */
function Contact() {
  const [f, setF] = useState({ name: "", email: "", phone: "", message: "" });
  const [copied, setCopied] = useState(false);

  const isMobile =
    typeof navigator !== "undefined" &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const encoded = encodeURIComponent(
    `Enquiry for ${BUSINESS_NAME}\n\n` +
      `Name: ${f.name}\n` +
      `Email: ${f.email}\n` +
      `Phone: ${f.phone}\n` +
      `Message: ${f.message}`
  );

  const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${encoded}`;
  const mailtoURL = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(
    "New enquiry"
  )}&body=${encoded}`;

  function copyPhone() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(PHONE_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <section id="contact" className="bg-[#000910]">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-3xl font-extrabold text-white">Contact</h2>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <Text label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
          <Text label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
          <Text label="Phone No" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
          <TextArea
            label="Message"
            value={f.message}
            onChange={(v) => setF({ ...f, message: v })}
            className="md:col-span-3"
          />
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          {/* WhatsApp - Green */}
          <a
            href={whatsappURL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-bold text-white bg-[#25D366] hover:brightness-110"
          >
            WhatsApp
          </a>

          {/* Email - Orange */}
          <a
            href={mailtoURL}
            className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-bold text-black bg-[#e07010] hover:brightness-110"
          >
            Email
          </a>

          {/* Phone - Blue (dial on mobile, show/copy on desktop) */}
          {isMobile ? (
            <a
              href={`tel:${PHONE_NUMBER.replace("+", "")}`}
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-bold text-white bg-[#0ea5e9] hover:brightness-110"
            >
              Phone
            </a>
          ) : (
            <button
              onClick={copyPhone}
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-bold text-white bg-[#0ea5e9] hover:brightness-110"
              title={PHONE_NUMBER}
            >
              {copied ? "Copied!" : `Phone: ${PHONE_NUMBER}`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CTA() {
  return (
    <section className="py-10 border-y border-[#103010] bg-[#003040]">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-6">
        <h3 className="text-2xl md:text-3xl font-extrabold text-white">
          Ready for fresh bins?
        </h3>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="py-10 text-center text-xs text-[#f0e0b0]/80">
     <div>
  © {new Date().getFullYear()} {BUSINESS_NAME}. Built By{" "}
  <a href="https://nibing.uy" target="_blank" rel="noopener noreferrer">
    Ni Bin Guy
  </a>
</div>
    </footer>
  );
}

/* ---------------- Mobile Action Bar ---------------- */
function MobileActionBar({ onBook }) {
  const minimalMsg = encodeURIComponent(
    `Hi, I'd like to make an equiry with ${BUSINESS_NAME}.`
  );
  const wa = `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${minimalMsg}`;
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#103010] bg-[#001820]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-2 gap-3">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-2xl bg-[#306030] text-white font-bold py-3"
        >
          WhatsApp
        </a>
        <button
          onClick={onBook}
          className="inline-flex items-center justify-center rounded-2xl bg-[#e07010] text-black font-extrabold py-3"
        >
          Book
        </button>
      </div>
    </div>
  );
}

/* ---------------- Booking Modal (full, with Email + Phone) ---------------- */
function BookingModal({ onClose }) {
  const [form, setForm] = useState({
    name: "",
    email: "",      // NEW
    phone: "",      // NEW
    address: "",
    postcode: "",
    bins: [],       // multi-select
    date: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function toggleBin(bin) {
    setForm((f) => {
      const exists = f.bins.includes(bin);
      const bins = exists ? f.bins.filter((b) => b !== bin) : [...f.bins, bin];
      return { ...f, bins };
    });
  }

  function validate() {
    if (!form.name.trim() || !form.address.trim() || !form.postcode.trim() || !form.date) {
      setError("Please complete Name, Address, Postcode, and Date.");
      return false;
    }
    if (form.bins.length === 0) {
      setError("Please select at least one bin.");
      return false;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Please provide at least one contact method (Email or Phone).");
      return false;
    }
    setError("");
    return true;
  }

  const isValid =
    form.name.trim() &&
    form.address.trim() &&
    form.postcode.trim() &&
    form.date &&
    form.bins.length > 0 &&
    (form.email.trim() || form.phone.trim());

  function buildMessage() {
    return [
      `New bin clean request for ${BUSINESS_NAME}:`,
      `Name: ${form.name}`,
      form.email ? `Email: ${form.email}` : null,
      form.phone ? `Phone: ${form.phone}` : null,
      `Address: ${form.address}`,
      `Postcode: ${form.postcode}`,
      `Bins: ${form.bins.join(", ")}`,
      `Preferred date: ${form.date}`,
      form.notes ? `Notes: ${form.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${encodeURIComponent(
    buildMessage()
  )}`;

  async function handleEmail(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSending(true);
      const res = await fetch("/.netlify/functions/sendBookingEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: BUSINESS_NAME,
          to: BOOKING_EMAIL,
          ...form,
          bins: form.bins.join(", "),
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      alert("Booking email sent!");
      onClose();
    } catch (err) {
      alert("Error sending email. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleWhatsApp() {
    if (!validate()) return;
    window.open(whatsappURL, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-title"
    >
      {/* Scrollable container with sticky header/footer for mobile usability */}
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#306030] bg-[#001820] text-[#f0e0b0] shadow-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[#103010] bg-[#001820]">
          <h3 id="booking-title" className="font-extrabold text-white">
            Book a Clean
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl"
            aria-label="Close booking modal"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="p-4 grid md:grid-cols-2 gap-4">
          <Text label="Name" value={form.name} onChange={(v) => update("name", v)} />
          <Text label="Postcode" value={form.postcode} onChange={(v) => update("postcode", v)} />

          <Text
            label="Email"
            value={form.email}
            onChange={(v) => update("email", v)}
            type="email"
          />
          <Text
            label="Phone No"
            value={form.phone}
            onChange={(v) => update("phone", v)}
            type="tel"
          />

          <Text
            label="Address"
            value={form.address}
            onChange={(v) => update("address", v)}
            className="md:col-span-2"
          />

          {/* Multi-select bins as checkboxes */}
          <div className="md:col-span-2">
            <div className="text-xs mb-1 text-[#f0e0b0]/80">Bins</div>
            <div className="flex flex-wrap gap-2">
              {BIN_OPTIONS.map((bin) => {
                const checked = form.bins.includes(bin);
                return (
                  <label
                    key={bin}
                    className={`cursor-pointer select-none inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      checked ? "bg-[#103010] border-[#306030]" : "bg-[#003040] border-[#103010]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[#e07010]"
                      checked={checked}
                      onChange={() => toggleBin(bin)}
                    />
                    <span>{bin}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Text
            label="Preferred Date"
            type="date"
            value={form.date}
            onChange={(v) => update("date", v)}
          />
          <div /> {/* spacer for grid alignment */}

          <TextArea
            label="Notes (optional)"
            value={form.notes}
            onChange={(v) => update("notes", v)}
            className="md:col-span-2"
          />
        </form>

        {/* Validation error */}
        {error && (
          <div className="px-4 pb-2 text-sm text-red-400" role="alert">
            {error}
          </div>
        )}

        {/* Sticky footer actions */}
        <div className="sticky bottom-0 p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-t border-[#103010] bg-[#001820]">
          <div className="text-xs text-[#f0e0b0]/80">
            Submit via WhatsApp or Email. We’ll get back to you to confirm.
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleWhatsApp}
              disabled={!isValid || sending}
              className="px-4 py-2 rounded-2xl bg-[#306030] text-white font-bold hover:brightness-110 disabled:opacity-60"
            >
              Send on WhatsApp
            </button>
            <button
              onClick={handleEmail}
              disabled={!isValid || sending}
              className="px-4 py-2 rounded-2xl bg-[#e07010] text-black font-bold hover:brightness-110 disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send by Email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



/* ---------------- UI Field Helpers ---------------- */
function FieldShell({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-xs mb-1 text-[#f0e0b0]/80">{label}</div>
      {children}
    </label>
  );
}

function Text({ label, value, onChange, type = "text", className = "" }) {
  return (
    <FieldShell label={label} className={className}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#003040] border border-[#103010] px-3 py-2 text-white placeholder-[#f0e0b0]/50 focus:outline-none"
        placeholder={label}
      />
    </FieldShell>
  );
}

function TextArea({ label, value, onChange, className = "" }) {
  return (
    <FieldShell label={label} className={className}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl bg-[#003040] border border-[#103010] px-3 py-2 text-white placeholder-[#f0e0b0]/50 focus:outline-none"
        placeholder={label}
      />
    </FieldShell>
  );
}

function Select({ label, value, onChange, options, className = "" }) {
  return (
    <FieldShell label={label} className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#003040] border border-[#103010] px-3 py-2 text-white focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
