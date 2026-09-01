import * as net from 'net';
import * as tls from 'tls';
import * as crypto from 'crypto';

export interface EmailServerConfig {
  email: string;
  name?: string;
  password?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  provider?: 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'custom' | 'shared';
}

export interface ParsedEmail {
  id: string;
  uid?: number;
  messageId?: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  cc?: { name: string; address: string }[];
  bcc?: { name: string; address: string }[];
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  snippet: string;
  flags: string[];
  attachments: {
    id: string;
    filename: string;
    contentType: string;
    size: number;
    contentBase64?: string;
  }[];
}

export interface SendEmailPayload {
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: {
    filename: string;
    contentType: string;
    contentBase64: string;
  }[];
}

/**
 * Auto-detects server settings based on email domain
 */
export function autoDetectEmailSettings(email: string): Partial<EmailServerConfig> {
  const domain = email.split('@')[1]?.toLowerCase().trim() || '';
  
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return {
      provider: 'gmail',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapSecure: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpSecure: true,
    };
  }

  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'office365.com') {
    return {
      provider: 'outlook',
      imapHost: 'outlook.office365.com',
      imapPort: 993,
      imapSecure: true,
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false, // STARTTLS
    };
  }

  if (domain === 'yahoo.com' || domain === 'ymail.com') {
    return {
      provider: 'yahoo',
      imapHost: 'imap.mail.yahoo.com',
      imapPort: 993,
      imapSecure: true,
      smtpHost: 'smtp.mail.yahoo.com',
      smtpPort: 465,
      smtpSecure: true,
    };
  }

  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return {
      provider: 'icloud',
      imapHost: 'imap.mail.me.com',
      imapPort: 993,
      imapSecure: true,
      smtpHost: 'smtp.mail.me.com',
      smtpPort: 587,
      smtpSecure: false,
    };
  }

  // Default fallback for custom domain
  return {
    provider: 'custom',
    imapHost: `mail.${domain}`,
    imapPort: 993,
    imapSecure: true,
    smtpHost: `mail.${domain}`,
    smtpPort: 465,
    smtpSecure: true,
  };
}

/**
 * Native Pure Node.js SMTP Client
 */
export class SmtpClient {
  private config: EmailServerConfig;

  constructor(config: EmailServerConfig) {
    this.config = config;
  }

