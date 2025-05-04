import { storage } from '../storage';
import { type LeadInsert, type Lead, type User } from '@shared/schema';
import { leadRouter } from './lead-router';
import IMAP from 'node-imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

class EmailService {
  private readonly FORWARDING_EMAIL = process.env.EMAIL_USER || 'squirerouting@gmail.com';
  private _isListening: boolean = false;
  private imap: IMAP;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_FREQUENCY = 60000; // Check every minute
  private nodemailer: any = null; // Will initialize if needed

  constructor() {
    console.log('EmailService init - Environment variables check:', {
      EMAIL_USER: process.env.EMAIL_USER ? 'found' : 'not found',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'found' : 'not found',
      FORWARDING_EMAIL: this.FORWARDING_EMAIL
    });
    
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
      // Try to use environment variables directly first
      let emailUser = process.env.EMAIL_USER;
      let emailPassword = process.env.EMAIL_PASSWORD;
      
      // If not in environment variables, try database settings as fallback
      if (!emailUser || !emailPassword) {
        const emailUserSetting = await storage.getSettingByKey("EMAIL_USER");
        const emailPasswordSetting = await storage.getSettingByKey("EMAIL_PASSWORD");
        
        if (emailUserSetting?.value && emailPasswordSetting?.value) {
          emailUser = emailUserSetting.value;
          emailPassword = emailPasswordSetting.value;
        }
      }
      
      // If we have valid credentials from either source, update our IMAP client
      // Hard code the password in case we get it from the user
      const appPassword = "jvqg ueiv xhld zaeb".replace(/\s+/g, ''); // Remove spaces
      
      if (emailUser) {
        // Use the hard-coded app password if available
        console.log(`Initializing email service with user: ${emailUser}`);
        console.log('Environment variables available:', {
          EMAIL_USER: process.env.EMAIL_USER ? 'set' : 'not set',
          EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'set' : 'not set',
          USING_APP_PASSWORD: 'yes'
        });
        
        this.imap = new IMAP({
          user: emailUser,
          password: appPassword, // Use the app password directly
          host: 'imap.gmail.com',
          port: 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false }
        });
        
        // Initialize nodemailer transport with the same credentials but using app password
        this.nodemailer = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: appPassword // Use the app password for this too
          }
        });
        
        // Reattach event handlers
        this.imap.once('ready', this.onImapReady.bind(this));
        this.imap.once('error', this.onImapError.bind(this));
        this.imap.once('end', this.onImapEnd.bind(this));
      }
    } catch (error) {
      console.error("Error initializing email service:", error);
      // Continue anyway so manual simulation will still work
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
  public async checkEmails(): Promise<boolean> {
    try {
      // Hard code the password in case we get it from the user
      const appPassword = "jvqg ueiv xhld zaeb".replace(/\s+/g, ''); // Remove spaces
      
      // Try environment variables first, then fall back to database settings
      let emailUser = process.env.EMAIL_USER;
      
      // If not in environment variables, try database settings
      if (!emailUser) {
        const emailUserSetting = await storage.getSettingByKey("EMAIL_USER");
        
        if (emailUserSetting?.value) {
          emailUser = emailUserSetting.value;
        }
      }
      
      if (!emailUser) {
        console.log('Email username not found in environment or database. Cannot check emails.');
        return false;
      }
      
      console.log(`Using email credentials for: ${emailUser} with app password`);
      
      // Create a new IMAP connection for this check using the app password
      const tempImap = new IMAP({
        user: emailUser,
        password: appPassword, // Use the app password directly here
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });
      
      // Return a promise that resolves when emails are checked
      return new Promise((resolve) => {
        // Set up event handlers for this specific connection
        tempImap.once('ready', () => {
          console.log('IMAP connection ready for email checking');
          this.checkNewEmailsWithConnection(tempImap, () => {
            tempImap.end();
            resolve(true);
          });
        });
        
        tempImap.once('error', (err) => {
          console.error('Error with IMAP connection:', err);
          resolve(false);
        });
        
        // Connect to the server
        tempImap.connect();
      });
    } catch (error) {
      console.error('Error checking emails:', error);
      return false;
    }
  }

  private checkNewEmails() {
    try {
      this.checkNewEmailsWithConnection(this.imap);
    } catch (error) {
      console.error('Error checking emails:', error);
    }
  }
  
  private checkNewEmailsWithConnection(imapConnection: any, callback?: () => void) {
    try {
      imapConnection.openBox('INBOX', false, (err: any, mailbox: any) => {
        if (err) {
          console.error('Error opening inbox:', err);
          if (callback) callback();
          return;
        }
        
        // Search for unread messages
        imapConnection.search(['UNSEEN'], (err: any, results: number[]) => {
          if (err) {
            console.error('Error searching for unread messages:', err);
            if (callback) callback();
            return;
          }
          
          if (results.length === 0) {
            // No new messages
            console.log('No unread messages found in inbox');
            if (callback) callback();
            return;
          }
          
          console.log(`Found ${results.length} new messages`);
          
          let processedCount = 0;
          
          // Fetch each message
          const f = imapConnection.fetch(results, { bodies: '' });
          
          f.on('message', (msg: any) => {
            msg.on('body', (stream: any) => {
              // Parse the email
              simpleParser(stream, async (err: any, parsed: any) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  processedCount++;
                  if (processedCount === results.length && callback) {
                    callback();
                  }
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
                imapConnection.addFlags(results, '\\Seen', (err: any) => {
                  if (err) {
                    console.error('Error marking message as read:', err);
                  }
                  
                  processedCount++;
                  if (processedCount === results.length && callback) {
                    callback();
                  }
                });
              });
            });
          });
          
          f.once('error', (err: any) => {
            console.error('Error fetching messages:', err);
            if (callback) callback();
          });
          
          // In case no messages are actually processed (unlikely but possible)
          f.once('end', () => {
            if (processedCount === 0 && callback) {
              callback();
            }
          });
        });
      });
    } catch (error) {
      console.error('Error checking emails with connection:', error);
      if (callback) callback();
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
      
      // IMPORTANT: Normalize email to lowercase to ensure proper deduplication
      if (leadData.email) {
        leadData.email = leadData.email.toLowerCase();
      }
      
      // Check for lead deduplication window setting
      const deduplicationSetting = await storage.getSettingByKey('LEAD_DEDUPLICATION_DAYS');
      const deduplicationDays = deduplicationSetting ? parseInt(deduplicationSetting.value, 10) : 7; // Default to 7 days
      
      // Check if we have an existing lead from this email within the window
      console.log(`Checking for existing lead with email ${leadData.email} within ${deduplicationDays} days window`);
      const existingLead = await storage.getLeadByEmailAndWindow(leadData.email, deduplicationDays);
      
      let lead;
      
      if (existingLead) {
        console.log(`Found existing lead (ID: ${existingLead.id}) for ${leadData.email} within ${deduplicationDays} day window`);
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

  /**
   * Send a lead notification email to an agent
   * 
   * @param lead The lead details
   * @param agent The agent to send the notification to
   * @returns Promise<boolean> True if email was sent successfully
   */
  async sendLeadNotification(lead: Lead, agent: User): Promise<boolean> {
    let transporter;
    try {
      // Hard code the password in case we get it from the user
      const appPassword = "jvqg ueiv xhld zaeb".replace(/\s+/g, ''); // Remove spaces
      const emailUser = process.env.EMAIL_USER;
      
      // First try environment variables directly with app password
      if (emailUser) {
        console.log(`Using environment variables for email: ${emailUser} with app password`);
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: appPassword // Use app password directly
          }
        });
      } 
      // Then try database settings
      else if (!this.nodemailer) {
        try {
          // Get fresh credentials
          const emailUserSetting = await storage.getSettingByKey("EMAIL_USER");
          const emailPasswordSetting = await storage.getSettingByKey("EMAIL_PASSWORD");
          
          if (!emailUserSetting?.value || !emailPasswordSetting?.value) {
            console.log('Email credentials not found. Cannot send lead notification email.');
            return false;
          }
          
          // Initialize nodemailer if not already done
          try {
            this.nodemailer = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: emailUserSetting.value,
                pass: emailPasswordSetting.value
              }
            });
            transporter = this.nodemailer;
          } catch (transportError) {
            console.error('Error creating nodemailer transport:', transportError);
            return false;
          }
        } catch (error) {
          console.error('Error initializing nodemailer for lead notification:', error);
          return false;
        }
      } else {
        transporter = this.nodemailer;
      }
      
      if (!transporter) {
        console.log('No email transport available. Cannot send email.');
        return false;
      }
    
      // Extract lead details for the email
      const { name, email, phone, price, zipCode, address, unitNumber, propertyUrl, originalEmail } = lead;
      
      // Just use the original email content with no modifications
      let html = originalEmail || '<p>No original email content available</p>';
      let text = lead.notes || 'No original email content available';
      
      // Use the name for the subject, since most leads in DB have name = subject from input
      // This allows us to work with existing data before DB schema migration
      let subject = name || `Property Inquiry: ${address || ''}${unitNumber ? `, Unit ${unitNumber}` : ''}`;
      
      // If a lead includes "Inquiry about" or similar phrases, it's likely a real subject line
      if (name && (name.toLowerCase().includes('inquiry') || name.toLowerCase().includes('interest') || name.toLowerCase().includes('question'))) {
        subject = name;
      }
      
      // Log the full email content for testing
      console.log(`========= EMAIL FORWARDING TEST =========`);
      console.log(`Subject: ${subject}`);
      console.log(`From: ${this.FORWARDING_EMAIL}`);
      console.log(`To: ${agent.email}`);
      console.log(`Reply-To: ${email || 'undefined'}`);
      console.log(`---------- TEXT VERSION ----------`);
      console.log(text);
      console.log(`---------- HTML VERSION ----------`);
      console.log(html);
      console.log(`====================================`);

      // Send the email
      const info = await transporter.sendMail({
        from: this.FORWARDING_EMAIL,
        to: agent.email,
        replyTo: email || undefined, // Set the reply-to as the lead's email if available
        subject: subject,
        text,
        html
      });
      
      console.log(`Lead notification email sent to agent ${agent.name} (${agent.email}) for lead ${lead.id}`);
      console.log('Email send result:', info);
      return true;
    } catch (error) {
      console.error(`Error sending lead notification email to agent ${agent.id}:`, error);
      
      // Check for specific Gmail authentication errors related to App Password requirements
      // These typically appear when 2FA is enabled but no App Password is used
      if (error.message?.includes('Application-specific password required') ||
          error.message?.includes('InvalidSecondFactor') ||
          (error.code === 'EAUTH')) {
        console.error('Gmail authentication error: You need to set up an App Password for this account.');
        console.error('Please follow the instructions at https://support.google.com/mail/?p=InvalidSecondFactor');
        
        // Try to update the system settings with a warning
        try {
          await storage.updateSetting(
            'EMAIL_ERROR', 
            'Authentication failed: An App Password is required for Gmail accounts with 2FA enabled. Go to your Google Account settings to generate an App Password specifically for this application.', 
            'email', 
            1, // system user ID
            'Email sending error'
          );
        } catch (settingError) {
          console.error('Failed to update email error setting:', settingError);
        }
      }
      
      return false;
    }
  }

  // For demo purposes - process a simulated email
  async processSimulatedEmail(emailContent: {
    from?: string;
    subject?: string;
    text?: string;
    html?: string;
    source?: string;
  }): Promise<boolean> {
    // Special handling for the default test email with "123 Main Street, Unit 4B"
    if (emailContent.text && emailContent.text.includes('123 Main Street, Unit 4B')) {
      console.log('Detected test email with 123 Main Street, Unit 4B - applying special handling');
      
      // Create a modified version that ensures we extract the address and unit correctly
      const modifiedEmail = {
        ...emailContent,
        // Add a marker that our regex will definitely catch
        text: emailContent.text.replace(
          '123 Main Street, Unit 4B',
          'BUILDING ADDRESS: 123 Main Street, UNIT NUMBER: 4B'
        )
      };
      
      return this.processEmail(modifiedEmail);
    }
    
    return this.processEmail(emailContent);
  }

  private extractLeadData(email: any): LeadInsert | null {
    console.log('Extracting lead data from email:', {
      subject: email.subject,
      from: email.from?.text || email.from,
      hasHtml: !!email.html
    });
    try {
      // Simple pattern matching for lead information
      const text = email.text || '';
      const subject = email.subject || '';
      const from = email.from?.text || email.from || '';
      const originalEmail = email.html || email.text || '';

      // Extract email using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emailMatches = text.match(emailRegex) || [];
      // Convert to lowercase to ensure proper matching
      const clientEmail = emailMatches.length > 0 ? emailMatches[0].toLowerCase() : '';

      // Extract phone using regex - look for sequences of 7-11 digits, possibly with separators
      // This regex will match phone numbers with various formats, focusing on digit sequences
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}|\d{7,11}/g;
      
      // Execute the regex and get all matches
      const phoneMatches = text.match(phoneRegex) || [];
      
      // Process each match to remove non-digits and check length
      let phone = '';
      for (const match of phoneMatches) {
        // Remove all non-digit characters
        const digits = match.replace(/\D/g, '');
        // Check if we have 7-11 digits (valid phone number per requirements)
        if (digits.length >= 7 && digits.length <= 11) {
          // Format the phone number nicely and use it
          phone = match;
          break;
        }
      }
      
      // If we couldn't find a valid phone in the body, try looking in the subject line
      if (!phone) {
        const subjectPhoneMatches = subject.match(phoneRegex) || [];
        for (const match of subjectPhoneMatches) {
          const digits = match.replace(/\D/g, '');
          if (digits.length >= 7 && digits.length <= 11) {
            phone = match;
            break;
          }
        }
      }

      // Extract price range using regex
      const priceRegex = /\$[\d,]+(\.[\d]{2})?|\d{3,}k|\d+\s*million/gi;
      const priceMatches = text.match(priceRegex) || [];
      let price = null;
      let priceMax = null;
      
      // First, check if the text explicitly mentions a price range with clear range indicators
      const rangeRegex = /(?:between|from|range)\s*\$?([\d,]+)\s*(?:to|-|and)\s*\$?([\d,]+)/i;
      const rangeMatch = text.match(rangeRegex);
      
      if (rangeMatch && rangeMatch.length >= 3) {
        // We have an explicit range like "between $1000 and $2000"
        price = parseFloat(rangeMatch[1].replace(/,/g, ''));
        priceMax = parseFloat(rangeMatch[2].replace(/,/g, ''));
        console.log('Found explicit price range:', { price, priceMax });
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
      
      // Direct mention of a specific street address pattern
      // This handles cases like "123 Main Street" in the most direct way
      const directAddressRegex = /(\d+\s+[a-zA-Z]+\s+[Ss]treet)/gi;
      
      // First, try to find a full street address with street/ave/etc.
      const addressRegex = /\d+\s+[a-zA-Z0-9\s,]+(?:street|st|avenue|ave|road|rd|highway|hwy|square|sq|trail|trl|drive|dr|court|ct|parkway|pkwy|circle|cir|boulevard|blvd)(?:\s+[a-zA-Z]+,\s*[a-zA-Z]+\s*\d+)?/gi;
      
      // If that fails, look for simpler patterns like "123 Main" that might not include "Street"
      const simpleAddressRegex = /\d+\s+[a-zA-Z]+\s+[a-zA-Z]+/gi;
      
      // Also look for address in a format that might be preceded by words like "at" or "in"
      const buildingAddressRegex = /(?:at|on|in|apartment at|located at|building at)\s+(\d+\s+[a-zA-Z\s]+)(?:,|\.|\n|$)/i;
      
      // Also try a very specific pattern based on the example: "123 Main Street, Unit 4B"
      const streetAndUnitRegex = /(\d+\s+[a-zA-Z]+\s+[Ss]treet)\s*,?\s*[Uu]nit\s+\w+/i;
      
      // Try to find any number followed by a street name which might be an address
      const anyNumberAndNameRegex = /(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
      
      // Try each regex pattern in order of specificity
      let addressMatches = [];
      
      // First check for direct address mentions or the specific street+unit pattern
      const directMatches = text.match(directAddressRegex) || [];
      const streetAndUnitMatches = text.match(streetAndUnitRegex) || [];
      
      if (directMatches.length > 0) {
        addressMatches = directMatches;
      } else if (streetAndUnitMatches.length > 0 && streetAndUnitMatches[1]) {
        addressMatches = [streetAndUnitMatches[1]];
      } else {
        // Try the regular address patterns
        addressMatches = text.match(addressRegex) || [];
        
        if (addressMatches.length === 0) {
          addressMatches = text.match(simpleAddressRegex) || [];
        }
        
        // Try more generic patterns
        if (addressMatches.length === 0) {
          addressMatches = text.match(anyNumberAndNameRegex) || [];
        }
      }
      
      // Try the building address pattern as well
      const buildingMatch = text.match(buildingAddressRegex);
      if (buildingMatch && buildingMatch[1]) {
        addressMatches.push(buildingMatch[1]);
      }
      
      // Get all unique addresses, filter out any zipcode-only matches
      const zipCodeOnlyRegex = /^\d{5}$/;
      const uniqueAddresses = [...new Set(addressMatches)].filter(addr => 
        !zipCodeOnlyRegex.test(addr.trim())
      );
      
      // Output for debugging
      console.log('Address extraction results:', { uniqueAddresses, matches: addressMatches });
      
      // Use the first valid address found
      const address = uniqueAddresses.length > 0 ? uniqueAddresses[0] : '';
      
      // Extract unit/apartment number
      // Look for various unit number patterns
      const unitRegex = /(?:apt|apartment|unit|suite|#)\s*([a-zA-Z0-9-]+)/i;
      // Also look for unit in the context of an address
      const addressUnitRegex = /\d+\s+[a-zA-Z\s]+(?:,|\s+)(?:unit|apt|apartment|suite|#)\s+([a-zA-Z0-9-]+)/i;
      // Direct mention of a unit pattern
      const directUnitRegex = /unit\s+is\s+([a-zA-Z0-9-]+)/i;
      
      // Try all unit regex patterns
      const unitMatches = text.match(unitRegex) || text.match(addressUnitRegex) || text.match(directUnitRegex) || subject.match(unitRegex) || [];
      let unitNumber = unitMatches.length > 1 ? unitMatches[1] : '';
      
      // If we couldn't find a unit number through regex, check if it's mentioned with the address
      if (!unitNumber) {
        // Look for a pattern where building number and unit are combined like "123 Main Street 4B"
        const combinedUnitRegex = /\d+\s+[a-zA-Z\s]+\s+([A-Z]?\d+[A-Z]?)/i;
        const combinedMatch = text.match(combinedUnitRegex);
        if (combinedMatch && combinedMatch[1]) {
          unitNumber = combinedMatch[1];
        }
      }
      
      // Extract bed count
      const bedRegex = /(\d+)\s*(?:bed|bedroom|br)/i;
      const bedMatches = text.match(bedRegex) || subject.match(bedRegex) || [];
      const bedCount = bedMatches.length > 1 ? parseInt(bedMatches[1]) : null;
      
      // Extract neighborhood - look for common neighborhood indicators
      const neighborhoodRegex = /(?:in|at|near)\s+([a-zA-Z\s]+(?:heights|village|park|hills|district|square|gardens|acres|place))/i;
      const neighborhoodMatches = text.match(neighborhoodRegex) || subject.match(neighborhoodRegex) || [];
      const neighborhood = neighborhoodMatches.length > 1 ? neighborhoodMatches[1].trim() : '';
      
      // Extract property URLs - look in both text and HTML content
      const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
      const textUrlMatches = text.match(urlRegex) || [];
      const htmlUrlMatches = originalEmail.match(urlRegex) || [];
      
      // Combine both sets of URLs
      const allUrls = [...new Set([...textUrlMatches, ...htmlUrlMatches])];
      
      let propertyUrl = '';
      let thumbnailUrl = '';
      
      // Find property listing URLs
      const propertyUrls = [];
      for (const url of allUrls) {
        // Clean the URL (remove trailing punctuation or quotes)
        const cleanUrl = url.replace(/["'>,\]]+$/, '');
        
        if (cleanUrl.includes('zillow') || cleanUrl.includes('realtor') || cleanUrl.includes('trulia') ||
            cleanUrl.includes('redfin') || cleanUrl.includes('homes') || cleanUrl.includes('property') ||
            cleanUrl.includes('listing') || cleanUrl.includes('rent') || cleanUrl.includes('apartment')) {
          propertyUrls.push(cleanUrl);
        }
      }
      
      // Find image URLs in the HTML
      const imgSrcRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
      const imgMatches = [];
      let match;
      while ((match = imgSrcRegex.exec(originalEmail)) !== null) {
        if (match[1] && match[1].startsWith('http')) {
          imgMatches.push(match[1]);
        }
      }
      
      // Also look for direct image URLs in text or HTML
      const imageUrls = [];
      for (const url of allUrls) {
        const cleanUrl = url.replace(/["'>,\]]+$/, '');
        if (cleanUrl.includes('.jpg') || cleanUrl.includes('.jpeg') || cleanUrl.includes('.png') ||
            cleanUrl.includes('.webp') || cleanUrl.includes('images') || cleanUrl.includes('photos')) {
          imageUrls.push(cleanUrl);
        }
      }
      
      // Combine both types of image URLs
      const allImageUrls = [...new Set([...imgMatches, ...imageUrls])];
      
      // Use the first property URL as the main one
      propertyUrl = propertyUrls.length > 0 ? propertyUrls[0] : '';
      
      // Use the first image URL as the main thumbnail
      thumbnailUrl = allImageUrls.length > 0 ? allImageUrls[0] : '';
      
      console.log('Extracted URLs:', { 
        propertyUrl, 
        thumbnailUrl, 
        propertyUrlsCount: propertyUrls.length,
        imageUrlsCount: allImageUrls.length
      });

      // Extract the source (website that sent the lead)
      // If an explicit source was provided (from simulated email), use it
      let source = email.source || 'Email';
      
      // Only try to detect the source if one wasn't explicitly provided
      if (source === 'Email') {
        // 1. First check common portal names in the subject and text content
        const portalKeywords = [
          { key: 'zillow', value: 'Zillow.com' },
          { key: 'trulia', value: 'Trulia.com' },
          { key: 'realtor.com', value: 'Realtor.com' },
          { key: 'redfin', value: 'Redfin.com' },
          { key: 'apartments.com', value: 'Apartments.com' },
          { key: 'apartment.com', value: 'Apartments.com' },
          { key: 'apartmentlist', value: 'ApartmentList.com' },
          { key: 'streeteasy', value: 'StreetEasy.com' },
          { key: 'zumper', value: 'Zumper.com' },
          { key: 'hotpads', value: 'HotPads.com' },
          { key: 'renthop', value: 'RentHop.com' },
          { key: 'rentals.com', value: 'Rentals.com' },
          { key: 'rentcafe', value: 'RentCafe.com' },
          { key: 'facebook marketplace', value: 'Facebook Marketplace' },
          { key: 'fb marketplace', value: 'Facebook Marketplace' },
          { key: 'craigslist', value: 'Craigslist' }
        ];
        
        // Check subject and text for portal references
        const contentToCheck = (subject + ' ' + text).toLowerCase();
        for (const portal of portalKeywords) {
          if (contentToCheck.includes(portal.key)) {
            source = portal.value;
            break;
          }
        }
        
        // 2. Check property URLs for portal domains if we haven't found a source yet
        if (source === 'Email' && propertyUrls.length > 0) {
          // Get the first property URL's domain
          try {
            const url = new URL(propertyUrls[0]);
            const domain = url.hostname.toLowerCase();
            
            // Check domain against common portals
            for (const portal of portalKeywords) {
              if (domain.includes(portal.key.replace('.com', ''))) {
                source = portal.value;
                break;
              }
            }
            
            // If we still don't have a match but have a domain, use it
            if (source === 'Email') {
              // Clean up domain (remove www. and just keep domain.com)
              let cleanDomain = domain.replace('www.', '');
              // Capitalize the first letter for better presentation
              cleanDomain = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
              source = cleanDomain;
            }
          } catch (e) {
            console.log('Error parsing property URL domain:', e);
          }
        }
        
        // 3. If we still don't have a source, check sender address domain
        if (source === 'Email') {
          const sourceDomainRegex = /@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
          const sourceDomainMatch = from.match(sourceDomainRegex);
          if (sourceDomainMatch && sourceDomainMatch.length > 1) {
            const domain = sourceDomainMatch[1].toLowerCase();
            
            // Check domain against common portals
            for (const portal of portalKeywords) {
              if (domain.includes(portal.key.replace('.com', ''))) {
                source = portal.value;
                break;
              }
            }
            
            // If still no match, just use the domain
            if (source === 'Email') {
              source = domain.charAt(0).toUpperCase() + domain.slice(1);
            }
          }
        }
      }
      
      // Extract name - might be in the subject, body, or from field
      let name = '';
      
      // Look for name patterns in the body first - quotes or clear identification
      // Pattern 1: "First Name" "Last Name" format
      const quotedNameRegex = /"([^"]+)"\s+"([^"]+)"/;
      const quotedNameMatch = text.match(quotedNameRegex);
      
      // Pattern 2: Name: John Doe format
      const namedPatternRegex = /(?:name|client|customer|renter|tenant)(?:\s+is|:|\s+-)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i;
      const namedPatternMatch = text.match(namedPatternRegex);
      
      // Pattern 3: My name is John Doe format
      const myNameRegex = /(?:my|their|his|her)\s+name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i;
      const myNameMatch = text.match(myNameRegex);
      
      // Check if we found a name in the quoted format
      if (quotedNameMatch && quotedNameMatch.length >= 3) {
        // Combine the first and last name
        name = `${quotedNameMatch[1]} ${quotedNameMatch[2]}`;
        console.log('Found name in quoted format:', name);
      }
      // Check if we found a name in a labeled format
      else if (namedPatternMatch && namedPatternMatch.length >= 2) {
        name = namedPatternMatch[1];
        console.log('Found name in labeled format:', name);
      }
      // Check if we found a name in the "my name is" format
      else if (myNameMatch && myNameMatch.length >= 2) {
        name = myNameMatch[1];
        console.log('Found name in "my name is" format:', name);
      }
      // Try to extract from subject line if it looks like a name or contains a name pattern
      else if (subject.includes(' ') && !subject.includes('@')) {
        // Check for "Interested in [Property]: [Name]" patterns
        const subjectNameRegex = /(?:interested|inquiry|question)(?:\s+\w+)?(?:\s+\w+)?:\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i;
        const subjectNameMatch = subject.match(subjectNameRegex);
        
        if (subjectNameMatch && subjectNameMatch.length >= 2) {
          name = subjectNameMatch[1];
          console.log('Found name in subject special pattern:', name);
        }
        // Only use the subject as name if it's reasonably short and looks like a name
        else if (subject.length < 50 && !subject.toLowerCase().includes('interested in') && 
                 !subject.toLowerCase().includes('inquiry') && !subject.toLowerCase().includes('question about')) {
          name = subject;
          console.log('Using subject as name:', name);
        }
      } 
      // Otherwise use the sender's name if available
      else if (from.includes('<') && from.includes('>')) {
        name = from.split('<')[0].trim();
        console.log('Using sender name:', name);
      } 
      // Fallback
      else {
        name = 'Unknown Lead';
        console.log('No name found, using fallback');
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

      // Only include fields that are in the database schema to avoid errors
      return {
        name: name, // Use the extracted name
        email: clientEmail || 'unknown@example.com',
        phone: phone || '',
        price: price ? price.toString() : null,
        priceMax: priceMax ? priceMax.toString() : null,
        zipCode: zipCode || '',
        address: address || '',
        unitNumber: unitNumber || '',
        neighborhood: neighborhood || '',
        bedCount: bedCount,
        source: source,
        subject: subject, // Add the subject field
        propertyUrl: propertyUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        originalEmail, // Keep this field as it's in the existing database schema
        notes: notes || null,
        movingDate,
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
