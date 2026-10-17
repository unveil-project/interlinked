## Inspiration

KillerPDF v1.2.0 ([Reddit, 412 upvotes](https://www.reddit.com/r/opensource/comments/1suyqgz/killerpdf_v120_free_opensource_pdf_editor_for/)) shipped this and it landed well:

> **Password-protected PDFs:** Instead of throwing a generic error, it now prompts for the password and opens normally. The decrypted copy is held in temp for the session.

## What to build

When the user opens an encrypted PDF:
1. Detect the encryption on load (lopdf returns an error variant we already plumb through)
2. Show a modal: **"This PDF is password-protected"** + password input + Unlock / Cancel
3. On unlock, decrypt in memory, hold the decrypted copy for the session only, never write the password anywhere
4. On Save/Save As: ask whether to re-apply password protection or save unencrypted (default: re-apply)
5. Wrong password → red shake on the field, retry up to 3 times before reverting to error

## Acceptance

- [ ] Encrypted PDF opens via password prompt, not via a generic error toast
- [ ] Decrypted bytes never written to disk except via explicit Save
- [ ] Re-encryption on save preserves the original password unless user opts out
- [ ] Unit test: open `tests/fixtures/encrypted-aes256.pdf` with the right password, assert page count
- [ ] Unit test: wrong password returns `Err(PdfError::WrongPassword)`, no panic

## Why now

This is table-stakes for an Adobe Acrobat competitor. Top-rated comment on the KillerPDF post: *"Adobe has become such a mess now that it's a subscription service, so anything to stick it to them."* — we're already that, this fills a real workflow gap.

Roadmap: v2.0.3 or v2.1.1.
