import DOMPurify from 'dompurify';

/** Parsed message content: either plain text or sanitized HTML for rendering */
export type ParsedMessageContent =
  | { kind: 'text'; value: string }
  | { kind: 'html'; value: string };

/**
 * Structure of AI message content when stored as JSON array (e.g. from chat UI).
 * Example: [{"content": {"type": "text", "data": "<div>...</div>"}}]
 */
interface ContentBlock {
  content?: {
    type?: string;
    data?: string;
  };
}

/**
 * Parses raw message content from the API. Handles:
 * - Plain text: returned as-is.
 * - JSON array of blocks (e.g. [{"content": {"type": "text", "data": "<div>...</div>"}}]):
 *   extracts text/HTML from "data", sanitizes HTML if present, and returns for display.
 */
export function parseMessageContent(raw: string): ParsedMessageContent {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { kind: 'text', value: '' };
  }

  const trimmed = raw.trim();

  // Try to parse as JSON array (AI assistant payload)
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(raw) as ContentBlock[];
      if (!Array.isArray(arr) || arr.length === 0) {
        return { kind: 'text', value: raw };
      }

      const parts: string[] = [];
      for (const block of arr) {
        const content = block?.content;
        if (content && content.type === 'text' && typeof content.data === 'string') {
          parts.push(content.data.trim());
        }
      }

      const extracted = parts.join('\n\n').trim();
      if (!extracted) return { kind: 'text', value: raw };

      // If extracted content looks like HTML, sanitize and render as HTML
      const looksLikeHtml = extracted.includes('<') && extracted.includes('>');
      if (looksLikeHtml) {
        const sanitized = DOMPurify.sanitize(extracted, {
          ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
        });
        return { kind: 'html', value: sanitized };
      }

      return { kind: 'text', value: extracted };
    } catch {
      // Not valid JSON or unexpected shape — show raw
      return { kind: 'text', value: raw };
    }
  }

  // Optional: handle single JSON object with content.data
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(raw) as { content?: { type?: string; data?: string } };
      const data = obj?.content?.data;
      if (typeof data === 'string' && obj?.content?.type === 'text') {
        const extracted = data.trim();
        if (/^\s*</.test(extracted)) {
          const sanitized = DOMPurify.sanitize(extracted, {
            ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
          });
          return { kind: 'html', value: sanitized };
        }
        return { kind: 'text', value: extracted };
      }
    } catch {
      // ignore
    }
  }

  return { kind: 'text', value: raw };
}
