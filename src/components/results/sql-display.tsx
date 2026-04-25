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
    <div className="relative rounded-lg bg-zinc-950 text-zinc-100 text-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-xs text-zinc-400 font-mono">SQL</span>
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
