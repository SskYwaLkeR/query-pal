"use client";

import { useState } from "react";
import { formatSQL } from "@/lib/sql/formatter";

interface SQLDisplayProps {
  sql: string;
}

export function SQLDisplay({ sql }: SQLDisplayProps) {
  const [copied, setCopied] = useState(false);
  const formatted = formatSQL(sql);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl bg-[oklch(0.16_0.015_265)] text-zinc-100 text-sm overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs text-zinc-400 font-mono">Generated Query</span>
        <button
          onClick={handleCopy}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="font-mono text-xs leading-relaxed whitespace-pre">
          {formatted}
        </code>
      </pre>
    </div>
  );
}
