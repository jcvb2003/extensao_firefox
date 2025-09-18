// Content script para renomear downloads do INSS
// Este script é injetado automaticamente nas páginas do INSS

(function() {
    'use strict';

    // Verificar se já foi inicializado para evitar duplicação
    if (window.downloadManagerInicializado) {
        return;
    }
    window.downloadManagerInicializado = true;

    // ===== MÓDULO DE DOWNLOAD =====
    const DownloadManager = {
        // Verificar se estamos no site correto
        isINSSSite() {
            return window.location.hostname === 'atendimento.inss.gov.br';
        },

        // Extrair dados do sócio da página
        getDadosSocio() {
            const labelElements = document.querySelectorAll('.dtp-datagrid-columns-item');
            let nome = 'Comprovante';
            let cpf = '';
            let protocolo = '';
            
            for (const el of labelElements) {
                const label = el.querySelector('.dtp-datagrid-label');
                const value = el.querySelector('.dtp-datagrid-value');
                
                if (label && value) {
                    const labelText = label.textContent.trim();
                    const valueText = value.textContent.trim();
                    
                    if (labelText === 'Nome Completo') {
                        nome = valueText;
                    } else if (labelText === 'CPF') {
                        cpf = valueText;
                    } else if (labelText === 'Protocolo') {
                        protocolo = valueText;
                    }
                }
            }
            
            return { nome, cpf, protocolo };
        },

        // Gerar nome do arquivo
        getNomeArquivo() {
            const dados = this.getDadosSocio();
            const { nome, cpf, protocolo } = dados;
            
            // Limpar caracteres especiais e espaços extras
            const nomeLimpo = nome.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
            const cpfLimpo = cpf.replace(/[^\d]/g, '');
            const protocoloLimpo = protocolo.replace(/[^\w\s-]/g, '').trim();
            
            // Montar nome do arquivo
            let nomeArquivo = nomeLimpo;
            if (cpfLimpo) nomeArquivo += ` - ${cpfLimpo}`;
            if (protocoloLimpo) nomeArquivo += ` - ${protocoloLimpo}`;
            
            return nomeArquivo || 'Comprovante';
        },

        // Interceptar cliques em links de download
        setupDownloadInterceptor() {
            document.addEventListener('click', (e) => {
                // Só intercepta se estivermos no site correto
                if (!this.isINSSSite()) {
                    return;
                }
                
                if (e.target.tagName === 'A' && e.target.href) {
                    const nomeArquivo = this.getNomeArquivo();
                    if (nomeArquivo && nomeArquivo !== 'Comprovante') {
                        e.target.setAttribute('download', `${nomeArquivo}.pdf`);
                        console.log(`📄 Download renomeado para: ${nomeArquivo}.pdf`);
                    }
                }
            }, true);
        },

        // Inicializar módulo
        init() {
            try {
                // Só inicializa se estivermos no site correto
                if (this.isINSSSite()) {
                    this.setupDownloadInterceptor();
                    console.log('Download Manager - Content Script carregado para INSS/GERID');
                } else {
                    console.log('Download Manager - Site não suportado, pulando inicialização');
                }
            } catch (error) {
                console.error('Erro ao inicializar Download Manager:', error);
            }
        }
    };

    // ===== INICIALIZAÇÃO =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DownloadManager.init());
    } else {
        DownloadManager.init();
    }

})(); 

