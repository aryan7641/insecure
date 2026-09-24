const generateWhatsAppUrl = (phoneNumber, message) => {
  // Ensure the phone number is 10 digits and prepend '91'
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  } else if (cleanNumber.length > 10 && cleanNumber.startsWith('91')) {
    // Already has 91 prefix
  } else {
    // Return original or handle invalid as needed, but returning as is for now
  }
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
};

const resolveTemplate = (templateBody, variables) => {
  let resolved = templateBody;
  for (const [key, value] of Object.entries(variables || {})) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    resolved = resolved.replace(regex, value);
  }
  return resolved;
};

module.exports = {
  generateWhatsAppUrl,
  resolveTemplate
};
