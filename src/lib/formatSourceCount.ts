export function formatSourceCount(count: number): string {
  const lastTwoDigits = Math.abs(count) % 100
  const lastDigit = lastTwoDigits % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} источников`
  }
  if (lastDigit === 1) {
    return `${count} источник`
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} источника`
  }
  return `${count} источников`
}
