import React, { useState, useEffect, useRef } from "react";

// Inline loader so you don't need extra files or libraries
function loadGooglePlaces(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) return resolve(window.google);

    const existing = document.querySelector('script[data-gmaps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }

    const s = document.createElement('script');
    s.dataset.gmaps = '1';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function NiBinGuyLandingPage() {
  const [showForm, setShowForm] = useState(false);

  // NEW: contact modal state
  const [showContactForm, setShowContactForm] = useState(false);

  const [bins, setBins] = useState([
    { type: "", count: 1, frequency: "4 Weekly (£5)" },
  ]);

  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // ✅ Keep Google Places, but don't require selection
  const [placeId, setPlaceId] = useState(null);
  const selectedPlaceRef = useRef(null);
  const addressRef = useRef(null);

  // constants
  const phoneNumber = "+447555178484";
  const phoneDisplay = "07555 178484";

  // Attach Google Places Autocomplete when the booking modal opens
  useEffect(() => {
    if (!showForm) return; // wait until modal renders
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return; // input will still work without autocomplete

    let ac; // Autocomplete instance
    let cleanup = () => {};

    loadGooglePlaces(key)
      .then((google) => {
        if (!addressRef.current) return;
        ac = new google.maps.places.Autocomplete(addressRef.current, {
          componentRestrictions: { country: ["gb"] },
          fields: ["place_id", "formatted_address", "address_components", "name", "geometry"],
          types: ["address"],
        });
        const listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          selectedPlaceRef.current = place;
          setPlaceId(place.place_id || null);
          const formatted = place.formatted_address || place.name || "";
          setAddress(formatted);
        });
        cleanup = () => listener.remove();
      })
      .catch((e) => {
        console.warn("Places failed to load:", e);
      });

    return () => cleanup();
  }, [showForm]);

  const handleSend = () => {
    if (!name || !email || !address || !phone || bins.some((b) => !b.type)) {
      alert("Please complete all fields before sending.");
      return;
    }
    // No Google selection enforcement — manual address is fine

    const binDetails = bins
      .filter((b) => b.type !== "")
      .map((b) => `${b.count}x ${b.type.replace(" Bin", "")} (${b.frequency})`)
      .join("%0A");

    const message = `Hi my name is ${encodeURIComponent(
      name
    )}. I'd like to book a bin clean, please.%0A${binDetails}%0AAddress: ${encodeURIComponent(
      address
    )}%0AEmail: ${encodeURIComponent(email)}%0APhone: ${encodeURIComponent(
      phone
    )}`;

    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, "_blank");
    setShowForm(false);
  };

  const handleEmailSend = async () => {
    if (!name || !email || !address || !phone || bins.some((b) => !b.type)) {
      alert("Please complete all fields before sending.");
      return;
    }
    // No Google selection enforcement — manual address is fine

    const loc = selectedPlaceRef.current?.geometry?.location;
    const lat = loc ? loc.lat() : null;
    const lng = loc ? loc.lng() : null;

    try {
      const res = await fetch("/.netlify/functions/sendBookingEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, address, bins, placeId, lat, lng }),
      });

      if (res.ok) {
        alert("Booking email sent successfully!");
        setShowForm(false);
      } else {
        alert("Failed to send booking email.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending booking email.");
    }
  };

  const handleBinChange = (index, field, value) => {
    const newBins = [...bins];
    newBins[index][field] = field === "count" ? parseInt(value || 0, 10) : value;
    setBins(newBins);
  };

  const addBinRow = () => {
    setBins([...bins, { type: "", count: 1, frequency: "4 Weekly (£5)" }]);
  };

  // ---------- CONTACT FORM: state + handlers ----------
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cMessage, setCMessage] = useState("");

  const handleContactWhatsApp = () => {
    if (!cName || !cEmail || !cPhone || !cMessage) {
      alert("Please complete all fields before sending.");
      return;
    }
    const msg =
      `Hi, I'm ${encodeURIComponent(cName)}.%0A` +
      `Phone: ${encodeURIComponent(cPhone)}%0A` +
      `Email: ${encodeURIComponent(cEmail)}%0A%0A` +
      `Message:%0A${encodeURIComponent(cMessage)}`;

    window.open(`https://wa.me/${phoneNumber}?text=${msg}`, "_blank");
    setShowContactForm(false);
    setCName(""); setCEmail(""); setCPhone(""); setCMessage("");
  };

  const handleContactEmail = async () => {
    if (!cName || !cEmail || !cPhone || !cMessage) {
      alert("Please complete all fields before sending.");
      return;
    }
    try {
      const res = await fetch("/.netlify/functions/sendContactEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cName, email: cEmail, phone: cPhone, message: cMessage }),
      });
      if (res.ok) {
        alert("Your message has been sent!");
        setShowContactForm(false);
        setCName(""); setCEmail(""); setCPhone(""); setCMessage("");
      } else {
        alert("Failed to send your message.");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending your message.");
    }
  };

  const handleCallClick = async () => {
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone|Mobi/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      try {
        await navigator.clipboard.writeText(phoneDisplay);
        alert(`Phone: ${phoneDisplay}\n(The number has been copied to your clipboard.)`);
      } catch {
        alert(`Phone: ${phoneDisplay}`);
      }
    }
  };
  // ----------------------------------------------------

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center pt-10 pb-20 px-4 bg-black">
        <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-green-900 opacity-30 blur-3xl rounded-full z-0"></div>
        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-b from-transparent via-[#121212] to-[#18181b] z-10 pointer-events-none" />

        <div className="relative z-20 flex flex-col items-center gap-4">
          <img
            src="logo.png"
            alt="Ni Bin Guy Logo"
            className="w-64 h-64 md:w-80 md:h-80 rounded-xl shadow-lg"
          />

          <h1 className="text-4xl md:text-6xl font-bold">
            Bin Cleaning, <span className="text-green-400">Done Right</span>
          </h1>

          <p className="text-lg md:text-xl max-w-xl mt-4 text-center">
            Professional wheelie bin cleaning at your home, across
            <span className="text-green-400"> County Down.</span> Sparkling clean &amp;
            fresh smelling bins without any drama.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
            >
              Book a Clean
            </button>

            {/* Contact Us button */}
            <button
              onClick={() => setShowContactForm(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
            >
              Contact Us
            </button>

            <a
              href="#customer-portal"
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition text-center"
            >
              Customer Portal
            </a>
          </div>
        </div>
      </section>

      {/* Booking Modal (keeps Google Places, no enforcement) */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowForm(false)}
              className="sticky top-2 right-4 text-gray-500 hover:text-red-500 text-xl float-right z-10"
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold text-center">Book a Bin Clean</h2>

            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />

            {bins.map((bin, index) => (
              <div key={index} className="space-y-2 border-b border-gray-200 pb-4 mb-4">
                <div className="flex gap-4">
                  <select
                    value={bin.type}
                    onChange={(e) => handleBinChange(index, "type", e.target.value)}
                    className="w-2/3 border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select Bin</option>
                    <option value="Black Bin">Black</option>
                    <option value="Brown Bin">Brown</option>
                    <option value="Green Bin">Green</option>
                    <option value="Blue Bin">Blue</option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={bin.count}
                    onChange={(e) => handleBinChange(index, "count", e.target.value)}
                    className="w-1/3 border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <select
                  value={bin.frequency}
                  onChange={(e) => handleBinChange(index, "frequency", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="4 Weekly (£5)">4 Weekly (£5)</option>
                  <option value="One-off (£12.50)">One-off (£12.50)</option>
                  <option value="Commercial <360L 4 Weekly (£5)">Commercial &lt;360L 4 Weekly (£5)</option>
                  <option value="Commercial <360L One-Off (£12.50)">Commercial &lt;360L One-Off (£12.50)</option>
                  <option value="Commercial >660L 4 Weekly (£12.50)">Commercial &gt;660L 4 Weekly (£12.50)</option>
                  <option value="Commercial >660L One-Off (£30)">Commercial &gt;660L One-Off (£30)</option>
                </select>
              </div>
            ))}

            <div className="flex items-center justify-between">
              {bins.length > 1 ? (
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={addBinRow}
                    className="text-sm text-green-600 hover:text-green-800 font-semibold"
                  >
                    + Add Another Bin
                  </button>
                  <button
                    onClick={() => setBins(bins.slice(0, -1))}
                    className="text-sm text-red-600 hover:text-red-800 font-semibold"
                  >
                    − Remove Last Bin
                  </button>
                </div>
              ) : (
                <button
                  onClick={addBinRow}
                  className="text-sm text-green-600 hover:text-green-800 font-semibold"
                >
                  + Add Another Bin
                </button>
              )}
            </div>

            {/* Address input (Autocomplete attached; manual typing also allowed) */}
            <input
              ref={addressRef}
              type="text"
              placeholder="Full Address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                // Optional: clear Google selection if the user edits manually
                setPlaceId(null);
                selectedPlaceRef.current = null;
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-4"
              autoComplete="off"
              inputMode="text"
            />
            <p className="text-xs text-gray-500 -mt-2">
              Tip: pick from suggestions or just type your full address.
            </p>

            <input
              type="tel"
              placeholder="Contact Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2"
            />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2"
            />

            <button
              onClick={handleSend}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Send via WhatsApp
            </button>

            <button
              onClick={handleEmailSend}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Send via Email
            </button>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {showContactForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setShowContactForm(false)}
        >
          <div
            className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowContactForm(false)}
              className="sticky top-2 right-4 text-gray-500 hover:text-red-500 text-xl float-right z-10"
            >
              &times;
            </button>

            <div className="flex items-center justify-center gap-3">
              <h2 className="text-2xl font-bold text-center">Contact Us</h2>
              <button
                onClick={handleCallClick}
                className="ml-2 p-2 rounded-full bg-green-100 hover:bg-green-200 focus:outline-none"
                aria-label="Call us"
                title="Call us"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.684l1.1 3.3a1 1 0 01-.27 1.06l-1.6 1.6a16 16 0 007.18 7.18l1.6-1.6a1 1 0 011.06-.27l3.3 1.1a1 1 0 01.684.95V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>

            <input
              type="text"
              placeholder="Your Name"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />

            <input
              type="tel"
              placeholder="Contact Number"
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />

            <input
              type="email"
              placeholder="Email Address"
              value={cEmail}
              onChange={(e) => setCEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />

            <textarea
              placeholder="Your Message"
              value={cMessage}
              onChange={(e) => setCMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 h-28 resize-y"
            />

            <button
              onClick={handleContactWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Send via WhatsApp
            </button>

            <button
              onClick={handleContactEmail}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Send via Email
            </button>

            <p className="text-center text-sm text-gray-600 mt-2">
              Prefer to call? Tap the phone icon.
            </p>
          </div>
        </div>
      )}

      {/* What We Do */}
      <section className="relative py-16 px-6 bg-[#18181b]">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-2">Domestic Bins</h3>
            <p>We clean green, black, and blue bins right outside your home.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-2">Commercial Contracts</h3>
            <p>Need regular bin cleaning? We handle your business waste too.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-2">Eco-Friendly Process</h3>
            <p>We use biodegradable products and minimal water waste.</p>
          </div>
        </div>
      </section>

      {/* The Bins We Clean */}
      <section className="relative py-16 px-6 bg-[#18181b] text-white text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-12">The Bins We Clean</h2>
        <div className="relative z-20 flex flex-wrap justify-center items-end gap-12 md:gap-20">
          <div className="flex flex-col items-center">
            <img src="/bins/120L.png" alt="120L Bin" className="h-32 mb-2" />
            <span className="text-sm">120L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/240L.png" alt="240L Bin" className="h-36 mb-2" />
            <span className="text-sm">240L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/360L.png" alt="360L Bin" className="h-40 mb-2" />
            <span className="text-sm">360L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/660L.png" alt="660L Bin" className="h-44 mb-2" />
            <span className="text-sm">660L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/1100L.png" alt="1100L Bin" className="h-48 mb-2" />
            <span className="text-sm">1100L</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-[#18181b] to-black pointer-events-none z-10" />
      </section>

      {/* Why Clean Your Bin */}
      <section className="py-16 px-6 bg-gradient-to-b from-black via-[#0a0a0a] to-zinc-900 text-white">
        <h2 className="text-3xl font-bold text-green-400 mb-12 text-center">Why Clean Your Bin?</h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="flex items-start gap-4">
            <img src="/odour.png" alt="Odours icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Prevent Nasty Odours</h3>
              <p className="text-gray-300">
                Bins can start to smell unpleasant fast. Regular cleaning eliminates those foul smells at the source.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <img src="/bacteria.png" alt="Bacteria icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Stop Bacteria Buildup</h3>
              <p className="text-gray-300">
                Leftover waste can attract harmful bacteria. Professional bin cleaning keeps your environment safer and more hygienic.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <img src="/pests.png" alt="Pests icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Deter Insects &amp; Vermin</h3>
              <p className="text-gray-300">
                Flies, maggots, and rodents are drawn to dirty bins. Keep them away by keeping your bin spotless.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <img src="/family.png" alt="Family icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Protect Your Family</h3>
              <p className="text-gray-300">
                A clean bin reduces exposure to germs and pathogens, helping keep your household healthier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ni Bin Guy */}
      <section className="py-16 px-6 bg-gradient-to-b from-zinc-900 via-[#1a1a1a] to-black text-white">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Why Ni Bin Guy?</h2>
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <div>
            <h3 className="text-xl font-semibold mb-2">Local &amp; Trusted</h3>
            <p>We’re based in Bangor and proud to serve County Down residents with care.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Flexible Plans</h3>
            <p>Whether you want a one-off clean or recurring service, we’ve got options.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Affordable Pricing</h3>
            <p>From just £5 per bin — clear pricing with no surprises.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Fully Insured</h3>
            <p>We’re fully insured and compliant — so you can rest easy.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
