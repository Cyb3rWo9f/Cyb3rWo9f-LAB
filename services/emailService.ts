/**
 * Secure Email Service for Contact Form
 * Uses Web3Forms - a secure, free service that doesn't expose API keys
 * Messages are sent directly to your email without backend requirements
 */

import { logger } from './logger';

export interface ContactFormData {
  name: string;
  subject: string;
  message: string;
}

export interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send contact form message securely via Web3Forms
 * The access key is PUBLIC and meant to be visible - it's not a security risk
 * All submissions are rate-limited and spam-protected by Web3Forms
 */
export const sendContactMessage = async (
  name: string,
  subject: string,
  message: string
): Promise<EmailResponse> => {
  try {
    // Get the public access key from environment
    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
    
    if (!accessKey) {
      return {
        success: false,
        error: 'Email service not configured. Please contact via GitHub or Twitter.'
      };
    }

    // Prepare form data
    const formData = {
      access_key: accessKey,
      name: name.trim(),
      subject: `[Portfolio Contact] ${subject.trim()}`,
      message: message.trim(),
      from_name: 'Cyb3rWo9f Portfolio',
      // Web3Forms automatically adds timestamp and IP for spam protection
    };

    // Send to Web3Forms API
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: 'Message sent successfully! I\'ll get back to you soon.'
      };
    } else {
      return {
        success: false,
        error: data.message || 'Failed to send message. Please try again.'
      };
    }
  } catch (error: any) {
    logger.error('Error sending contact message:', error);
    
    // Handle network errors gracefully
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred. Please try contacting via GitHub or Twitter.'
    };
  }
};
