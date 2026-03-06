"use client"

import DOMPurify from "isomorphic-dompurify"

interface RichTextContentProps {
  content: string
}

export default function RichTextContent({ content }: RichTextContentProps) {
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  })

  return (
    <div
      className="prose prose-stone max-w-none handbook-prose"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}
