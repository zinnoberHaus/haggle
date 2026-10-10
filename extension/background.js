import { getSiteUrl, openSearch } from "./config.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus
    .removeAll()
    .then(() => {
      chrome.contextMenus.create({
        id: "haggle-selection",
        title: "Search Haggle for “%s”",
        contexts: ["selection"],
        documentUrlPatterns: ["http://*/*", "https://*/*"],
      });
      chrome.contextMenus.create({
        id: "haggle-page",
        title: "Search this page title on Haggle",
        contexts: ["page"],
        documentUrlPatterns: ["http://*/*", "https://*/*"],
      });
    })
    .catch(() => {
      /* Reinstalling or reloading the extension retries registration. */
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const query =
    info.menuItemId === "haggle-selection" ? info.selectionText : tab?.title;
  if (!["haggle-selection", "haggle-page"].includes(String(info.menuItemId)))
    return;
  if (query?.trim()) {
    openSearch(query).catch(async () => {
      await chrome.tabs.create({ url: `${await getSiteUrl()}/ask` });
    });
  } else {
    getSiteUrl().then((siteUrl) =>
      chrome.tabs.create({ url: `${siteUrl}/ask` }),
    );
  }
});
