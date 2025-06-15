export async function sleep(msec: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, msec));
}

export function paddingZero(num: number | string, padding: number): string {
  return ('0'.repeat(padding) + num).slice(-padding);
}

export function dec2HexString(n: number): string {
  return paddingZero(n.toString(16).toUpperCase(), 2);
}

export function getHeaderLength(header: number[]): number {
  return (header[4] << 24) | (header[3] << 16) | (header[2] << 8) | header[1];
}

export function isValidIdm(idm: string): boolean {
  // IDmは16桁のHEX文字列（スペース区切り）かどうかをチェック
  const idmPattern = /^[0-9A-F]{2}( [0-9A-F]{2}){7}$/;
  return idmPattern.test(idm);
}

export function arrayToHexString(arr: number[]): string {
  return arr.map(v => dec2HexString(v)).join(' ');
}