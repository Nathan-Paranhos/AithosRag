import { useState } from 'react';

// Hook para gerenciar estado no localStorage
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // Estado para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Obter do localStorage por chave
      const item = window.localStorage.getItem(key);
      // Analisar JSON armazenado ou se nenhum retornar initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Se erro também retornar initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Retornar uma versão envolvida da função setter do useState que ...
  // ... persiste o novo valor no localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permitir que value seja uma função para que tenhamos a mesma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Salvar estado
      setStoredValue(valueToStore);
      // Salvar no localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // Uma implementação mais avançada lidaria com o caso de erro
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
};