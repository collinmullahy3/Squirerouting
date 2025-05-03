import { MailService } from '@sendgrid/mail';
import { Lead, User } from '@shared/schema';
import { storage } from '../storage';

export class EmailSender {
  private mailService: MailService;
  private initialized: boolean = false;

  constructor() {
    this.mailService = new MailService();
  }

  async initialize(): Promise<boolean> {
    try {
      // Check for SENDGRID_API_KEY in environment or database
      const apiKeySetting = await storage.getSettingByKey("SENDGRID_API_KEY");
      const apiKey = apiKeySetting?.value || process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        console.log('SendGrid API key not found. Email notifications are disabled.');
        return false;
      }
      
      this.mailService.setApiKey(apiKey);
      this.initialized = true;
      console.log('Email sender service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize email sender service:', error);
      return false;
    }
  }

  /**
   * Forward a lead notification to the assigned agent
   */
  async forwardLeadToAgent(lead: Lead): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
      if (!this.initialized) {
        return false;
      }
    }

    try {
      // Skip if no agent is assigned
      if (!lead.assignedAgentId) {
        console.log(`Cannot forward lead ${lead.id} - no agent assigned`);
        return false;
      }

      // Get the assigned agent
      const agent = await storage.getUserById(lead.assignedAgentId);
      if (!agent) {
        console.log(`Agent ${lead.assignedAgentId} not found for lead ${lead.id}`);
        return false;
      }

      // Create the email content
      const emailContent = this.createLeadNotificationEmail(lead, agent);
      
      // Send the email
      await this.mailService.send(emailContent);
      
      console.log(`Lead ${lead.id} forwarded to agent ${agent.name} (${agent.email})`);
      return true;
    } catch (error) {
      console.error(`Error forwarding lead ${lead.id} to agent:`, error);
      return false;
    }
  }

  /**
   * Create the email content for a lead notification
   */
  private createLeadNotificationEmail(lead: Lead, agent: User) {
    // Extract lead details for the email
    const { name, email, phone, price, zipCode, address, unitNumber, propertyUrl, originalEmail } = lead;
    
    // Create a simple HTML email that includes the original email content
    const html = `
      <h2>New Lead Assignment</h2>
      <p>A new lead has been assigned to you:</p>
      
      <h3>Lead Details</h3>
      <ul>
        <li><strong>Name:</strong> ${name || 'Not provided'}</li>
        <li><strong>Email:</strong> ${email || 'Not provided'}</li>
        <li><strong>Phone:</strong> ${phone || 'Not provided'}</li>
        <li><strong>Price Target:</strong> ${price ? `$${price}` : 'Not provided'}</li>
        <li><strong>Address:</strong> ${address || 'Not provided'}</li>
        ${unitNumber ? `<li><strong>Unit:</strong> ${unitNumber}</li>` : ''}
        <li><strong>Zip Code:</strong> ${zipCode || 'Not provided'}</li>
        ${propertyUrl ? `<li><strong>Property URL:</strong> <a href="${propertyUrl}">${propertyUrl}</a></li>` : ''}
      </ul>

      <h3>Original Email</h3>
      <div style="border: 1px solid #ddd; padding: 15px; background-color: #f8f8f8; font-family: monospace;">
        ${originalEmail ? originalEmail : 'No original email content available'}
      </div>
      
      <p style="margin-top: 20px; font-style: italic;">
        You can reply directly to this email to respond to the lead. Your reply will be sent to the lead's email address.
      </p>
    `;

    // Create a text version as well
    const text = `
      New Lead Assignment

      A new lead has been assigned to you:

      Lead Details:
      - Name: ${name || 'Not provided'}
      - Email: ${email || 'Not provided'}
      - Phone: ${phone || 'Not provided'}
      - Price Target: ${price ? `$${price}` : 'Not provided'}
      - Address: ${address || 'Not provided'}
      ${unitNumber ? `- Unit: ${unitNumber}\n` : ''}
      - Zip Code: ${zipCode || 'Not provided'}
      ${propertyUrl ? `- Property URL: ${propertyUrl}\n` : ''}

      Original Email:
      ${originalEmail ? originalEmail : 'No original email content available'}

      You can reply directly to this email to respond to the lead. Your reply will be sent to the lead's email address.
    `;

    return {
      to: agent.email,
      from: 'squirerouting@gmail.com', // Using the system forwarding address
      replyTo: email, // Setting the reply-to as the lead's email
      subject: `New Lead Assignment: ${name || 'New Inquiry'} - ${address || 'Property Inquiry'}`,
      text,
      html
    };
  }
}

// Export a singleton instance
export const emailSender = new EmailSender();
