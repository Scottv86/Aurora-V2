import zlib from 'zlib';

export interface LocalPdfExtractResult {
  ok: boolean;
  text: string;
  wordCount: number;
  pageEstimate: number;
}

function unescapePdfLiteral(str: string): string {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = str[++i];
    if (next === undefined) break;
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === '(' || next === ')' || next === '\\') out += next;
    else if (next === '\r' || next === '\n') {
      if (next === '\r' && str[i + 1] === '\n') i++;
    } else if (next >= '0' && next <= '7') {
      let oct = next;
      if (str[i + 1] >= '0' && str[i + 1] <= '7') oct += str[++i];
      if (str[i + 1] >= '0' && str[i + 1] <= '7') oct += str[++i];
      out += String.fromCharCode(parseInt(oct, 8));
    } else {
      out += next;
    }
  }
  return out;
}

function decodePdfHex(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length < 2) return '';
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2).padEnd(2, '0'), 16);
    if (!Number.isNaN(byte)) bytes.push(byte);
  }
  // UTF-16BE BOM
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return out;
  }
  // Only decode printable ASCII/Latin-1
  let out = '';
  for (const b of bytes) {
    if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13 || (b >= 160 && b <= 255)) {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

function extractTextFromContentStream(content: string): string {
  const chunks: string[] = [];
  const btRegex = /BT([\s\S]*?)ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btRegex.exec(content)) !== null) {
    const block = btMatch[1];
    let blockText = '';

    // Tokenize literal strings (...), hex strings <...>, arrays [...], and operators
    let i = 0;
    const len = block.length;
    while (i < len) {
      const ch = block[i];

      if (ch === '(') {
        // Parse balanced PDF literal string
        let depth = 1;
        let raw = '';
        i++;
        while (i < len && depth > 0) {
          const c = block[i];
          if (c === '\\') {
            raw += c + (block[i + 1] ?? '');
            i += 2;
            continue;
          }
          if (c === '(') depth++;
          else if (c === ')') {
            depth--;
            if (depth === 0) {
              i++;
              break;
            }
          }
          raw += c;
          i++;
        }
        // Check if followed by Tj, ', or "
        const after = block.slice(i, i + 8).trimStart();
        if (after.startsWith('Tj') || after.startsWith("'") || after.startsWith('"')) {
          blockText += unescapePdfLiteral(raw);
          if (after.startsWith("'") || after.startsWith('"')) blockText += '\n';
        }
        continue;
      }

      if (ch === '[') {
        // Parse TJ array
        let arrEnd = i + 1;
        let inParen = 0;
        while (arrEnd < len) {
          const c = block[arrEnd];
          if (c === '\\' && inParen > 0) {
            arrEnd += 2;
            continue;
          }
          if (c === '(') inParen++;
          else if (c === ')') inParen = Math.max(0, inParen - 1);
          else if (c === ']' && inParen === 0) break;
          arrEnd++;
        }
        const arrBody = block.slice(i + 1, arrEnd);
        const after = block.slice(arrEnd + 1, arrEnd + 8).trimStart();
        i = arrEnd + 1;

        if (after.startsWith('TJ')) {
          let j = 0;
          while (j < arrBody.length) {
            const ac = arrBody[j];
            if (ac === '(') {
              let d = 1;
              let raw = '';
              j++;
              while (j < arrBody.length && d > 0) {
                const c = arrBody[j];
                if (c === '\\') {
                  raw += c + (arrBody[j + 1] ?? '');
                  j += 2;
                  continue;
                }
                if (c === '(') d++;
                else if (c === ')') {
                  d--;
                  if (d === 0) {
                    j++;
                    break;
                  }
                }
                raw += c;
                j++;
              }
              blockText += unescapePdfLiteral(raw);
            } else if (ac === '<' && arrBody[j + 1] !== '<') {
              const endHex = arrBody.indexOf('>', j + 1);
              if (endHex !== -1) {
                blockText += decodePdfHex(arrBody.slice(j + 1, endHex));
                j = endHex + 1;
              } else {
                j++;
              }
            } else if (ac === '-' || (ac >= '0' && ac <= '9')) {
              let numStr = '';
              while (j < arrBody.length && /[-0-9.]/.test(arrBody[j])) {
                numStr += arrBody[j++];
              }
              const kern = parseFloat(numStr);
              if (Number.isFinite(kern) && kern < -120) {
                blockText += ' ';
              }
            } else {
              j++;
            }
          }
        }
        continue;
      }

      if (ch === '<' && block[i + 1] !== '<') {
        const endHex = block.indexOf('>', i + 1);
        if (endHex !== -1) {
          const hexStr = block.slice(i + 1, endHex);
          const after = block.slice(endHex + 1, endHex + 8).trimStart();
          if (after.startsWith('Tj')) {
            blockText += decodePdfHex(hexStr);
          }
          i = endHex + 1;
          continue;
        }
      }

      // Line break operators (Td, TD, T*, Tm)
      if (ch === 'T' && (block[i + 1] === 'd' || block[i + 1] === 'D' || block[i + 1] === '*' || block[i + 1] === 'm')) {
        if (blockText.length > 0 && !blockText.endsWith('\n') && !blockText.endsWith(' ')) {
          blockText += '\n';
        }
        i += 2;
        continue;
      }

      i++;
    }

    if (blockText.trim()) {
      chunks.push(blockText.trim());
    }
  }

  return chunks.join('\n');
}

