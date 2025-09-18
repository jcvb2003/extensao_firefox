// Content script para automação do PesqBrasil REAP
// Este script é injetado automaticamente nas páginas do PesqBrasil REAP

(function() {
    'use strict';

    // Verificar se já foi inicializado para evitar duplicação
    if (window.automacaoREAPInicializada) {
        return;
    }
    window.automacaoREAPInicializada = true;

    // ===== MÓDULO DE CONFIGURAÇÃO =====
    const Config = {
        // Valores padrão para meses
        MONTH_VALUES: {
            'Janeiro': 0, 'Fevereiro': 0, 'Março': 0, 'Abril': 0, 'Maio': 20,
            'Junho': 18, 'Julho': 15, 'Agosto': 12, 'Setembro': 12, 'Outubro': 15,
            'Novembro': 18, 'Dezembro': 20
        },

        // Espécies padrão
        ESPECIES: [
            "Matrinxã ou Jatuarana (Brycon spp)",
            "Acará (Astronotus ocellatus)",
            "Aracu (Schizodon spp)",
            "Traíra (Hoplias malabaricus)",
            "Mapará (Hypophthalmus spp)"
        ],

        // Configurações de delay
        DELAYS: {
            CLICK: 400,
            INPUT: 300,
            NAVIGATION: 200
        }
    };

    // ===== MÓDULO DE UTILITÁRIOS =====
    const Utils = {
        // Aguardar um tempo específico
        async delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // Aguardar o carregamento da página
        async waitForPageLoad() {
            return new Promise((resolve) => {
                if (document.readyState === "complete") {
                    resolve();
                } else {
                    window.addEventListener("load", resolve);
                }
            });
        },

        // Definir valor em campo React
        setReactInputValue(input, value) {
            if (!input) return;

            let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, value);

            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            input.dispatchEvent(new Event("blur", { bubbles: true }));
            console.log(`✅ Campo preenchido: ${value}`);
        }
    };

    // ===== MÓDULO DE SELEÇÃO =====
    const SelectionManager = {
        // Selecionar opções em listas suspensas
        async selectRadioOption(inputId, labelText) {
            let input = document.getElementById(inputId);
            let button = input?.nextElementSibling;

            if (!input || !button) {
                console.warn(`❌ Campo de seleção ou botão não encontrado para ${inputId}`);
                return;
            }

            button.click();
            console.log(`📂 Lista aberta para ${inputId}`);
            await Utils.delay(Config.DELAYS.CLICK);

            let listContainer = button.closest('.br-select')?.querySelector('.br-list');
            if (!listContainer) {
                console.warn(`❌ Lista não encontrada para ${inputId}`);
                return;
            }

            let label = [...listContainer.querySelectorAll('label')].find(el => el.innerText.trim() === labelText);

            if (label) {
                label.click();
                console.log(`✅ Selecionado: ${labelText} para ${inputId}`);
                await Utils.delay(Config.DELAYS.CLICK);
            } else {
                console.warn(`❌ Opção '${labelText}' não encontrada para ${inputId}`);
            }
        },

        // Selecionar opções gerais
        async selecionarOpcoesGerais() {
            await this.selectRadioOption('select-tipoPrestacaoServico-industrial_____select', 'Economia Familiar');
            await this.selectRadioOption('select-metodoPesca-0_____select', 'Emalhe');
            await this.selectRadioOption('select-ambientePesca-0_____select', 'Água Doce');
        },

        // Selecionar comercialização por estado
        async selecionarComercializacaoEstado() {
            await this.selectRadioOption('select-houveComercializacao_____select', 'Sim');
            await Utils.delay(Config.DELAYS.NAVIGATION);
            await this.selectRadioOption('select-estadoComercializacao_____select', 'PA');
        },

        // Selecionar venda direta
        async selecionarVendaDireta() {
            await this.selectRadioOption('Venda direta ao consumidor-5', 'Venda direta ao consumidor');
        },

        // Selecionar unidade de medida
        async selecionarUnidadeMedida() {
            for (let i = 0; i < 5; i++) {
                await this.selectRadioOption(`select-tipoUnidadeMedida-${i}_____select`, 'Quilo (Kg)');
            }
        },

        // Selecionar espécies
        async selecionarEspecies() {
            for (let i = 0; i < Config.ESPECIES.length; i++) {
                await this.selectRadioOption(`select-especiePescado-${i}_____select`, Config.ESPECIES[i]);
            }
        }
    };

    // ===== MÓDULO DE PREENCHIMENTO =====
    const FillManager = {
        // Preencher meses
        async preencherMeses() {
            let button = document.querySelector('.style_button__XM2cm');
            if (!button) {
                console.warn("❌ Botão 'Selecione os Meses' não encontrado.");
                return;
            }

            button.click();
            console.log("📂 Lista de meses aberta...");
            await Utils.delay(Config.DELAYS.CLICK);

            for (let [mes, valor] of Object.entries(Config.MONTH_VALUES)) {
                let mesCard = [...document.querySelectorAll('.Card_card__bA0nc')]
                    .find(el => el.innerText.trim() === mes);

                if (!mesCard) {
                    console.warn(`❌ Mês '${mes}' não encontrado.`);
                    continue;
                }

                mesCard.click();
                console.log(`📅 Mês '${mes}' selecionado.`);
                await Utils.delay(Config.DELAYS.CLICK);

                let input = document.querySelector('#diasInput');
                if (input) {
                    Utils.setReactInputValue(input, valor);
                    console.log(`✅ Preenchido: ${mes} = ${valor}`);
                    await Utils.delay(Config.DELAYS.CLICK);
                } else {
                    console.warn(`❌ Campo de entrada não encontrado para '${mes}'.`);
                    continue;
                }

                let saveButton = document.querySelector('.Modal_saveButton___B1wc');
                if (saveButton) {
                    saveButton.click();
                    console.log(`💾 Salvo: ${mes}`);
                    await Utils.delay(Config.DELAYS.CLICK);
                } else {
                    console.warn(`❌ Botão 'Salvar' não encontrado para '${mes}'.`);
                }
            }
        },

        // Preencher quantidade e preço
        async preencherQuantidadePreco() {
            // Primeiro, tentar obter dados salvos da extensão
            const storedData = await this.getStoredReapData();
            
            function requestData(callback) {
                // Cria o modal personalizado (compatível com Firefox)
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.style.zIndex = '10000';

                // Caixa do conteúdo
                const box = document.createElement('div');
                box.style.backgroundColor = 'white';
                box.style.padding = '20px';
                box.style.borderRadius = '8px';
                box.style.width = '500px';
                box.style.maxWidth = '90%';
                box.style.textAlign = 'center';

                // Título
                const title = document.createElement('h3');
                title.textContent = 'Selecionar Dados REAP';
                title.style.marginBottom = '15px';
                title.style.color = '#333';

                // Ano de Referência Atual
                const anoInput = document.querySelector('input[name="anoReferencia"]');
                if (anoInput && anoInput.value) {
                    const yearInfo = document.createElement('div');
                    yearInfo.style.backgroundColor = '#f0f9ff';
                    yearInfo.style.border = '1px solid #0ea5e9';
                    yearInfo.style.borderRadius = '6px';
                    yearInfo.style.padding = '10px';
                    yearInfo.style.marginBottom = '15px';
                    yearInfo.style.textAlign = 'center';

                    const yearLabel = document.createElement('span');
                    yearLabel.textContent = 'Ano de Referência Atual: ';
                    yearLabel.style.fontWeight = '500';
                    yearLabel.style.color = '#0369a1';

                    const yearValue = document.createElement('span');
                    yearValue.textContent = anoInput.value;
                    yearValue.style.fontWeight = '700';
                    yearValue.style.color = '#0284c7';
                    yearValue.style.backgroundColor = 'white';
                    yearValue.style.padding = '2px 6px';
                    yearValue.style.borderRadius = '3px';
                    yearValue.style.border = '1px solid #0ea5e9';

                    yearInfo.appendChild(yearLabel);
                    yearInfo.appendChild(yearValue);
                    box.appendChild(yearInfo);
                }

                // Opções de anos salvos
                const yearOptions = document.createElement('div');
                yearOptions.style.marginBottom = '20px';

                if (storedData && Object.keys(storedData).length > 0) {
                    const label = document.createElement('label');
                    label.textContent = 'Dados salvos por ano:';
                    label.style.display = 'block';
                    label.style.marginBottom = '10px';
                    label.style.fontWeight = 'bold';

                    yearOptions.appendChild(label);

                    Object.entries(storedData).forEach(([year, data]) => {
                        if (data.trim()) {
                            const button = document.createElement('button');
                            button.textContent = `Usar dados de ${year}`;
                            button.style.display = 'block';
                            button.style.width = '100%';
                            button.style.margin = '5px 0';
                            button.style.padding = '10px';
                            button.style.backgroundColor = '#008080';
                            button.style.color = 'white';
                            button.style.border = 'none';
                            button.style.borderRadius = '5px';
                            button.style.cursor = 'pointer';

                            button.onclick = () => {
                                const linhas = data.split('\n').map(l => l.trim().split('\t')).filter(l => l.length === 2);
                                document.body.removeChild(modal);
                                callback(linhas);
                            };

                            yearOptions.appendChild(button);
                        }
                    });
                }

                // Separador
                const separator = document.createElement('hr');
                separator.style.margin = '15px 0';
                separator.style.border = '1px solid #ddd';

                // Opção de colar manualmente
                const manualLabel = document.createElement('label');
                manualLabel.textContent = 'Ou cole os dados manualmente:';
                manualLabel.style.display = 'block';
                manualLabel.style.marginBottom = '10px';
                manualLabel.style.fontWeight = 'bold';

                const textarea = document.createElement('textarea');
                textarea.rows = 8;
                textarea.style.width = '100%';
                textarea.style.fontFamily = 'monospace';
                textarea.style.marginBottom = '10px';
                textarea.placeholder = 'Exemplo:\n20\t10\n15\t8\n18\t9';

                const buttonGroup = document.createElement('div');
                buttonGroup.style.display = 'flex';
                buttonGroup.style.gap = '10px';

                const botaoAplicar = document.createElement('button');
                botaoAplicar.textContent = 'Aplicar';
                botaoAplicar.style.flex = '1';
                botaoAplicar.style.padding = '8px 16px';
                botaoAplicar.style.cursor = 'pointer';
                botaoAplicar.style.backgroundColor = '#008080';
                botaoAplicar.style.color = 'white';
                botaoAplicar.style.border = 'none';
                botaoAplicar.style.borderRadius = '5px';

                const botaoCancelar = document.createElement('button');
                botaoCancelar.textContent = 'Cancelar';
                botaoCancelar.style.flex = '1';
                botaoCancelar.style.padding = '8px 16px';
                botaoCancelar.style.cursor = 'pointer';
                botaoCancelar.style.backgroundColor = '#6b7280';
                botaoCancelar.style.color = 'white';
                botaoCancelar.style.border = 'none';
                botaoCancelar.style.borderRadius = '5px';

                botaoAplicar.onclick = () => {
                    const valor = textarea.value.trim();
                    if (!valor) {
                        alert('Nenhum dado inserido.');
                        return;
                    }

                    const linhas = valor.split('\n').map(l => l.trim().split('\t'));
                    if (linhas.some(l => l.length !== 2)) {
                        alert('Por favor, insira os dados no formato correto (2 colunas por linha, separadas por TAB).');
                        return;
                    }

                    document.body.removeChild(modal);
                    callback(linhas);
                };

                botaoCancelar.onclick = () => {
                    document.body.removeChild(modal);
                };

                // Fechar modal com Escape
                const fecharModal = (e) => {
                    if (e.key === 'Escape') {
                        document.body.removeChild(modal);
                        document.removeEventListener('keydown', fecharModal);
                    }
                };
                document.addEventListener('keydown', fecharModal);

                buttonGroup.appendChild(botaoAplicar);
                buttonGroup.appendChild(botaoCancelar);

                box.appendChild(title);
                box.appendChild(yearOptions);
                if (storedData && Object.keys(storedData).length > 0) {
                    box.appendChild(separator);
                }
                box.appendChild(manualLabel);
                box.appendChild(textarea);
                box.appendChild(buttonGroup);
                modal.appendChild(box);
                document.body.appendChild(modal);
            }

            requestData(async (dados) => {
                let quantidadeInputs = document.querySelectorAll('input[name^="resultadosOperacaoPesca"][name$=".totalPescado"]');
                let precoInputs = document.querySelectorAll('input[name^="resultadosOperacaoPesca"][name$=".precoQuilo"]');

                for (let i = 0; i < dados.length; i++) {
                    let [quantidade, preco] = dados[i];

                    if (quantidadeInputs[i]) {
                        Utils.setReactInputValue(quantidadeInputs[i], quantidade);
                        console.log(`✅ Quantidade preenchida (${i + 1}): ${quantidade}`);
                    } else {
                        console.warn(`❌ Campo de quantidade não encontrado para índice ${i}`);
                    }

                    if (precoInputs[i]) {
                        Utils.setReactInputValue(precoInputs[i], preco);
                        console.log(`✅ Preço preenchido (${i + 1}): ${preco}`);
                    } else {
                        console.warn(`❌ Campo de preço não encontrado para índice ${i}`);
                    }

                    await Utils.delay(Config.DELAYS.INPUT);
                }
            });
        },

        // Obter dados REAP salvos
        async getStoredReapData() {
            return new Promise((resolve) => {
                if (typeof browser !== 'undefined' && browser.storage) {
                    browser.storage.local.get(['sinpescaSettings'], (result) => {
                        const settings = result.sinpescaSettings || {};
                        resolve(settings.reapData || {});
                    });
                } else if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.get(['sinpescaSettings'], (result) => {
                        const settings = result.sinpescaSettings || {};
                        resolve(settings.reapData || {});
                    });
                } else {
                    resolve({});
                }
            });
        },

    };

    // ===== MÓDULO DE ESPÉCIES =====
    const SpeciesManager = {
        // Adicionar espécies
        async adicionarEspecies() {
            for (let i = 0; i < 5; i++) {
                let button = document.querySelector('.br-button.primary.active');
                if (!button) {
                    console.warn(`❌ Botão 'Adicionar nova espécie' não encontrado.`);
                    return;
                }

                button.click();
                console.log(`✅ Espécie adicionada (${i + 1}/5)`);
                await Utils.delay(Config.DELAYS.CLICK);
            }
        }
    };

    // ===== MÓDULO DE INTERFACE =====
    const UIManager = {
        // Criar botão de iniciar automação
        criarBotaoIniciar() {
            const botao = document.createElement('button');
            botao.textContent = 'Iniciar Automação REAP';
            botao.style.cssText = this.getEstilosBotao('20px', '#4CAF50');
            botao.style.zIndex = '1000';

            document.body.appendChild(botao);

            botao.addEventListener('click', async () => {
                console.log("🚀 Iniciando automação...");
                await AutomationManager.executarAutomacao();
            });
        },

        // Criar botão de prompt
        criarBotaoPrompt() {
            const botaoPrompt = document.createElement('button');
            botaoPrompt.textContent = 'Abrir Prompt Quantidade e Preço';
            botaoPrompt.style.cssText = this.getEstilosBotao('80px', '#FF9800');
            botaoPrompt.style.zIndex = '1000';

            document.body.appendChild(botaoPrompt);

            botaoPrompt.addEventListener('click', async () => {
                console.log("📋 Abrindo prompt para Quantidade e Preço...");
                await FillManager.preencherQuantidadePreco();
            });
        },


        // Obter estilos dos botões
        getEstilosBotao(bottom, backgroundColor) {
            return `
                position: fixed;
                bottom: ${bottom};
                left: 20px;
                padding: 10px 20px;
                font-size: 16px;
                background-color: ${backgroundColor};
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            `;
        }
    };

    // ===== MÓDULO PRINCIPAL DE AUTOMAÇÃO =====
    const AutomationManager = {
        // Executar automação completa
        async executarAutomacao() {
            try {
                // Passo 1: Selecionar "Sim" para "Realizou pesca no período"
                await SelectionManager.selectRadioOption('select-realizouPescaPeriodo-reap_____select', 'Sim');
                
                // Passo 2: Selecionar opções gerais
                await SelectionManager.selecionarOpcoesGerais();
                
                // Passo 3: Selecionar comercialização por estado
                await SelectionManager.selecionarComercializacaoEstado();
                
                // Passo 4: Selecionar venda direta
                await SelectionManager.selecionarVendaDireta();
                
                // Passo 5: Adicionar espécies
                await SpeciesManager.adicionarEspecies();

                // Passo 6: Executar seleções em paralelo
                await Promise.all([
                    SelectionManager.selecionarEspecies(),
                    SelectionManager.selecionarUnidadeMedida()
                ]);

                // Passo 7: Preencher meses
                await FillManager.preencherMeses();

                // Passo 8: Preencher quantidade e preço
                await FillManager.preencherQuantidadePreco();
                
                console.log("🚀 Automação concluída!");
            } catch (error) {
                console.error('Erro durante a automação:', error);
            }
        }
    };

    // ===== MÓDULO PRINCIPAL =====
    const REAPExtension = {
        // Inicializar extensão
        init() {
            try {
                // Criar botões de interface
                UIManager.criarBotaoIniciar();
                UIManager.criarBotaoPrompt();
                
                console.log('Automação REAP - Content Script carregado');
            } catch (error) {
                console.error('Erro ao inicializar extensão REAP:', error);
            }
        }
    };

    // ===== INICIALIZAÇÃO =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => REAPExtension.init());
    } else {
        REAPExtension.init();
    }

})(); 