import crypto from 'crypto';

export interface ExtractedFileMetadata {
  dimensions?: {
    width: number;
    height: number;
    aspectRatio?: string;
    megapixels?: string;
  };
  exif?: {
    make?: string;
    model?: string;
    dateTimeOriginal?: string;
    software?: string;
    orientation?: number | string;
    iso?: number;
    fNumber?: number;
    exposureTime?: string;
    lensModel?: string;
  };
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    mapsUrl?: string;
  };
  pdfInfo?: {
    version?: string;
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    pageCount?: number;
  };
  textStats?: {
    linesCount?: number;
    wordsCount?: number;
    charactersCount?: number;
  };
  system: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  };
}

export class FileMetadataExtractor {
  /**
   * Extract comprehensive metadata from raw file buffer
   */
  static extract(buffer: Buffer, filename: string, mimeType: string): ExtractedFileMetadata {
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const safeMime = mimeType || 'application/octet-stream';

    const result: ExtractedFileMetadata = {
      system: {
        filename,
        mimeType: safeMime,
        sizeBytes: buffer.length,
        sha256
      }
    };

    try {
      // 1. Image extraction (JPEG / PNG / WEBP / TIFF)
      if (safeMime.startsWith('image/')) {
        if (safeMime.includes('jpeg') || safeMime.includes('jpg') || filename.match(/\.jpe?g$/i)) {
          this.parseJpeg(buffer, result);
        } else if (safeMime.includes('png') || filename.endsWith('.png')) {
          this.parsePng(buffer, result);
        }
      }

      // 2. PDF extraction
      if (safeMime === 'application/pdf' || filename.endsWith('.pdf')) {
        this.parsePdf(buffer, result);
      }

      // 3. Text stats extraction
      if (safeMime.startsWith('text/') || filename.match(/\.(txt|md|csv|json|xml|log|ts|js)$/i)) {
        this.parseText(buffer, result);
      }
    } catch (err) {
      console.warn('[FileMetadataExtractor] Non-fatal parsing error:', err);
    }

    return result;
  }

