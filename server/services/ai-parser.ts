import Anthropic from '@anthropic-ai/sdk';
import { LeadInsert } from '@shared/schema';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Uses Anthropic's Claude to parse structured and unstructured emails 
 * and extract meaningful lead information
 */
export async function parseEmailWithAI(emailContent: string, subject: string): Promise<Partial<LeadInsert>> {
  try {
    console.log('Using AI to parse email content');
    
    const prompt = `
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
    
    const message = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
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
  } catch (error) {
    console.error('Error using AI to parse email:', error);
    return {};
  }
}