  public async verifyConnection(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const host = this.config.smtpHost || 'smtp.gmail.com';
      const port = this.config.smtpPort || (this.config.smtpSecure ? 465 : 587);
      const isDirectTls = port === 465 || this.config.smtpSecure === true;

      let socket: net.Socket;
      let isResolved = false;

      const finish = (success: boolean, msg: string) => {
        if (!isResolved) {
          isResolved = true;
          try { socket.destroy(); } catch (_) {}
          resolve({ success, message: msg });
        }
      };

      const timeout = setTimeout(() => {
        finish(false, `SMTP Connection timed out after 10s connecting to ${host}:${port}`);
      }, 10000);

      try {
        if (isDirectTls) {
          socket = tls.connect({
            host,
            port,
            rejectUnauthorized: false,
            servername: host
          });
        } else {
          socket = net.connect({ host, port });
        }

        let stage = 0;
        let buffer = '';

        socket.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\r\n');
          const lastLine = lines[lines.length - 2] || lines[lines.length - 1] || '';
          
          if (!lastLine) return;

          // Check if multi-line response (code with '-' e.g. 250-8BITMIME)
          if (/^\d{3}-/.test(lastLine)) return;

          const code = parseInt(lastLine.substring(0, 3), 10);
          buffer = '';

          if (stage === 0) { // Initial greeting
            if (code === 220) {
              stage = 1;
              socket.write(`EHLO aurora.workspace\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, `Unexpected SMTP banner: ${lastLine}`);
            }
          } else if (stage === 1) { // EHLO response
            if (code === 250) {
              if (!this.config.password) {
                clearTimeout(timeout);
                finish(true, `SMTP server connected successfully.`);
                return;
              }
              stage = 2;
              socket.write(`AUTH LOGIN\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, `EHLO rejected: ${lastLine}`);
            }
          } else if (stage === 2) { // AUTH LOGIN response -> send base64 username
            if (code === 334) {
              stage = 3;
              const usernameB64 = Buffer.from(this.config.email).toString('base64');
              socket.write(`${usernameB64}\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, `AUTH LOGIN rejected: ${lastLine}`);
            }
          } else if (stage === 3) { // Base64 username accepted -> send base64 password
            if (code === 334) {
              stage = 4;
              const cleanPass = (this.config.password || '').replace(/\s+/g, '');
              const passB64 = Buffer.from(cleanPass).toString('base64');
              socket.write(`${passB64}\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, `Username rejected: ${lastLine}`);
            }
          } else if (stage === 4) { // Authentication result
            clearTimeout(timeout);
            if (code === 235) {
              finish(true, 'SMTP Authentication successful.');
            } else {
              finish(false, `SMTP Authentication failed (Invalid email or password/App Password): ${lastLine}`);
            }
          }
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          finish(false, `SMTP Socket Error: ${err.message}`);
        });

      } catch (err: any) {
        clearTimeout(timeout);
        finish(false, `SMTP Exception: ${err.message}`);
      }
    });
  }

  public async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string; error?: string }> {
    return new Promise((resolve) => {
      const host = this.config.smtpHost || 'smtp.gmail.com';
      const port = this.config.smtpPort || (this.config.smtpSecure ? 465 : 587);
      const isDirectTls = port === 465 || this.config.smtpSecure === true;
      const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@aurora.internal>`;

      let socket: net.Socket;
      let isResolved = false;

      const finish = (success: boolean, msgId: string, err?: string) => {
        if (!isResolved) {
          isResolved = true;
          try { socket.destroy(); } catch (_) {}
          resolve({ success, messageId: msgId, error: err });
        }
      };

      const timeout = setTimeout(() => {
        finish(false, messageId, `SMTP timeout while sending email to ${host}:${port}`);
      }, 15000);

      try {
        if (isDirectTls) {
          socket = tls.connect({
            host,
            port,
            rejectUnauthorized: false,
            servername: host
          });
        } else {
          socket = net.connect({ host, port });
        }

        let stage = 0;
        let recipientIdx = 0;
        const allRecipients = [...payload.to, ...(payload.cc || []), ...(payload.bcc || [])];
        let buffer = '';

        socket.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\r\n');
          const lastLine = lines[lines.length - 2] || lines[lines.length - 1] || '';
          if (!lastLine) return;
          if (/^\d{3}-/.test(lastLine)) return;

          const code = parseInt(lastLine.substring(0, 3), 10);
          buffer = '';

          if (stage === 0) {
            if (code === 220) {
              stage = 1;
              socket.write(`EHLO aurora.workspace\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `SMTP Banner Error: ${lastLine}`);
            }
          } else if (stage === 1) {
            if (code === 250) {
              if (this.config.password) {
                stage = 2;
                socket.write(`AUTH LOGIN\r\n`);
              } else {
                stage = 5;
                socket.write(`MAIL FROM:<${payload.from}>\r\n`);
              }
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `EHLO Error: ${lastLine}`);
            }
          } else if (stage === 2) {
            if (code === 334) {
              stage = 3;
              socket.write(`${Buffer.from(this.config.email).toString('base64')}\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `AUTH Error: ${lastLine}`);
            }
          } else if (stage === 3) {
            if (code === 334) {
              stage = 4;
              const cleanPass = (this.config.password || '').replace(/\s+/g, '');
              socket.write(`${Buffer.from(cleanPass).toString('base64')}\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `Username Error: ${lastLine}`);
            }
          } else if (stage === 4) {
            if (code === 235) {
              stage = 5;
              socket.write(`MAIL FROM:<${payload.from}>\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `Auth Failed: ${lastLine}`);
            }
          } else if (stage === 5) {
            if (code === 250) {
              stage = 6;
              socket.write(`RCPT TO:<${allRecipients[0]}>\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `MAIL FROM rejected: ${lastLine}`);
            }
          } else if (stage === 6) {
            if (code === 250 || code === 251) {
              recipientIdx++;
              if (recipientIdx < allRecipients.length) {
                socket.write(`RCPT TO:<${allRecipients[recipientIdx]}>\r\n`);
              } else {
                stage = 7;
                socket.write(`DATA\r\n`);
              }
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `RCPT TO rejected: ${lastLine}`);
            }
          } else if (stage === 7) {
            if (code === 354) {
              stage = 8;
              const rawMime = buildMimeMessage(payload, messageId);
              socket.write(`${rawMime}\r\n.\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false, messageId, `DATA command rejected: ${lastLine}`);
            }
          } else if (stage === 8) {
            clearTimeout(timeout);
            if (code === 250) {
              socket.write(`QUIT\r\n`);
              finish(true, messageId);
            } else {
              finish(false, messageId, `Message data rejected: ${lastLine}`);
            }
          }
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          finish(false, messageId, `Socket error: ${err.message}`);
        });

      } catch (err: any) {
        clearTimeout(timeout);
        finish(false, messageId, `SMTP Send exception: ${err.message}`);
      }
    });
  }
}

/**
 * Builds RFC 2822 MIME message
 */
function buildMimeMessage(payload: SendEmailPayload, messageId: string): string {
  const boundary = `----=_Part_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const altBoundary = `----=_Alt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const senderName = payload.fromName ? `"${payload.fromName}" <${payload.from}>` : payload.from;

  let headers = [
    `From: ${senderName}`,
    `To: ${payload.to.join(', ')}`,
    ...(payload.cc && payload.cc.length ? [`Cc: ${payload.cc.join(', ')}`] : []),
    `Subject: =?UTF-8?B?${Buffer.from(payload.subject || '').toString('base64')}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    ...(payload.inReplyTo ? [`In-Reply-To: ${payload.inReplyTo}`] : []),
    ...(payload.references ? [`References: ${payload.references}`] : []),
  ];

  const hasAttachments = payload.attachments && payload.attachments.length > 0;

  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    
    let body = headers.join('\r\n') + '\r\n\r\n';
    body += `--${boundary}\r\n`;
    body += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;
    
    // Plain text part
    body += `--${altBoundary}\r\n`;
    body += `Content-Type: text/plain; charset=UTF-8\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${Buffer.from(payload.bodyText || payload.bodyHtml?.replace(/<[^>]+>/g, '') || '').toString('base64')}\r\n\r\n`;

    // HTML part
    body += `--${altBoundary}\r\n`;
    body += `Content-Type: text/html; charset=UTF-8\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${Buffer.from(payload.bodyHtml || payload.bodyText || '').toString('base64')}\r\n\r\n`;
    body += `--${altBoundary}--\r\n\r\n`;

    // Attachment parts
    for (const att of payload.attachments!) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.filename}"\r\n`;
      body += `Content-Transfer-Encoding: base64\r\n`;
      body += `Content-Disposition: attachment; filename="${att.filename}"\r\n\r\n`;
      body += `${att.contentBase64}\r\n\r\n`;
    }

    body += `--${boundary}--`;
    return body;
  } else {
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    let body = headers.join('\r\n') + '\r\n\r\n';

    // Plain text
    body += `--${altBoundary}\r\n`;
    body += `Content-Type: text/plain; charset=UTF-8\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${Buffer.from(payload.bodyText || payload.bodyHtml?.replace(/<[^>]+>/g, '') || '').toString('base64')}\r\n\r\n`;

    // HTML
    body += `--${altBoundary}\r\n`;
    body += `Content-Type: text/html; charset=UTF-8\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${Buffer.from(payload.bodyHtml || payload.bodyText || '').toString('base64')}\r\n\r\n`;
    body += `--${altBoundary}--`;
    return body;
  }
}

