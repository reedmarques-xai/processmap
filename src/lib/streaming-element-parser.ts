/**
 * Incremental Excalidraw element parser for streaming JSON responses.
 *
 * Grok returns JSON like:
 *   { "title": "...", "summary": "...", "excalidraw": { "elements": [ {...}, {...} ] } }
 *
 * This parser watches the stream character-by-character and emits each
 * complete element object from the "elements" array as soon as its closing
 * `}` arrives — without waiting for the entire response to finish.
 *
 * Usage:
 *   const parser = new StreamingElementParser();
 *   for (const chunk of chunks) {
 *     const newElements = parser.push(chunk);
 *     if (newElements.length > 0) updateDiagram(parser.getAllElements());
 *   }
 */

export class StreamingElementParser {
  // Accumulated text (only used for final full parse)
  private buffer = "";

  // State machine
  private inElementsArray = false; // true once we're inside `"elements": [`
  private depth = 0;               // brace depth within current element object
  private currentElement = "";     // accumulator for the current element's JSON
  private inString = false;        // inside a JSON string literal
  private escaped = false;         // last char was backslash

  // Successfully parsed elements so far
  private elements: Record<string, unknown>[] = [];

  // Track whether we've seen the opening `[` after `"elements"`
  private lookingForArrayOpen = false;
  // Small buffer to detect `"elements"` key
  private keyBuffer = "";
  private keyDetected = false;

  /**
   * Feed a chunk of text from the stream.
   * Returns an array of newly completed elements (may be empty).
   */
  push(chunk: string): Record<string, unknown>[] {
    this.buffer += chunk;
    const newElements: Record<string, unknown>[] = [];

    for (const ch of chunk) {
      // ----- Key detection: find `"elements"` followed by `:` then `[` -----
      if (!this.inElementsArray && !this.keyDetected) {
        this.keyBuffer += ch;
        // Keep only last 30 chars to avoid unbounded growth
        if (this.keyBuffer.length > 30) {
          this.keyBuffer = this.keyBuffer.slice(-30);
        }
        if (this.keyBuffer.endsWith('"elements"')) {
          this.keyDetected = true;
          this.lookingForArrayOpen = true;
        }
        continue;
      }

      // ----- Waiting for the `[` that opens the elements array -----
      if (this.lookingForArrayOpen) {
        if (ch === "[") {
          this.inElementsArray = true;
          this.lookingForArrayOpen = false;
          this.depth = 0;
          this.currentElement = "";
        }
        // Skip `:`, whitespace, etc.
        continue;
      }

      // ----- Inside the elements array: parse element objects -----
      if (this.inElementsArray) {
        // Handle string escaping
        if (this.inString) {
          this.currentElement += ch;
          if (this.escaped) {
            this.escaped = false;
          } else if (ch === "\\") {
            this.escaped = true;
          } else if (ch === '"') {
            this.inString = false;
          }
          continue;
        }

        // Not inside a string
        if (ch === '"') {
          this.inString = true;
          this.currentElement += ch;
          continue;
        }

        if (ch === "{") {
          this.depth++;
          this.currentElement += ch;
          continue;
        }

        if (ch === "}") {
          this.depth--;
          this.currentElement += ch;

          if (this.depth === 0) {
            // We have a complete element object
            try {
              const el = JSON.parse(this.currentElement.trim());
              this.elements.push(el);
              newElements.push(el);
            } catch {
              // Malformed element — skip it
              console.warn("[StreamingElementParser] Failed to parse element, skipping");
            }
            this.currentElement = "";
          }
          continue;
        }

        if (ch === "]" && this.depth === 0) {
          // End of the elements array
          this.inElementsArray = false;
          continue;
        }

        // Accumulate chars inside an element object
        if (this.depth > 0) {
          this.currentElement += ch;
        }
        // Skip commas and whitespace between elements (depth === 0)
      }
    }

    return newElements;
  }

  /** Get all elements parsed so far. */
  getAllElements(): Record<string, unknown>[] {
    return [...this.elements];
  }

  /** Get the full accumulated text buffer (for final JSON.parse fallback). */
  getBuffer(): string {
    return this.buffer;
  }

  /** Get count of parsed elements. */
  getCount(): number {
    return this.elements.length;
  }
}
