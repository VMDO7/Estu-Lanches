import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from './Input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', label = 'Buscar', className }: SearchInputProps) {
  return (
    <div className={cn('w-full', className)}>
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        leftIcon={<Search />}
        maxLength={80}
        className="[&::-webkit-search-cancel-button]:hidden"
        rightSlot={
          value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex size-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
