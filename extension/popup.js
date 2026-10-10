import { getSiteUrl, normalizeSiteUrl, openSearch } from "./config.js";

const query = document.querySelector("#query");
const siteInput = document.querySelector("#site-url");
const status = document.querySelector("#status");
const searchButton = document.querySelector("#search-button");

async function usePageTitle() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.title || !/^https?:\/\//.test(tab.url || "")) {
    status.textContent =
      "Open a shopping webpage, or type your own query above.";
    return;
  }
  query.value = tab.title.slice(0, 500);
  status.textContent = "Page title added. Edit it before searching if needed.";
  query.focus();
}

getSiteUrl()
  .then((url) => {
    siteInput.value = url;
  })
  .catch(() => {
    status.textContent =
      "Could not read your settings. Enter your Haggle address below.";
  });

document.querySelector("#page-title").addEventListener("click", () => {
  usePageTitle().catch(() => {
    status.textContent = "Cannot read this page. Type your search above.";
  });
});

document
  .querySelector("#search-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    searchButton.disabled = true;
    try {
      await openSearch(query.value);
      window.close();
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "Could not open search. Check the site address.";
    } finally {
      searchButton.disabled = false;
    }
  });

document
  .querySelector("#settings-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const siteUrl = normalizeSiteUrl(siteInput.value.trim());
      await chrome.storage.local.set({ siteUrl });
      siteInput.value = siteUrl;
      status.textContent = "Site address saved on this browser.";
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "Could not save the site address.";
    }
  });
