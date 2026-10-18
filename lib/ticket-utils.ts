// Ticket formatting utility functions

/**
 * Format ticket number to ensure consistency across the system
 * @param ticketNumber The ticket number from the database (could be null or undefined)
 * @param purchaseId The purchase ID as a fallback
 * @returns Formatted ticket number
 */
export function formatTicketNumber(ticketNumber: string | null | undefined, purchaseId?: string | number): string {
  if (!ticketNumber && !purchaseId) return 'N/A'
  
  // If ticket number already has TKT prefix and is properly formatted, return as is
  if (ticketNumber && ticketNumber.toUpperCase().startsWith('TKT')) {
    return ticketNumber.toUpperCase()
  }
  
  // Extract numeric part from either ticketNumber or purchaseId
  let numericPart = ''
  if (ticketNumber) {
    numericPart = ticketNumber.replace(/[^0-9]/g, '')
  } else if (purchaseId) {
    numericPart = purchaseId.toString().replace(/[^0-9]/g, '')
  }
  
  // Take first 10 digits and pad with zeros if less than 10
  numericPart = numericPart.slice(0, 10).padStart(10, '0')
  
  return `TKT${numericPart}`
}

/**
 * Get the searchable ticket number for filtering
 * @param ticketNumber The ticket number from the database
 * @param purchaseId The purchase ID as a fallback
 * @returns Searchable ticket number (lowercase, numeric only)
 */
export function getSearchableTicketNumber(ticketNumber: string | null | undefined, purchaseId?: string | number): string {
  if (!ticketNumber && !purchaseId) return ''
  
  let numericPart = ''
  if (ticketNumber) {
    numericPart = ticketNumber.replace(/[^0-9]/g, '')
  } else if (purchaseId) {
    numericPart = purchaseId.toString().replace(/[^0-9]/g, '')
  }
  
  return numericPart.slice(0, 10).padStart(10, '0')
}

/**
 * Get event abbreviation from event title
 */
function getEventAbbreviation(eventTitle: string): string {
  // Try to get meaningful abbreviation from event title
  const words = eventTitle.toUpperCase().split(/\s+/);
  
  // DEBUG: Log the event title processing
  console.log(`🔧 getEventAbbreviation: "${eventTitle}" → words:`, words);
  
  // Look for acronyms or important words first
  if (eventTitle.toUpperCase().includes('BULS')) {
    console.log(`🔧 Found BULS in title → BUL`);
    return 'BUL'; // Use BUL for BULS events
  }
  
  // Also check for BUL (might be used as abbreviation)
  if (eventTitle.toUpperCase().includes('BUL')) {
    console.log(`🔧 Found BUL in title → BUL`);
    return 'BUL';
  }
  
  // Check for other common patterns
  if (eventTitle.toUpperCase().includes('NETWORKING')) {
    console.log(`🔧 Found NETWORKING in title → NET`);
    return 'NET';
  }
  
  if (eventTitle.toUpperCase().includes('CHRISTMAS')) {
    console.log(`🔧 Found CHRISTMAS in title → CHR`);
    return 'CHR';
  }
  
  if (eventTitle.toUpperCase().includes('GENERAL')) {
    console.log(`🔧 Found GENERAL in title → GEN`);
    return 'GEN';
  }
  
  if (eventTitle.toUpperCase().includes('MEETING')) {
    console.log(`🔧 Found MEETING in title → MEE`);
    return 'MEE';
  }
  
  // For multi-word titles, try to create meaningful abbreviation
  if (words.length > 1) {
    // e.g., "Annual General Meeting" → "AGM"
    // e.g., "Networking Event" → "NET"
    const firstLetters = words.map(word => word.charAt(0)).join('');
    console.log(`🔧 First letters: "${firstLetters}"`);
    
    if (firstLetters.length >= 3) {
      const abbr = firstLetters.substring(0, 3);
      console.log(`🔧 Using first 3 letters: "${abbr}"`);
      return abbr;
    } else {
      // Fallback to first 3 letters of first meaningful word
      const firstWord = words.find(word => word.length > 2) || words[0];
      const abbr = firstWord.substring(0, 3);
      console.log(`🔧 Using first 3 letters of first word "${firstWord}": "${abbr}"`);
      return abbr;
    }
  } else {
    // Single word title, use first 3 letters
    const abbr = words[0].substring(0, 3);
    console.log(`🔧 Single word, using first 3 letters: "${abbr}"`);
    return abbr;
  }
}

