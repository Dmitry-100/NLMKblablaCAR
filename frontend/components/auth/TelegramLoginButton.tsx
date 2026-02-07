import React, { useEffect, useRef } from 'react';

// Telegram auth data type
export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: TelegramAuthData) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write';
  showUserPhoto?: boolean;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: TelegramAuthData) => void;
    };
  }
}

export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 12,
  requestAccess = 'write',
  showUserPhoto = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create callback function
    const callbackName = 'TelegramLoginWidgetCallback';
    (window as unknown as Record<string, (user: TelegramAuthData) => void>)[callbackName] = onAuth;

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', requestAccess);
    if (showUserPhoto) {
      script.setAttribute('data-userpic', 'true');
    }

    // Append script to container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    // Cleanup
    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [botName, buttonSize, cornerRadius, onAuth, requestAccess, showUserPhoto]);

  return <div ref={containerRef} className="flex justify-center" />;
};
