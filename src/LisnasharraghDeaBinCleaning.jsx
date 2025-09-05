import { useEffect } from "react";

export default function LisnasharraghDeaBinCleaning() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/";
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-[#003040] text-white p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-4">
        Wheelie Bin Cleaning in <span className="text-[#e07010]">Lisnasharragh (DEA)</span>
      </h1>
      <p className="max-w-xl text-lg mb-6">
        East and south-east Belfast homes — convenient, scheduled wheelie bin cleaning across Lisnasharragh.
      </p>
      <p className="italic text-sm text-gray-300">
        Redirecting you to our homepage to book your clean...
      </p>
    </section>
  );
}
