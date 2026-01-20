// This service worker script sets the side panel behavior to open on action click.
// This is the recommended way to handle side panel toggling.
// FIX: Declare the `chrome` object to resolve TypeScript "Cannot find name 'chrome'" errors.
// This informs the compiler that `chrome` is a global variable provided by the browser
// extension environment, allowing its properties like `sidePanel` to be accessed without type errors.
declare const chrome: any;

if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
}
