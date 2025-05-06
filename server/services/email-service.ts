import IMAP from 'node-imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { MailService } from '@sendgrid/mail';
import { storage } from '../storage';
import { emailSettingsSchema, EmailSettings, Lead, User, UserInsert, leadStatusUpdateSchema } from '@shared/schema';
import { leadRouter } from './lead-router';

class EmailService {
  private readonly FORWARDING_EMAIL = process.env.EMAIL_USER || 'squirerouting@gmail.com';
  private _isListening: boolean = false;
  private imap: IMAP;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_FREQUENCY = 60000; // Check every minute
  private nodemailer: any = null; // Will initialize if needed
  
  constructor() {
    this.imap = new IMAP({
      user: '',
      password: '',
      host: '',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
  }
  
  get isListening(): boolean {
    return this._isListening;
  }
  
  get forwardingEmail(): string {
    return this.FORWARDING_EMAIL;
  }
  
  async initialize(): Promise<boolean> {
    try {
      // Try to get email settings from the database
      const emailSetting = await storage.getSettingByKey('EMAIL_SETTINGS');
      
      if (!emailSetting?.value) {
        console.log('Email settings not found. Email service will not be started.');
        return false;
      }
      
      try {
        const settings = emailSettingsSchema.parse(JSON.parse(emailSetting.value));
        this.setupImapConnection(settings);
        return true;
      } catch (error) {
        console.error('Invalid email settings format:', error);
        return false;
      }
    } catch (error) {
      console.error('Error initializing email service:', error);
      return false;
    }
  }
  
  private setupImapConnection(settings: EmailSettings) {
    // Clean up any existing connection and interval
    if (this.imap) {
      try {
        this.imap.end();
      } catch (e) {
        // Ignore errors when ending the connection
      }
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Create a new IMAP connection with the provided settings
    this.imap = new IMAP({
      user: settings.emailUser,
      password: settings.emailPassword,
      host: settings.emailHost,
      port: settings.emailPort,
      tls: settings.emailTls,
      tlsOptions: { rejectUnauthorized: true } // Always verify TLS
    });
    
    // Set up event handlers
    this.imap.once('ready', this.onImapReady.bind(this));
    this.imap.once('error', this.onImapError.bind(this));
    this.imap.once('end', this.onImapEnd.bind(this));
    
    // Attempt connection
    try {
      this.imap.connect();
      console.log('IMAP connection initiated');
    } catch (error) {
      console.error('Error connecting to IMAP server:', error);
    }
  }
  
  // Start listening for new emails
  public async startListening(): Promise<boolean> {
    if (this._isListening) {
      console.log('Email service is already listening');
      return true;
    }
    
    if (!this.imap) {
      await this.initialize();
    }
    
    // Check immediately and then set up interval
    await this.checkEmails();
    
    this.checkInterval = setInterval(() => {
      this.checkEmails().catch(error => {
        console.error('Error checking emails:', error);
      });
    }, this.CHECK_FREQUENCY);
    
    this._isListening = true;
    console.log('Email service started listening for new messages');
    return true;
  }
  
  // Stop listening for new emails
  public stopListening(): boolean {
    if (!this._isListening) {
      return false;
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this._isListening = false;
    console.log('Email service stopped listening for new messages');
    return true;
  }
  
  private onImapReady() {
    console.log('IMAP connection ready');
    // The connection is ready, but we don't automatically check emails here.
    // Emails will be checked on an interval.
  }
  
  private onImapError(err: Error) {
    console.error('IMAP connection error:', err);
    this._isListening = false;
    
    // Attempt to reconnect after a delay
    setTimeout(() => this.initialize(), 60000); // try again in 1 minute
  }
  
  private onImapEnd() {
    console.log('IMAP connection ended');
    this._isListening = false;
    
    // Attempt to reconnect after a delay
    setTimeout(() => this.initialize(), 60000); // try again in 1 minute
  }
  
  public async checkEmails(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Check if connection is ready
        if (!this.imap) {
          console.error('IMAP connection not initialized');
          resolve(false);
          return;
        }
        
        // Check connection state
        if (this.imap.state !== 'authenticated') {
          console.log(`IMAP connection state is ${this.imap.state}, waiting for ready state`);
          resolve(false);
          return;
        }
        
        this.checkNewEmails();
        resolve(true);
      } catch (error) {
        console.error('Error checking emails:', error);
        resolve(false);
      }
    });
  }
  
  private checkNewEmails() {
    try {
      const imapConnection = this.imap;
      this.checkNewEmailsWithConnection(imapConnection);
    } catch (error) {
      console.error('Error checking new emails:', error);
    }
  }
  
  private checkNewEmailsWithConnection(imapConnection: any, callback?: () => void) {
    try {
      // Try to open the 'myspace' label/folder first
      imapConnection.openBox('[Gmail]/MySpace', false, (err: any, mailbox: any) => {
        if (err) {
          // If 'myspace' label doesn't exist, try the standard 'MySpace' label
          imapConnection.openBox('MySpace', false, (labelErr: any, labelMailbox: any) => {
            if (labelErr) {
              // If neither exists, fall back to INBOX but log a warning
              console.log('MySpace label not found, checking INBOX instead. Please create a MySpace label.');
              imapConnection.openBox('INBOX', false, (inboxErr: any, inboxMailbox: any) => {
                if (inboxErr) {
                  console.error('Error opening inbox:', inboxErr);
                  if (callback) callback();
                  return;
                }
                this.searchUnreadEmails(imapConnection, callback);
              });
            } else {
              // Label found, search for unread emails
              this.searchUnreadEmails(imapConnection, callback);
            }
          });
        } else {
          // Gmail path found, search for unread emails
          this.searchUnreadEmails(imapConnection, callback);
        }
      });
    } catch (error) {
      console.error('Error in checkNewEmailsWithConnection:', error);
      if (callback) callback();
    }
  }

  private searchUnreadEmails(imapConnection: any, callback?: () => void) {
    try {
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
    } catch (error) {
      console.error('Error checking emails with connection:', error);
      if (callback) callback();
    }
  }
  
  // Process an email received via the API endpoint
  async processEmail(emailData: any): Promise<boolean> {
    try {
      const leadData = await this.extractLeadData(emailData);
      
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
    try {
      // Check if we have the required fields
      if (!emailContent.subject || !emailContent.text) {
        console.log('Simulate email error: Missing subject or text', {
          subject: emailContent.subject,
          text: emailContent.text
        });
        throw new Error('Subject and text are required');
      }
      
      // Ensure we add the current dates to the emailContent object
      emailContent = {
        ...emailContent,
        receivedAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Processing simulated email:', {
        subject: emailContent.subject,
        from: emailContent.from || 'test@example.com',
        source: emailContent.source || undefined,
        textLength: emailContent.text.length,
        htmlLength: emailContent.html?.length || 0
      });

      return await this.processEmail(emailContent);
    } catch (error) {
      console.error('Error processing simulated email:', error);
      return false;
    }
  }

  private extractLeadData(email: any): Promise<any> {
    // TODO: Implement lead data extraction from email
    // For now, just create a placeholder lead
    return Promise.resolve({
      name: email.subject,
      email: email.from,
      receivedAt: new Date(),
      updatedAt: new Date(),
      originalEmail: email.html || email.text
    });
  }
}

export const emailService = new EmailService();
