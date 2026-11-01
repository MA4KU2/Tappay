/** Payload transport for the QR: the shared wire JSON, base64url-safed inside a URL. */
export function payUrl(payload: string): string {
  return `${location.origin}/pay?req=${b64urlEncode(payload)}`;
}

export function b64urlEncode(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64urlDecode(s: string): string {
  const b64 = s.replaceAll("-", "+").replaceAll("_", "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(b64 + pad), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Solid deep-link that opens a URL inside the MetaMask in-app browser. */
export function metamaskLink(payHref: string): string {
  const u = new URL(payHref);
  const port = u.port && u.port !== "443" ? `:${u.port}` : "";
  return `https://metamask.app.link/dapp/${u.hostname}${port}${u.pathname}${u.search}`;
}

/** Receipt link after settlement. */
export const basescanTx = (tx: string): string => `https://sepolia.basescan.org/tx/${tx}`;
