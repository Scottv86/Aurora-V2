import net from 'net';

export interface ScreeningResult {
  isClean: boolean;
  reasons: string[];
  sanitizedData: any;
}

export class SecurityScreeningService {
  static screenPayload(data: any): ScreeningResult {
    const reasons: string[] = [];
    const sanitizedData = this.deepCloneAndScreen(data, reasons);
    
    // Low-risk sanitizations like XSS cleanups allow the record to pass through
    // whereas SQL and command injections will result in quarantine isolation (isClean: false)
    const hasQuarantineFlag = reasons.some(r => 
      r.startsWith('SQL_INJECTION') || r.startsWith('COMMAND_INJECTION')
    );

    return {
      isClean: !hasQuarantineFlag,
      reasons,
      sanitizedData
    };
  }


  private static deepCloneAndScreen(val: any, reasons: string[]): any {
    if (val === null || val === undefined) return val;

    if (Array.isArray(val)) {
      return val.map(item => this.deepCloneAndScreen(item, reasons));
    }

    if (typeof val === 'object') {
      const copy: Record<string, any> = {};
      for (const [key, value] of Object.entries(val)) {
        copy[key] = this.deepCloneAndScreen(value, reasons);
      }
      return copy;
    }

    if (typeof val === 'string') {
      let currentText = val;

      // 1. Check for SQL Injection signatures (e.g., UNION SELECT, OR 1=1, DROP TABLE)
      const sqlInjectionPatterns = [
        /\bUNION\s+SELECT\b/i,
        /\bOR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
        /\bDROP\s+TABLE\b/i,
        /\bINSERT\s+INTO\b/i,
        /\bDELETE\s+FROM\b/i,
        /\bSELECT\s+.*\s+FROM\b/i
      ];

      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(currentText)) {
          reasons.push(`SQL_INJECTION_DETECTED: "${pattern.source}"`);
        }
      }

      // 2. Check for shell command injections (e.g., ; rm -rf, && curl, etc.)
      const commandInjectionPatterns = [
        /[;&|]\s*(?:rm|curl|wget|bash|sh|powershell|cmd|eval|exec)\b/i,
        /\$\((?:rm|curl|wget|bash|sh|powershell|cmd|eval|exec)\b/i
      ];

      for (const pattern of commandInjectionPatterns) {
        if (pattern.test(currentText)) {
          reasons.push(`COMMAND_INJECTION_DETECTED: "${pattern.source}"`);
        }
      }

      // 3. Screen and sanitize XSS scripts
      const xssScriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
      const htmlEventHandlersRegex = /\bon[a-z]+\s*=\s*['"][^'"]*['"]/gi;
      const javascriptUriRegex = /href\s*=\s*['"]javascript:[^'"]*['"]/gi;

      let isSanitized = false;
      if (xssScriptRegex.test(currentText)) {
        currentText = currentText.replace(xssScriptRegex, '');
        isSanitized = true;
      }
      if (htmlEventHandlersRegex.test(currentText)) {
        currentText = currentText.replace(htmlEventHandlersRegex, '');
        isSanitized = true;
      }
      if (javascriptUriRegex.test(currentText)) {
        currentText = currentText.replace(javascriptUriRegex, 'href="#"');
        isSanitized = true;
      }

      if (isSanitized) {
        reasons.push('XSS_SCRIPT_SANITIZED');
      }

      return currentText;
    }

    return val;
  }

  /**
   * Screens file extensions and buffer contents for viruses using ClamAV stream scanner.
   */
  static async screenFile(fileBuffer: Buffer, fileName: string): Promise<{ isClean: boolean; reason?: string }> {
    // 1. Hard extension block for unsafe executable files
    const unsafeExtensions = ['.exe', '.bat', '.sh', '.cmd', '.bin', '.msi', '.js', '.vbs', '.scr', '.jar', '.com', '.elf'];
    const lowerName = fileName.toLowerCase();
    const isUnsafeExtension = unsafeExtensions.some(ext => lowerName.endsWith(ext));

    if (isUnsafeExtension) {
      return { isClean: false, reason: `UNSAFE_FILE_EXTENSION: ${fileName}` };
    }

    // 2. Scan file content via ClamAV if configured
    const clamHost = process.env.CLAMAV_HOST;
    const clamPort = process.env.CLAMAV_PORT ? parseInt(process.env.CLAMAV_PORT, 10) : 3310;

    if (!clamHost) {
      console.warn('[SecurityScreening] CLAMAV_HOST not configured. File content scan skipped.');
      return { isClean: true };
    }

    return new Promise((resolve) => {
      const client = net.createConnection({ host: clamHost, port: clamPort }, () => {
        // Connected, send INSTREAM command
        const instreamHeader = Buffer.from('nINSTREAM\n');
        client.write(instreamHeader);

        // Send file buffer in chunk format: [4 bytes length][chunk data]
        const chunkSize = 4096;
        let offset = 0;

        while (offset < fileBuffer.length) {
          const chunk = fileBuffer.subarray(offset, offset + chunkSize);
          const lenBuffer = Buffer.alloc(4);
          lenBuffer.writeUInt32BE(chunk.length, 0);

          client.write(lenBuffer);
          client.write(chunk);

          offset += chunkSize;
        }

        // Send EOF chunk (length 0)
        const eofBuffer = Buffer.alloc(4);
        eofBuffer.writeUInt32BE(0, 0);
        client.write(eofBuffer);
      });

      let response = '';
      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('error', (err) => {
        console.error('[SecurityScreening] ClamAV socket error:', err);
        resolve({ isClean: true, reason: 'CLAMAV_CONNECTION_ERROR' });
      });

      client.on('end', () => {
        client.destroy();
        
        if (response.includes('FOUND')) {
          const virusName = response.match(/stream: (.*) FOUND/)?.[1] || 'Malicious Signature';
          resolve({ isClean: false, reason: `MALWARE_DETECTED: ${virusName}` });
        } else if (response.includes('OK')) {
          resolve({ isClean: true });
        } else {
          resolve({ isClean: true });
        }
      });

      // Set timeout
      client.setTimeout(10000, () => {
        client.destroy();
        resolve({ isClean: true, reason: 'CLAMAV_TIMEOUT' });
      });
    });
  }
}
