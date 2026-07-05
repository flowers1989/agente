"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
  compact?: boolean;
}

export function Markdown({ content, className, compact }: MarkdownProps) {
  return (
    <div
      className={cn(
        "text-sm text-foreground/90 leading-relaxed",
        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-5 [&_h1]:mb-3 [&_h1]:text-foreground [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2.5 [&_h2]:text-foreground",
        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
        "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1.5 [&_h4]:text-foreground",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:my-1",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:my-1",
        "[&_li]:leading-relaxed",
        "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-blue-400 [&_a]:break-words",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        "[&_code]:bg-muted [&_code]:text-foreground [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:font-mono [&_code]:before:content-none [&_code]:after:content-none",
        "[&_pre]:bg-muted/60 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs",
        "[&_hr]:my-4 [&_hr]:border-border",
        "[&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_table]:text-xs [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-border",
        "[&_thead]:bg-muted/60",
        "[&_th]:border [&_th]:border-border [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground",
        "[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top",
        "[&_tbody_tr:nth-child(even)]:bg-muted/20",
        compact &&
          "[&_h1]:text-lg [&_h1]:mt-2 [&_h1]:mb-1.5 [&_h1]:border-b-0 [&_h1]:pb-0 [&_h2]:text-base [&_h2]:mt-2 [&_h2]:mb-1",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
