(() => {
  const isEnglish = document.documentElement.lang === 'en';
  const byId = id => document.getElementById(id);
  const input = byId('pdfFile');
  const choose = byId('pdfChoose');
  const analyze = byId('pdfAnalyze');
  const clean = byId('pdfClean');
  const reset = byId('pdfReset');
  const selected = byId('pdfSelected');
  const fileName = byId('pdfFileName');
  const fileSize = byId('pdfFileSize');
  const results = byId('pdfResults');
  const fieldList = byId('pdfFields');
  const status = byId('pdfStatus');
  const acknowledgement = byId('pdfSignedAck');
  const MAX_SIZE = 30 * 1024 * 1024;
  let currentFile = null;
  let busy = false;
  let pdfLibraryPromise = null;

  function ensurePdfLibrary() {
    if (window.PDFLib) return Promise.resolve();
    if (!pdfLibraryPromise) {
      pdfLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        script.onload = () => window.PDFLib ? resolve() : reject(new Error('PDFLib indisponível'));
        script.onerror = () => reject(new Error('Falha ao carregar PDFLib'));
        document.head.append(script);
      }).catch(error => {
        pdfLibraryPromise = null;
        throw error;
      });
    }
    return pdfLibraryPromise;
  }

  const labels = isEnglish ? [\n    ['Title', doc => doc.getTitle()], ['Author', doc => doc.getAuthor()], ['Subject', doc => doc.getSubject()], ['Keywords', doc => doc.getKeywords()], ['Creator application', doc => doc.getCreator()], ['PDF producer', doc => doc.getProducer()], ['Creation date', doc => doc.getCreationDate()], ['Modified date', doc => doc.getModificationDate()]\n  ] : [
    ['Título', doc => doc.getTitle()],
    ['Autor', doc => doc.getAuthor()],
    ['Assunto', doc => doc.getSubject()],
    ['Palavras-chave', doc => doc.getKeywords()],
    ['Aplicativo de criação', doc => doc.getCreator()],
    ['Programa que gerou o PDF', doc => doc.getProducer()],
    ['Data de criação', doc => doc.getCreationDate()],
    ['Data de modificação', doc => doc.getModificationDate()]
  ];
  const formatBytes = bytes => bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  const messages = {"Escolha um PDF para começar.":"Choose a PDF to get started.","Escolha um arquivo PDF válido.":"Choose a valid PDF file.","Este arquivo passa do limite de 30 MB. Tente uma cópia menor.":"This file exceeds the 30 MB limit. Try a smaller copy.","Arquivo selecionado. Analise os campos comuns antes de criar a cópia.":"File selected. Review common fields before creating a copy.","Carregando a ferramenta de PDF pela primeira vez…":"Loading the PDF tool for the first time…","Lendo os campos de metadados localmente…":"Reading metadata fields locally…","Nenhum campo comum preenchido foi encontrado":"No populated common fields were found","Não foi possível ler este PDF. Arquivos protegidos por senha, danificados ou com estruturas não compatíveis não podem ser processados.":"This PDF could not be read. Password-protected, damaged, or incompatible files cannot be processed.","A biblioteca de PDF não carregou. Confira sua conexão e tente novamente.":"The PDF library could not load. Check your connection and try again.","Criando uma cópia limpa no seu navegador…":"Creating a cleaned copy in your browser…","Cópia criada e baixada. ":"Cleaned copy created and downloaded. "," entrada(s) comum(ns) de metadados foram removidas; o original ficou intacto.":" common metadata entries were removed; your original is unchanged.","Não foi possível gerar esta cópia. O arquivo original permanece intacto; tente outro PDF sem senha.":"Could not create this copy. Your original is unchanged; try another PDF without a password.","A biblioteca de PDF não carregou. O arquivo original permanece intacto; confira sua conexão e tente novamente.":"The PDF library could not load. Your original is unchanged; check your connection and try again.","Cole um ou mais links para começar.":"Paste one or more links to get started.","Exemplo carregado. Revise-o e clique em limpar.":"Example loaded. Review it, then click Clean."," não parece uma URL válida e foi mantida":" is not a valid URL and was kept"," não usa HTTP ou HTTPS e foi mantida":" does not use HTTP or HTTPS and was kept"," contém credenciais no endereço e foi mantida para revisão manual":" contains credentials and was kept for manual review","Links limpos copiados para a área de transferência.":"Cleaned links copied to the clipboard.","Não foi possível copiar automaticamente. O resultado está selecionado para cópia manual.":"Could not copy automatically. The result is selected for manual copying.","Escolha um documento Office para começar.":"Choose an Office document to get started.","xml":"xml","Escolha um arquivo .docx, .xlsx ou .pptx. Formatos com macros e arquivos antigos não são aceitos.":"Choose a .docx, .xlsx, or .pptx file. Macro-enabled and older formats are not supported.","Este documento passa do limite de 15 MB. Tente uma cópia menor.":"This document exceeds the 15 MB limit. Try a smaller copy.","Arquivo selecionado. Analise os campos de propriedades que esta ferramenta reconhece.":"File selected. Review the property fields this tool recognizes.","Carregando a ferramenta de documentos pela primeira vez…":"Loading the document tool for the first time…","Lendo as propriedades localmente no navegador…":"Reading properties locally in your browser…","Este arquivo parece ter uma assinatura digital. Não vamos regravá-lo para evitar invalidar a assinatura.":"This file appears to have a digital signature. It will not be rewritten to avoid invalidating the signature.","Nenhuma propriedade comum preenchida foi encontrada":"No populated common properties were found","Não foi possível abrir este documento. Ele pode estar danificado, protegido ou usar uma estrutura incompatível.":"Could not open this document. It may be damaged, protected, or use an incompatible structure.","A biblioteca de documentos não carregou. Confira sua conexão e tente novamente.":"The document library could not load. Check your connection and try again.","Limpando propriedades e criando uma cópia no seu navegador…":"Cleaning properties and creating a copy in your browser…"," campo(s) de propriedades reconhecidas foram limpos; o original ficou intacto.":" recognized property fields were cleared; your original is unchanged.","Não foi possível gerar esta cópia. O original permanece intacto; tente outro documento compatível.":"Could not create this copy. Your original is unchanged; try another compatible document."};
  const translate = message => {
    if (!isEnglish) return message;
    if (messages[message]) return messages[message];
    if (message.startsWith('Não encontramos campos comuns preenchidos;')) return 'No populated common fields were found; you can still create a rewritten copy.';
    if (message.startsWith('Cópia criada e baixada. ')) return 'Cleaned copy created and downloaded. ' + message.substring('Cópia criada e baixada. '.length).replace(' entrada(s) comum(ns) de metadados foram removidas; o original ficou intacto.', ' common metadata entries were removed; your original is unchanged.');
    if (message.includes('campo(s) comum(ns) preenchido(s) encontrado(s).')) { const n = Number(message.split(' ')[0]); return n + (n === 1 ? ' populated common field found. Values are not shown.' : ' populated common fields found. Values are not shown.'); }
    return message;
  };
  const say = (message, state = '') => { status.textContent = translate(message); status.dataset.state = state; };
  const readField = (doc, getter) => { try { const value = getter(doc); return value instanceof Date ? (Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString(isEnglish ? 'en-US' : 'pt-BR')) : String(value || '').trim(); } catch { return ''; } };
  const setBusy = value => {
    busy = value;
    choose.disabled = value;
    analyze.disabled = value || !currentFile;
    clean.disabled = value || !currentFile || !acknowledgement.checked;
    reset.disabled = value || !currentFile;
  };
  const clearAnalysis = () => { results.classList.add('utility-hidden'); fieldList.replaceChildren(); clean.disabled = true; };
  const resetTool = () => {
    currentFile = null;
    input.value = '';
    selected.classList.add('utility-hidden');
    clearAnalysis();
    acknowledgement.checked = false;
    setBusy(false);
    say('Escolha um PDF para começar.');
  };

  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    clearAnalysis();
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
      currentFile = null;
      selected.classList.add('utility-hidden');
      say('Escolha um arquivo PDF válido.', 'error');
      setBusy(false);
      return;
    }
    if (file.size > MAX_SIZE) {
      currentFile = null;
      selected.classList.add('utility-hidden');
      say('Este arquivo passa do limite de 30 MB. Tente uma cópia menor.', 'error');
      setBusy(false);
      return;
    }
    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size) + (isEnglish ? ' · 30 MB limit' : ' · limite de 30 MB');
    selected.classList.remove('utility-hidden');
    acknowledgement.checked = false;
    setBusy(false);
    say('Arquivo selecionado. Analise os campos comuns antes de criar a cópia.');
  });

  acknowledgement.addEventListener('change', () => {
    clean.disabled = busy || !currentFile || !acknowledgement.checked;
  });

  analyze.addEventListener('click', async () => {
    if (!currentFile) return;
    setBusy(true);
    say('Carregando a ferramenta de PDF pela primeira vez…', 'busy');
    try {
      await ensurePdfLibrary();
      say('Lendo os campos de metadados localmente…', 'busy');
      const bytes = await currentFile.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      const found = labels.filter(([, getter]) => readField(doc, getter));
      fieldList.replaceChildren();
      if (found.length) {
        for (const [label] of found) {
          const item = document.createElement('li');
          item.textContent = label;
          fieldList.append(item);
        }
      } else {
        const item = document.createElement('li');
        item.textContent = 'Nenhum campo comum preenchido foi encontrado';
        fieldList.append(item);
      }
      results.classList.remove('utility-hidden');
      window.higienizadorTrack?.('tool_analysis_completed', { tool: 'pdf' });
      clean.dataset.infoCount = String(found.length);
      say(found.length ? found.length + ' campo(s) comum(ns) preenchido(s) encontrado(s). Os valores não são mostrados.' : 'Não encontramos campos comuns preenchidos; ainda é possível gerar uma cópia regravada.', '');
    } catch (error) {
      results.classList.add('utility-hidden');
      say(window.PDFLib
        ? 'Não foi possível ler este PDF. Arquivos protegidos por senha, danificados ou com estruturas não compatíveis não podem ser processados.'
        : 'A biblioteca de PDF não carregou. Confira sua conexão e tente novamente.', 'error');
    } finally {
      setBusy(false);
    }
  });

  clean.addEventListener('click', async () => {
    if (!currentFile || !acknowledgement.checked) return;
    setBusy(true);
    say('Carregando a ferramenta de PDF pela primeira vez…', 'busy');
    try {
      await ensurePdfLibrary();
      say('Criando uma cópia limpa no seu navegador…', 'busy');
      const bytes = await currentFile.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      const infoRef = doc.context && doc.context.trailerInfo && doc.context.trailerInfo.Info;
      let removed = 0;
      if (infoRef) {
        const info = doc.context.lookup(infoRef);
        if (info && typeof info.keys === 'function' && typeof info.delete === 'function') {
          for (const key of info.keys()) if (info.delete(key)) removed += 1;
        }
      }
      if (doc.catalog && typeof doc.catalog.delete === 'function' && doc.catalog.delete(PDFLib.PDFName.of('Metadata'))) removed += 1;
      const cleanedBytes = await doc.save();
      const blob = new Blob([cleanedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile.name.replace(/\.pdf$/i, '') + (isEnglish ? '-metadata-cleaned.pdf' : '-metadados-limpos.pdf');
      window.higienizadorTrack?.('tool_clean_completed', { tool: 'pdf' });
      window.higienizadorTrack?.('tool_result_downloaded', { tool: 'pdf' });
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      say('Cópia criada e baixada. ' + removed + ' entrada(s) comum(ns) de metadados foram removidas; o original ficou intacto.');
    } catch (error) {
      say(window.PDFLib
        ? 'Não foi possível gerar esta cópia. O arquivo original permanece intacto; tente outro PDF sem senha.'
        : 'A biblioteca de PDF não carregou. O arquivo original permanece intacto; confira sua conexão e tente novamente.', 'error');
    } finally {
      setBusy(false);
    }
  });
  reset.addEventListener('click', resetTool);
  resetTool();
})();
