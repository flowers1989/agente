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
        /* Encabezados mejorados con gradiente */
        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-transparent [&_h1]:bg-clip-text [&_h1]:bg-gradient-to-r [&_h1]:from-manus-primary [&_h1]:to-manus-secondary [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-3",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-foreground",
        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
        "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1.5 [&_h4]:text-foreground",
        /* Párrafos y listas */
        "[&_p]:my-2.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul>li]:my-1.5",
        "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol>li]:my-1.5",
        "[&_li]:leading-relaxed",
        /* Enlaces mejorados */
        "[&_a]:text-manus-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium [&_a]:break-words hover:[&_a]:text-manus-secondary [&_a]:transition-colors",
        /* Citas mejoradas */
        "[&_blockquote]:border-l-4 [&_blockquote]:border-manus-primary [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:bg-muted/30 [&_blockquote]:py-2 [&_blockquote]:pr-3 [&_blockquote]:rounded-r",
        /* Código mejorado */
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        "[&_code]:bg-muted [&_code]:text-foreground [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:font-mono [&_code]:before:content-none [&_code]:after:content-none [&_code]:border [&_code]:border-border/40",
        "[&_pre]:bg-muted/80 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border [&_pre]:shadow-lg",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs [&_pre_code]:text-foreground/90",
        /* Líneas horizontales */
        "[&_hr]:my-4 [&_hr]:border-border",
        /* Tablas mejoradas */
        "[&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:text-xs [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:border-border [&_table]:shadow-sm",
        "[&_thead]:bg-muted/60 [&_thead]:border-b [&_thead]:border-border",
        "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_th]:bg-muted/40",
        "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
        "[&_tbody_tr:nth-child(even)]:bg-muted/20",
        "[&_tbody_tr:hover]:bg-muted/40 [&_tbody_tr]:transition-colors",
        /* Modo compacto */
        compact &&
          "[&_h1]:text-lg [&_h1]:mt-2 [&_h1]:mb-1.5 [&_h1]:border-b-0 [&_h1]:pb-0 [&_h2]:text-base [&_h2]:mt-2 [&_h2]:mb-1",
        className
      )}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
