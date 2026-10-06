/** Escape LIKE/ILIKE wildcards so an email is matched literally ("a_b@x.com"
 *  must not match "aXb@x.com"). Case-insensitivity is kept by using it with
 *  ilike. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
