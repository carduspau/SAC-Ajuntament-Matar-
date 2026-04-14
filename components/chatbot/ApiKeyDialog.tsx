'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Key, Eye, EyeOff } from 'lucide-react';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ApiKeyDialog({ open, onClose }: ApiKeyDialogProps) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setKey(localStorage.getItem('sac_openai_key') ?? '');
    }
  }, [open]);

  function save() {
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem('sac_openai_key', key);
      } else {
        localStorage.removeItem('sac_openai_key');
      }
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  return (
    <Modal open={open} onClose={onClose} title="Configuració OpenAI" size="sm">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Key className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            La clau s'emmagatzema al teu navegador (localStorage) i no s'envia al servidor excepte per a les peticions a OpenAI.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground-1">Clau API d'OpenAI (sk-...)</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            />
            <button
              onClick={() => setShow(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground-2 hover:text-foreground"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} className="flex-1">
            {saved ? '✓ Desat!' : 'Desar'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel·lar</Button>
        </div>
      </div>
    </Modal>
  );
}
