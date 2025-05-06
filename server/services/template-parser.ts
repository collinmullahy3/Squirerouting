import { LeadInsert, ParsingPattern } from '@shared/schema';
import { storage } from '../storage';
import { parseEmailWithAI } from './ai-parser';

/**
 * Parse email using stored templates instead of AI
 */
export async function parseEmailWithTemplates(
  emailContent: string,
  subject: string,
  emailFrom: string
): Promise<Partial<LeadInsert> | null> {
  try {
    // First detect the likely source of the email
    const source = detectSourceFromEmail(emailContent, subject, emailFrom);
    
    if (!source) {
      console.log('Unable to detect source from email');
      return null;
    }
    
    console.log(`Detected source: ${source}, attempting to parse using templates`);
    
    // Get stored pattern for this source
    const storedPattern = await storage.getParsingPatternBySource(source);
    
    if (!storedPattern) {
      console.log(`No parsing pattern found for source: ${source}`);
      return null;
    }
    
    console.log(`Found pattern for ${source}, last used: ${storedPattern.lastUsed}`);
    
    // Use the template to extract data
    const extractedData = extractDataFromTemplate(emailContent, subject, emailFrom, storedPattern);
    
    if (extractedData) {
      // Increment success count for pattern
      await storage.incrementParsingPatternSuccessCount(storedPattern.id);
      console.log(`Successfully parsed email using template for ${source}`);
    }
    
    return extractedData;
  } catch (error) {
    console.error('Template parsing error:', error);
    return null;
  }
}

/**
 * Detect the source of the email based on domain, content patterns, etc.
 */
function detectSourceFromEmail(emailContent: string, subject: string, emailFrom: string): string | null {
  // Convert all inputs to lowercase for case-insensitive matching
  const contentLower = emailContent.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const fromLower = emailFrom.toLowerCase();
  
  // First check for domain patterns in email addresses - these are most reliable
  // Map of domain patterns to source names
  const domainSourceMap: Record<string, string> = {
    '@myspacenyc.com': 'MySpace NYC',
    '@zumper.com': 'Zumper',
    '@zillow.com': 'Zillow',
    '@trulia.com': 'Trulia',
    '@apartments.com': 'Apartments.com',
    '@streeteasy.com': 'StreetEasy',
    '@hotpads.com': 'HotPads',
    '@renthop.com': 'RentHop',
    '@nooklyn.com': 'Nooklyn',
    '@realtor.com': 'Realtor.com',
    '@rentable.co': 'Rentable',
    '@loftey.com': 'Loftey',
    '@realty.com': 'Realty.com',
    '@theguarantors.com': 'TheGuarantors',
    '@bondnewyork.com': 'Bond New York',
    '@compass.com': 'Compass',
    '@cazamio.com': 'Cazamio'
  };
  
  // Check from email domain against our map
  for (const [domainPattern, sourceName] of Object.entries(domainSourceMap)) {
    if (fromLower.includes(domainPattern)) {
      return sourceName;
    }
  }
  
  // Check for content patterns if email domain didn't match
  // Map of content keywords to source names
  const contentSourceMap: Record<string, string> = {
    'myspace nyc': 'MySpace NYC',
    'zumper': 'Zumper',
    'zillow': 'Zillow',
    'trulia': 'Trulia',
    'apartments.com': 'Apartments.com',
    'streeteasy': 'StreetEasy',
    'hotpads': 'HotPads',
    'renthop': 'RentHop',
    'nooklyn': 'Nooklyn',
    'realtor.com': 'Realtor.com',
    'rentable': 'Rentable',
    'loftey': 'Loftey',
    'realty.com': 'Realty.com',
    'guarantors': 'TheGuarantors',
    'bond new york': 'Bond New York',
    'compass': 'Compass',
    'cazamio': 'Cazamio'
  };
  
  // Check both content and subject for keywords
  for (const [keyword, sourceName] of Object.entries(contentSourceMap)) {
    if (contentLower.includes(keyword) || subjectLower.includes(keyword)) {
      return sourceName;
    }
  }
  
  // If no match, look for other strong indicators like lead inquiry patterns
  if (subjectLower.includes('property inquiry') || 
      subjectLower.includes('rental inquiry') || 
      subjectLower.includes('apartment inquiry')) {
    return 'Property Inquiry';
  }
  
  // Check for common real estate terms in combination
  const realEstateTerms = ['apartment', 'rental', 'bedroom', 'bath', 'rent', 'lease', 'property'];
  let termCount = 0;
  
  for (const term of realEstateTerms) {
    if (contentLower.includes(term)) {
      termCount++;
    }
  }
  
  // If we have multiple real estate terms, it's likely a real estate lead
  if (termCount >= 3) {
    return 'Real Estate Lead';
  }
  
  // If we can't determine the source, return null
  return null;
}

