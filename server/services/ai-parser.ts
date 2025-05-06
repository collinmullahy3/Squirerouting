import Anthropic from '@anthropic-ai/sdk';
import { LeadInsert, ParsingPatternInsert } from '@shared/schema';
import { storage } from '../storage';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Uses Anthropic's Claude to parse structured and unstructured emails 
 * and extract meaningful lead information
 */
/**
 * Check for existing parsing pattern for a source and use it if available
 */
async function getExistingPattern(source: string): Promise<string | null> {
  if (!source) return null;
  
  try {
    const pattern = await storage.getParsingPatternBySource(source);
    if (pattern && pattern.pattern) {
      return pattern.pattern;
    }
    return null;
  } catch (error) {
    console.error('Error getting existing pattern:', error);
    return null;
  }
}

/**
 * Store a successful parsing pattern for future use
 */
async function storeParsingPattern(source: string, pattern: string): Promise<void> {
  if (!source || !pattern) return;
  
  try {
    // Store the pattern
    await storage.storeParsingPattern({
      source,
      pattern,
      patternType: 'ai',
    });
    console.log(`Updated parsing pattern for source: ${source}`);
  } catch (error) {
    console.error('Error storing parsing pattern:', error);
  }
}

export async function parseEmailWithAI(emailContent: string, subject: string): Promise<Partial<LeadInsert>> {
  try {
    console.log('Using AI to parse email content');
    
    // First, try to detect the source from the email content or subject
    let detectedSource = detectSourceFromEmail(emailContent, subject);
    let existingPattern = null;
    
    // If we have a detected source, check for existing patterns
    if (detectedSource) {
      existingPattern = await getExistingPattern(detectedSource);
    }
    
    // If we have an existing pattern, try to use it first
    if (existingPattern) {
      try {
        // The pattern is stored as a JSON string of a previously successful parse
        const parsedData = JSON.parse(existingPattern);
        
        // If the pattern has a source, use that to improve detection
        if (parsedData && parsedData.source) {
          detectedSource = parsedData.source;
          
          // Increment the success count for this pattern
          const pattern = await storage.getParsingPatternBySource(detectedSource);
          if (pattern && pattern.id) {
            await storage.incrementParsingPatternSuccessCount(pattern.id);
          }
          
          // Return the formatted data using the existing pattern
          return {
            name: `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim(),
            email: parsedData.email || '',
            phone: parsedData.phone || '',
            price: parsedData.price || null,
            zipCode: parsedData.zipCode || '',
            address: parsedData.address || '',
            unitNumber: parsedData.unitNumber || '',
            bedCount: parsedData.bedCount || null,
            neighborhood: parsedData.neighborhood || null,
            propertyUrl: parsedData.propertyUrl || null,
            thumbnailUrl: null,
            source: parsedData.source || 'Email',
            notes: null,
            movingDate: parsedData.movingDate ? new Date(parsedData.movingDate) : null,
            receivedAt: new Date(),
            updatedAt: new Date(),
            subject: subject,
            originalEmail: emailContent,
          };
        }
      } catch (patternError) {
        console.error('Error using existing pattern:', patternError);
        // Continue with AI parsing if using the pattern fails
      }
    }
    
    // If there's no existing pattern or it failed, use Claude AI to parse the email
    // Define the base prompt
    const basePrompt = `
    I need you to parse the following email to extract lead information for a real estate listing.
    
    Email subject line: ${subject}
    Email content: 
    ${emailContent}
    
    Extract the following information and output it in a structured JSON format:
    - First Name
    - Last Name
    - Email Address (valid email addresses only)
    - Phone Number (valid phone number only - no other text)
    - Address (property street address without unit number)
    - Unit Number (if available)
    - Bed Count (numeric value only)
    - Rent/Price (numeric value only, without $ or commas)
    - Zip Code (just the zip code without other text)
    - Neighborhood (if available)
    - Moving Date (if available)
    - Source Website (e.g., Zillow, Trulia, etc.)
    - Property URL (if available)
    
    Guidelines:
    - Only extract valid email addresses with standard format (user@domain.com).
    - Only extract valid phone numbers without any additional text.
    - Just output a clean JSON object, no other text.
    - If a field has invalid data or isn't present, set it to null.
    - For numeric fields like bedCount and price, only include numeric values.
    - Don't invent or hallucinate information not in the email.
    - If you're unsure about data, set the field to null.
    - If there are multiple values for a field (like several emails), choose the most valid one.
    
    The output should look like this (filled in with actual data):
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "2125551234",
      "address": "123 Main St",
      "unitNumber": "4B",
      "bedCount": 2,
      "price": 2500,
      "zipCode": "10001",
      "neighborhood": "Chelsea",
      "movingDate": "2025-06-01",
      "source": "Zillow",
      "propertyUrl": "https://zillow.com/property/123"
    }
    `;
    
    // If we have a detected source, include that in the prompt
    const finalPrompt = detectedSource 
      ? basePrompt + `\n\nThis email appears to come from ${detectedSource}. Please confirm this source if possible.` 
      : basePrompt;
      
    // Send to Claude for processing
    const message = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: finalPrompt }],
      model: 'claude-3-7-sonnet-20250219',
    });
    
    // Access the text content from the response
    const contentBlock = message.content[0];
    const responseContent = typeof contentBlock === 'object' && 'text' in contentBlock 
      ? contentBlock.text as string
      : JSON.stringify(contentBlock);
    
    // Extract JSON from response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from AI response');
      return {};
    }
    
    const jsonStr = jsonMatch[0];
    console.log('AI parser extracted JSON:', jsonStr);
    
    // Parse the JSON
    const parsedData = JSON.parse(jsonStr);
    
    // If we successfully parsed the data and identified a source, store the pattern
    if (parsedData && parsedData.source) {
      await storeParsingPattern(parsedData.source, jsonStr);
      console.log('AI successfully parsed the email');
    }
    
    // Format the data for return
    const formattedData = {
      name: `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim(),
      email: parsedData.email || '',
      phone: parsedData.phone || '',
      price: parsedData.price || null,
      zipCode: parsedData.zipCode || '',
      address: parsedData.address || '',
      unitNumber: parsedData.unitNumber || '',
      bedCount: parsedData.bedCount || null,
      neighborhood: parsedData.neighborhood || null,
      propertyUrl: parsedData.propertyUrl || null,
      thumbnailUrl: null,
      source: parsedData.source || 'Email',
      notes: null,
      movingDate: parsedData.movingDate ? new Date(parsedData.movingDate) : null,
      receivedAt: new Date(),
      updatedAt: new Date(),
      subject: subject,
      originalEmail: emailContent,
    };
    
    return formattedData;
  } catch (error) {
    console.error('Error using AI to parse email:', error);
    return {};
  }
}

/**
 * Detect the likely source of the email based on common patterns
 */
function detectSourceFromEmail(emailContent: string, subject: string): string | null {
  if (!emailContent && !subject) return null;
  
  // Common real estate listing sources
  const sources = [
    { name: 'Zillow', patterns: ['zillow.com', 'zillow', 'new zillow listing', 'zillow listing'] },
    { name: 'StreetEasy', patterns: ['streeteasy.com', 'streeteasy', 'new streeteasy listing'] },
    { name: 'Trulia', patterns: ['trulia.com', 'trulia', 'new trulia listing'] },
    { name: 'Apartments.com', patterns: ['apartments.com', 'apartments', 'new apartments.com listing'] },
    { name: 'Hotpads', patterns: ['hotpads.com', 'hotpads', 'new hotpads listing'] },
    { name: 'RentHop', patterns: ['renthop.com', 'renthop', 'new renthop listing'] },
    { name: 'Zumper', patterns: ['zumper.com', 'zumper', 'new zumper listing'] },
    { name: 'Naked Apartments', patterns: ['nakedapartments.com', 'naked apartments', 'new naked apartments listing'] },
    { name: 'Redfin', patterns: ['redfin.com', 'redfin', 'new redfin listing'] },
    { name: 'RentProgress', patterns: ['rentprogress.com', 'rent progress', 'new rent progress listing'] },
    { name: 'MySpaceNYC', patterns: ['myspacenyc.com', 'myspacenyc', 'my space nyc', 'new myspace listing'] }
  ];
  
  // Combine subject and content for searching
  const fullText = `${subject} ${emailContent}`.toLowerCase();
  
  // Check each source
  for (const source of sources) {
    for (const pattern of source.patterns) {
      if (fullText.includes(pattern.toLowerCase())) {
        return source.name;
      }
    }
  }
  
  return null;
}
