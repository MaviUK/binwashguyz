import { useState } from "react";

// ================== QUICK CONFIG ==================
const BUSINESS_NAME = "Bin Wash Guyz";
const WHATSAPP_NUMBER = "+447555178484"; // must be international format
const BOOKING_EMAIL = "aabincleaning@gmail.com";
// ==================================================

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#000000] text-[#f0e0b0]">
      <Header onBook={() => setOpen(true)} />
      <Hero onBook={() => setOpen(true)} />
      <Sections />
      <CTA onBook={() => setOpen(true)} />
      <Footer />
      {/* Mobile quick actions bar */}
      <MobileActionBar onBook={() => setOpen(true)} />
      {open && <BookingModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function Header({ onBook }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-[#000000]/70 backdrop-blur border-b border-[#103010]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-12 h-12 rounded" />
          <div className="font-extrabold tracking-wide text-xl text-[#f0e0b0]">
            {BUSINESS_NAME}
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#services" className="hover:text-white">Services</a>
          <a href="#benefits" className="hover:text-white">Benefits</a>
          <a href="#why" className="hover:text-white">Why Us</a>
          <a href="#contact" className="hover:text-white">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={onBook}
            className="hidden md:inline-flex px-4 py-2 rounded-2xl bg-[#e07010] text-black font-bold shadow hover:brightness-110"
          >
            Book Now
          </button>
          <button
            className="md:hidden p-2 rounded-xl border border-[#103010] text-[#f0e0b0]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>
      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#103010] bg-[#001820]">
          <div className="max-w-6xl mx-auto px-4 py-3 grid gap-3 text-sm">
            <a href="#services" className="py-2 border-b border-white/5">Services</a>
            <a href="#benefits" className="py-2 border-b border-white/5">Benefits</a>
            <a href="#why" className="py-2 border-b border-white/5">Why Us</a>
            <a href="#contact" className="py-2">Contact</a>
            <button onClick={onBook} className="mt-2 px-4 py-2 rounded-2xl bg-[#e07010] text-black font-bold">
              Book Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ onBook }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#003040] via-transparent to-transparent opacity-60" />
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white">
            Fresh, Sanitized <span className="text-[#e07010]">Wheelie Bins</span>
          </h1>
          <p className="mt-4 text-lg text-[#f0e0b0]">
            We deep-clean, sanitize and deodorize your household bins using
            eco-friendly methods. No mess, no hassle — just spotless bins.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBook}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#e07010] text-black font-bold shadow hover:brightness-110"
            >
              Book a Clean
            </button>
            <a
              href="#services"
              className="hidden sm:inline-flex px-5 py-3 rounded-2xl border border-[#306030] text-[#f0e0b0] hover:bg-[#103010]"
            >
              See Services
            </a>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-4 max-w-md text-sm">
            {[
              "Eco-friendly detergents",
              "Disinfect & deodorize",
              "Regular schedules",
              "Local & insured",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#306030]" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 bg-[#103010] blur-3xl opacity-40 rounded-full" />
          <img
            src="/logo.png"
            alt="Bin Wash Guyz"
            className="relative w-full max-w-md mx-auto drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}

function Sections() {
  return (
    <>
      {/* Services */}
      <section id="services" className="bg-[#001820] border-y border-[#103010]">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-3xl font-extrabold text-white">Services</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Household Wheelie Bins",
                desc: "Standard clean, disinfect and deodorize for general waste, recycling and food bins.",
              },
              {
                title: "Regular Routes",
                desc: "Choose monthly or fortnightly visits synced to your council collection day.",
              },
              {
                title: "Commercial",
                desc: "Custom schedules for flats, shops and businesses. Volume pricing available.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="p-6 rounded-2xl bg-[#003040] text-[#f0e0b0] border border-[#103010] shadow"
              >
                <h3 className="font-bold text-white text-lg">{c.title}</h3>
                <p className="mt-2 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits">
        <div className="max-w-6xl mx_auto px-4 py-14">
          <h2 className="text-3xl font-extrabold text-white">Why clean your bins?</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6 text-sm">
            {[
              {
                t: "Kills germs",
                d: "Removes bacteria build-up and harmful pathogens from bin surfaces.",
              },
              {
                t: "Odour control",
                d: "Deodorizes and leaves a fresh scent, even in hot weather.",
              },
              {
                t: "Pest deterrent",
                d: "Discourages flies, maggots, foxes and rodents.",
              },
            ].map((b) => (
              <div
                key={b.t}
                className="p-6 rounded-2xl bg-[#103010] text-[#f0e0b0] border border-[#306030]/40"
              >
                <div className="text-[#e07010] font-extrabold">{b.t}</div>
                <p className="mt-2">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="bg-[#001820] border-y border-[#103010]">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-3xl font-extrabold text-white">Why {BUSINESS_NAME}?</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6 items-center">
            <ul className="space-y-3 text-[#f0e0b0]">
              {[
                "Professional equipment & detergents",
                "Local, friendly service",
                "Text reminders before each visit",
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
      <section id="contact">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-3xl font-extrabold text-white">Contact</h2>
          <p className="mt-3 text-[#f0e0b0]">WhatsApp: {WHATSAPP_NUMBER}</p>
          <p className="text-[#f0e0b0]">Email: {BOOKING_EMAIL}</p>
        </div>
      </section>
    </>
  );
}

function CTA({ onBook }) {
  return (
    <section className="py-10 border-y border-[#103010] bg-[#003040]">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <h3 className="text-2xl md:text-3xl font-extrabold text-white">
          Ready for fresh bins?
        </h3>
        <button
          onClick={onBook}
          className="px-6 py-3 rounded-2xl bg-[#e07010] text-black font-extrabold shadow hover:brightness-110"
        >
          Book via WhatsApp / Email
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 text-center text-xs text-[#f0e0b0]/80">
      <div>
        © {new Date().getFullYear()} {BUSINESS_NAME}. Built for Netlify.
      </div>
    </footer>
  );
}

// Mobile fixed bottom bar for small screens
function MobileActionBar({ onBook }) {
  const minimalMsg = encodeURIComponent(
    `Hi, I'd like to book a bin clean with ${BUSINESS_NAME}.`
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

// ---------------- BOOKING MODAL ------------------
function BookingModal({ onClose }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    postcode: "",
    bins: "Household",
    date: "",
    notes: "",
  });
  const [error, setError] = useState("");

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function buildMessage() {
    const parts = [
      `New bin clean request for ${BUSINESS_NAME}:`,
      `Name: ${form.name}`,
      `Address: ${form.address}`,
      `Postcode: ${form.postcode}`,
      `Bins: ${form.bins}`,
      form.date ? `Preferred date: ${form.date}` : null,
      form.notes ? `Notes: ${form.notes}` : null,
    ].filter(Boolean);
    return parts.join("\n");
  }

  const whatsappURL = (() => {
    const msg = encodeURIComponent(buildMessage());
    return `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${msg}`;
  })();

  const mailtoURL = (() => {
    const subject = encodeURIComponent("Bin clean booking");
    const body = encodeURIComponent(buildMessage());
    return `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`;
  })();

  function validate() {
    if (!form.name || !form.address || !form.postcode) {
      setError("Please fill in Name, Address and Postcode.");
      return false;
    }
    setError("");
    return true;
  }

  function handleWhatsApp(e) {
    if (!validate()) e.preventDefault();
  }

  function handleEmail(e) {
    if (!validate()) e.preventDefault();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-2xl rounded-2xl border border-[#306030] bg-[#001820] text-[#f0e0b0] shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#103010]">
          <h3 className="font-extrabold text-white">Book a Clean</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">✕</button>
        </div>

        {/* Netlify form fallback */}
        <form name="booking" method="POST" data-netlify="true" className="p-4 grid md:grid-cols-2 gap-4">
          <input type="hidden" name="form-name" value="booking" />
          <Text label="Name" value={form.name} onChange={(v)=>update("name", v)} name="name" />
          <Text label="Postcode" value={form.postcode} onChange={(v)=>update("postcode", v)} name="postcode" />
          <Text label="Address" value={form.address} onChange={(v)=>update("address", v)} name="address" className="md:col-span-2" />
          <Select label="Bins" value={form.bins} onChange={(v)=>update("bins", v)} name="bins" options={["Household","Recycling","Food","All"]} />
          <Text label="Preferred Date" type="date" value={form.date} onChange={(v)=>update("date", v)} name="date" />
          <TextArea label="Notes" value={form.notes} onChange={(v)=>update("notes", v)} name="notes" className="md:col-span-2" />
        </form>

        {error && (
          <div className="px-4 text-sm text-red-400">{error}</div>
        )}

        <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-t border-[#103010]">
          <div className="text-xs text-[#f0e0b0]/80">
            Submit via WhatsApp (preferred) or Email. Netlify will also capture the form if enabled.
          </div>
          <div className="flex gap-3">
            <a
              onClick={handleWhatsApp}
              href={whatsappURL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-2xl bg-[#306030] text-white font-bold hover:brightness-110"
            >
              Send on WhatsApp
            </a>
            <a
              onClick={handleEmail}
              href={mailtoURL}
              className="px-4 py-2 rounded-2xl bg-[#e07010] text-black font-bold hover:brightness-110"
            >
              Send by Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldShell({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-xs mb-1 text-[#f0e0b0]/80">{label}</div>
      {children}
    </label>
  );
}

function Text({ label, name, value, onChange, type = "text", className = "" }) {
  return (
    <FieldShell label={label} className={className}>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#003040] border border-[#103010] px-3 py-2 text-white placeholder-[#f0e0b0]/50 focus:outline-none"
        placeholder={label}
      />
    </FieldShell>
  );
}

function TextArea({ label, name, value, onChange, className = "" }) {
  return (
    <FieldShell label={label} className={className}>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl bg-[#003040] border border-[#103010] px-3 py-2 text-white placeholder-[#f0e0b0]/50 focus:outline-none"
        placeholder={label}
      />
    </FieldShell>
  );
}

function Select({ label, name, value, onChange, options, className = "" }) {
  return (
    <FieldShell label={label} className={className}>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#003040] border border-[#103010] px-3 py-2 text-white focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </FieldShell>
  );
}
