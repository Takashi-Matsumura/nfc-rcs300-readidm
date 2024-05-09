// utils.js
export async function sleep(msec) {
  return new Promise((resolve) => setTimeout(resolve, msec));
}

export async function send(device, data) {
  let uint8a = new Uint8Array(data);
  console.log(">>>>>>>>>>");
  console.log(uint8a);
  await device.transferOut(deviceEp.out, uint8a);
  await sleep(100);
}

export function padding_zero(num, p) {
  return ("0".repeat(p * 1) + num).slice(-(p * 1));
}
export function dec2HexString(n) {
  return padding_zero((n * 1).toString(16).toUpperCase(), 2);
}
export function get_header_length(header) {
  return (header[4] << 24) | (header[3] << 16) | (header[2] << 8) | header[1];
}
