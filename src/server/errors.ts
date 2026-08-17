/** Expected, user-safe business error. Standalone (no framework imports) so it
 * can be used by services without pulling in HTTP/auth dependencies. */
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "DOMAIN",
  ) {
    super(message);
    this.name = "DomainError";
  }
}
