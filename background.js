(async function () {
    // Configurações globais
    let esocialSettings = {
        consultarGuias: false,
        gerarGps: false,
        selectedYear: 'current'
    };

    // Função para mostrar um prompt
    async function getPromptInput(message) {
        const promptUrl = browser.runtime.getURL("prompt.html") + "#" + encodeURIComponent(message);
        let promptTab;
        try {
            promptTab = await browser.tabs.create({ url: promptUrl });
        } catch (error) {
            console.error("Erro ao criar aba de prompt:", error);
            throw error;
        }

        return new Promise((resolve, reject) => {
            const listener = (request, sender) => {
                if (sender.tab && sender.tab.id === promptTab.id && request.type === "promptResponse") {
                    browser.runtime.onMessage.removeListener(listener);
                    browser.tabs.remove(promptTab.id).catch(err => console.error("Erro ao fechar promptTab:", err));
                    resolve(request.value);
                }
            };
            browser.runtime.onMessage.addListener(listener);
            setTimeout(() => {
                browser.runtime.onMessage.removeListener(listener);
                browser.tabs.get(promptTab.id).then(() => {
                    browser.tabs.remove(promptTab.id).catch(err => console.error("Erro ao fechar promptTab:", err));
                }).catch(() => console.log("PromptTab já foi fechado"));
                reject(new Error("Timeout ao esperar resposta do prompt"));
            }, 30000); // 30 segundos
        });
    }

    // Função para preencher campo
    async function setReactInputValue(tabId, selector, value) {
        try {
            await browser.scripting.executeScript({
                target: { tabId: tabId },
                func: (sel, val) => {
                    const input = document.querySelector(sel);
                    if (!input) throw new Error(`Elemento ${sel} não encontrado`);
                    let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeInputValueSetter.call(input, val);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                },
                args: [selector, value]
            });
            console.log(`Preencheu ${selector} com "${value}" na aba ${tabId}`);
        } catch (error) {
            console.error(`Erro ao preencher ${selector}:`, error);
            throw error;
        }
    }

    // Função para clicar em elemento
    async function clickElement(tabId, selector) {
        try {
            await browser.scripting.executeScript({
                target: { tabId: tabId },
                func: sel => {
                    const element = document.querySelector(sel);
                    if (!element) throw new Error(`Elemento ${sel} não encontrado`);
                    element.click();
                },
                args: [selector]
            });
            console.log(`Clicou em ${selector} na aba ${tabId}`);
        } catch (error) {
            console.error(`Erro ao clicar em ${selector}:`, error);
            throw error;
        }
    }

    // Função para esperar elemento
    async function waitForElement(tabId, selector) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 40; // 20 segundos
            const interval = setInterval(() => {
                browser.scripting.executeScript({
                    target: { tabId: tabId },
                    func: sel => {
                        const element = document.querySelector(sel);
                        return !!element && element.offsetParent !== null;
                    },
                    args: [selector]
                }).then(result => {
                    if (result[0].result) {
                        console.log(`Elemento ${selector} encontrado na aba ${tabId}`);
                        clearInterval(interval);
                        resolve(true);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error(`Elemento ${selector} não encontrado após ${maxAttempts} tentativas`));
                    } else {
                        console.log(`Tentativa ${attempts + 1}/${maxAttempts} para ${selector} na aba ${tabId}`);
                    }
                    attempts++;
                }).catch(err => {
                    clearInterval(interval);
                    
    // Listener para mensagens do popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Mensagem recebida:", message);
        
        // Iniciar login PesqBrasil
        if (message.action === "startPesqBrasilLogin") {
            getPromptInput("Digite os CPFs e senhas no formato CPF:SENHA, um por linha")
                .then(result => {
                    if (result) {
                        console.log("Prompt respondido com sucesso");
                        // Aqui você pode processar o resultado do prompt
                        sendResponse({ success: true });
                    } else {
                        console.log("Prompt cancelado ou vazio");
                        sendResponse({ success: false, error: "Prompt cancelado ou vazio" });
                    }
                })
                .catch(error => {
                    console.error("Erro no prompt:", error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Indica que a resposta será enviada assincronamente
        }

        // Iniciar login eSocial
        if (message.action === "startESocialLogin") {
            processarLoginsESocial().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Erro ao processar logins eSocial:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Indica que a resposta será enviada assincronamente
        }
        
        // Atualizar configurações do eSocial
        if (message.action === "updateESocialSettings") {
            if (message.settings) {
                // Atualiza apenas as propriedades fornecidas
                esocialSettings = { ...esocialSettings, ...message.settings };
                console.log("Configurações do eSocial atualizadas:", esocialSettings);
                
                // Se as opções são mutuamente exclusivas, garantir que apenas uma esteja ativa
                if (esocialSettings.consultarGuias && esocialSettings.gerarGps) {
                    // Prioriza a opção que acabou de ser ativada
                    if (message.settings.consultarGuias) {
                        esocialSettings.gerarGps = false;
                    } else if (message.settings.gerarGps) {
                        esocialSettings.consultarGuias = false;
                    }
                }
            }
            sendResponse({ success: true, settings: esocialSettings });
            return false;
        }
    });
                    
                    console.error(`Erro ao verificar ${selector}:`, err);
                    reject(err);
                });
            }, 500);
        });
    }

    // Função para armazenar credenciais
    async function armazenarCredenciais(tabId, cpf, senha) {
        const chave = `credenciais_${tabId}`;
        try {
            await browser.storage.local.set({
                [chave]: { cpf, senha, loginConcluido: false }
            });
            console.log(`Credenciais armazenadas para aba ${tabId}: CPF="${cpf}", Senha="${senha}"`);
        } catch (error) {
            console.error(`Erro ao armazenar credenciais para aba ${tabId}:`, error);
        }
    }

    // Função para recuperar credenciais
    async function recuperarCredenciais(tabId) {
        const chave = `credenciais_${tabId}`;
        try {
            const resultado = await browser.storage.local.get(chave);
            return resultado[chave] || null;
        } catch (error) {
            console.error(`Erro ao recuperar credenciais para aba ${tabId}:`, error);
            return null;
        }
    }

    // Função para marcar login como concluído
    async function marcarLoginConcluido(tabId) {
        const chave = `credenciais_${tabId}`;
        try {
            const credenciais = await recuperarCredenciais(tabId);
            if (credenciais) {
                credenciais.loginConcluido = true;
                await browser.storage.local.set({ [chave]: credenciais });
                console.log(`Login marcado como concluído para aba ${tabId}`);
            }
        } catch (error) {
            console.error(`Erro ao marcar login como concluído para aba ${tabId}:`, error);
        }
    }

    // Função para limpar credenciais
    async function limparCredenciais(tabId) {
        const chave = `credenciais_${tabId}`;
        try {
            await browser.storage.local.remove(chave);
            console.log(`Credenciais removidas para aba ${tabId}`);
        } catch (error) {
            console.error(`Erro ao remover credenciais para aba ${tabId}:`, error);
        }
    }

    // Função para processar uma aba eSocial
    async function processarAbaESocial({ tabId, containerId }, index) {
        console.log(`Iniciando processamento eSocial para aba ${tabId} (linha ${index + 1})`);

        // Recuperar credenciais armazenadas
        const credenciais = await recuperarCredenciais(tabId);
        if (!credenciais) {
            console.error(`Nenhuma credencial encontrada para aba ${tabId}`);
            return;
        }
        const { cpf, senha, loginConcluido } = credenciais;
        console.log(`Credenciais recuperadas para aba ${tabId}: CPF="${cpf}", Senha="${senha}", LoginConcluido=${loginConcluido}`);

        // Listener para remover o contêiner e credenciais quando a aba for fechada
        const removeContainer = async (closedTabId) => {
            if (closedTabId === tabId) {
                try {
                    await browser.contextualIdentities.remove(containerId);
                    console.log(`Contêiner ${containerId} removido após fechar aba ${tabId}`);
                } catch (err) {
                    console.error(`Erro ao remover contêiner ${containerId}:`, err);
                }
                await limparCredenciais(tabId);
                browser.tabs.onRemoved.removeListener(removeContainer);
            }
        };
        browser.tabs.onRemoved.addListener(removeContainer);

        return new Promise((resolve) => {
            const listener = async (updatedTabId, changeInfo) => {
                if (updatedTabId !== tabId || changeInfo.status !== "complete") return;

                let tabUrl;
                try {
                    const updatedTab = await browser.tabs.get(tabId);
                    tabUrl = updatedTab.url;
                } catch (error) {
                    console.error(`Erro ao obter URL da aba ${tabId}:`, error);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                    return;
                }

                // Parar se o login já foi concluído
                const credenciaisAtualizadas = await recuperarCredenciais(tabId);
                if (credenciaisAtualizadas && credenciaisAtualizadas.loginConcluido) {
                    console.log(`Login já concluído para aba ${tabId}, encerrando processamento`);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                    return;
                }

                try {
                    if (tabUrl.startsWith("https://login.esocial.gov.br/")) {
                        // eSocial: clicar no botão 'Entrar com gov.br' antes de preencher login
                        await waitForElement(tabId, '.br-button.sign-in');
                        await clickElement(tabId, '.br-button.sign-in');
                    } else if (tabUrl.startsWith("https://sso.acesso.gov.br/login")) {
                        const hasAccountId = await browser.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => !!document.querySelector('#accountId')
                        });
                        const hasPassword = await browser.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => !!document.querySelector('#password')
                        });

                        if (hasAccountId[0].result) {
                            await waitForElement(tabId, '#accountId');
                            await setReactInputValue(tabId, '#accountId', cpf);
                            await waitForElement(tabId, '#enter-account-id');
                            await clickElement(tabId, '#enter-account-id');
                        } else if (hasPassword[0].result) {
                            await waitForElement(tabId, '#password');
                            await setReactInputValue(tabId, '#password', senha);
                            await waitForElement(tabId, '#submit-button');
                            await clickElement(tabId, '#submit-button');
                            await marcarLoginConcluido(tabId); // Marcar como concluído
                            console.log(`Login concluído para linha ${index + 1} na aba ${tabId}`);
                            browser.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    } else if (tabUrl.startsWith("https://www.esocial.gov.br/portal/FolhaPagamento/Listagem/Competencias")) {
                        browser.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                } catch (error) {
                    console.error(`Erro na aba ${tabId} (linha ${index + 1}):`, error);
                    browser.tabs.onUpdated.removeListener(listener);
                    setTimeout(async () => {
                        try {
                            await browser.tabs.update(tabId, { url: tabUrl });
                            console.log(`Recarregando aba ${tabId} para retry`);
                        } catch (retryError) {
                            console.error(`Erro ao recarregar aba ${tabId}:`, retryError);
                            resolve();
                        }
                    }, 5000);
                }
            };
            browser.tabs.onUpdated.addListener(listener);
        });
    }

    // Função para processar uma aba PesqBrasil
    async function processarAba({ tabId, containerId }, index) {
        console.log(`Iniciando processamento para aba ${tabId} (linha ${index + 1})`);

        // Recuperar credenciais armazenadas
        const credenciais = await recuperarCredenciais(tabId);
        if (!credenciais) {
            console.error(`Nenhuma credencial encontrada para aba ${tabId}`);
            return;
        }
        const { cpf, senha, loginConcluido } = credenciais;
        console.log(`Credenciais recuperadas para aba ${tabId}: CPF="${cpf}", Senha="${senha}", LoginConcluido=${loginConcluido}`);

        // Listener para remover o contêiner e credenciais quando a aba for fechada
        const removeContainer = async (closedTabId) => {
            if (closedTabId === tabId) {
                try {
                    await browser.contextualIdentities.remove(containerId);
                    console.log(`Contêiner ${containerId} removido após fechar aba ${tabId}`);
                } catch (err) {
                    console.error(`Erro ao remover contêiner ${containerId}:`, err);
                }
                await limparCredenciais(tabId);
                browser.tabs.onRemoved.removeListener(removeContainer);
            }
        };
        browser.tabs.onRemoved.addListener(removeContainer);

        return new Promise((resolve) => {
            const listener = async (updatedTabId, changeInfo) => {
                if (updatedTabId !== tabId || changeInfo.status !== "complete") return;

                let tabUrl;
                try {
                    const updatedTab = await browser.tabs.get(tabId);
                    tabUrl = updatedTab.url;
                } catch (error) {
                    console.error(`Erro ao obter URL da aba ${tabId}:`, error);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                    return;
                }

                // Parar se o login já foi concluído
                const credenciaisAtualizadas = await recuperarCredenciais(tabId);
                if (credenciaisAtualizadas && credenciaisAtualizadas.loginConcluido) {
                    console.log(`Login já concluído para aba ${tabId}, encerrando processamento`);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                    return;
                }

                try {
                    if (tabUrl.startsWith("https://pesqbrasil-pescadorprofissional.agro.gov.br/")) {
                        await waitForElement(tabId, '#button_____3');
                        await clickElement(tabId, '#button_____3');
                    } else if (tabUrl.startsWith("https://sso.acesso.gov.br/login")) {
                        const hasAccountId = await browser.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => !!document.querySelector('#accountId')
                        });
                        const hasPassword = await browser.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => !!document.querySelector('#password')
                        });

                        if (hasAccountId[0].result) {
                            await waitForElement(tabId, '#accountId');
                            await setReactInputValue(tabId, '#accountId', cpf);
                            await waitForElement(tabId, '#enter-account-id');
                            await clickElement(tabId, '#enter-account-id');
                        } else if (hasPassword[0].result) {
                            await waitForElement(tabId, '#password');
                            await setReactInputValue(tabId, '#password', senha);
                            await waitForElement(tabId, '#submit-button');
                            await clickElement(tabId, '#submit-button');
                            await marcarLoginConcluido(tabId); // Marcar como concluído
                            console.log(`Login concluído para linha ${index + 1} na aba ${tabId}`);
                            browser.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    } else if (tabUrl.hostname.includes('meu.inss.gov.br')) {
                        // INSS: salvar CPF e senha para o popup do gov.br
                        await browser.storage.local.set({ govbr_login: { cpf, senha } });
                        // INSS: clicar no botão 'Entrar com gov.br' usando seletor absoluto
                        const inssBtnSelector = 'div#root > div > div:nth-of-type(3) > div > main:nth-of-type(2) > div > div > div > form > button';
                        await waitForElement(tabId, inssBtnSelector);
                        await clickElement(tabId, inssBtnSelector);
                        // O restante do login será feito no popup pelo listener global
                    } else if (tabUrl.hostname.includes('servicos.acesso.gov.br')) {
                        // Esperar pelo campo de CPF/login
                        await waitForElement(tabId, '#accountId');
                        await setReactInputValue(tabId, '#accountId', cpf);
                        await waitForElement(tabId, '#enter-account-id');
                        await clickElement(tabId, '#enter-account-id');
                        // Esperar pelo campo de senha
                        await waitForElement(tabId, '#password');
                        await setReactInputValue(tabId, '#password', senha);
                        await waitForElement(tabId, '#submit-button');
                        await clickElement(tabId, '#submit-button');
                    }
                } catch (error) {
                    console.error(`Erro na aba ${tabId} (linha ${index + 1}):`, error);
                    browser.tabs.onUpdated.removeListener(listener);
                    setTimeout(async () => {
                        try {
                            await browser.tabs.update(tabId, { url: tabUrl });
                            console.log(`Recarregando aba ${tabId} para retry`);
                        } catch (retryError) {
                            console.error(`Erro ao recarregar aba ${tabId}:`, retryError);
                            resolve();
                        }
                    }, 5000);
                }
            };
            browser.tabs.onUpdated.addListener(listener);
        });
    }

    // Função principal para processar logins eSocial
    async function processarLoginsESocial() {
        let dados;
        try {
            dados = await getPromptInput("Cole os CPFs e Senhas (separados por tabulação ou espaço, quebras de linha como tab)");
        } catch (error) {
            console.error("Falha no prompt:", error);
            return;
        }
        if (dados === null) {
            console.error("❌ Operação cancelada. Nenhum dado foi fornecido.");
            return;
        }
        dados = dados.trim();
        if (!dados) {
            console.error("❌ Nenhum dado válido inserido!");
            return;
        }

        // Logar o input bruto
        console.log(`Input bruto: "${dados}"`);

        // Split em linhas
        let linhas = dados.split(/\r?\n/).map(linha => linha.trim()).filter(linha => linha);
        console.log(`Total de linhas detectadas: ${linhas.length}`);

        // Processar cada linha, dividindo por tabs ou espaços
        let credenciais = [];
        linhas.forEach((linha, i) => {
            const partes = linha.split(/[\t ]+/).map(item => item.trim());
            console.log(`Linha ${i + 1}: Partes detectadas = ${partes.length}, Conteúdo = [${partes.join(", ")}]`);
            for (let j = 0; j < partes.length; j += 2) {
                const cpf = partes[j];
                const senha = partes[j + 1];
                if (cpf && senha) {
                    credenciais.push({ cpf, senha });
                } else {
                    console.warn(`⚠️ Ignorando conjunto inválido na linha ${i + 1}, índice ${j}: CPF="${cpf}", Senha="${senha}"`);
                }
            }
        });

        console.log(`Credenciais válidas detectadas: ${credenciais.length}`);
        credenciais.forEach((cred, i) => {
            console.log(`Credencial ${i + 1}: CPF="${cred.cpf}", Senha="${cred.senha}"`);
        });

        // Abrir todas as abas simultaneamente
        const abas = await Promise.all(credenciais.map(async (cred, index) => {
            try {
                const container = await browser.contextualIdentities.create({
                    name: `Sessão-eSocial-${index + 1}-${cred.cpf.slice(-4)}`,
                    color: "blue",
                    icon: "fingerprint"
                });
                const tab = await browser.tabs.create({
                    url: "https://login.esocial.gov.br/",
                    cookieStoreId: container.cookieStoreId
                });
                console.log(`Aba ${tab.id} aberta com container ${container.cookieStoreId} para linha ${index + 1}`);
                await armazenarCredenciais(tab.id, cred.cpf, cred.senha);
                return { tabId: tab.id, containerId: container.cookieStoreId };
            } catch (error) {
                console.error(`Erro ao criar contêiner ou aba para linha ${index + 1}:`, error);
                return null;
            }
        }));

        // Filtrar abas válidas e processar todas ao mesmo tempo
        const abasValidas = abas.filter(aba => aba !== null);
        await Promise.all(abasValidas.map((aba, index) => processarAbaESocial(aba, index)));

        console.log("✅ Todas as abas eSocial foram abertas e preenchidas.");
    }

    // Função para processar dados do eSocial (recebe dados do prompt)
    async function processarDadosESocial(dados) {
        if (!dados || dados.trim() === '') {
            console.error("❌ Nenhum dado válido fornecido para eSocial!");
            return;
        }

        dados = dados.trim();
        console.log(`eSocial - Input bruto: "${dados}"`);

        // Split em linhas
        let linhas = dados.split(/\r?\n/).map(linha => linha.trim()).filter(linha => linha);
        console.log(`eSocial - Total de linhas detectadas: ${linhas.length}`);

        // Processar cada linha, dividindo por tabs ou espaços
        let credenciais = [];
        linhas.forEach((linha, i) => {
            const partes = linha.split(/[\t ]+/).map(item => item.trim());
            console.log(`eSocial - Linha ${i + 1}: Partes detectadas = ${partes.length}, Conteúdo = [${partes.join(", ")}]`);
            for (let j = 0; j < partes.length; j += 2) {
                const cpf = partes[j];
                const senha = partes[j + 1];
                if (cpf && senha) {
                    credenciais.push({ cpf, senha });
                } else {
                    console.warn(`⚠️ eSocial - Ignorando conjunto inválido na linha ${i + 1}, índice ${j}: CPF="${cpf}", Senha="${senha}"`);
                }
            }
        });

        console.log(`eSocial - Credenciais válidas detectadas: ${credenciais.length}`);
        credenciais.forEach((cred, i) => {
            console.log(`eSocial - Credencial ${i + 1}: CPF="${cred.cpf}", Senha="${cred.senha}"`);
        });

        // Abrir todas as abas simultaneamente
        const abas = await Promise.all(credenciais.map(async (cred, index) => {
            try {
                const container = await browser.contextualIdentities.create({
                    name: `Sessão-eSocial-${index + 1}-${cred.cpf.slice(-4)}`,
                    color: "blue",
                    icon: "fingerprint"
                });
                const tab = await browser.tabs.create({
                    url: "https://login.esocial.gov.br/",
                    cookieStoreId: container.cookieStoreId
                });
                console.log(`eSocial - Aba ${tab.id} aberta com container ${container.cookieStoreId} para linha ${index + 1}`);
                await armazenarCredenciais(tab.id, cred.cpf, cred.senha);
                return { tabId: tab.id, containerId: container.cookieStoreId };
            } catch (error) {
                console.error(`eSocial - Erro ao criar contêiner ou aba para linha ${index + 1}:`, error);
                return null;
            }
        }));

        // Filtrar abas válidas e processar todas ao mesmo tempo
        const abasValidas = abas.filter(aba => aba !== null);
        await Promise.all(abasValidas.map((aba, index) => processarAbaESocial(aba, index)));

        console.log("✅ eSocial - Todas as abas foram abertas e preenchidas.");
    }

    // Função principal para processar logins PesqBrasil
    async function processarLogins() {
        let dados;
        try {
            dados = await getPromptInput("Cole os CPFs e Senhas (separados por tabulação ou espaço, quebras de linha como tab)");
        } catch (error) {
            console.error("Falha no prompt:", error);
            return;
        }
        if (dados === null) {
            console.error("❌ Operação cancelada. Nenhum dado foi fornecido.");
            return;
        }
        dados = dados.trim();
        if (!dados) {
            console.error("❌ Nenhum dado válido inserido!");
            return;
        }

        // Logar o input bruto
        console.log(`Input bruto: "${dados}"`);

        // Split em linhas
        let linhas = dados.split(/\r?\n/).map(linha => linha.trim()).filter(linha => linha);
        console.log(`Total de linhas detectadas: ${linhas.length}`);

        // Processar cada linha, dividindo por tabs ou espaços
        let credenciais = [];
        linhas.forEach((linha, i) => {
            const partes = linha.split(/[\t ]+/).map(item => item.trim());
            console.log(`Linha ${i + 1}: Partes detectadas = ${partes.length}, Conteúdo = [${partes.join(", ")}]`);
            for (let j = 0; j < partes.length; j += 2) {
                const cpf = partes[j];
                const senha = partes[j + 1];
                if (cpf && senha) {
                    credenciais.push({ cpf, senha });
                } else {
                    console.warn(`⚠️ Ignorando conjunto inválido na linha ${i + 1}, índice ${j}: CPF="${cpf}", Senha="${senha}"`);
                }
            }
        });

        console.log(`Credenciais válidas detectadas: ${credenciais.length}`);
        credenciais.forEach((cred, i) => {
            console.log(`Credencial ${i + 1}: CPF="${cred.cpf}", Senha="${cred.senha}"`);
        });

        // Abrir todas as abas simultaneamente
        const abas = await Promise.all(credenciais.map(async (cred, index) => {
            try {
                const container = await browser.contextualIdentities.create({
                    name: `Sessão-${index + 1}-${cred.cpf.slice(-4)}`,
                    color: "blue",
                    icon: "fingerprint"
                });
                const tab = await browser.tabs.create({
                    url: "https://pesqbrasil-pescadorprofissional.agro.gov.br/",
                    cookieStoreId: container.cookieStoreId
                });
                console.log(`Aba ${tab.id} aberta com container ${container.cookieStoreId} para linha ${index + 1}`);
                await armazenarCredenciais(tab.id, cred.cpf, cred.senha);
                return { tabId: tab.id, containerId: container.cookieStoreId };
            } catch (error) {
                console.error(`Erro ao criar contêiner ou aba para linha ${index + 1}:`, error);
                return null;
            }
        }));

        // Filtrar abas válidas e processar todas ao mesmo tempo
        const abasValidas = abas.filter(aba => aba !== null);
        await Promise.all(abasValidas.map((aba, index) => processarAba(aba, index)));

        console.log("✅ Todas as abas foram abertas e preenchidas.");
    }

    // Adicionar listener para o botão da barra de ferramentas
    browser.browserAction.onClicked.addListener(() => {
        processarLogins();
    });

    // Listener para mensagem de início de login PesqBrasil
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startPesqBrasilLogin') {
            // Chama a função processarLogins() diretamente
            processarLogins().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Erro ao processar logins PesqBrasil:', error);
                sendResponse({ success: false, error: error.message });
            });
            
            // Retorna true para indicar que a resposta será assíncrona
            return true;
        }
    });

    // Listener para mensagem de início de login eSocial
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startESocialLogin') {
            // Chama a função processarLoginsESocial() diretamente
            processarLoginsESocial().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Erro ao processar logins eSocial:', error);
                sendResponse({ success: false, error: error.message });
            });
            
            // Retorna true para indicar que a resposta será assíncrona
            return true;
        }
    });

    // Função para processar uma aba ativada por hash (similar ao Login Múltiplo)
    async function processarAbaHash(tabId, cpf, senha) {
        console.log(`Iniciando processamento via hash para aba ${tabId}`);
        
        // Armazenar credenciais para persistência
        await armazenarCredenciais(tabId, cpf, senha);
        console.log(`Credenciais armazenadas via hash para aba ${tabId}: CPF="${cpf}", Senha="${senha}"`);

        // Listener para remover credenciais quando a aba for fechada
        const removeCredentials = async (closedTabId) => {
            if (closedTabId === tabId) {
                await limparCredenciais(tabId);
                browser.tabs.onRemoved.removeListener(removeCredentials);
            }
        };
        browser.tabs.onRemoved.addListener(removeCredentials);

        return new Promise((resolve) => {
            const listener = async (updatedTabId, changeInfo) => {
                if (updatedTabId !== tabId || changeInfo.status !== "complete") return;

                let tabUrl;
                try {
                    const updatedTab = await browser.tabs.get(tabId);
                    tabUrl = updatedTab.url;
                } catch (error) {
                    console.error(`Erro ao obter URL da aba ${tabId}:`, error);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                    return;
                }

                // Parar se o login já foi concluído
                const credenciaisAtualizadas = await recuperarCredenciais(tabId);
                if (credenciaisAtualizadas && credenciaisAtualizadas.loginConcluido) {
                    console.log(`Login já concluído para aba ${tabId}, encerrando processamento`);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                    return;
                }

                try {
                    // Recuperar credenciais armazenadas para cada navegação
                    const credenciais = await recuperarCredenciais(tabId);
                    if (!credenciais) {
                        console.error(`Nenhuma credencial encontrada para aba ${tabId}`);
                        browser.tabs.onUpdated.removeListener(listener);
                        resolve();
                        return;
                    }
                    const { cpf: storedCpf, senha: storedSenha } = credenciais;

                    if (tabUrl.startsWith("https://pesqbrasil-pescadorprofissional.agro.gov.br/")) {
                        await waitForElement(tabId, '#button_____3');
                        await clickElement(tabId, '#button_____3');
                    } else if (tabUrl.startsWith("https://sso.acesso.gov.br/login")) {
                        const hasAccountId = await browser.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => !!document.querySelector('#accountId')
                        });
                        const hasPassword = await browser.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => !!document.querySelector('#password')
                        });

                        if (hasAccountId[0].result) {
                            await waitForElement(tabId, '#accountId');
                            await setReactInputValue(tabId, '#accountId', storedCpf);
                            await waitForElement(tabId, '#enter-account-id');
                            await clickElement(tabId, '#enter-account-id');
                        } else if (hasPassword[0].result) {
                            await waitForElement(tabId, '#password');
                            await setReactInputValue(tabId, '#password', storedSenha);
                            await waitForElement(tabId, '#submit-button');
                            await clickElement(tabId, '#submit-button');
                            await marcarLoginConcluido(tabId); // Marcar como concluído
                            console.log(`Login concluído via hash na aba ${tabId}`);
                            browser.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    } else if (tabUrl.startsWith("https://login.esocial.gov.br/")) {
                        // eSocial: clicar no botão 'Entrar com gov.br' antes de preencher login
                        await waitForElement(tabId, '.br-button.sign-in');
                        await clickElement(tabId, '.br-button.sign-in');
                    } else if (tabUrl.hostname.includes('meu.inss.gov.br')) {
                        // INSS: salvar CPF e senha para o popup do gov.br
                        await browser.storage.local.set({ govbr_login: { cpf: storedCpf, senha: storedSenha } });
                        // INSS: clicar no botão 'Entrar com gov.br' usando seletor absoluto
                        const inssBtnSelector = 'div#root > div > div:nth-of-type(3) > div > main:nth-of-type(2) > div > div > div > form > button';
                        await waitForElement(tabId, inssBtnSelector);
                        await clickElement(tabId, inssBtnSelector);
                        // O restante do login será feito no popup pelo listener global
                    } else if (tabUrl.hostname.includes('servicos.acesso.gov.br')) {
                        // Esperar pelo campo de CPF/login
                        await waitForElement(tabId, '#accountId');
                        await setReactInputValue(tabId, '#accountId', storedCpf);
                        await waitForElement(tabId, '#enter-account-id');
                        await clickElement(tabId, '#enter-account-id');
                        // Esperar pelo campo de senha
                        await waitForElement(tabId, '#password');
                        await setReactInputValue(tabId, '#password', storedSenha);
                        await waitForElement(tabId, '#submit-button');
                        await clickElement(tabId, '#submit-button');
                    }
                } catch (error) {
                    console.error(`Erro na aba ${tabId}:`, error);
                    browser.tabs.onUpdated.removeListener(listener);
                    setTimeout(async () => {
                        try {
                            await browser.tabs.update(tabId, { url: tabUrl });
                            console.log(`Recarregando aba ${tabId} para retry`);
                        } catch (retryError) {
                            console.error(`Erro ao recarregar aba ${tabId}:`, retryError);
                            resolve();
                        }
                    }, 5000);
                }
            };
            browser.tabs.onUpdated.addListener(listener);
        });
    }

    // NOVO: Listener para abas criadas, para automação direta via hash
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (changeInfo.status !== 'complete' || !tab.url) return;
        try {
            const url = new URL(tab.url);
            // Verificar se esta aba já está sendo processada por outro listener
            const isBeingProcessed = await browser.storage.local.get(`processing_${tabId}`);
            if (isBeingProcessed[`processing_${tabId}`]) {
                return; // Aba já está sendo processada
            }
            
            if (url.hash && (url.hash.includes('cpf=') && url.hash.includes('senha='))) {
                // Marcar aba como sendo processada
                await browser.storage.local.set({ [`processing_${tabId}`]: true });
                
                // Extrair cpf e senha do hash
                const params = new URLSearchParams(url.hash.replace(/^#/, ''));
                const cpf = params.get('cpf');
                const senha = params.get('senha');
                if (cpf && senha) {
                    // Usar o sistema de persistência igual ao Login Múltiplo
                    await processarAbaHash(tabId, cpf, senha);
                }
            }
        } catch (e) {
            console.error('Erro na automação via hash:', e);
        } finally {
            // Limpar marcação de processamento
            await browser.storage.local.remove(`processing_${tabId}`);
        }
    });

    // Listener para abrir aba em container a pedido do sistema
    browser.runtime.onMessage.addListener(async (message, sender) => {
        if (message && message.type === 'abrirAbaContainer') {
            const { url, cpf, senha } = message;
            try {
                const container = await browser.contextualIdentities.create({
                    name: `Sessão-${cpf.slice(-4)}-${Date.now()}`,
                    color: "blue",
                    icon: "fingerprint"
                });
                const hash = `#cpf=${encodeURIComponent(cpf)}&senha=${encodeURIComponent(senha)}`;
                const tab = await browser.tabs.create({
                    url: url + hash,
                    cookieStoreId: container.cookieStoreId
                });
                // Salvar relação aba/container
                await browser.storage.local.set({ ['container_' + tab.id]: container.cookieStoreId });
            } catch (error) {
                console.error('Erro ao abrir aba em container:', error);
            }
        }
    });

    // Listener global para remover container ao fechar aba
    browser.tabs.onRemoved.addListener(async (tabId) => {
        const key = 'container_' + tabId;
        const data = await browser.storage.local.get(key);
        if (data[key]) {
            try {
                await browser.contextualIdentities.remove(data[key]);
                await browser.storage.local.remove(key);
                console.log('Container removido ao fechar aba:', data[key]);
            } catch (e) {
                console.error('Erro ao remover container:', e);
            }
        }
    });

    // Listener global para automação do popup gov.br
    browser.tabs.onCreated.addListener(async (tab) => {
        try {
            if (tab.url && tab.url.includes('sso.acesso.gov.br')) {
                // Esperar a aba carregar
                await new Promise(resolve => setTimeout(resolve, 1000));
                const data = await browser.storage.local.get('govbr_login');
                if (data.govbr_login) {
                    const { cpf, senha } = data.govbr_login;
                    // Preencher login gov.br
                    await waitForElement(tab.id, '#accountId');
                    await setReactInputValue(tab.id, '#accountId', cpf);
                    await waitForElement(tab.id, '#enter-account-id');
                    await clickElement(tab.id, '#enter-account-id');
                    await waitForElement(tab.id, '#password');
                    await setReactInputValue(tab.id, '#password', senha);
                    await waitForElement(tab.id, '#submit-button');
                    await clickElement(tab.id, '#submit-button');
                    // Limpar storage
                    await browser.storage.local.remove('govbr_login');
                }
            }
        } catch (e) {
            console.error('Erro na automação do popup gov.br:', e);
        }
    });
})();