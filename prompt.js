(function () {
    const message = decodeURIComponent(document.location.hash.substring(1));
    const result = prompt(message);
    browser.runtime.sendMessage({ type: "promptResponse", value: result });
})();