/**
 * Extract data using the stored template pattern
 */
function extractDataFromTemplate(
  emailContent: string,
  subject: string,
  emailFrom: string,
  pattern: ParsingPattern
): Partial<LeadInsert> | null {
  try {
    // The pattern.pattern field contains a JSON string of a previously successful extraction
    // Parse it to use as a template
    const templateData = JSON.parse(pattern.pattern);
    
    // Create a new lead object based on the template
    const leadData: Partial<LeadInsert> = {
      // Always use these fields from the current email
      originalEmail: emailContent,
      subject,
      source: pattern.source,
      receivedAt: new Date(),
      updatedAt: new Date(),
      
      // Extract data from email using regex patterns based on the source
      ...extractSourceSpecificData(emailContent, subject, emailFrom, pattern.source)
    };
    
    // Use template data as fallback for any missing fields
    // This ensures we parse what we can from the email but still have reasonable defaults
    const result = {
      ...templateData,  // Template data as base
      ...leadData,      // Overwrite with any fields we successfully extracted
      
      // Always use current email and timestamp data
      originalEmail: emailContent,
      subject,
      receivedAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Format the name field by combining firstName and lastName if they exist
    if (result.firstName || result.lastName) {
      result.name = [result.firstName, result.lastName].filter(Boolean).join(' ');
    }
    
    console.log('Extracted data using template:', {
      source: pattern.source,
      name: result.name,
      email: result.email,
      phone: result.phone,
      address: result.address,
      zipCode: result.zipCode
    });
    
    return result;
  } catch (error) {
    console.error('Error extracting data from template:', error);
    return null;
  }
}

/**
 * Extract source-specific data using regex patterns
 */
function extractSourceSpecificData(
  emailContent: string,
  subject: string,
  emailFrom: string,
  source: string
): Partial<LeadInsert> {
  const data: Partial<LeadInsert> = {};
  
  // Common patterns that work across multiple sources
  // First pass: Extract all possible data using generic patterns
  
  // Extract name patterns
  const namePatterns = [
    /(?:name|contact)s?:?\s+([a-zA-Z]+(\s[a-zA-Z]+){0,3})/i,   // "Name: Jane Smith"
    /(?:my name is|this is)\s+([a-zA-Z]+(\s[a-zA-Z]+){0,3})/i,  // "My name is Jane Smith"
    /(?:from|by)\s+([a-zA-Z]+(\s[a-zA-Z]+){0,3})/i,            // "From Jane Smith"
    /([a-zA-Z]+(\s[a-zA-Z]+){0,3})\s+(?:is interested|would like)/i // "Jane Smith is interested"
  ];
  
  for (const pattern of namePatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      data.name = match[1].trim();
      break;
    }
  }
  
  // Email address extraction and filtering
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const emailMatches = emailContent.match(emailRegex) || [];
  if (emailMatches.length > 0) {
    // Filter out sender domains that shouldn't be considered as the renter's email
    const excludeDomains = [
      'zumper.com', 'zillow.com', 'myspacenyc.com', 'cazamio.com', 
      'compass.com', 'theguarantors.com', 'bondnewyork.com', 'streeteasy.com',
      'renthop.com', 'hotpads.com', 'apartments.com', 'trulia.com',
      'nooklyn.com', 'realtor.com', 'rentable.co', 'loftey.com', 'realty.com'
    ];
    
    const validEmails = emailMatches.filter(email => {
      if (!email) return false;
      const parts = email.split('@');
      if (parts.length !== 2) return false;
      const domain = parts[1].toLowerCase();
      return !excludeDomains.some(excl => domain.includes(excl));
    });
    
    if (validEmails.length > 0) {
      data.email = validEmails[0].toLowerCase();
    }
  }
  
  // Phone number (various formats) with improved detection
  const phonePatterns = [
    /(?:phone|cell|mobile|tel)(?:\s*(?:number|#))?\s*(?:is|:)?\s*(\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4})/i,  // Phone: 555-123-4567
    /(?:(?:call|text|contact)\s+(?:me|us)?\s+(?:at|on)?)\s*(\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4})/i,  // Call me at 555-123-4567
    /\b(\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4})\b/g  // Any 10-digit phone number pattern
  ];
  
  for (const pattern of phonePatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      // Clean up phone format: either keep just digits or standardize format
      data.phone = match[1].replace(/\D/g, '');
      if (data.phone.length === 10) {
        // Format as XXX-XXX-XXXX for consistency
        data.phone = `${data.phone.slice(0,3)}-${data.phone.slice(3,6)}-${data.phone.slice(6)}`;
      }
      break;
    }
  }
  
  // Address extraction with improved patterns
  const addressPatterns = [
    // Address patterns with street number and name
    /(?:property|address|location|apartment|apt|unit)\s+(?:at|is|:|located at)?\s+([0-9]+\s+[a-zA-Z0-9\s.,]+(?:street|st|avenue|ave|road|rd|drive|dr|blvd|boulevard)\s*[a-zA-Z0-9\s.,#]*)/i,
    // Look for NY addresses with unit/apt numbers
    /([0-9]+\s+[a-zA-Z0-9\s.,]+(?:street|st|avenue|ave|road|rd|drive|dr|blvd|boulevard)\s*[a-zA-Z0-9\s.,#]*\s*,?\s*(?:new york|ny|brooklyn|queens|bronx|staten island))/i,
    // Any sequence that looks like a numbered street address
    /\b([0-9]+\s+[a-zA-Z0-9\s.,]+(?:street|st|avenue|ave|road|rd|drive|dr|blvd|boulevard|place|pl|court|ct|terrace|ter|lane|ln|way)\b)/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      data.address = match[1].trim();
      break;
    }
  }
  
  // Unit/Apartment number extraction
  // First, specific search for patterns like "Unit 5B" in the text
  const specificUnitPattern = /\b(?:unit|apt|apartment|suite|ste|#)\s*([a-zA-Z0-9-]{1,5})\b/i;
  const unitInAddressPattern = /\b(\d+[a-zA-Z](?:-\d+)?)(?:\s|$|,)/i; // Like "5B" or "22A" standalone
  
  // Look for unit number in subject line first - often most reliable
  const subjectUnitMatch = subject.match(specificUnitPattern);
  if (subjectUnitMatch && subjectUnitMatch[1]) {
    const unitCandidate = subjectUnitMatch[1].trim();
    // Filter common false positives
    const nonUnitKeywords = ['in', 'at', 'near', 'by', 'from', 'to', 'the', 'for', 'with'];
    if (!nonUnitKeywords.includes(unitCandidate.toLowerCase())) {
      data.unitNumber = unitCandidate;
    }
  } else {
    // Then look in the email content with multiple pattern approaches
    const unitPatterns = [
      // Unit/apt label followed by number/letter - most specific
      /(?:unit|apt|apartment)\s*(?:#|number|no)?\s*[:#]?\s*([a-zA-Z0-9-]{1,5})\b/i,
      // Reference to an address with unit/apt specified
      /(?:located at|at|on)\s+[^,]+,?\s+(?:unit|apt|apartment|suite|ste|#)\s+([a-zA-Z0-9-]{1,5})\b/i,
      // Unit/apt label with identifier
      /(?:unit|apt|apartment|suite|ste)\s+([a-zA-Z0-9-]{1,5})\b/i,
      // Hash symbol with unit identifier
      /#\s*([a-zA-Z0-9-]{1,5})\b/i,
      // Address with "Unit X" pattern
      /(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd)(?:[.,\s]+)(?:unit|apt|apartment|suite|ste|#)?\s+([a-zA-Z0-9-]{1,5})\b/i,
      // Common pattern: address with apartment designator after comma
      /\d+\s+[^,]+,[\s\n]*(?:unit|apt|apartment|suite|ste|#)?\s*([a-zA-Z0-9-]{1,5})\b/i
    ];
    
    // Try each pattern in order of specificity
    let unitFound = false;
    for (const pattern of unitPatterns) {
      const match = emailContent.match(pattern);
      if (match && match[1]) {
        const unitCandidate = match[1].trim();
        // Skip results that are clearly not unit numbers (common false positives)
        const nonUnitKeywords = ['in', 'at', 'near', 'by', 'from', 'to', 'the', 'for', 'with'];
        if (!nonUnitKeywords.includes(unitCandidate.toLowerCase())) {
          data.unitNumber = unitCandidate;
          unitFound = true;
          break;
        }
      }
    }
    
    // If still no unit found, look for standalone unit numbers like "5B" in context
    if (!unitFound) {
      // Try to find unit patterns near address references
      const addressContexts = [
        /(?:\d+\s+[a-zA-Z]+\s+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|place|pl|court|ct|terrace|ter|lane|ln))[^\n.]*?([0-9][a-zA-Z]|[a-zA-Z][0-9])[^\n.]*/i,
        /apartment\s+in\s+[^\n.]*?([0-9][a-zA-Z]|[a-zA-Z][0-9])/i
      ];
      
      for (const pattern of addressContexts) {
        const match = emailContent.match(pattern);
        if (match && match[1]) {
          data.unitNumber = match[1].trim();
          break;
        }
      }
    }
  }
  
  // If we found a unitNumber, make sure it passes final validation
  if (data.unitNumber) {
    // Unit numbers should generally be short (1-5 characters) and often contain both letters and numbers
    if (data.unitNumber.length > 5) {
      // Probably not a valid unit number
      data.unitNumber = null;
    } else if (['in', 'at', 'near', 'by', 'from', 'to', 'the', 'for', 'with'].includes(data.unitNumber.toLowerCase())) {
      // These are common false positives
      data.unitNumber = null;
    }
  }
  
  // Neighborhood extraction
  const neighborhoods = [
    'Williamsburg', 'East Village', 'West Village', 'Upper East Side', 'Upper West Side',
    'Lower East Side', 'Chelsea', 'Harlem', 'Midtown', 'SoHo', 'Tribeca', 'Financial District',
    'Chinatown', 'Brooklyn Heights', 'Dumbo', 'Park Slope', 'Bushwick', 'Astoria', 'Long Island City',
    'Greenpoint', 'Bedford-Stuyvesant', 'Crown Heights', 'Prospect Heights', 'Fort Greene'
  ];
  
  for (const neighborhood of neighborhoods) {
    if (emailContent.toLowerCase().includes(neighborhood.toLowerCase())) {
      data.neighborhood = neighborhood;
      break;
    }
  }
  
  // ZIP code extraction with improved context
  const zipPatterns = [
    /(?:zip|zip code|postal|postal code)\s*(?:is|:|code)?\s*(\d{5}(?:-\d{4})?)/i,  // Zip code: 10001
    /(?:new york|ny|brooklyn|queens|bronx|staten island)\s*,?\s*(?:ny)?\s*(\d{5}(?:-\d{4})?)/i,  // Brooklyn, NY 11211
    /\b(\d{5}(?:-\d{4})?)\b/  // Any 5-digit or 9-digit zip code
  ];
  
  for (const pattern of zipPatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      data.zipCode = match[1];
      break;
    }
  }
  
  // Bed count extraction
  const bedPatterns = [
    /\b([0-9])\s*(?:bed|bedroom|br)\b/i,                      // "2 bedroom"
    /\b([0-9])\s*(?:bed|bedroom|br)[s]?\b/i,                  // "2 bedrooms"
    /\b([0-9])\s*(?:-|\/)\s*([0-9])\s*bed/i,                // "1-2 bed"
    /\b(?:([0-9])\s*bed)/i,                                   // "2bed"
    /\blooking\s+for\s+(?:a|an)?\s*([0-9])\s*(?:bed|bedroom|br)/i // "looking for a 2 bedroom"
  ];
  
  for (const pattern of bedPatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      data.bedCount = parseInt(match[1]);
      break;
    }
  }
  
  // Price range extraction with better context detection
  const pricePatterns = [
    // Budget, price range mentions 
    /(?:budget|price|rent)\s*(?:range|is|of)?\s*(?:around|about|approximately)?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+k|[0-9]+(?:\.[0-9]+)?k)\s*(?:-|to|and)\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+k|[0-9]+(?:\.[0-9]+)?k)/i,
    // Single price point
    /(?:budget|price|rent)\s*(?:is|of)?\s*(?:around|about|approximately)?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+k|[0-9]+(?:\.[0-9]+)?k)/i,
    // Dollar sign followed by number
    /\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+k|[0-9]+(?:\.[0-9]+)?k)/i
  ];
  
  // Try to find a price range first (min-max)
  for (const pattern of pricePatterns) {
    const match = emailContent.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        // We found a range
        const minPrice = parsePrice(match[1]);
        const maxPrice = parsePrice(match[2]);
        
        if (minPrice && maxPrice) {
          data.price = minPrice;
          data.priceMax = maxPrice;
          break;
        }
      } else if (match[1]) {
        // Single price point
        const price = parsePrice(match[1]);
        if (price) {
          data.price = price;
          break;
        }
      }
    }
  }
  
  // Source-specific extraction patterns
  switch (source) {
    case 'Zumper':
      // Specialized Zumper email format handling
      if (emailContent.includes('Contact Details:')) {
        // This is a structured Zumper email with clear sections
        console.log('Processing structured Zumper email');
        
        // Extract contact name
        const nameMatch = emailContent.match(/Name:\s*([^\n]+)/);
        if (nameMatch && nameMatch[1]) {
          data.name = nameMatch[1].trim();
        }

        // Extract email (being careful to get tenant's email, not Zumper's)
        const emailMatch = emailContent.match(/Email:\s*([^\n]+)/);
        if (emailMatch && emailMatch[1] && !emailMatch[1].includes('@zumper.com')) {
          data.email = emailMatch[1].trim().toLowerCase();
        }
        
        // Extract phone
        const phoneMatch = emailContent.match(/Phone:\s*([^\n]+)/);
        if (phoneMatch && phoneMatch[1]) {
          // Clean up phone format: either keep just digits or standardize format
          const phoneRaw = phoneMatch[1].trim();
          const digitsOnly = phoneRaw.replace(/\D/g, '');
          if (digitsOnly.length === 10) {
            // Format as XXX-XXX-XXXX for consistency
            data.phone = `${digitsOnly.slice(0,3)}-${digitsOnly.slice(3,6)}-${digitsOnly.slice(6)}`;
          } else {
            data.phone = phoneRaw;
          }
        }
        
        // Extract budget/price
        const budgetMatch = emailContent.match(/Budget:\s*\$?([\d,.]+)/);
        if (budgetMatch && budgetMatch[1]) {
          data.price = budgetMatch[1].replace(/[^\d.]/g, ''); // Remove non-digits except decimal
        }
        
        // Extract property address from the subject line or content
        const addressSubjectMatch = subject.match(/inquiry for (.+?)(?:,|$|\n)/);
        if (addressSubjectMatch && addressSubjectMatch[1]) {
          data.address = addressSubjectMatch[1].trim();
          
          // Check for unit number in the address
          const unitMatch = data.address.match(/#([\w-]+)/);
          if (unitMatch && unitMatch[1]) {
            data.unitNumber = unitMatch[1];
          }
        } else {
          // Try to find address in content
          const propertyMatch = emailContent.match(/property at ([^\n.]+)/);
          if (propertyMatch && propertyMatch[1]) {
            data.address = propertyMatch[1].trim();
            
            // Check for unit number in the address
            const unitMatch = data.address.match(/#([\w-]+)/);
            if (unitMatch && unitMatch[1]) {
              data.unitNumber = unitMatch[1];
            }
          }
        }
        
        // Extract zip code
        const zipMatch = emailContent.match(/\b(\d{5})\b/);
        if (zipMatch && zipMatch[1]) {
          data.zipCode = zipMatch[1];
        }
        
        // Look for neighborhood mentions
        if (emailContent.toLowerCase().includes('williamsburg')) {
          data.neighborhood = 'Williamsburg';
        } else if (emailContent.toLowerCase().includes('east village')) {
          data.neighborhood = 'East Village';
        } else if (emailContent.toLowerCase().includes('bushwick')) {
          data.neighborhood = 'Bushwick';
        }
        
        // Extract bed count
        if (emailContent.toLowerCase().includes('1-bedroom') || 
            emailContent.toLowerCase().includes('1 bedroom')) {
          data.bedCount = 1;
        } else if (emailContent.toLowerCase().includes('2-bedroom') || 
                   emailContent.toLowerCase().includes('2 bedroom')) {
          data.bedCount = 2;
        } else if (emailContent.toLowerCase().includes('3-bedroom') || 
                   emailContent.toLowerCase().includes('3 bedroom')) {
          data.bedCount = 3;
        }
        
        // Set the source
        data.source = 'Zumper';
        
        console.log('Successfully parsed Zumper email with structured format');
      } else {
        // Fallback to regular extraction if not structured format
        console.log('Using regular extraction patterns for Zumper email');
        
        if (!data.bedCount && emailContent.includes('bedroom')) {
          const bedRegex = /(\d+)\s*bedroom/i;
          const bedMatch = emailContent.match(bedRegex);
          if (bedMatch && bedMatch[1]) {
            data.bedCount = parseInt(bedMatch[1]);
          }
        }
        
        // Zumper often includes property URLs
        const zumperUrlRegex = /(https:\/\/www\.zumper\.com\/[^\s"]+)/i;
        const zumperUrlMatch = emailContent.match(zumperUrlRegex);
        if (zumperUrlMatch && zumperUrlMatch[1]) {
          data.propertyUrl = zumperUrlMatch[1];
        }
        
        // Zumper image regex
        const zumperImgRegex = /(https:\/\/img\.zumpercdn\.com\/[^\s"]+)/i;
        const zumperImgMatch = emailContent.match(zumperImgRegex);
        if (zumperImgMatch && zumperImgMatch[1]) {
          data.thumbnailUrl = zumperImgMatch[1];
        }
      }
      break;
      
    case 'Zillow':
      // Zillow-specific extraction
      const zillowUrlRegex = /(https:\/\/www\.zillow\.com\/[^\s"]+)/i;
      const zillowUrlMatch = emailContent.match(zillowUrlRegex);
      if (zillowUrlMatch && zillowUrlMatch[1]) {
        data.propertyUrl = zillowUrlMatch[1];
      }
      
      // Zillow images
      const zillowImgRegex = /(https:\/\/photos\.zillowstatic\.com\/[^\s"]+)/i;
      const zillowImgMatch = emailContent.match(zillowImgRegex);
      if (zillowImgMatch && zillowImgMatch[1]) {
        data.thumbnailUrl = zillowImgMatch[1];
      }
      break;
      
    case 'MySpace NYC':
      // MySpace specific patterns
      const myspaceUrlRegex = /(https:\/\/myspacenyc\.com\/[^\s"]+|https:\/\/landlord\.cazamio\.com\/[^\s"]+)/i;
      const myspaceUrlMatch = emailContent.match(myspaceUrlRegex);
      if (myspaceUrlMatch && myspaceUrlMatch[1]) {
        data.propertyUrl = myspaceUrlMatch[1];
      }
      break;
      
    case 'Cazamio':
      // Cazamio-specific extraction
      const cazamioUrlRegex = /(https:\/\/landlord\.cazamio\.com\/[^\s"]+)/i;
      const cazamioUrlMatch = emailContent.match(cazamioUrlRegex);
      if (cazamioUrlMatch && cazamioUrlMatch[1]) {
        data.propertyUrl = cazamioUrlMatch[1];
      }
      break;
      
    case 'StreetEasy':
      // StreetEasy specific patterns
      const streetEasyUrlRegex = /(https:\/\/streeteasy\.com\/[^\s"]+)/i;
      const streetEasyUrlMatch = emailContent.match(streetEasyUrlRegex);
      if (streetEasyUrlMatch && streetEasyUrlMatch[1]) {
        data.propertyUrl = streetEasyUrlMatch[1];
      }
      break;
      
    // Add more source-specific extractors as needed
  }
  
  return data;
}

/**
 * Helper function to parse price strings with various formats
 * Handles $3,000, 3000, 3k, 3.5k, etc.
 */
function parsePrice(priceStr: string): string | null {
  try {
    // Remove $ and commas
    let cleanPrice = priceStr.replace(/[$,]/g, '');
    
    // Handle 'k' notation (e.g., '3.5k' -> '3500')
    if (cleanPrice.toLowerCase().endsWith('k')) {
      const numValue = parseFloat(cleanPrice.toLowerCase().replace('k', '')) * 1000;
      return String(numValue);
    }
    
    // Otherwise just return the numeric value
    return cleanPrice;
  } catch (error) {
    console.error('Error parsing price:', error);
    return null;
  }
}
