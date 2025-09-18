// popup.js - Lógica da interface SINPESCA

class SinpescaPopup {
    constructor() {
        this.elements = {};
        this.settings = {};
        this.init();
    }

    async init() {
        this.bindElements();
        this.attachEventListeners();
        await this.loadSettings();
        this.populateYearDropdown();
        this.updateUI();
        this.updateStatus('Pronto');
    }

    bindElements() {
        this.elements = {
            pesqBrasilBtn: document.getElementById('pesqBrasilBtn'),
            esocialBtn: document.getElementById('esocialBtn'),
            consultarGuiasToggle: document.getElementById('consultarGuiasToggle'),
            gerarGpsToggle: document.getElementById('gerarGpsToggle'),
            anoDropdownContainer: document.getElementById('anoDropdownContainer'),
            anoSelect: document.getElementById('anoSelect'),
            gpsControlsContainer: document.getElementById('gpsControlsContainer'),
            mesSelect: document.getElementById('mesSelect'),
            valorInput: document.getElementById('valorInput'),
            statusIndicator: document.getElementById('statusIndicator'),
            // REAP elements
            reapTabs: document.querySelectorAll('.reap-tab'),
            reapPanels: document.querySelectorAll('.reap-tab-panel'),
            reapTextareas: {
                2021: document.getElementById('data2021'),
                2022: document.getElementById('data2022'),
                2023: document.getElementById('data2023'),
                2024: document.getElementById('data2024')
            }
        };
    }

