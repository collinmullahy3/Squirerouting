import { storage } from '../storage';
import { type LeadInsert } from '@shared/schema';
import { leadRouter } from './lead-router';

class EmailService {
  private readonly FORWARDING_EMAIL = 'collinmullahy3+myspace@gmail.com';
  private _isListening: boolean = true; // Simplified approach - always "listening" for API calls

  get isListening(): boolean {
    return this._isListening;
  }

  get forwardingEmail(): string {
    return this.FORWARDING_EMAIL;
  }

  async initialize(): Promise<boolean> {
    console.log(`Email service ready to receive forwarded emails. Agents should forward leads to: ${this.FORWARDING_EMAIL}`);
    return true;
  }

  // Process an email received via the API endpoint
  async processEmail(emailData: any): Promise<boolean> {
    try {
      console.log('Processing email with data:', {
        subject: emailData.subject,
        from: emailData.from,
        hasText: !!emailData.text,
        hasHtml: !!emailData.html,
        textLength: emailData.text?.length || 0
      });
      
      const leadData = this.extractLeadData(emailData);
      
      if (!leadData) {
        console.error('Email could not be parsed as a lead - missing required data');
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
        hasOriginalEmail: !!leadData.originalEmail,
        receivedAt: leadData.receivedAt ? 'Set' : 'Not set',
        updatedAt: leadData.updatedAt ? 'Set' : 'Not set'
      });
      
      // Make sure required dates are set
      if (!leadData.receivedAt) {
        leadData.receivedAt = new Date();
      }
      if (!leadData.updatedAt) {
        leadData.updatedAt = new Date();
      }
      
      try {  
        // Create the lead in the database
        console.log('Creating new lead...');
        const lead = await storage.createLead(leadData);
        console.log('Created lead with ID:', lead.id);
        
        // Route the lead to an agent
        console.log('Routing lead to agent...');
        const routeResult = await leadRouter.routeLead(lead);
        console.log('Lead routing result:', routeResult ? 'SUCCESS' : 'FAILED');
        
        return true;
      } catch (dbError) {
        console.error('Database error creating or routing lead:', dbError);
        return false; 
      }
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

      // Make sure to add all required fields from the Lead schema
      return {
        name,
        email: clientEmail || 'unknown@example.com',
        phone: phone || '',
        price: price ? price.toString() : null,
        zipCode: zipCode || '',
        address: address || '',
        source: 'Email',
        originalEmail,
        // Add the subject field which seems to be required
        subject: subject,
        // Make sure dates are included
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
