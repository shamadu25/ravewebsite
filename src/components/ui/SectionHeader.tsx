import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  dark = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <div className={cn("inline-flex items-center mb-5", align === "center" ? "justify-center" : "justify-start")}>
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border ${
            dark
              ? "bg-blue-500/12 text-blue-400 border-blue-500/25"
              : "bg-blue-50 text-blue-600 border-blue-100"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.1] tracking-tight mb-5 ${
          dark ? "text-white" : "text-gray-900"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`text-lg leading-relaxed ${
            dark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
