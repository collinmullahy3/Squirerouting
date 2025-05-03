import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function SendGridSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Redirect to email-settings and show toast
  useEffect(() => {
    toast({
      title: "Email Settings Updated",
      description: "We've simplified our email system. Please use the Email Settings page instead.",
      variant: "default",
    });
    setLocation('/email-settings');
  }, [setLocation, toast]);
  
  // Return null as we're redirecting
  return null;
}
