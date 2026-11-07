// Progressive enhancement for /resume: the page is complete without JS; this only adds a "Copy email" button.
import { emailAddress } from '../content/profile';

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(emailAddress());
      btn.textContent = 'Copied!';
    } catch {
      // Clipboard blocked: fall back to opening the mail app (the address is only built now, on click).
      window.location.href = 'mai' + 'lto:' + emailAddress();
    }
  });
});
