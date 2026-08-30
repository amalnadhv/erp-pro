export function numberToWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (!isFinite(num) || num < 0) return ''
  const n = Math.round(num * 100)
  const rupees = Math.floor(n / 100)
  const paise = n % 100
  const intToWords = (x: number): string => {
    if (x === 0) return ''
    if (x < 20) return a[x]
    if (x < 100) return (b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '')).trim()
    if (x < 1000) return (intToWords(Math.floor(x / 100)) + ' Hundred' + (x % 100 ? ' ' + intToWords(x % 100) : '')).trim()
    if (x < 100000) return (intToWords(Math.floor(x / 1000)) + ' Thousand' + (x % 1000 ? ' ' + intToWords(x % 1000) : '')).trim()
    if (x < 10000000) return (intToWords(Math.floor(x / 100000)) + ' Lakh' + (x % 100000 ? ' ' + intToWords(x % 100000) : '')).trim()
    return (intToWords(Math.floor(x / 10000000)) + ' Crore' + (x % 10000000 ? ' ' + intToWords(x % 10000000) : '')).trim()
  }
  let words = intToWords(rupees) + ' Dirhams'
  if (paise > 0) words += ' and ' + intToWords(paise) + ' Fils'
  return words + ' Only'
}
