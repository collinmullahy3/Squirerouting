// Custom type declarations for missing npm modules

declare module 'node-imap' {
  interface ImapOptions {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    tlsOptions?: { rejectUnauthorized: boolean };
  }

  interface ImapBox {
    name: string;
    flags: string[];
    readOnly: boolean;
    uidvalidity: number;
    uidnext: number;
    permFlags: string[];
    keywords: string[];
    newKeywords: boolean;
    persistentUIDs: boolean;
    nomodseq: boolean;
    messages: {
      total: number;
      new: number;
      unseen: number;
    };
  }

  export default class Connection {
    constructor(options: ImapOptions);
    connect(): void;
    once(event: string, callback: (arg?: any) => void): void;
    on(event: string, callback: (arg?: any) => void): void;
    openBox(name: string, readOnly: boolean, callback: (err: Error | null, box: ImapBox) => void): void;
    search(criteria: string[], callback: (err: Error | null, results: number[]) => void): void;
    fetch(source: number[], options: { bodies: string }): any;
    end(): void;
    addFlags(source: number[], flags: string, callback: (err: Error | null) => void): void;
  }
}

declare module 'mailparser' {
  export function simpleParser(stream: any, callback: (err: Error | null, parsed: any) => void): void;
}