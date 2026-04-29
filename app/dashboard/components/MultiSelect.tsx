'use client';
import { useState } from 'react';
import { cn } from '@/utils';

type Props = {
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
};

export default function MultiSelect({ options, selected, onChange, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const displaySelected = options.filter((o) => selected.includes(o.id));
  const filteredOptions = options
    .filter((o) => !selected.includes(o.id))
    .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
    setIsOpen(false);
    setSearch('');
  };

  const remove = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOpen(false);
  };

  return (
    <div className="relative" onBlur={handleBlur}>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-300 shadow-sm hover:shadow-md">
        {displaySelected.map((item) => (
          <div
            key={item.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-sm"
          >
            {item.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                remove(item.id);
              }}
              className="ml-2 text-blue-600 hover:text-blue-800 font-bold text-sm transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        <input
          type="text"
          placeholder={selected.length === 0 ? placeholder : `${selected.length} selected`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
        />
      </div>
      {isOpen && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.id}
                  className="px-4 py-3 flex items-center cursor-pointer hover:bg-blue-50 transition-colors duration-200 text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggle(option.id);
                  }}
                >
                  <div className="flex items-center mr-3">
                    <div
                      className={`w-4 h-4 rounded border-2 transition-colors ${
                        selected.includes(option.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <span className="text-gray-700">{option.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-gray-500 text-sm text-center">No matching options</p>
          )}
        </div>
      )}
    </div>
  );
}