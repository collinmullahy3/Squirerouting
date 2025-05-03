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
    try {
      // Try to get email credentials from database settings
      const emailUserSetting = await storage.getSettingByKey("EMAIL_USER");
      const emailPasswordSetting = await storage.getSettingByKey("EMAIL_PASSWORD");
      
      // If we have settings in the database, update our IMAP client
      if (emailUserSetting?.value && emailPasswordSetting?.value) {
        this.imap = new IMAP({
          user: emailUserSetting.value,
          password: emailPasswordSetting.value,
          host: 'imap.gmail.com',
          port: 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false }
        });
        
        // Reattach event handlers
        this.imap.once('ready', this.onImapReady.bind(this));
        this.imap.once('error', this.onImapError.bind(this));
        this.imap.once('end', this.onImapEnd.bind(this));
      }
    } catch (error) {
      console.error("Error initializing email service with database settings:", error);
      // Continue with environment variables if database settings fail
    }
    
    console.log(`Email service ready to receive forwarded emails. Agents should forward leads to: ${this.FORWARDING_EMAIL}`);

    // Try to get email credentials from settings or environment variables
    const emailUser = this.imap.user;
    const emailPassword = this.imap.password;
      
    if (!emailUser || !emailPassword) {
      console.log('Email credentials not found. IMAP inbox checking is disabled, but manual simulation will still work.');
      return true; // Still return true as the service can work in simulation mode
    }

    // Check if credentials are valid
    if (emailUser.trim() === '' || emailPassword.trim() === '') {
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
  
  // Exposed for manual testing
  public checkEmails() {
    this.checkNewEmails();
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
      
      // Log full lead data for debugging
      console.log('Extracted lead data:', {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        price: leadData.price,
        zipCode: leadData.zipCode,
        address: leadData.address,
        source: leadData.source,
        propertyUrl: leadData.propertyUrl,
        thumbnailUrl: leadData.thumbnailUrl,
        receivedAt: leadData.receivedAt,
        updatedAt: leadData.updatedAt
      });
      
      // Check for lead deduplication window setting
      const deduplicationSetting = await storage.getSettingByKey('LEAD_DEDUPLICATION_DAYS');
      const deduplicationDays = deduplicationSetting ? parseInt(deduplicationSetting.value, 10) : 7; // Default to 7 days
      
      // Check if we have an existing lead from this email within the window
      const existingLead = await storage.getLeadByEmailAndWindow(leadData.email, deduplicationDays);
      
      let lead;
      
      if (existingLead) {
        console.log(`Found existing lead for ${leadData.email} within ${deduplicationDays} day window`);
        // Update the existing lead with new information
        lead = await storage.updateLeadFromNewInquiry(existingLead.id, leadData);
        if (!lead) {
          console.error(`Failed to update existing lead ${existingLead.id} with new inquiry data`);
          lead = existingLead; // Fallback to existing lead without updates
        }
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

      // Extract price range using regex
      const priceRegex = /\$[\d,]+(\.[\d]{2})?|\d{3,}k|\d+\s*million/gi;
      const priceMatches = text.match(priceRegex) || [];
      let price = null;
      let priceMax = null;
      
      // Handle price ranges
      if (priceMatches.length >= 2) {
        // We have a potential price range
        // Check if text contains range indicators
        const hasRangeIndicator = /price range|budget range|between|price from|range of|from .* to/i.test(text);
        
        if (hasRangeIndicator || priceMatches.length === 2) {
          // Convert price strings to numeric values
          const priceValues = priceMatches.map(priceStr => {
            const sanitized = priceStr.replace(/\$|,/g, '');
            if (sanitized.toLowerCase().includes('k')) {
              return parseFloat(sanitized) * 1000;
            } else if (sanitized.toLowerCase().includes('million')) {
              return parseFloat(sanitized) * 1000000;
            } else {
              return parseFloat(sanitized);
            }
          }).filter(p => !isNaN(p));
          
          // Sort to get the min and max
          if (priceValues.length >= 2) {
            priceValues.sort((a, b) => a - b);
            price = priceValues[0];
            priceMax = priceValues[priceValues.length - 1];
          }
        }
      }
      
      // If we don't have a range, just set a single price
      if (price === null && priceMatches.length > 0) {
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

      // Extract moving date using regex patterns
      const movingDateRegex = /(?:move(?:-| |\s+)in(?:g)?(?:\s+|\s+by\s+|\s+date\s+|:\s+))(\w+\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th)?\s+\w+\s*,?\s*\d{4}?)/i;
      const movingDateMatches = text.match(movingDateRegex);
      
      let movingDate = null;
      if (movingDateMatches && movingDateMatches.length > 1) {
        try {
          // Try to parse the date string
          const dateStr = movingDateMatches[1].trim();
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            movingDate = parsedDate;
          }
        } catch (e) {
          console.log('Failed to parse moving date:', e);
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
      // Get all unique addresses
      const uniqueAddresses = [...new Set(addressMatches)];
      const address = uniqueAddresses.length > 0 ? uniqueAddresses[0] : '';
      
      // Extract property URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatches = text.match(urlRegex) || [];
      let propertyUrl = '';
      let thumbnailUrl = '';
      
      // Find property listing URLs
      const propertyUrls = [];
      for (const url of urlMatches) {
        if (url.includes('zillow') || url.includes('realtor') || url.includes('trulia') ||
            url.includes('redfin') || url.includes('homes') || url.includes('property') ||
            url.includes('listing') || url.includes('rent') || url.includes('apartment')) {
          propertyUrls.push(url);
        }
      }
      
      // Use the first property URL as the main one
      propertyUrl = propertyUrls.length > 0 ? propertyUrls[0] : '';
      
      // Check for image URLs - likely a thumbnail
      const imageUrls = [];
      for (const url of urlMatches) {
        if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') ||
            url.includes('.webp') || url.includes('images') || url.includes('photos')) {
          imageUrls.push(url);
        }
      }
      
      // Use the first image URL as the main thumbnail
      thumbnailUrl = imageUrls.length > 0 ? imageUrls[0] : '';

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

      // If we have multiple addresses, add them to the notes
      let notes = '';
      if (uniqueAddresses.length > 1) {
        notes += 'Additional property addresses:\n';
        for (let i = 1; i < uniqueAddresses.length; i++) {
          notes += `${i}. ${uniqueAddresses[i]}\n`;
        }
      }
      
      // If we have multiple property URLs, add them to the notes
      if (propertyUrls.length > 1) {
        notes += '\nAdditional property links:\n';
        for (let i = 1; i < propertyUrls.length; i++) {
          notes += `${i}. ${propertyUrls[i]}\n`;
        }
      }

      return {
        name,
        email: clientEmail || 'unknown@example.com',
        phone: phone || '',
        price: price ? price.toString() : null,
        priceMax: priceMax ? priceMax.toString() : null,
        zipCode: zipCode || '',
        address: address || '',
        source: 'Email',
        propertyUrl: propertyUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        originalEmail,
        movingDate,
        notes: notes || null,
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
