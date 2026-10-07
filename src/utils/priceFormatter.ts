/**
 * Price Formatting and Sanitization Utilities
 * 
 * Handles price display formatting and prevents unwanted "만원" suffix
 * when prices are consultation/inquiry text (e.g. '상담문의', '가격협의', '전화문의').
 */

/**
 * Cleans the raw price string by removing any accidental "만원" or "만 원" 
 * if the text represents a consultation/inquiry.
 */
export const cleanPrice = (price: any): string => {
    if (!price && price !== 0) return '';
    let str = String(price).trim();
    if (!str) return '';

    // If the price text is consultation/negotiation/inquiry, strip any "만원", "만 원", "만"
    if (/상담|문의|협의/.test(str)) {
        str = str.replace(/\s*만\s*원?/g, '').trim();
    }
    return str;
};

/**
 * Formats price for display on detailed view pages and fact sheets.
 * - Consultation prices (상담문의, 협의 등): Never appends "만원".
 * - Numeric/standard prices: Formats with appropriate units.
 */
export const formatDisplayPrice = (price: any, transactionType: any): string => {
    const rawPrice = cleanPrice(price);
    const safeType = String(transactionType || '').trim();

    if (!rawPrice) {
        return safeType || '상담문의';
    }

    // Check if it's a consultation/inquiry
    const isConsultation = /상담|문의|협의/.test(rawPrice);

    if (isConsultation) {
        // Guarantee no "만원" is present
        const text = rawPrice.replace(/\s*만\s*원?/g, '').trim() || '상담문의';
        if (safeType && text.startsWith(safeType)) {
            return text;
        }
        return safeType ? `${safeType} ${text}` : text;
    }

    // Numeric and standard type formatting
    if (safeType === '매매') {
        const hasUnit = rawPrice.includes('만') || rawPrice.includes('억') || rawPrice.includes('원');
        return `매매 ${rawPrice}${hasUnit ? '' : '만원'}`;
    }
    if (safeType === '전세') {
        const hasUnit = rawPrice.includes('만') || rawPrice.includes('억') || rawPrice.includes('원');
        return `전세 ${rawPrice}${hasUnit ? '' : '만원'}`;
    }
    if (safeType === '월세' && rawPrice.includes('/')) {
        const parts = rawPrice.split('/');
        return `보 ${parts[0]}만 / 월 ${parts[1]}만`;
    }
    if (safeType.includes('타입')) {
        const hasUnit = rawPrice.includes('만') || rawPrice.includes('억') || rawPrice.includes('원');
        return `${safeType} ${rawPrice}${hasUnit ? '' : '만원'}`;
    }

    return safeType ? `${safeType} ${rawPrice}` : rawPrice;
};

/**
 * Formats price for compact display cards (e.g. MainTab grid, Recommended cards).
 */
export const formatCardPrice = (price: any, transactionType?: any): string => {
    const rawPrice = cleanPrice(price);
    const safeType = String(transactionType || '').trim();

    if (!rawPrice) {
        return safeType || '상담문의';
    }

    if (/상담|문의|협의/.test(rawPrice)) {
        const text = rawPrice.replace(/\s*만\s*원?/g, '').trim() || '상담문의';
        if (safeType && !text.startsWith(safeType)) {
            return `${safeType} ${text}`;
        }
        return text;
    }

    if (safeType && !rawPrice.startsWith(safeType)) {
        return `${safeType} ${rawPrice}`;
    }

    return rawPrice;
};
