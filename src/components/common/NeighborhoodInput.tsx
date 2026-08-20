import { useState, useRef, useEffect } from 'react'
import { LA_VIRGINIA_NEIGHBORHOODS } from '../../config/constants'

interface NeighborhoodInputProps {
  name?: string
  defaultValue?: string
  required?: boolean
  onChange?: (value: string) => void
}

export function NeighborhoodInput({
  name = 'neighborhood',
  defaultValue = '',
  required = true,
  onChange
}: NeighborhoodInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const query = normalize(value.trim())

  const suggestions = query
    ? LA_VIRGINIA_NEIGHBORHOODS.filter(n => normalize(n).includes(query))
    : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(neighborhood: string) {
    setValue(neighborhood)
    setShowSuggestions(false)
    if (onChange) onChange(neighborhood)
  }

  return (
    <div className="neighborhood-autocomplete-field" ref={containerRef}>
      <input
        name={name}
        type="text"
        value={value}
        onChange={e => {
          setValue(e.target.value)
          setShowSuggestions(true)
          if (onChange) onChange(e.target.value)
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Ej. San Carlos, Restrepo..."
        autoComplete="off"
        required={required}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="neighborhood-tooltip-popover" role="listbox">
          <div className="tooltip-arrow" />
          <div className="tooltip-suggestions-container">
            {suggestions.map(neighborhood => (
              <button
                key={neighborhood}
                type="button"
                className="tooltip-suggestion-item"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(neighborhood)}
              >
                {neighborhood}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
