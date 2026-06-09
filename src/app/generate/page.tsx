import { GenerateClient } from "@/components/GenerateClient";

export const metadata = {
  title: "Design Studio — CryptoThreads",
};

export default function GeneratePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-black">Design Studio</h1>
      <p className="mt-2 max-w-2xl text-white/60">
        Type any coin&apos;s ticker or paste its website. We pull the logo and compose a
        print-ready design live. Add it to your cart and we&apos;ll print it on demand.
      </p>
      <div className="mt-10">
        <GenerateClient />
      </div>
    </div>
  );
}
