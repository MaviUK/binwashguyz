import { useEffect } from "react";

export default function NorthBelfastBinCleaning() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/";
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-[#003040] text-white p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-4">
        Wheelie Bin Cleaning in <span className="text-[#e07010]">North Belfast</span>
      </h1>
      <p className="max-w-xl text-lg mb-6">
        Fresh, sanitised bins across Antrim Road, Cavehill, Cliftonville, Shankill, and Ardoyne. Affordable, eco-friendly wheelie bin cleaning for homes and businesses.
      </p>
      <p className="italic text-sm text-gray-300">
        Redirecting you to our homepage to book your clean...
      </p>
    </section>
  );
}
