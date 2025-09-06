import { useEffect } from "react";

export default function SouthBelfastBinCleaning() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/";
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-[#003040] text-white p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-4">
        Wheelie Bin Cleaning in <span className="text-[#e07010]">South Belfast</span>
      </h1>
      <p className="max-w-xl text-lg mb-6">
        From Queen's Quarter to Malone, Ormeau Road and Lisburn Road, we keep bins fresh and sanitised across South Belfast.
      </p>
      <p className="italic text-sm text-gray-300">
        Redirecting you to our homepage to book your clean...
      </p>
    </section>
  );
}
