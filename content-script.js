// Repassa mensagens do site para o background da extensão
window.addEventListener("message", function(event) {
  if (event.source !== window) return;
  if (event.data && event.data.type === "abrirAbaContainer") {
    // @ts-ignore
    browser.runtime.sendMessage(event.data);
  }
}); 