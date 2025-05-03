import { storage } from '../storage';
import { type LeadInsert } from '@shared/schema';
import { leadRouter } from './lead-router';
import IMAP from 'node-imap';
import { simpleParser } from 'mailparser';

class EmailService {
  private readonly FORWARDING_EMAIL = process.env.EMAIL_USER || 'squirerouting@gmail.com';
  private _isListening: boolean = false;
  private imap: IMAP;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_FREQUENCY = 60000; // Check every minute

  constructor() {
    this.imap = new IMAP({
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    // Setup event handlers
    this.imap.once('ready', this.onImapReady.bind(this));
    this.imap.once('error', this.onImapError.bind(this));
    this.imap.once('end', this.onImapEnd.bind(this));
  }

  get isListening(): boolean {
    return this._isListening;
  }

  get forwardingEmail(): string {
    return this.FORWARDING_EMAIL;
  }

  async initialize(): Promise<boolean> {
    console.log(`Email service ready to receive forwarded emails. Agents should forward leads to: ${this.FORWARDING_EMAIL}`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email credentials not found. IMAP inbox checking is disabled, but manual simulation will still work.');
      return true; // Still return true as the service can work in simulation mode
    }

    // Check if credentials are valid
    if (process.env.EMAIL_USER.trim() === '' || process.env.EMAIL_PASSWORD.trim() === '') {
      console.log('Empty email credentials provided. IMAP inbox checking is disabled, but manual simulation will still work.');
      return true; // Still return true as the service can work in simulation mode
    }

    try {
      // Connect to the IMAP server
      this.imap.connect();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      console.log('IMAP inbox checking is disabled, but manual simulation will still work.');
      return true; // Still return true as the service can work in simulation mode
    }
  }
  
  private onImapReady() {
    console.log('IMAP connection established successfully');
    this._isListening = true;
    
    // Start periodic checking
    this.checkNewEmails();
    this.checkInterval = setInterval(() => this.checkNewEmails(), this.CHECK_FREQUENCY);
  }
  
  private onImapError(err: Error) {
    console.error('IMAP connection error:', err);
    this._isListening = false;
    
    // Don't try to reconnect if this is an authentication error
    if (err.toString().includes('Invalid credentials') || err.toString().includes('AUTHENTICATIONFAILED')) {
      console.log('Authentication failed - not attempting to reconnect');
      return;
    }
    
    // Try to reconnect in 30 seconds for other types of errors
    setTimeout(() => {
      console.log('Attempting to reconnect to IMAP server...');
      try {
        this.imap.connect();
      } catch (error) {
        console.error('Failed to reconnect:', error);
      }
    }, 30000);
  }
  
  private onImapEnd() {
    console.log('IMAP connection ended');
    this._isListening = false;
    
    // Clear interval if it exists
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  private checkNewEmails() {
    try {
      this.imap.openBox('INBOX', false, (err, mailbox) => {
        if (err) {
          console.error('Error opening inbox:', err);
          return;
        }
        
        // Search for unread messages
        this.imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('Error searching for unread messages:', err);
            return;
          }
          
          if (results.length === 0) {
            // No new messages
            return;
          }
          
          console.log(`Found ${results.length} new messages`);
          
          // Fetch each message
          const f = this.imap.fetch(results, { bodies: '' });
          
          f.on('message', (msg) => {
            msg.on('body', (stream) => {
              // Parse the email
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  return;
                }
                
                // Process the email
                await this.processEmail({
                  from: parsed.from?.text,
                  subject: parsed.subject,
                  text: parsed.text,
                  html: parsed.html
                });
                
                // Mark as read
                this.imap.addFlags(results, '\\Seen', (err) => {
                  if (err) {
                    console.error('Error marking message as read:', err);
                  }
                });
              });
            });
          });
          
          f.once('error', (err) => {
            console.error('Error fetching messages:', err);
          });
        });
      });
    } catch (error) {
      console.error('Error checking emails:', error);
    }
  }

  // Process an email received via the API endpoint
  async processEmail(emailData: any): Promise<boolean> {
    try {
      const leadData = this.extractLeadData(emailData);
      
      if (!leadData) {
        console.log('Email could not be parsed as a lead');
        return false;
      }
      
      console.log('Extracted lead data:', leadData);
      
      // Check for lead deduplication window setting
      const deduplicationSetting = await storage.getSettingByKey('LEAD_DEDUPLICATION_DAYS');
      const deduplicationDays = deduplicationSetting ? parseInt(deduplicationSetting.value, 10) : 7; // Default to 7 days
      
      // Check if we have an existing lead from this email within the window
      const existingLead = await storage.getLeadByEmailAndWindow(leadData.email, deduplicationDays);
      
      let lead;
      
      if (existingLead) {
        console.log(`Found existing lead for ${leadData.email} within ${deduplicationDays} day window`);
        // Use the existing lead ID and assigned agent if any
        lead = existingLead;
      } else {
        // Create a new lead in the database
        lead = await storage.createLead(leadData);
        
        // Route the lead to an agent
        await leadRouter.routeLead(lead);
      }
      
      return true;
    } catch (error) {
      console.error('Error processing email:', error);
      return false;
    }
  }

  // For demo purposes - process a simulated email
  async processSimulatedEmail(emailContent: {
    from?: string;
    subject?: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    return this.processEmail(emailContent);
  }

  private extractLeadData(email: any): LeadInsert | null {
    try {
      // Simple pattern matching for lead information
      const text = email.text || '';
      const subject = email.subject || '';
      const from = email.from?.text || email.from || '';
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
      const priceRegex = /\$[\d,]+(\.[\d]{2})?|\d{3,}k|\d+\s*million/gi;
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
