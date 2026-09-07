import { Construction } from "lucide-react";

interface PagePlaceholderProps {
  title: string;
  description?: string;
}

export default function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
        <Construction className="w-8 h-8 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">{title}</h1>
      <p className="text-slate-500 max-w-md">
        {description ??
          "Fitur ini belum tersedia. Halaman ini akan segera dikembangkan."}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        Fitur belum tersedia
      </div>
    </div>
  );
}
