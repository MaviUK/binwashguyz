import { useEffect } from "react";

export default function MaloneStranmillisBinCleaning() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/";
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-[#003040] text-white p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-4">
        Wheelie Bin Cleaning in <span className="text-[#e07010]">Malone & Stranmillis</span>
      </h1>
      <p className="max-w-xl text-lg mb-6">
        Leafy streets and Victorian homes near the Lagan — discreet, professional wheelie bin cleaning you can rely on.
      </p>
      <p className="italic text-sm text-gray-300">
        Redirecting you to our homepage to book your clean...
      </p>
    </section>
  );
}
