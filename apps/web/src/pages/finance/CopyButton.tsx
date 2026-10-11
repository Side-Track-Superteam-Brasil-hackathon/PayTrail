import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../../components/Button';

export function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <Button
      variant={done ? 'success' : 'secondary'}
      size="sm"
      onClick={() => void copy()}
      className={className}
      icon={done ? <Check size={16} /> : <Copy size={16} />}
    >
      {done ? 'Copied' : label}
    </Button>
  );
}
