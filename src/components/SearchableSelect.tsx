import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from './ui/utils';

type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
};

export default function SearchableSelect({
  id,
  value,
  options,
  onValueChange,
  placeholder = 'Selecione',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum item encontrado.',
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return options;

    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch));
  }, [options, searchTerm]);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setSearchTerm('');
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        id={id}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "h-9 w-full cursor-pointer justify-between border-input bg-input-background px-3 py-2 text-sm font-normal text-foreground hover:bg-input-background dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:hover:bg-[#273447]",
          !selectedOption && 'text-muted-foreground dark:text-slate-400',
          className,
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="min-w-0 truncate">{selectedOption?.label || placeholder}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
        <div className="border-b p-2 dark:border-[#2f394a]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:cursor-default [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-white [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:cursor-default [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:border-[#1f2a37] dark:[&::-webkit-scrollbar-thumb]:bg-[#4b5b70]">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-slate-400">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-[#314155]',
                  value === option.value && 'bg-gray-100 dark:bg-[#314155]',
                )}
                onClick={() => handleSelect(option.value)}
              >
                <Check className={cn('size-4 shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')} />
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
        </div>
      )}
    </div>
  );
}
