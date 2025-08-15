import { useState, useEffect } from 'react';

// Permite escopar por NFE usando um prefixo opcional nas chaves do localStorage
export const useImpostoEntrada = (initialValue: number = 0, keyPrefix?: string) => {
  const storageKey = `${keyPrefix ? `${keyPrefix}:` : ''}impostoEntrada`;

  const [impostoEntrada, setImpostoEntrada] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    // fallback para a chave antiga (compatibilidade)
    if (saved === null) {
      const legacy = localStorage.getItem('impostoEntrada');
      return legacy ? Number(legacy) : initialValue;
    }
    return Number(saved);
  });

  useEffect(() => {
    localStorage.setItem(storageKey, impostoEntrada.toString());
  }, [impostoEntrada, storageKey]);

  const handleImpostoEntradaChange = (value: number) => {
    setImpostoEntrada(value);
  };

  return {
    impostoEntrada,
    setImpostoEntrada: handleImpostoEntradaChange,
  };
};