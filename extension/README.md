# Haggle browser search companion

A Manifest V3 extension that opens Haggle searches from selected text, a page title, or a popup query. It does not embed syndicated deal content or implement automated checkout.

## Install the preview

1. Keep this directory in a stable location.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable Developer mode, select **Load unpacked**, and choose this directory.
4. Open the popup's Site settings and verify the Haggle site address.
5. On a normal HTTP(S) webpage, use the context menu or popup to search.

The extension is not listed in a browser store. Unpacked installations do not update automatically; reload the extension after updating its files.

## Data and permissions

- `activeTab`: access the title of the current tab only when invoked by the user.
- `contextMenus`: add explicit selected-text and page-title search actions.
- `storage`: save the Haggle site origin locally in the browser.
- No content scripts, host permissions, external scripts, or remote network fetches.
- Search text is sent in a new browser tab's `/ask?q=...` URL. It can remain in browser history and server request logs. The originating page's URL is not transmitted by this extension.
- Extension code and imagery do not contain DealNews syndicated content.

Set `DEFAULT_SITE_URL` in `config.js` to the verified production origin before packaging. Users can override it in the popup; HTTPS and HTTP localhost are supported. Only an origin is stored, with paths and credentials excluded.

Chrome references: [context menus](https://developer.chrome.com/docs/extensions/reference/api/contextMenus), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [storage](https://developer.chrome.com/docs/extensions/reference/api/storage).
