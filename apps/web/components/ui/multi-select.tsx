"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Option {
  label: string;
  value: string;
  customerId?: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "Chọn tài khoản..."
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    (option.customerId && option.customerId.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleOption = (value: string) => {
    const isSelected = selectedValues.includes(value);
    if (isSelected) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const removeValue = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== value));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-[40px] w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-sm ring-offset-background cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-secondary/40 transition-colors duration-150 ease-in-out",
          isOpen && "border-border-md ring-1 ring-ring"
        )}
      >
        <div className="flex flex-wrap gap-1 max-w-[90%]">
          {selectedValues.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedValues.map(val => {
              const opt = options.find(o => o.value === val);
              return (
                <Badge
                  key={val}
                  variant="secondary"
                  className="flex items-center gap-1 bg-ads-teal-bg text-ads-teal-text hover:bg-ads-teal-bg/80 border-0 rounded px-1.5 py-0.5 text-xs transition-all"
                >
                  <span className="truncate max-w-[120px]">{opt ? opt.label : val}</span>
                  <X
                    className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                    onClick={(e) => removeValue(e, val)}
                  />
                </Badge>
              );
            })
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-55 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-full rounded-lg border border-border bg-card shadow-lg p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center border-b border-border px-2.5 py-1.5 gap-2">
            <Search className="h-4 w-4 shrink-0 opacity-40" />
            <input
              type="text"
              placeholder="Tìm tài khoản..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent text-sm text-text-1 border-0 focus:outline-none focus:ring-0 placeholder:text-text-3 py-0.5"
            />
            {search && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
              />
            )}
          </div>
          <div className="max-h-48 overflow-y-auto mt-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Không tìm thấy tài khoản nào.
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(option.value);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded px-2.5 py-1.5 text-sm cursor-pointer transition-colors duration-100",
                      isSelected
                        ? "bg-secondary text-text-1 font-medium"
                        : "hover:bg-secondary/50 text-text-2"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-text-1 bg-text-1 text-bg-card"
                          : "border-border"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">
                      {option.label}
                      {option.customerId && (
                        <span className="ml-1 text-xs opacity-50 font-normal">({option.customerId})</span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
