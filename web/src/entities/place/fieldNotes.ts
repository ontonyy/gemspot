/* Presentation-layer labels for the raw fieldNotes key/value pairs coming
   from the API (access/lit/best). Mapping only — DTOs and dataset stay raw.
   Unknown keys/values pass through unchanged. */

const KEY_LABELS: Record<string, string> = {
  access: 'Access',
  lit: 'Lighting',
  best: 'Best time',
}

const VALUE_LABELS: Record<string, Record<string, string>> = {
  access: {
    Free: 'Free entry',
    Paid: 'Paid',
    Booking: 'Booking needed',
  },
  lit: {
    Yes: 'Lit at night',
    No: 'Not lit',
  },
  best: {
    Eve: 'Evenings',
    Day: 'Daytime',
    Dusk: 'Around dusk',
    Apr: 'April (season)',
  },
}

export function fieldNoteKeyLabel(key: string): string {
  return KEY_LABELS[key] ?? key
}

export function fieldNoteValueLabel(key: string, value: string): string {
  return VALUE_LABELS[key]?.[value] ?? value
}
