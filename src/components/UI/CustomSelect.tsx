import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: any;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  badge?: string;
  description?: string;
  group?: string;
  disabled?: boolean;
  raw?: any;
}

export type RawSelectOption = string | number | SelectOption | { [key: string]: any };

export interface CustomSelectProps {
  value?: any;
  onChange: (value: any, option?: any) => void;
  options?: RawSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  allowClear?: boolean;
  className?: string;
  popoverClassName?: string;
  searchable?: boolean | 'auto';
  searchPlaceholder?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  renderOption?: (option: SelectOption, isSelected: boolean, isActive: boolean) => React.ReactNode;
  renderTrigger?: (selectedOption: SelectOption | null, placeholder: string) => React.ReactNode;
  noResultsMessage?: string;
}

export const CustomSelect = forwardRef<HTMLButtonElement, CustomSelectProps>(({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  readonly = false,
  error = false,
  allowClear = false,
  className,
  popoverClassName,
  searchable = 'auto',
  searchPlaceholder = 'Search options...',
  autoFocus = false,
  onBlur,
  onFocus,
  onKeyDown,
  renderOption,
  renderTrigger,
  noResultsMessage = 'No matching options'
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUp, setOpenUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Expose button ref to parent (e.g. for .focus() or .blur())
  useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

  // Normalize options into SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return (options || []).map((opt) => {
      if (opt === null || opt === undefined) {
        return { value: '', label: '' };
      }
      if (typeof opt === 'string' || typeof opt === 'number') {
        return {
          value: opt,
          label: String(opt),
          raw: opt
        };
      }
      const val = opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : opt.label);
      const label = opt.label !== undefined ? String(opt.label) : (opt.name !== undefined ? String(opt.name) : String(val ?? ''));
      return {
        value: val,
        label,
        icon: opt.icon,
        color: opt.color,
        badge: opt.badge,
        description: opt.description,
        group: opt.group,
        disabled: opt.disabled,
        raw: opt.raw || opt
      };
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    const strVal = String(value);
    const found = normalizedOptions.find(opt => String(opt.value) === strVal);
    if (found) return found;

    // Fallback: match by label
    const foundByLabel = normalizedOptions.find(opt => opt.label === strVal);
    if (foundByLabel) return foundByLabel;

    // Fallback: display unlisted selected value cleanly
    return {
      value,
      label: typeof value === 'object' ? (value.name || value.label || JSON.stringify(value)) : String(value),
      raw: value
    };
  }, [normalizedOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter(opt => {
      const matchLabel = opt.label?.toLowerCase().includes(q);
      const matchDesc = opt.description?.toLowerCase().includes(q);
      const matchGroup = opt.group?.toLowerCase().includes(q);
      return matchLabel || matchDesc || matchGroup;
    });
  }, [normalizedOptions, search]);

  // Determine whether search input should be visible
  const showSearch = useMemo(() => {
    if (searchable === true) return true;
    if (searchable === false) return false;
    return normalizedOptions.length > 7;
  }, [searchable, normalizedOptions.length]);

  // Measure trigger position and orientation
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerRect(rect);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Flip up if space below is tight and above has more room
      setOpenUp(spaceBelow < 280 && spaceAbove > spaceBelow);
    }
  }, []);

  // Update position on open, scroll, or resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = (e: Event) => {
        if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
        updatePosition();
      };
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Auto-focus search input or reset activeIndex when opening
  useLayoutEffect(() => {
    if (isOpen) {
      setSearch('');
      // Find initial active index matching current selection
      const initialIdx = filteredOptions.findIndex(o => String(o.value) === String(value));
      setActiveIndex(initialIdx >= 0 ? initialIdx : (filteredOptions.length > 0 ? 0 : -1));

      if (showSearch) {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && optionsListRef.current) {
      const activeEl = optionsListRef.current.children[activeIndex] as HTMLElement;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  // Close when readonly/disabled changes
  useEffect(() => {
    if (readonly || disabled) {
      setIsOpen(false);
    }
  }, [readonly, disabled]);

  // Auto-focus trigger on mount if requested
  useEffect(() => {
    if (autoFocus && triggerRef.current && !readonly && !disabled) {
      triggerRef.current.focus();
    }
  }, [autoFocus, readonly, disabled]);

  // Handle clicking outside trigger & portal popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && containerRef.current.contains(target) ||
        popoverRef.current && popoverRef.current.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      triggerRef.current?.blur();
      onBlur?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value, option.raw || option);
    setIsOpen(false);
    triggerRef.current?.blur();
    onBlur?.();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setIsOpen(false);
    triggerRef.current?.blur();
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readonly || disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      onKeyDown?.(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (filteredOptions.length === 0) return;
        let nextIdx = activeIndex + 1;
        while (nextIdx < filteredOptions.length && filteredOptions[nextIdx]?.disabled) {
          nextIdx++;
        }
        if (nextIdx < filteredOptions.length) {
          setActiveIndex(nextIdx);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (filteredOptions.length === 0) return;
        let prevIdx = activeIndex - 1;
        while (prevIdx >= 0 && filteredOptions[prevIdx]?.disabled) {
          prevIdx--;
        }
        if (prevIdx >= 0) {
          setActiveIndex(prevIdx);
        }
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (activeIndex >= 0 && filteredOptions[activeIndex] && !filteredOptions[activeIndex].disabled) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.blur();
        onBlur?.();
        break;
      }
      case 'Tab': {
        setIsOpen(false);
        onBlur?.();
        break;
      }
    }

    onKeyDown?.(e);
  };

  const hasValue = selectedOption && selectedOption.value !== '' && selectedOption.value !== undefined && selectedOption.value !== null;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (readonly || disabled) return;
          if (!isOpen) onFocus?.();
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "group w-full flex items-center justify-between text-left transition-all duration-200 select-none outline-none",
          "border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700",
          readonly ? "cursor-default opacity-75" : disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className,
          isOpen && "border-indigo-500 bg-white dark:bg-zinc-950 ring-4 ring-indigo-500/10 shadow-lg shadow-indigo-500/5 text-zinc-900 dark:text-white",
          error && "border-rose-500 bg-rose-500/5 ring-4 ring-rose-500/5"
        )}
      >
        <div className="flex-1 flex items-center gap-2.5 overflow-hidden min-w-0 pr-2">
          {renderTrigger ? (
            renderTrigger(selectedOption, placeholder)
          ) : hasValue ? (
            <div className="flex items-center gap-2 min-w-0">
              {selectedOption.icon && (
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                  {selectedOption.icon}
                </span>
              )}
              {selectedOption.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedOption.color }}
                />
              )}
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 truncate font-normal">
              {placeholder}
            </span>
          )}
        </div>

        {/* Right Actions: Clear + Chevron */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {allowClear && hasValue && !readonly && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
              title="Clear selection"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={cn(
              "text-zinc-400 transition-transform duration-200",
              isOpen && "rotate-180 text-indigo-500"
            )}
          />
        </div>
      </button>

      {/* Floating Popover Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && triggerRect && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                ...(openUp
                  ? { bottom: Math.max(12, window.innerHeight - triggerRect.top + 6) }
                  : { top: Math.min(triggerRect.bottom + 6, window.innerHeight - 280) }
                ),
                left: Math.min(Math.max(12, triggerRect.left), Math.max(12, window.innerWidth - Math.max(triggerRect.width, 240) - 12)),
                width: Math.max(triggerRect.width, 240),
                maxWidth: 'calc(100vw - 24px)',
                zIndex: 99999
              }}
              className={cn(
                "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 flex flex-col max-h-72 overflow-hidden",
                popoverClassName
              )}
              onKeyDown={handleKeyDown}
            >
              {/* Optional Search Filter Bar */}
              {showSearch && (
                <div className="relative p-1 mb-1 border-b border-zinc-100 dark:border-zinc-800/80">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setActiveIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-7 py-1.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* Options List */}
              <div
                ref={optionsListRef}
                role="listbox"
                className="overflow-y-auto p-0.5 space-y-0.5 custom-scrollbar flex-1"
              >
                {filteredOptions.length === 0 ? (
                  <div className="py-6 px-4 text-center">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                      {noResultsMessage}
                    </p>
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = selectedOption !== null && String(selectedOption.value) === String(opt.value);
                    const isActive = activeIndex === idx;

                    return (
                      <button
                        key={`${opt.value}-${idx}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={opt.disabled}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur before click registers
                        }}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group",
                          opt.disabled && "opacity-40 cursor-not-allowed",
                          isSelected
                            ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/20"
                            : isActive
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                        )}
                      >
                        {renderOption ? (
                          renderOption(opt, isSelected, isActive)
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                              {opt.icon && (
                                <span className={cn(
                                  "shrink-0",
                                  isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                                )}>
                                  {opt.icon}
                                </span>
                              )}
                              {opt.color && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: opt.color }}
                                />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="truncate">
                                  {opt.label}
                                </span>
                                {opt.description && (
                                  <span className={cn(
                                    "text-[10px] truncate",
                                    isSelected ? "text-indigo-100" : "text-zinc-400 dark:text-zinc-500"
                                  )}>
                                    {opt.description}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {opt.badge && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                                )}>
                                  {opt.badge}
                                </span>
                              )}
                              {isSelected && (
                                <Check size={14} className="text-white shrink-0 stroke-[2.5]" />
                              )}
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});

CustomSelect.displayName = 'CustomSelect';
