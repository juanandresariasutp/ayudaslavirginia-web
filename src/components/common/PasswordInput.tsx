import { useState } from 'react'

interface PasswordInputProps {
  name?: string
  autoComplete?: string
  placeholder?: string
  required?: boolean
  minLength?: number
}

export function PasswordInput({
  name = 'password',
  autoComplete,
  placeholder,
  required = false,
  minLength
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <input
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        onClick={() => setVisible(current => !current)}
      >
        {visible ? '◉' : '◉̸'}
      </button>
    </div>
  )
}
