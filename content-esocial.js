// Script para automações no eSocial
// Inclui redirecionamento e funcionalidades de consulta de guias pagas e geração de GPS
// Versão unificada com automação inteligente baseada nas configurações

(function() {
    'use strict';
    
    // === FUNÇÕES AUXILIARES ===
    function waitForElement(selector, callback, maxAttempts = 40, interval = 500) {
        let attempts = 0;
        function checkElement() {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkElement, interval);
            }
        }
        checkElement();
    }
    
    function simulateClick(element) {
        if (element) {
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    }
    
    function setSelectValue(select, value) {
        if (!select) return;
        select.value = value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    
    // === FUNÇÃO PARA PROCESSAR CONFIGURAÇÕES ===
    function processarConfiguracoes(settings) {
        // Verifica se a URL atual corresponde ao padrão esperado
        if (window.location.href === 'https://www.esocial.gov.br/portal/Home/Inicial?tipoEmpregador=EMPREGADOR_DOMESTICO') {
            // Redireciona com base nas configurações ativadas
            if (settings.consultarGuias) {
                window.location.href = 'https://www.esocial.gov.br/portal/FolhaPagamento/Listagem/Competencias';
            } else if (settings.gerarGps) {
                // Redireciona para GPS com competência específica
                const anoAtual = new Date().getFullYear();
                const mes = settings.selectedMonth || '08';
                const competencia = `${anoAtual}${mes}`;
                const urlGPS = `https://www.esocial.gov.br/portal/FolhaPagamento/Listagem/ListarPagamentos?competencia=${competencia}`;
                
                window.location.href = urlGPS;
            }
            // Se nenhuma opção estiver ativada, não faz redirecionamento
        }
    }
    
    // === FUNÇÃO PARA AUTOMAÇÃO NA PÁGINA DE COMPETÊNCIAS ===
    function automatizarCompetencias(settings) {
        if (window.location.href.startsWith('https://www.esocial.gov.br/portal/FolhaPagamento/Listagem/Competencias')) {
            // Só executa automação se "Consultar Guias" estiver ativado
            if (!settings.consultarGuias) {
                return;
            }
            
            // Se o ano selecionado for 'current', apenas redireciona sem automação
            if (settings.selectedYear === 'current') {
                return;
            }
            
            // Aguarda o select de ano aparecer
            waitForElement('#AnoFiltrado', (select) => {
                const anoSelecionado = settings.selectedYear;
                
                // Só executa se o valor ainda não for o ano selecionado
                if (select.value !== anoSelecionado) {
                    setSelectValue(select, anoSelecionado);
                    waitForElement('#btnFiltro', (btn) => {
                        simulateClick(btn);
                    });
                }
            });
        }
    }
    
    // === FUNÇÃO PARA AUTOMAÇÃO NA PÁGINA DE GPS ===
    function automatizarGPS(settings) {
        if (window.location.href.startsWith('https://www.esocial.gov.br/portal/FolhaPagamento/Listagem/ListarPagamentos') && 
            window.location.href.includes('competencia=')) {
            
            // Só executa automação se "Gerar GPS" estiver ativado
            if (!settings.gerarGps) {
                return;
            }

            // Aguarda o botão de expandir comercialização aparecer
            waitForElement('span.expandir-comercializacao a[onclick*="ExpandirDivComercializacao"]', (botaoExpandir) => {
                // Executa clique simulado no elemento
                simulateClick(botaoExpandir);
                
                // Aguarda um pouco para a expansão completar
                setTimeout(() => {
                    // Preenche o campo de valor diretamente (sem abrir o input primeiro)
                    const valorComercializado = settings.valorComercializado;
                    
                    // Procura o campo de valor no DOM (pode estar oculto)
                    const campoValor = document.querySelector('#ValorTotalComercializado');
                    if (campoValor) {
                        // Preenche o campo diretamente
                        campoValor.value = valorComercializado;
                        campoValor.dispatchEvent(new Event('input', { bubbles: true }));
                        campoValor.dispatchEvent(new Event('change', { bubbles: true }));
                        campoValor.dispatchEvent(new Event('blur', { bubbles: true }));
                    }
                    
                    // Aguarda um pouco e depois clica no link de comercialização para abrir o input
                    setTimeout(() => {
                        waitForElement('a[onclick*="AbrirDialogTipoComercializacao"]', (linkComercializacao) => {
                            simulateClick(linkComercializacao);
                            
                            // Aguarda o campo aparecer visualmente e confirma o valor
                            setTimeout(() => {
                                waitForElement('#ValorTotalComercializado', (campoValorVisivel) => {
                                    // Garante que o valor está preenchido e visível
                                    campoValorVisivel.value = valorComercializado;
                                    campoValorVisivel.dispatchEvent(new Event('input', { bubbles: true }));
                                    campoValorVisivel.dispatchEvent(new Event('change', { bubbles: true }));
                                    campoValorVisivel.dispatchEvent(new Event('blur', { bubbles: true }));
                                });
                            }, 200);
                        });
                    }, 200);
                }, 200);
            });
        }
    }
    
    // === CARREGAMENTO INICIAL DAS CONFIGURAÇÕES ===
    browser.storage.local.get(['sinpescaSettings'], function(result) {
        const settings = result.sinpescaSettings || {
            consultarGuias: false,
            gerarGps: false,
            selectedYear: 'current',
            selectedMonth: '08',
            valorComercializado: ''
        };
        
        processarConfiguracoes(settings);
        automatizarCompetencias(settings);
        automatizarGPS(settings);
    });
    
    // === LISTENER PARA MENSAGENS DO BACKGROUND SCRIPT ===
    browser.runtime.onMessage.addListener((message) => {
        if (message.action === 'updateESocialSettings') {
            log('Configurações do eSocial atualizadas:', message.settings);
            
            // Atualiza as configurações locais
            const settings = message.settings;
            
            // Verifica se estamos na página inicial do eSocial
            if (window.location.href === 'https://www.esocial.gov.br/portal/Home/Inicial?tipoEmpregador=EMPREGADOR_DOMESTICO') {
                processarConfiguracoes(settings);
            }
            
            // Verifica se estamos na página de competências para automação
            automatizarCompetencias(settings);
            
            // Verifica se estamos na página de GPS para automação
            automatizarGPS(settings);
        }
        return false;
    });
})();