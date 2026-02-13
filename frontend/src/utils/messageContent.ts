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

  // Optional: handle single JSON object (AI content block or user structured context)
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;

      // AI-style block: { content: { type: 'text', data: '...' } }
      const content = obj?.content as { type?: string; data?: string } | undefined;
      const data = content?.data;
      if (typeof data === 'string' && content?.type === 'text') {
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

      // User structured context (e.g. property selection): { propertyName: "...", location: "..." }
      // Render as human-readable lines instead of raw JSON
      const friendlyLabels: Record<string, string> = {
        propertyName: 'Property',
        location: 'Location',
        property: 'Property',
        city: 'City',
        country: 'Country',
      };
      const lines: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined || (typeof val === 'string' && !val.trim())) continue;
        const label = friendlyLabels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
        const value = typeof val === 'object' ? JSON.stringify(val) : String(val);
        lines.push(`${label}: ${value}`);
      }
      if (lines.length > 0) {
        return { kind: 'text', value: lines.join('\n') };
      }
    } catch {
      // ignore
    }
  }

  return { kind: 'text', value: raw };
}