/**
 * Native Pure Node.js IMAP Client (TLS on port 993)
 */
export class ImapClient {
  private config: EmailServerConfig;

  constructor(config: EmailServerConfig) {
    this.config = config;
  }

  public async verifyConnection(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const host = this.config.imapHost || 'imap.gmail.com';
      const port = this.config.imapPort || 993;

      let socket: tls.TLSSocket;
      let isResolved = false;

      const finish = (success: boolean, msg: string) => {
        if (!isResolved) {
          isResolved = true;
          try { socket.destroy(); } catch (_) {}
          resolve({ success, message: msg });
        }
      };

      const timeout = setTimeout(() => {
        finish(false, `IMAP Connection timed out after 10s connecting to ${host}:${port}`);
      }, 10000);

      try {
        socket = tls.connect({
          host,
          port,
          rejectUnauthorized: false,
          servername: host
        });

        let tag = 1;
        let buffer = '';

        socket.on('data', (chunk) => {
          buffer += chunk.toString();
          
          if (buffer.includes('* OK')) {
            // Server ready -> send LOGIN
            const cleanPass = (this.config.password || '').replace(/\s+/g, '');
            socket.write(`A001 LOGIN "${this.config.email}" "${cleanPass}"\r\n`);
          } else if (buffer.includes('A001 OK')) {
            clearTimeout(timeout);
            finish(true, 'IMAP Connection & Authentication verified successfully.');
          } else if (buffer.includes('A001 NO') || buffer.includes('A001 BAD')) {
            clearTimeout(timeout);
            finish(false, `IMAP Login rejected by ${host}. Ensure IMAP is enabled and you are using a valid App Password.`);
          }
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          finish(false, `IMAP Socket error: ${err.message}`);
        });
      } catch (err: any) {
        clearTimeout(timeout);
        finish(false, `IMAP Exception: ${err.message}`);
      }
    });
  }

  /**
   * Fetches latest N messages from mailbox
   */
  public async fetchRecentMessages(folder = 'INBOX', limit = 50): Promise<ParsedEmail[]> {
    return new Promise((resolve) => {
      const host = this.config.imapHost || 'imap.gmail.com';
      const port = this.config.imapPort || 993;
      const emails: ParsedEmail[] = [];

      let socket: tls.TLSSocket;
      let isResolved = false;

      const finish = () => {
        if (!isResolved) {
          isResolved = true;
          try { socket.destroy(); } catch (_) {}
          resolve(emails);
        }
      };

      const timeout = setTimeout(() => {
        finish();
      }, 15000);

      try {
        socket = tls.connect({
          host,
          port,
          rejectUnauthorized: false,
          servername: host
        });

        let step = 0;
        let buffer = '';
        let totalMessages = 0;

        socket.on('data', (chunk) => {
          buffer += chunk.toString();

          if (step === 0 && buffer.includes('* OK')) {
            step = 1;
            buffer = '';
            const cleanPass = (this.config.password || '').replace(/\s+/g, '');
            socket.write(`A01 LOGIN "${this.config.email}" "${cleanPass}"\r\n`);
          } else if (step === 1 && buffer.includes('A01 OK')) {
            step = 2;
            buffer = '';
            socket.write(`A02 SELECT "${folder}"\r\n`);
          } else if (step === 1 && (buffer.includes('A01 NO') || buffer.includes('A01 BAD'))) {
            clearTimeout(timeout);
            finish();
          } else if (step === 2 && buffer.includes('A02 OK')) {
            step = 3;
            // Parse total messages: * <count> EXISTS
            const existsMatch = buffer.match(/\*\s+(\d+)\s+EXISTS/i);
            totalMessages = existsMatch ? parseInt(existsMatch[1], 10) : 0;
            buffer = '';

            if (totalMessages === 0) {
              clearTimeout(timeout);
              finish();
              return;
            }

            const startSeq = Math.max(1, totalMessages - limit + 1);
            socket.write(`A03 FETCH ${startSeq}:${totalMessages} (FLAGS BODY.PEEK[])\r\n`);
          } else if (step === 3 && buffer.includes('A03 OK')) {
            clearTimeout(timeout);
            // Parse buffer for RFC822 messages
            const rawMessages = buffer.split(/\*\s+\d+\s+FETCH/i);
            for (const raw of rawMessages) {
              if (raw.includes('BODY[]') || raw.includes('FLAGS')) {
                const parsed = parseRawEmailString(raw);
                if (parsed.subject || parsed.from.address) {
                  emails.unshift(parsed);
                }
              }
            }
            finish();
          }
        });

        socket.on('error', () => {
          clearTimeout(timeout);
          finish();
        });
      } catch (_) {
        clearTimeout(timeout);
        finish();
      }
    });
  }

  /**
   * Permanently delete / trash message on remote IMAP server (Two-Way Live Deletion)
   */
  public async deleteMessage(target: { messageId?: string; subject?: string }, folder = 'INBOX'): Promise<boolean> {
    return new Promise((resolve) => {
      const host = this.config.imapHost || 'imap.gmail.com';
      const port = this.config.imapPort || 993;

      let socket: tls.TLSSocket;
      let isResolved = false;

      const finish = (success: boolean) => {
        if (!isResolved) {
          isResolved = true;
          try {
            if (socket) {
              socket.write(`A99 LOGOUT\r\n`);
              socket.destroy();
            }
          } catch (_) {}
          resolve(success);
        }
      };

      const timeout = setTimeout(() => {
        finish(false);
      }, 10000);

      try {
        socket = tls.connect({
          host,
          port,
          rejectUnauthorized: false,
          servername: host
        });

        let step = 0;
        let buffer = '';
        let foundSeq: string[] = [];

        socket.on('data', (chunk) => {
          buffer += chunk.toString();

          if (step === 0 && buffer.includes('* OK')) {
            step = 1;
            buffer = '';
            const cleanPass = (this.config.password || '').replace(/\s+/g, '');
            socket.write(`A01 LOGIN "${this.config.email}" "${cleanPass}"\r\n`);
          } else if (step === 1 && buffer.includes('A01 OK')) {
            step = 2;
            buffer = '';
            socket.write(`A02 SELECT "${folder}"\r\n`);
          } else if (step === 1 && (buffer.includes('A01 NO') || buffer.includes('A01 BAD'))) {
            clearTimeout(timeout);
            finish(false);
          } else if (step === 2 && buffer.includes('A02 OK')) {
            step = 3;
            buffer = '';
            if (target.messageId) {
              const cleanMid = target.messageId.replace(/[<>]/g, '');
              socket.write(`A03 SEARCH HEADER Message-ID "${cleanMid}"\r\n`);
            } else if (target.subject) {
              const cleanSub = target.subject.replace(/"/g, '');
              socket.write(`A03 SEARCH SUBJECT "${cleanSub}"\r\n`);
            } else {
              clearTimeout(timeout);
              finish(false);
            }
          } else if (step === 3 && buffer.includes('A03 OK')) {
            const searchMatch = buffer.match(/\*\s+SEARCH\s+([\d\s]+)/i);
            if (searchMatch && searchMatch[1].trim()) {
              foundSeq = searchMatch[1].trim().split(/\s+/).filter(Boolean);
            }

            if (foundSeq.length === 0) {
              if (target.messageId && target.subject) {
                step = 4;
                buffer = '';
                const cleanSub = target.subject.replace(/"/g, '');
                socket.write(`A04 SEARCH SUBJECT "${cleanSub}"\r\n`);
                return;
              }
              clearTimeout(timeout);
              finish(true);
              return;
            }

            step = 5;
            buffer = '';
            const seqStr = foundSeq.join(',');
            socket.write(`A05 STORE ${seqStr} +FLAGS (\\Deleted)\r\n`);
          } else if (step === 4 && buffer.includes('A04 OK')) {
            const searchMatch = buffer.match(/\*\s+SEARCH\s+([\d\s]+)/i);
            if (searchMatch && searchMatch[1].trim()) {
              foundSeq = searchMatch[1].trim().split(/\s+/).filter(Boolean);
            }

            if (foundSeq.length === 0) {
              clearTimeout(timeout);
              finish(true);
              return;
            }

            step = 5;
            buffer = '';
            const seqStr = foundSeq.join(',');
            socket.write(`A05 STORE ${seqStr} +FLAGS (\\Deleted)\r\n`);
          } else if (step === 5 && buffer.includes('A05 OK')) {
            step = 6;
            buffer = '';
            socket.write(`A06 EXPUNGE\r\n`);
          } else if (step === 6 && buffer.includes('A06 OK')) {
            clearTimeout(timeout);
            finish(true);
          }
        });

        socket.on('error', () => {
          clearTimeout(timeout);
          finish(false);
        });
      } catch (_) {
        clearTimeout(timeout);
        finish(false);
      }
    });
  }
}

/**
 * Robust RFC 2822 & MIME Parser for IMAP emails
 */
function parseRawEmailString(raw: string): ParsedEmail {
  const emailId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  // Strip IMAP FETCH envelope header (e.g. (FLAGS (\Seen) BODY[] {12345}\r\n)
  const cleanRaw = raw.replace(/^[^(]*\([^)]*BODY\[\]\s*\{\d+\}\r?\n/i, '')
                      .replace(/\r?\n\)\r?\n?$/, '');

  // Extract Subject
  let subject = 'No Subject';
  const subMatch = cleanRaw.match(/\r?\nSubject:\s*(.*?)(?=\r?\n[A-Za-z0-9-]+:|\r?\n\r?\n|$)/s);
  if (subMatch) {
    subject = decodeMimeHeader(subMatch[1].replace(/\r?\n\s+/g, ' ').trim());
  }

  // Extract From
  let from = { name: 'Unknown', address: '' };
  const fromMatch = cleanRaw.match(/\r?\nFrom:\s*(.*?)(?=\r?\n[A-Za-z0-9-]+:|\r?\n\r?\n|$)/s);
  if (fromMatch) {
    const rawFrom = decodeMimeHeader(fromMatch[1].replace(/\r?\n\s+/g, ' ').trim());
    const emailMatch = rawFrom.match(/<([^>]+)>/);
    const addr = emailMatch ? emailMatch[1] : rawFrom;
    const name = rawFrom.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || addr.split('@')[0];
    from = { name, address: addr };
  }

  // Extract To
  const toList: { name: string; address: string }[] = [];
  const toMatch = cleanRaw.match(/\r?\nTo:\s*(.*?)(?=\r?\n[A-Za-z0-9-]+:|\r?\n\r?\n|$)/s);
  if (toMatch) {
    const rawTo = decodeMimeHeader(toMatch[1].replace(/\r?\n\s+/g, ' ').trim());
    rawTo.split(',').forEach(part => {
      const em = part.match(/<([^>]+)>/);
      const addr = em ? em[1] : part.trim();
      const name = part.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || addr;
      if (addr) toList.push({ name, address: addr });
    });
  }

  // Extract Date
  let date = new Date().toISOString();
  const dateMatch = cleanRaw.match(/\r?\nDate:\s*(.*?)(?=\r?\n[A-Za-z0-9-]+:|\r?\n\r?\n|$)/s);
  if (dateMatch) {
    try {
      date = new Date(dateMatch[1].trim()).toISOString();
    } catch (_) {}
  }

  // Extract Message-ID
  let messageId = '';
  const msgIdMatch = cleanRaw.match(/\r?\nMessage-ID:\s*(.*?)(?=\r?\n[A-Za-z0-9-]+:|\r?\n\r?\n|$)/is);
  if (msgIdMatch) {
    messageId = msgIdMatch[1].trim();
  }

  // Flags
  const flags: string[] = [];
  if (raw.includes('\\Seen')) flags.push('\\Seen');
  if (raw.includes('\\Flagged')) flags.push('\\Flagged');

  // Parse MIME tree from cleaned content
  const parsed = parseMimeSection(cleanRaw);

  let bodyHtml = parsed.htmlParts.length > 0 ? parsed.htmlParts.join('<br/><hr/><br/>') : '';
  let bodyText = parsed.textParts.length > 0 ? parsed.textParts.join('\n\n') : '';

  if (!bodyHtml && bodyText) {
    bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: inherit; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(bodyText)}</div>`;
  } else if (!bodyText && bodyHtml) {
    bodyText = bodyHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                       .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ')
                       .trim();
  }

  const snippet = (bodyText || subject)
    .replace(/\s+/g, ' ')
    .substring(0, 140)
    .trim();

  return {
    id: emailId,
    messageId,
    from,
    to: toList,
    subject,
    date,
    bodyText,
    bodyHtml,
    snippet,
    flags,
    attachments: parsed.attachments
  };
}

function parseMimeSection(rawSection: string): { htmlParts: string[]; textParts: string[]; attachments: any[] } {
  const htmlParts: string[] = [];
  const textParts: string[] = [];
  const attachments: any[] = [];

  // Separate headers & body
  const splitIdx = rawSection.search(/\r?\n\r?\n/);
  let headerBlock = '';
  let bodyBlock = '';
  if (splitIdx !== -1) {
    headerBlock = rawSection.substring(0, splitIdx);
    bodyBlock = rawSection.substring(splitIdx).replace(/^\r?\n\r?\n/, '');
  } else {
    bodyBlock = rawSection;
  }

  // Parse headers
  const contentTypeMatch = headerBlock.match(/Content-Type:\s*([^;\r\n]+)(?:;\s*([^\r\n]+(?:\r?\n\s+[^\r\n]+)*))?/i);
  const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase().trim() : 'text/plain';
  const typeParams = contentTypeMatch && contentTypeMatch[2] ? contentTypeMatch[2].replace(/\r?\n\s+/g, ' ') : '';

  const encodingMatch = headerBlock.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : '';

  const charsetMatch = typeParams.match(/charset=["']?([^"';\s]+)["']?/i) || headerBlock.match(/charset=["']?([^"';\s]+)["']?/i);
  const charset = charsetMatch ? charsetMatch[1].trim() : 'utf-8';

  const boundaryMatch = typeParams.match(/boundary=["']?([^"';\r\n]+)["']?/i) || headerBlock.match(/boundary=["']?([^"';\r\n]+)["']?/i);
  const boundary = boundaryMatch ? boundaryMatch[1].trim() : null;

  const dispositionMatch = headerBlock.match(/Content-Disposition:\s*([^;\r\n]+)(?:;\s*([^\r\n]+(?:\r?\n\s+[^\r\n]+)*))?/i);
  const filenameMatch = (dispositionMatch ? dispositionMatch[2] : '')?.match(/filename=["']?([^"';\r\n]+)["']?/i) || typeParams.match(/name=["']?([^"';\r\n]+)["']?/i);
  const filename = filenameMatch ? decodeMimeHeader(filenameMatch[1].trim()) : null;

  if (boundary) {
    // Multipart section
    const boundaryRegex = new RegExp(`--${escapeRegExp(boundary)}(?:--)?`);
    const parts = bodyBlock.split(boundaryRegex);
    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed || trimmed === '--') continue;
      const sub = parseMimeSection(trimmed);
      htmlParts.push(...sub.htmlParts);
      textParts.push(...sub.textParts);
      attachments.push(...sub.attachments);
    }
  } else if (filename || (dispositionMatch && dispositionMatch[1].toLowerCase().includes('attachment'))) {
    // Attachment
    const attFilename = filename || `attachment_${Date.now()}`;
    const cleanBase64 = encoding === 'base64' ? bodyBlock.replace(/\s+/g, '') : Buffer.from(bodyBlock).toString('base64');
    attachments.push({
      id: `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      filename: attFilename,
      contentType: contentType || 'application/octet-stream',
      size: Math.round((cleanBase64.length * 3) / 4),
      contentBase64: cleanBase64
    });
  } else if (contentType.includes('text/html')) {
    const decodedHtml = decodePartContent(bodyBlock, encoding, charset);
    htmlParts.push(decodedHtml);
  } else if (contentType.includes('text/plain')) {
    const decodedText = decodePartContent(bodyBlock, encoding, charset);
    textParts.push(decodedText);
  } else {
    const decoded = decodePartContent(bodyBlock, encoding, charset);
    if (decoded.includes('<html') || decoded.includes('<div') || decoded.includes('<p>')) {
      htmlParts.push(decoded);
    } else {
      textParts.push(decoded);
    }
  }

  return { htmlParts, textParts, attachments };
}

