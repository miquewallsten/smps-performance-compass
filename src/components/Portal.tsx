import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

export default function Portal({ children }: PortalProps) {
  useEffect(() => {
    const body = document.body;
    const div = document.createElement('div');
    div.className = 'fixed inset-0 z-[9999]';
    body.appendChild(div);
    return () => {
      body.removeChild(div);
    };
  }, []);

  return createPortal(children, document.body);
}