  /**
   * Parse PNG dimensions
   */
  private static parsePng(buffer: Buffer, result: ExtractedFileMetadata) {
    if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      result.dimensions = {
        width,
        height,
        aspectRatio: `${(width / height).toFixed(2)}:1`,
        megapixels: ((width * height) / 1000000).toFixed(1) + ' MP'
      };
    }
  }

  /**
   * Parse JPEG dimensions and EXIF metadata (including GPS)
   */
  private static parseJpeg(buffer: Buffer, result: ExtractedFileMetadata) {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return;

    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      offset += 2;

      // SOF markers containing width/height
      if (marker === 0xc0 || marker === 0xc2) {
        if (offset + 7 <= buffer.length) {
          const height = buffer.readUInt16BE(offset + 3);
          const width = buffer.readUInt16BE(offset + 5);
          result.dimensions = {
            width,
            height,
            aspectRatio: `${(width / height).toFixed(2)}:1`,
            megapixels: ((width * height) / 1000000).toFixed(1) + ' MP'
          };
        }
      }

      // APP1 Marker: EXIF & GPS
      if (marker === 0xe1) {
        const length = buffer.readUInt16BE(offset);
        const segmentEnd = offset + length;
        const exifHeader = buffer.slice(offset + 2, offset + 6).toString('ascii');

        if (exifHeader === 'Exif') {
          this.parseExifSegment(buffer.slice(offset + 8, segmentEnd), result);
        }
        offset += length;
        continue;
      }

      // Skip marker payload
      if (offset + 2 <= buffer.length) {
        const length = buffer.readUInt16BE(offset);
        offset += length;
      } else {
        break;
      }
    }
  }

  /**
   * Parse TIFF/EXIF IFD tags inside APP1
   */
  private static parseExifSegment(exifBuf: Buffer, result: ExtractedFileMetadata) {
    if (exifBuf.length < 8) return;

    // Check byte order: 'II' (Intel, Little Endian) or 'MM' (Motorola, Big Endian)
    const isLittleEndian = exifBuf[0] === 0x49 && exifBuf[1] === 0x49;
    const readUInt16 = (idx: number) => isLittleEndian ? exifBuf.readUInt16LE(idx) : exifBuf.readUInt16BE(idx);
    const readUInt32 = (idx: number) => isLittleEndian ? exifBuf.readUInt32LE(idx) : exifBuf.readUInt32BE(idx);

    const firstIFDOffset = readUInt32(4);
    if (firstIFDOffset >= exifBuf.length) return;

    result.exif = result.exif || {};

    let gpsIFDOffset = 0;

    // Read IFD0 entries
    const numEntries = readUInt16(firstIFDOffset);
    let entryOffset = firstIFDOffset + 2;

    for (let i = 0; i < numEntries && entryOffset + 12 <= exifBuf.length; i++) {
      const tag = readUInt16(entryOffset);
      const count = readUInt32(entryOffset + 4);
      const valOffset = entryOffset + 8;

      // Tag 0x010F: Make
      if (tag === 0x010f) {
        const strOffset = readUInt32(valOffset);
        if (strOffset < exifBuf.length) {
          result.exif.make = exifBuf.slice(strOffset, strOffset + Math.min(count, 40)).toString('ascii').replace(/\0.*$/, '').trim();
        }
      }
      // Tag 0x0110: Model
      if (tag === 0x0110) {
        const strOffset = readUInt32(valOffset);
        if (strOffset < exifBuf.length) {
          result.exif.model = exifBuf.slice(strOffset, strOffset + Math.min(count, 40)).toString('ascii').replace(/\0.*$/, '').trim();
        }
      }
      // Tag 0x0131: Software
      if (tag === 0x0131) {
        const strOffset = readUInt32(valOffset);
        if (strOffset < exifBuf.length) {
          result.exif.software = exifBuf.slice(strOffset, strOffset + Math.min(count, 40)).toString('ascii').replace(/\0.*$/, '').trim();
        }
      }
      // Tag 0x0132: DateTime
      if (tag === 0x0132) {
        const strOffset = readUInt32(valOffset);
        if (strOffset < exifBuf.length) {
          result.exif.dateTimeOriginal = exifBuf.slice(strOffset, strOffset + Math.min(count, 25)).toString('ascii').replace(/\0.*$/, '').trim();
        }
      }
      // Tag 0x8825: GPS Info IFD Pointer
      if (tag === 0x8825) {
        gpsIFDOffset = readUInt32(valOffset);
      }

      entryOffset += 12;
    }

    // Read GPS IFD if pointer found
    if (gpsIFDOffset > 0 && gpsIFDOffset < exifBuf.length) {
      try {
        const numGpsEntries = readUInt16(gpsIFDOffset);
        let gpsEntry = gpsIFDOffset + 2;

        let latRef = 'N';
        let lonRef = 'E';
        let latDeg = 0, latMin = 0, latSec = 0;
        let lonDeg = 0, lonMin = 0, lonSec = 0;
        let hasLat = false, hasLon = false;

        for (let g = 0; g < numGpsEntries && gpsEntry + 12 <= exifBuf.length; g++) {
          const gTag = readUInt16(gpsEntry);
          const gValOffset = gpsEntry + 8;

          // GPSLatitudeRef (1)
          if (gTag === 0x0001) {
            latRef = String.fromCharCode(exifBuf[gValOffset]);
          }
          // GPSLatitude (2) - 3 RATIONALs
          if (gTag === 0x0002) {
            const ptr = readUInt32(gValOffset);
            if (ptr + 24 <= exifBuf.length) {
              latDeg = readUInt32(ptr) / (readUInt32(ptr + 4) || 1);
              latMin = readUInt32(ptr + 8) / (readUInt32(ptr + 12) || 1);
              latSec = readUInt32(ptr + 16) / (readUInt32(ptr + 20) || 1);
              hasLat = true;
            }
          }
          // GPSLongitudeRef (3)
          if (gTag === 0x0003) {
            lonRef = String.fromCharCode(exifBuf[gValOffset]);
          }
          // GPSLongitude (4) - 3 RATIONALs
          if (gTag === 0x0004) {
            const ptr = readUInt32(gValOffset);
            if (ptr + 24 <= exifBuf.length) {
              lonDeg = readUInt32(ptr) / (readUInt32(ptr + 4) || 1);
              lonMin = readUInt32(ptr + 8) / (readUInt32(ptr + 12) || 1);
              lonSec = readUInt32(ptr + 16) / (readUInt32(ptr + 20) || 1);
              hasLon = true;
            }
          }

          gpsEntry += 12;
        }

        if (hasLat && hasLon) {
          let latitude = latDeg + (latMin / 60) + (latSec / 3600);
          if (latRef === 'S') latitude = -latitude;

          let longitude = lonDeg + (lonMin / 60) + (lonSec / 3600);
          if (lonRef === 'W') longitude = -longitude;

          result.gps = {
            latitude: Number(latitude.toFixed(6)),
            longitude: Number(longitude.toFixed(6)),
            mapsUrl: `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`
          };
        }
      } catch (gpsErr) {
        console.warn('[FileMetadataExtractor] GPS parse notice:', gpsErr);
      }
    }
  }

  /**
   * Parse PDF Header & Information Dictionary
   */
  private static parsePdf(buffer: Buffer, result: ExtractedFileMetadata) {
    const raw = buffer.toString('latin1', 0, Math.min(buffer.length, 300000));

    // 1. PDF Version
    const versionMatch = raw.match(/%PDF-([0-9.]+)/);
    const pdfVersion = versionMatch ? versionMatch[1] : '1.4';

    // 2. Page count heuristic
    const pageMatches = raw.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : undefined;

    // 3. Document Info tags
    const extractTag = (tag: string): string | undefined => {
      const match = raw.match(new RegExp(`/${tag}\\s*\\(([^)]+)\\)`));
      return match ? match[1].trim() : undefined;
    };

    const extractDate = (tag: string): string | undefined => {
      const match = raw.match(new RegExp(`/${tag}\\s*\\(D:([0-9]{4})([0-9]{2})([0-9]{2})`));
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      return undefined;
    };

    result.pdfInfo = {
      version: `PDF ${pdfVersion}`,
      pageCount: pageCount && pageCount > 0 ? pageCount : 1,
      title: extractTag('Title'),
      author: extractTag('Author'),
      creator: extractTag('Creator'),
      producer: extractTag('Producer'),
      creationDate: extractDate('CreationDate'),
      modificationDate: extractDate('ModDate')
    };

    if (result.pdfInfo.author || result.pdfInfo.creator) {
      result.exif = result.exif || {};
      result.exif.make = result.pdfInfo.creator;
      result.exif.software = result.pdfInfo.producer;
      result.exif.dateTimeOriginal = result.pdfInfo.creationDate;
    }
  }

  /**
   * Parse Text stats
   */
  private static parseText(buffer: Buffer, result: ExtractedFileMetadata) {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r\n|\r|\n/);
    const words = text.trim().split(/\s+/).filter(Boolean);

    result.textStats = {
      linesCount: lines.length,
      wordsCount: words.length,
      charactersCount: text.length
    };
  }
}
