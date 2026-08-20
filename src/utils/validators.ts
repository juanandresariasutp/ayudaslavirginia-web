import type React from 'react'

export function normalizePersonName(value: string): string {
  return value
    .toLocaleLowerCase('es-CO')
    .replace(/(^|[\s'-])\p{L}/gu, letter => letter.toLocaleUpperCase('es-CO'))
}

export function formatName(event: React.FormEvent<HTMLInputElement>): void {
  event.currentTarget.value = normalizePersonName(
    event.currentTarget.value.replace(/[^\p{L}\p{M}\s'-]/gu, '')
  )
}

export function digitsOnly(event: React.FormEvent<HTMLInputElement>): void {
  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '')
}

export function requestSubmissionError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (
    message.includes('10 MB') ||
    message.includes('procesar la fotografía') ||
    message.includes('optimizar la fotografía') ||
    message.includes('debe ser una imagen')
  ) {
    return message
  }
  if (message.includes('help_requests_description_check')) {
    return 'La descripción debe tener entre 10 y 2000 caracteres.'
  }
  if (message.includes('help_requests_new_consent_proof_required')) {
    return 'Debes aceptar el tratamiento de datos y confirmar que eres una persona.'
  }
  if (message.includes('help_requests_public_contact_consent_required')) {
    return 'Debes autorizar la publicación del teléfono y la dirección exacta.'
  }
  if (message.includes('help_requests_request_photo_required')) {
    return 'Debes adjuntar una fotografía de la solicitud.'
  }
  if (message.includes('help_requests_full_name_check')) {
    return 'El nombre completo debe tener entre 3 y 120 caracteres.'
  }
  return 'No fue posible enviar la solicitud. Revisa los campos e inténtalo nuevamente.'
}