function decodeQuotedPrintable(input: string, charset = 'utf-8'): string {
  // 1. Remove soft line breaks (=\r\n or =\n)
  const cleaned = input.replace(/=\r?\n/g, '');
  
  // 2. Decode hex bytes
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '=' && i + 2 < cleaned.length) {
      const hex = cleaned.substring(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(cleaned.charCodeAt(i));
  }
  
  try {
    const enc = (charset.toLowerCase() === 'utf-8' || charset.toLowerCase() === 'utf8') ? 'utf-8' : charset;
    return Buffer.from(bytes).toString(enc as BufferEncoding);
  } catch (_) {
    return Buffer.from(bytes).toString('utf-8');
  }
}

function decodePartContent(content: string, encoding: string, charset = 'utf-8'): string {
  const enc = (encoding || '').toLowerCase().trim();
  if (enc === 'base64') {
    try {
      const clean = content.replace(/[^A-Za-z0-9+/=]/g, '');
      const charEnc = (charset.toLowerCase() === 'utf-8' || charset.toLowerCase() === 'utf8') ? 'utf-8' : charset;
      return Buffer.from(clean, 'base64').toString(charEnc as BufferEncoding);
    } catch (_) {
      return content;
    }
  } else if (enc === 'quoted-printable') {
    return decodeQuotedPrintable(content, charset);
  }
  return content;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeMimeHeader(header: string): string {
  return header.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return Buffer.from(text, 'base64').toString(charset.toLowerCase() === 'utf-8' ? 'utf-8' : 'utf-8');
      } else if (encoding.toUpperCase() === 'Q') {
        return decodeQuotedPrintable(text.replace(/_/g, ' '), charset);
      }
    } catch (_) {}
    return text;
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