function isReadableText(text: string): boolean {
  if (text.length < 80) return false;
  // Count real English/alphanumeric words (>= 2 letters)
  const words = text.match(/[A-Za-z]{2,}/g) || [];
  if (words.length < 20) return false;
  // Ensure low ratio of replacement/control garbage characters
  const sample = text.slice(0, 4000);
  const printable = sample.replace(/[^\x20-\x7E\n\r\t]/g, '').length;
  return printable / sample.length >= 0.8;
}

/**
 * Fast zero-dependency PDF text extractor.
 * Inflates FlateDecode content streams and parses BT..ET text operators in milliseconds.
 * Returns { ok: false } for scanned/image-only or custom-CID-encoded PDFs so caller can fall back to Gemini OCR.
 */
export function extractPdfTextLocally(buffer: Buffer, maxChars = 25_000): LocalPdfExtractResult {
  try {
    const latin = buffer.toString('latin1');
    const pageMatches = latin.match(/\/Type\s*\/Page\b/g);
    const pageEstimate = pageMatches ? pageMatches.length : 1;

    const extractedParts: string[] = [];
    let totalLen = 0;

    const streamMarker = Buffer.from('stream');
    const endStreamMarker = Buffer.from('endstream');
    let pos = 0;

    while (pos < buffer.length && totalLen < maxChars) {
      const sIdx = buffer.indexOf(streamMarker, pos);
      if (sIdx === -1) break;

      // Check dictionary immediately preceding "stream" to skip obvious image/font streams
      const dictStart = Math.max(0, sIdx - 400);
      const dictSnippet = buffer.subarray(dictStart, sIdx).toString('latin1');
      let dataStart = sIdx + streamMarker.length;
      if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
      else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) dataStart += 1;

      const eIdx = buffer.indexOf(endStreamMarker, dataStart);
      if (eIdx === -1) break;
      pos = eIdx + endStreamMarker.length;

      if (/\/Subtype\s*\/(Image|Type1C|CIDFontType0C|OpenType)/.test(dictSnippet)) {
        continue;
      }

      let rawStream = buffer.subarray(dataStart, eIdx);
      // Trim trailing newline before endstream
      while (rawStream.length > 0 && (rawStream[rawStream.length - 1] === 0x0a || rawStream[rawStream.length - 1] === 0x0d)) {
        rawStream = rawStream.subarray(0, rawStream.length - 1);
      }

      if (rawStream.length === 0 || rawStream.length > 2_000_000) continue;

      let decodedStr = '';
      if (/\/Filter\s*\/FlateDecode|\/FlateDecode/.test(dictSnippet)) {
        try {
          decodedStr = zlib.inflateSync(rawStream).toString('latin1');
        } catch {
          try {
            decodedStr = zlib.inflateRawSync(rawStream).toString('latin1');
          } catch {
            continue;
          }
        }
      } else if (!/\/Filter\s*\//.test(dictSnippet)) {
        decodedStr = rawStream.toString('latin1');
      } else {
        continue;
      }

      if (!decodedStr.includes('BT') || !decodedStr.includes('ET')) continue;

      const text = extractTextFromContentStream(decodedStr);
      if (text) {
        extractedParts.push(text);
        totalLen += text.length;
      }
    }

    const combined = extractedParts
      .join('\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, maxChars);

    if (!isReadableText(combined)) {
      return { ok: false, text: '', wordCount: 0, pageEstimate };
    }

    const wordCount = combined.split(/\s+/).filter(Boolean).length;
    return { ok: true, text: combined, wordCount, pageEstimate };
  } catch {
    return { ok: false, text: '', wordCount: 0, pageEstimate: 1 };
  }
}
