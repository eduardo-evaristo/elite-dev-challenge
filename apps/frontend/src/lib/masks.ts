function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1.').replace(/\.+$/, '');
}

export function maskExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export function maskCurrency(value: string): string {
  let digits = onlyDigits(value);
  if (!digits) return '';
  digits = digits.replace(/^0+/, '') || '0';
  while (digits.length < 3) {
    digits = `0${digits}`;
  }
  const intPart = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = digits.slice(-2);
  return `R$ ${intPart},${decPart}`;
}