/**
 * Generate a new ticket number with format: TKT-EVT-MMYY-RAND
 * Where:
 * - TKT: Ticket prefix
 * - EVT: Event abbreviation (smart: takes first word or acronym from title)
 * - MMYY: Month (2 digits) + Year (2 digits)
 * - RAND: Random 3-digit number
 * 
 * Examples:
 * - Annual BULS Networking Event → TKT-BUL-1126-123 (uses "BULS" from title)
 * - Christmas Party → TKT-CHR-1226-456
 * - Board Election → TKT-BOA-1126-789
 * 
 * @param eventTitle The event title
 * @param eventDate The event date (string or Date object)
 * @param seed Optional seed for deterministic random number (e.g., purchase ID)
 * @returns Formatted ticket number
 */
export function generateTicketNumber(eventTitle: string, eventDate: string | Date, seed?: string | number): string {
  console.log(`🔧 generateTicketNumber called: title="${eventTitle}", date="${eventDate}", seed="${seed}"`);
  
  // 1. Get event abbreviation
  let eventAbbr = getEventAbbreviation(eventTitle);
  
  console.log(`🔧 Event abbreviation: "${eventAbbr}"`);
  
  // Ensure we have exactly 3 uppercase letters
  eventAbbr = eventAbbr.replace(/[^A-Z]/g, '').substring(0, 3).padEnd(3, 'X');
  
  // 2. Get month and year (MMYY format)
  const date = new Date(eventDate);
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
  const monthYear = `${month}${year}`;
  
  // 3. Generate deterministic random number based on seed (purchase ID or timestamp)
  // This ensures same ticket always gets same random number when using same seed
  // For regeneration, use timestamp to get new random number
  let randomNum: number;
  
  if (seed) {
    // Use seed to generate deterministic random number
    const seedStr = seed.toString();
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    randomNum = 100 + Math.abs(hash) % 900; // 100-999
    
    console.log(`🔧 Random number from seed "${seedStr}": ${randomNum}`);
  } else {
    // Fallback to random (for display without seed)
    randomNum = Math.floor(Math.random() * 900) + 100; // 100 to 999
    console.log(`🔧 Random number (no seed): ${randomNum}`);
  }
  
  // 4. Combine all parts
  return `TKT-${eventAbbr}-${monthYear}-${randomNum}`;
}

/**
 * Format existing ticket number or generate new one if needed
 * This is the main function to use for display
 * 
 * @param ticketNumber Existing ticket number from database (could be null)
 * @param eventTitle Event title (for generating new number if needed)
 * @param eventDate Event date (for generating new number if needed)
 * @param purchaseId Purchase ID as fallback
 * @returns Formatted ticket number
 */
export function formatOrGenerateTicketNumber(
  ticketNumber: string | null | undefined, 
  eventTitle?: string, 
  eventDate?: string | Date,
  purchaseId?: string | number
): string {
  // Check if ticket number is in old format (TKT-THEO-2026-001)
  // Old format: TKT-[NAME]-[YYYY]-[NNN] (where YYYY is full year like 2026)
  // New format: TKT-[EVT]-[MMYY]-[NNN] (where MMYY is month+2-digit year like 1026)
  if (ticketNumber && ticketNumber.trim()) {
    const ticketUpper = ticketNumber.toUpperCase();
    
    // Check if it's in old format: TKT-[NAME]-[YYYY]-[NNN]
    // Where YYYY is 4-digit year (e.g., 2026, 2025)
    const oldFormatRegex = /^TKT-[A-Z]+-(19|20)\d{2}-\d{3}$/;
    
    // Check if it's in new format: TKT-[EVT]-[MMYY]-[NNN]
    // Where MM is 01-12 and YY is 2-digit year
    const newFormatRegex = /^TKT-[A-Z]{3}-(0[1-9]|1[0-2])\d{2}-\d{3}$/;
    
    // If it's in old format AND we have event info, convert to new format
    if (oldFormatRegex.test(ticketUpper) && eventTitle && eventDate) {
      // This ticket is in old format, generate new format
      return generateTicketNumber(eventTitle, eventDate, purchaseId);
    }
    
    // If it's already in new format, check if abbreviation is correct
    if (newFormatRegex.test(ticketUpper) && eventTitle) {
      // Extract abbreviation from ticket
      const ticketAbbr = ticketUpper.split('-')[1];
      
      // Generate correct abbreviation for this event
      const correctAbbr = getEventAbbreviation(eventTitle);
      
      // If abbreviation is wrong, regenerate ticket number
      if (ticketAbbr !== correctAbbr) {
        if (eventDate) {
          return generateTicketNumber(eventTitle, eventDate, purchaseId);
        }
      }
      
      // Otherwise keep it as-is
      return ticketUpper;
    }
    
    // Otherwise use the ticket number as-is (could be numeric format or other)
    return formatTicketNumber(ticketNumber, purchaseId);
  }
  
  // If we have event info, generate a new ticket number
  if (eventTitle && eventDate) {
    return generateTicketNumber(eventTitle, eventDate, purchaseId);
  }
  
  // Fallback to old format
  return formatTicketNumber(ticketNumber, purchaseId);
}