    attachEventListeners() {
        // Botão PesqBrasil
        this.elements.pesqBrasilBtn.addEventListener('click', () => {
            this.handlePesqBrasilLogin();
        });

        // Botão eSocial
        this.elements.esocialBtn.addEventListener('click', () => {
            this.handleESocialLogin();
        });

        // Toggle Consultar Guias Pagas
        this.elements.consultarGuiasToggle.addEventListener('change', (e) => {
            this.handleConsultarGuiasToggle(e.target.checked);
        });

        // Toggle Gerar GPS
        this.elements.gerarGpsToggle.addEventListener('change', (e) => {
            this.handleGerarGpsToggle(e.target.checked);
        });

        // Dropdown de Ano
        this.elements.anoSelect.addEventListener('change', (e) => {
            this.handleYearChange(e.target.value);
        });

        // Dropdown de Mês GPS
        this.elements.mesSelect.addEventListener('change', (e) => {
            this.handleMesChange(e.target.value);
        });

        // Campo de Valor GPS
        this.elements.valorInput.addEventListener('input', (e) => {
            this.handleValorChange(e.target.value);
        });

        // REAP Tab listeners
        this.elements.reapTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.handleReapTabClick(e.target.dataset.year);
            });
        });

        // REAP Textarea listeners
        Object.entries(this.elements.reapTextareas).forEach(([year, textarea]) => {
            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    this.handleReapDataChange(year, e.target.value);
                });
            }
        });
    }

    async loadSettings() {
        try {
            const result = await this.getStorageData(['sinpescaSettings']);
        this.settings = result.sinpescaSettings || {
            consultarGuias: false,
            gerarGps: false,
            selectedYear: 'current',
            selectedMonth: '08',
            valorComercializado: '',
            reapData: {
                2021: '',
                2022: '',
                2023: '',
                2024: ''
            }
        };
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            this.settings = {
                consultarGuias: false,
                gerarGps: false,
                selectedYear: 'current',
                selectedMonth: '08',
                valorComercializado: '',
                reapData: {
                    2021: '',
                    2022: '',
                    2023: '',
                    2024: ''
                }
            };
        }
    }

    async saveSettings() {
        try {
            await this.setStorageData({ sinpescaSettings: this.settings });
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
        }
    }

    updateUI() {
        // Atualizar toggles com base nas configurações
        this.elements.consultarGuiasToggle.checked = this.settings.consultarGuias;
        this.elements.gerarGpsToggle.checked = this.settings.gerarGps;
        this.elements.anoSelect.value = this.settings.selectedYear;
        this.elements.mesSelect.value = this.settings.selectedMonth;
        this.elements.valorInput.value = this.settings.valorComercializado;

        // Atualizar dados REAP
        Object.entries(this.settings.reapData || {}).forEach(([year, data]) => {
            if (this.elements.reapTextareas[year]) {
                this.elements.reapTextareas[year].value = data;
            }
        });

        // Mostrar/ocultar dropdown de ano
        if (this.settings.consultarGuias) {
            this.elements.anoDropdownContainer.classList.remove('hidden');
            this.elements.anoDropdownContainer.classList.add('fade-in');
        } else {
            this.elements.anoDropdownContainer.classList.add('hidden');
        }

        // Mostrar/ocultar controles de GPS
        if (this.settings.gerarGps) {
            this.elements.gpsControlsContainer.classList.remove('hidden');
            this.elements.gpsControlsContainer.classList.add('fade-in');
        } else {
            this.elements.gpsControlsContainer.classList.add('hidden');
        }

        // Garantir que os toggles sejam mutuamente exclusivos
        if (this.settings.consultarGuias && this.settings.gerarGps) {
            // Se ambos estiverem ativos, desativa o Gerar GPS
            this.settings.gerarGps = false;
            this.elements.gerarGpsToggle.checked = false;
            this.elements.gpsControlsContainer.classList.add('hidden');
        }
    }

    populateYearDropdown() {
        const currentYear = new Date().getFullYear();
        const dropdown = this.elements.anoSelect;
        
        // Limpar opções existentes (exceto a primeira)
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }

        // Adicionar anos anteriores (últimos 5 anos)
        for (let i = 0; i <= 5; i++) {
            const year = currentYear - i;
            if (i > 0) { // Pula o ano atual que já está como opção padrão
                const option = document.createElement('option');
                option.value = year.toString();
                option.textContent = year.toString();
                dropdown.appendChild(option);
            }
        }
    }

    async handlePesqBrasilLogin() {
        try {
            this.updateStatus('Iniciando login PesqBrasil...');
            this.setLoading(true, 'pesqBrasil');

            // Enviar mensagem para o background script para iniciar o prompt PesqBrasil
            const response = await this.sendMessage({
                action: 'startPesqBrasilLogin'
            });

            if (response && response.success) {
                this.updateStatus('Login PesqBrasil iniciado com sucesso');
            } else {
                this.updateStatus('Erro ao iniciar login PesqBrasil');
            }

        } catch (error) {
            console.error('Erro no login PesqBrasil:', error);
            this.updateStatus('Erro ao iniciar login PesqBrasil');
        } finally {
            this.setLoading(false, 'pesqBrasil');
        }
    }

    async handleESocialLogin() {
        try {
            this.updateStatus('Iniciando login eSocial...');
            this.setLoading(true, 'esocial');

            // Enviar mensagem para o background script para iniciar o prompt eSocial
            const response = await this.sendMessage({
                action: 'startESocialLogin'
            });

            if (response && response.success) {
                this.updateStatus('Login eSocial iniciado com sucesso');
            } else {
                this.updateStatus('Erro ao iniciar login eSocial');
            }

        } catch (error) {
            console.error('Erro no login eSocial:', error);
            this.updateStatus('Erro ao iniciar login eSocial');
        } finally {
            this.setLoading(false, 'esocial');
        }
    }

    async handleConsultarGuiasToggle(enabled) {
        // Se estiver ativando Consultar Guias, desativa Gerar GPS
        if (enabled && this.settings.gerarGps) {
            this.settings.gerarGps = false;
            this.elements.gerarGpsToggle.checked = false;
        }

        this.settings.consultarGuias = enabled;
        await this.saveSettings();

        // Mostrar/ocultar dropdown
        if (enabled) {
            this.elements.anoDropdownContainer.classList.remove('hidden');
            this.elements.anoDropdownContainer.classList.add('fade-in');
        } else {
            this.elements.anoDropdownContainer.classList.add('hidden');
        }

        // Enviar configuração para background
        await this.sendMessage({
            action: 'updateESocialSettings',
            settings: {
                consultarGuias: enabled,
                selectedYear: this.settings.selectedYear
            }
        });

        this.updateStatus(enabled ? 'Consultar guias ativado' : 'Consultar guias desativado');
    }

    async handleGerarGpsToggle(enabled) {
        // Se estiver ativando Gerar GPS, desativa Consultar Guias
        if (enabled && this.settings.consultarGuias) {
            this.settings.consultarGuias = false;
            this.elements.consultarGuiasToggle.checked = false;
            this.elements.anoDropdownContainer.classList.add('hidden');
        }

        this.settings.gerarGps = enabled;
        await this.saveSettings();

        // Mostrar/ocultar controles de GPS
        if (enabled) {
            this.elements.gpsControlsContainer.classList.remove('hidden');
            this.elements.gpsControlsContainer.classList.add('fade-in');
        } else {
            this.elements.gpsControlsContainer.classList.add('hidden');
        }

        // Enviar configuração para background
        await this.sendMessage({
            action: 'updateESocialSettings',
            settings: {
                gerarGps: enabled,
                selectedMonth: this.settings.selectedMonth,
                valorComercializado: this.settings.valorComercializado
            }
        });

        this.updateStatus(enabled ? 'Gerar GPS ativado' : 'Gerar GPS desativado');
    }

    // REAP Tab Management
    handleReapTabClick(selectedYear) {
        // Atualizar abas ativas
        this.elements.reapTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.year === selectedYear) {
                tab.classList.add('active');
            }
        });

        // Atualizar painéis ativos
        this.elements.reapPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === `panel-${selectedYear}`) {
                panel.classList.add('active');
            }
        });

        this.updateStatus(`Aba REAP ${selectedYear} selecionada`);
    }

    async handleReapDataChange(year, data) {
        if (!this.settings.reapData) {
            this.settings.reapData = {};
        }
        this.settings.reapData[year] = data;
        await this.saveSettings();
        this.updateStatus(`Dados REAP ${year} salvos`);
    }


    async handleYearChange(selectedYear) {
        this.settings.selectedYear = selectedYear;
        await this.saveSettings();

        // Enviar configuração para background
        await this.sendMessage({
            action: 'updateESocialSettings',
            settings: {
                consultarGuias: this.settings.consultarGuias,
                selectedYear: selectedYear
            }
        });

        const yearText = selectedYear === 'current' ? 'ano atual' : selectedYear;
        this.updateStatus(`Ano selecionado: ${yearText}`);
    }

    async handleMesChange(selectedMonth) {
        this.settings.selectedMonth = selectedMonth;
        await this.saveSettings();

        // Enviar configuração para background
        await this.sendMessage({
            action: 'updateESocialSettings',
            settings: {
                gerarGps: this.settings.gerarGps,
                selectedMonth: selectedMonth,
                valorComercializado: this.settings.valorComercializado
            }
        });

        const monthNames = {
            '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
            '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
            '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
        };
        this.updateStatus(`Mês selecionado: ${monthNames[selectedMonth]}`);
    }

    async handleValorChange(valor) {
        // Formatar valor enquanto digita
        const valorFormatado = this.formatarValor(valor);
        this.elements.valorInput.value = valorFormatado;
        
        this.settings.valorComercializado = valorFormatado;
        await this.saveSettings();

        // Enviar configuração para background
        await this.sendMessage({
            action: 'updateESocialSettings',
            settings: {
                gerarGps: this.settings.gerarGps,
                selectedMonth: this.settings.selectedMonth,
                valorComercializado: valorFormatado
            }
        });
    }

    formatarValor(valor) {
        // Remove tudo exceto números
        let numeros = valor.replace(/\D/g, '');
        
        if (numeros === '') return '';
        
        // Converte para centavos
        const centavos = parseInt(numeros);
        
        // Formata como moeda brasileira
        const reais = centavos / 100;
        return reais.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    setLoading(loading, type = 'pesqBrasil') {
        const container = document.querySelector('.container');
        if (loading) {
            container.classList.add('loading');
            if (type === 'pesqBrasil') {
                this.elements.pesqBrasilBtn.innerHTML = `
                    <span class="btn-icon">⏳</span>
                    <span class="btn-text">Processando...</span>
                `;
            } else if (type === 'esocial') {
                this.elements.esocialBtn.innerHTML = `
                    <span class="btn-icon">⏳</span>
                    <span class="btn-text">Processando...</span>
                `;
            }
        } else {
            container.classList.remove('loading');
            if (type === 'pesqBrasil') {
                this.elements.pesqBrasilBtn.innerHTML = `
                    <span class="btn-icon">🌐</span>
                    <span class="btn-text">PesqBrasil</span>
                `;
            } else if (type === 'esocial') {
                this.elements.esocialBtn.innerHTML = `
                    <span class="btn-icon">📋</span>
                    <span class="btn-text">Esocial</span>
                `;
            }
        }
    }

    updateStatus(message) {
        const statusText = this.elements.statusIndicator.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message;
        }
        
        // Voltar ao status "Pronto" após 3 segundos
        if (message !== 'Pronto') {
            setTimeout(() => {
                this.updateStatus('Pronto');
            }, 3000);
        }
    }

    // Utilities para comunicação com browser APIs
    getStorageData(keys) {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.storage) {
                browser.storage.local.get(keys, resolve);
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(keys, resolve);
            } else {
                resolve({});
            }
        });
    }

    setStorageData(data) {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.storage) {
                browser.storage.local.set(data, resolve);
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set(data, resolve);
            } else {
                resolve();
            }
        });
    }

    sendMessage(message) {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.runtime) {
                browser.runtime.sendMessage(message, resolve);
            } else if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage(message, resolve);
            } else {
                resolve({ success: false, error: 'API não disponível' });
            }
        });
    }

    getActiveTab() {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.tabs) {
                browser.tabs.query({ active: true, currentWindow: true }, resolve);
            } else if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, resolve);
            } else {
                resolve([]);
            }
        });
    }

    executeScript(tabId, details) {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.tabs) {
                browser.tabs.executeScript(tabId, details, resolve);
            } else if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.executeScript(tabId, details, resolve);
            } else {
                resolve([]);
            }
        });
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new SinpescaPopup();
});