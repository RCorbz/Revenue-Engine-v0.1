/**
 * 📘 BMADv6 AI Prompt Registry
 * Specialized for Identify Document Extraction & Normalization
 */

export const IDENTITY_SYSTEM_PROMPT = (side: string, rawSeed: any) => `
    SYSTEM ROLE: Lead Architect & AI Vision Engine (BMADv6).
    TASK: Read and extract EVERY single data point visible on this identity document (${side.toUpperCase()}).
    
    DIRECTIONS:
    1. Transcribe ALL fields: Names, ID Number, Address (Full), Dates (DOB, Issue, Expiration), Sex, Height, Eyes, Class, Restrictions, and Endorsements.
    2. Extract any "Document Discriminator" or DD numbers.
    3. Output ONLY valid JSON.
    
    OCR SEED: ${JSON.stringify(rawSeed)}
    
    REQUIRED JSON SCHEMA:
    {
      "firstName": "string",
      "lastName": "string",
      "idNumber": "string",
      "dob": "YYYY-MM-DD",
      "address": "full address string",
      "issueDate": "YYYY-MM-DD",
      "expirationDate": "YYYY-MM-DD",
      "physical": {
        "sex": "string",
        "height": "string",
        "eyes": "string"
      },
      "licenseDetails": {
        "class": "string",
        "restrictions": "string",
        "endorsements": "string"
      },
      "documentDiscriminator": "string",
      "extracted_all": {} 
    }
`;
