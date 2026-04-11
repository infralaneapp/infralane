"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type CommentContentProps = {
  content: string;
};

function processMentions(text: string) {
  // Replace @mentions with bold markdown so they render highlighted
  return text.replace(/@"([^"]+)"|@(\S+)/g, (match, quoted, plain) => {
    const name = quoted ?? plain;
    return `**@${name}**`;
  });
}

export function CommentContent({ content }: CommentContentProps) {
  const processed = processMentions(content);

  return (
    <div className="mt-2.5 text-sm leading-relaxed text-secondary-foreground prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground prose-strong:text-primary prose-a:text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{processed}</ReactMarkdown>
    </div>
  );
}