// ===== MÓDULO PESQBRASIL =====
(function() { 
'use strict'; 

console.log('Script PesqBrasil iniciado'); 

// Verificar se estamos no site correto
function isPesqBrasilSite() {
    return window.location.hostname.includes('pesqbrasil-pescadorprofissional.agro.gov.br');
}

// Só executa se estivermos no site correto
if (!isPesqBrasilSite()) {
    console.log('PesqBrasil - Site não suportado, saindo...');
    return;
}

console.log('PesqBrasil - Site correto detectado, continuando...');

let pdfBlob = null; 
let blobUrl = null;
let downloadButton = null;
let pdfDetected = false;
 
// Função para extrair o nome do usuário do elemento .avatar-menu_nome__zZCoz 
function getNomeUsuario() { 
    console.log('Procurando nome em .avatar-menu_nome__zZCoz...'); 
    const nameElement = document.querySelector('.avatar-menu_nome__zZCoz'); 
    if (nameElement) { 
        // Remove o ícone (ou qualquer elemento filho) e pega apenas o texto 
        const nameText = nameElement.childNodes[0]?.textContent?.trim(); 
        if (nameText) { 
            console.log('Nome encontrado:', nameText); 
            return nameText; 
        } 
    } 
    console.warn('Nome não encontrado, usando padrão: Usuario'); 
    return 'Usuario'; 
} 
 
// Função para determinar o sufixo com base no label 
function getSufixo() { 
    console.log('Verificando elementos para determinar sufixo...'); 
    // Primeiro, verifica se há um elemento com a classe style_boxUploads__WVCKX 
    const uploadBox = document.querySelector('.style_boxUploads__WVCKX'); 
    if (uploadBox) { 
        // Procura por labels dentro do elemento 
        const labels = uploadBox.querySelectorAll('.upload-label span'); 
        for (const label of labels) { 
            const labelText = label.textContent.trim(); 
            console.log('Label encontrado:', labelText); 
            if (labelText === 'Protocolo') { 
                console.log('Sufixo definido: - PROTOCOLO'); 
                return ' - PROTOCOLO'; 
            } 
        } 
    } 
 
    // Verifica o título como fallback 
    console.log('Verificando .style_title__FIFG9...'); 
    const titleElement = document.querySelector('.style_title__FIFG9'); 
    if (titleElement) { 
        const titleText = titleElement.textContent.trim(); 
        console.log('Título encontrado:', titleText); 
        if (titleText === 'Carteira Profissional') { 
            return ' - CARTEIRA'; 
        } else if (titleText === 'Certificado de Regularidade') { 
            return ' - CERTIFICADO'; 
        } else if (titleText === 'Imprimir protocolo') { 
            return ' - PS PESQ'; 
        } 
    } 
    console.warn('Nenhum título ou label correspondente encontrado, sufixo vazio'); 
    return ''; 
} 
 
// Função para criar o botão de download 
function createDownloadButton() { 
    const button = document.createElement('button'); 
    button.textContent = 'Baixar PDF Renomeado'; 
    button.style.position = 'fixed'; 
    button.style.top = '10px'; 
    button.style.right = '10px'; 
    button.style.zIndex = '1000'; 
    button.style.padding = '10px'; 
    button.style.backgroundColor = '#4CAF50'; 
    button.style.color = 'white'; 
    button.style.border = 'none'; 
    button.style.borderRadius = '5px'; 
    button.style.cursor = 'pointer'; 
    button.style.fontSize = '16px'; 
    button.disabled = true; 
    button.title = 'Aguarde o PDF carregar...'; 
    document.body.appendChild(button); 
    return button; 
}

// Função para detectar PDF carregado através de iframes
function detectPDFInIframe() {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
        if (iframe.src && iframe.src.includes('.pdf')) {
            console.log('PDF detectado em iframe:', iframe.src);
            return iframe.src;
        }
        // Verifica se o iframe tem um blob URL
        if (iframe.src && iframe.src.startsWith('blob:')) {
            console.log('Blob URL detectado em iframe:', iframe.src);
            return iframe.src;
        }
    }
    return null;
}

// Função para verificar se há PDFs na página
function checkForPDFs() {
    console.log('Verificando PDFs na página...');
    
    // Método 1: Verificar iframes com PDF
    const pdfUrl = detectPDFInIframe();
    if (pdfUrl) {
        console.log('PDF encontrado via iframe:', pdfUrl);
        activateDownloadButton(pdfUrl);
        return true;
    }
    
    // Método 2: Verificar links de download
    const downloadLinks = document.querySelectorAll('a[href*=".pdf"], a[download*=".pdf"]');
    for (const link of downloadLinks) {
        console.log('Link de PDF encontrado:', link.href);
        activateDownloadButton(link.href);
        return true;
    }
    
    // Método 3: Verificar elementos com PDF embutido
    const pdfElements = document.querySelectorAll('embed[type="application/pdf"], object[type="application/pdf"]');
    for (const element of pdfElements) {
        console.log('Elemento PDF encontrado:', element.src || element.data);
        activateDownloadButton(element.src || element.data);
        return true;
    }
    
    return false;
}

// Função para ativar o botão de download
function activateDownloadButton(pdfUrl) {
    if (downloadButton && !pdfDetected) {
        pdfDetected = true;
        const nomeUsuario = getNomeUsuario();
        const sufixo = getSufixo();
        const filename = `${nomeUsuario}${sufixo}.pdf`;
        
        console.log('Ativando botão de download com:', filename);
        
        downloadButton.disabled = false;
        downloadButton.title = `Baixar como ${filename}`;
        downloadButton.onclick = () => {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('Download iniciado com nome:', filename);
        };
    }
} 
 
// Cria o botão de download 
downloadButton = createDownloadButton(); 

// Captura o Blob do PDF (método original mantido como fallback)
const originalCreateObjectURL = window.URL.createObjectURL; 
window.URL.createObjectURL = function(blob) { 
    console.log('URL.createObjectURL chamado, Blob:', blob); 
    if (blob && blob.type === 'application/pdf') { 
        pdfBlob = blob; 
        blobUrl = originalCreateObjectURL.call(this, blob); 
        console.log('Blob URL gerada:', blobUrl); 

        // Ativa o botão de download usando o blob
        if (downloadButton && !pdfDetected) {
            pdfDetected = true;
            const nomeUsuario = getNomeUsuario(); 
            const sufixo = getSufixo(); 
            const filename = `${nomeUsuario}${sufixo}.pdf`; 
            console.log('Nome do arquivo gerado:', filename); 

            downloadButton.disabled = false; 
            downloadButton.title = `Baixar como ${filename}`; 
            downloadButton.onclick = () => { 
                const link = document.createElement('a'); 
                link.href = blobUrl; 
                link.download = filename; 
                document.body.appendChild(link); 
                link.click(); 
                document.body.removeChild(link); 
                console.log('Download iniciado com nome:', filename); 
            }; 
        }
    } 
    return originalCreateObjectURL.call(this, blob); 
};
 
// Observa mudanças no DOM para detectar PDFs
const observer = new MutationObserver(function(mutations) { 
    mutations.forEach(mutation => { 
        mutation.addedNodes.forEach(node => { 
            if (node.tagName === 'IFRAME') { 
                console.log('Novo iframe detectado:', node.src); 
                // Verifica se é um PDF
                if (node.src && (node.src.includes('.pdf') || node.src.startsWith('blob:'))) {
                    setTimeout(() => checkForPDFs(), 500); // Pequeno delay para o PDF carregar
                }
            } 
            if (node.querySelectorAll) { 
                const iframes = node.querySelectorAll('iframe'); 
                iframes.forEach(iframe => { 
                    console.log('iframe encontrado em nó adicionado:', iframe.src); 
                    if (iframe.src && (iframe.src.includes('.pdf') || iframe.src.startsWith('blob:'))) {
                        setTimeout(() => checkForPDFs(), 500);
                    }
                }); 
            } 
        }); 
    }); 
}); 

// Função para iniciar a detecção
function startPDFDetection() {
    console.log('Iniciando detecção de PDFs...');
    
    // Verifica imediatamente se já há PDFs
    if (!checkForPDFs()) {
        console.log('PDF não encontrado imediatamente, iniciando observação...');
        
        // Inicia a observação do DOM
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        // Verifica periodicamente (fallback)
        const intervalCheck = setInterval(() => {
            if (pdfDetected) {
                clearInterval(intervalCheck);
                return;
            }
            checkForPDFs();
        }, 1000);
        
        // Para a verificação após 30 segundos
        setTimeout(() => {
            clearInterval(intervalCheck);
            if (!pdfDetected) {
                console.warn('PDF não detectado após 30 segundos');
            }
        }, 30000);
    }
}

// Inicia a detecção quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPDFDetection);
} else {
    startPDFDetection();
}
 
})();