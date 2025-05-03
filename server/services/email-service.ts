import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { storage } from '../storage';
import { type LeadInsert, type EmailSettings } from '@shared/schema';
import { leadRouter } from './lead-router';

// Default email configuration
const defaultConfig = {
  user: '',
  password: '',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

class EmailService {
  private imap: Imap | null = null;
  private config: Imap.Config;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly FETCH_INTERVAL_MS = 60000; // Check emails every minute

  constructor(config: Imap.Config = defaultConfig) {
    this.config = config;
  }

  get isConfigured(): boolean {
    return Boolean(this.config.user && this.config.password);
  }

  get isListening(): boolean {
    return this._isListening;
  }
  
  private _isListening: boolean = false;

  // Load email settings from the database
  async loadSettings(): Promise<boolean> {
    try {
      // Get all email settings
      const emailUser = await storage.getSettingByKey('email_user');
      const emailPassword = await storage.getSettingByKey('email_password');
      const emailHost = await storage.getSettingByKey('email_host');
      const emailPort = await storage.getSettingByKey('email_port');
      const emailTls = await storage.getSettingByKey('email_tls');

      // Update configuration with database values
      this.config = {
        user: emailUser?.value || '',
        password: emailPassword?.value || '',
        host: emailHost?.value || 'imap.gmail.com',
        port: emailPort?.value ? parseInt(emailPort.value) : 993,
        tls: emailTls?.value === 'false' ? false : true,
        tlsOptions: { rejectUnauthorized: false }
      };

      return this.isConfigured;
    } catch (error) {
      console.error('Error loading email settings:', error);
      return false;
    }
  }

  // Update email settings in the database
  async updateSettings(settings: EmailSettings, userId: number): Promise<boolean> {
    try {
      await storage.updateSetting('email_user', settings.emailUser, 'email', userId);
      await storage.updateSetting('email_password', settings.emailPassword, 'email', userId);
      await storage.updateSetting('email_host', settings.emailHost, 'email', userId);
      await storage.updateSetting('email_port', settings.emailPort.toString(), 'email', userId);
      await storage.updateSetting('email_tls', settings.emailTls.toString(), 'email', userId);
      
      // Reload settings
      return await this.loadSettings();
    } catch (error) {
      console.error('Error saving email settings:', error);
      return false;
    }
  }

  async initialize(): Promise<boolean> {
    // Load settings from database
    const settingsLoaded = await this.loadSettings();
    
    if (!settingsLoaded || !this.isConfigured) {
      console.error('Email service configuration missing. Please configure email settings in the admin panel.');
      return false;
    }

    try {
      this.imap = new Imap(this.config);
      this.setupListeners();
      return true;
    } catch (error) {
      console.error('Error initializing email service:', error);
      return false;
    }
  }

  private setupListeners(): void {
    if (!this.imap) return;

    this.imap.once('ready', () => {
      console.log('Email service connected successfully');
      this._isListening = true;
      this.checkEmails();
    });

    this.imap.once('error', (err: Error) => {
      console.error('Email service error:', err);
      this._isListening = false;
      
      // Attempt to reconnect after error
      setTimeout(() => {
        this.connect();
      }, 30000); // Wait 30 seconds before reconnecting
    });

    this.imap.once('end', () => {
      console.log('Email service connection ended');
      this._isListening = false;
    });
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.imap) {
        resolve(false);
        return;
      }

      this.imap.once('ready', () => {
        this._isListening = true;
        resolve(true);
      });

      this.imap.once('error', () => {
        resolve(false);
      });

      this.imap.connect();
    });
  }

  startListening(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.connect();
    
    // Set up interval to check for new emails
    this.checkInterval = setInterval(() => {
      if (this._isListening) {
        this.checkEmails();
      } else {
        this.connect();
      }
    }, this.FETCH_INTERVAL_MS);
  }

  stopListening(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.imap && this._isListening) {
      this.imap.end();
      this._isListening = false;
    }
  }

  private async checkEmails(): Promise<void> {
    if (!this.imap || !this._isListening) return;

    try {
      await this.openInbox();
      const searchCriteria = ['UNSEEN'];
      
      this.imap.search(searchCriteria, (err, results) => {
        if (err) {
          console.error('Error searching for emails:', err);
          return;
        }

        if (results.length === 0) {
          return;
        }

        console.log(`Found ${results.length} new emails`);
        this.fetchEmails(results);
      });
    } catch (error) {
      console.error('Error checking emails:', error);
    }
  }

  private openInbox(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error('IMAP client not initialized'));
        return;
      }

      this.imap.openBox('INBOX', false, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private fetchEmails(messageIds: number[]): void {
    if (!this.imap || messageIds.length === 0) return;

    try {
      const fetch = this.imap.fetch(messageIds, { bodies: '' });

      fetch.on('message', (msg) => {
        const chunks: Buffer[] = [];
        
        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            chunks.push(chunk);
          });
        });

        msg.once('end', async () => {
          const buffer = Buffer.concat(chunks);
          try {
            const parsedEmail = await simpleParser(buffer);
            const leadData = this.extractLeadData(parsedEmail);
            
            if (leadData) {
              console.log('Extracted lead data:', leadData);
              const lead = await storage.createLead(leadData);
              await leadRouter.routeLead(lead);
            }
          } catch (error) {
            console.error('Error processing email:', error);
          }
        });
      });

      fetch.once('error', (err) => {
        console.error('Error fetching emails:', err);
      });
    } catch (error) {
      console.error('Error setting up fetch:', error);
    }
  }

  private extractLeadData(email: any): LeadInsert | null {
    try {
      // Simple pattern matching for lead information
      // In a production system, this would be more sophisticated
      const text = email.text || '';
      const subject = email.subject || '';
      const from = email.from?.text || '';
      const originalEmail = email.html || email.text || '';

      // Extract email using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emailMatches = text.match(emailRegex) || [];
      const clientEmail = emailMatches.length > 0 ? emailMatches[0] : '';

      // Extract phone using regex
      const phoneRegex = /(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;
      const phoneMatches = text.match(phoneRegex) || [];
      const phone = phoneMatches.length > 0 ? phoneMatches[0] : '';

      // Extract price using regex
      const priceRegex = /\$[\d,]+(\.\d{2})?|\d{3,}k|\d+\s*million/gi;
      const priceMatches = text.match(priceRegex) || [];
      let price = null;
      if (priceMatches.length > 0) {
        // Convert price string to numeric value
        const priceStr = priceMatches[0].replace(/\$|,/g, '');
        if (priceStr.toLowerCase().includes('k')) {
          price = parseFloat(priceStr) * 1000;
        } else if (priceStr.toLowerCase().includes('million')) {
          price = parseFloat(priceStr) * 1000000;
        } else {
          price = parseFloat(priceStr);
        }
      }

      // Extract zip code using regex (US format)
      const zipRegex = /\b\d{5}(-\d{4})?\b/g;
      const zipMatches = text.match(zipRegex) || [];
      const zipCode = zipMatches.length > 0 ? zipMatches[0] : '';

      // Extract address - this is more complex and may require NLP
      // For demo purposes, we'll look for common address patterns
      const addressRegex = /\d+\s+[a-zA-Z0-9\s,]+(?:street|st|avenue|ave|road|rd|highway|hwy|square|sq|trail|trl|drive|dr|court|ct|parkway|pkwy|circle|cir|boulevard|blvd)\s+[a-zA-Z]+,\s*[a-zA-Z]+\s*\d+/gi;
      const addressMatches = text.match(addressRegex) || [];
      const address = addressMatches.length > 0 ? addressMatches[0] : '';

      // Extract name - might be in the subject or from field
      // This is a simplified approach
      let name = '';
      
      // Try to extract from subject line if it looks like a name
      if (subject.includes(' ') && !subject.includes('@') && subject.length < 50) {
        name = subject;
      } 
      // Otherwise use the sender's name if available
      else if (from.includes('<') && from.includes('>')) {
        name = from.split('<')[0].trim();
      } 
      // Fallback
      else {
        name = 'Unknown Lead';
      }

      // Skip emails that don't look like leads
      if (!clientEmail && !phone) {
        console.log('Email does not appear to be a lead');
        return null;
      }

      return {
        name,
        email: clientEmail || 'unknown@example.com',
        phone: phone || '',
        price: price ? price.toString() : null,
        zipCode: zipCode || '',
        address: address || '',
        source: 'Email',
        originalEmail,
        receivedAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error extracting lead data:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();
