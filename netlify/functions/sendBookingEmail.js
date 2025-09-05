              className="px-4 py-2 rounded-2xl bg-[#306030] text-white font-bold hover:brightness-110"
            >
              Send on WhatsApp
            </a>
            <button
              onClick={handleEmail}
              disabled={sending}
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
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </FieldShell>
  );
}
