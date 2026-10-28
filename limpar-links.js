(() => {
  const isEnglish = document.documentElement.lang === 'en';
  const byId = id => document.getElementById(id);
  const source = byId('linkSource');
  const output = byId('linkOutput');
  const cleanButton = byId('cleanLinks');
  const sampleButton = byId('linkSample');
  const clearButton = byId('clearLinks');
  const copyButton = byId('copyLinks');
  const status = byId('linkStatus');
  const count = byId('linkCount');
  const MAX_CHARS = 120000;
  const knownTracking = new Set([
    'fbclid', 'gclid', 'dclid', 'msclkid', 'wbraid', 'gbraid', 'igshid',
    'mibextid', 'mc_cid', 'mc_eid', '_ga', '_gl', 'vero_id', 'yclid'
  ]);
  let hasOutput = false;

  const messages = {"Escolha um PDF para começar.":"Choose a PDF to get started.","Escolha um arquivo PDF válido.":"Choose a valid PDF file.","Este arquivo passa do limite de 30 MB. Tente uma cópia menor.":"This file exceeds the 30 MB limit. Try a smaller copy.","Arquivo selecionado. Analise os campos comuns antes de criar a cópia.":"File selected. Review common fields before creating a copy.","Carregando a ferramenta de PDF pela primeira vez…":"Loading the PDF tool for the first time…","Lendo os campos de metadados localmente…":"Reading metadata fields locally…","Nenhum campo comum preenchido foi encontrado":"No populated common fields were found","Não foi possível ler este PDF. Arquivos protegidos por senha, danificados ou com estruturas não compatíveis não podem ser processados.":"This PDF could not be read. Password-protected, damaged, or incompatible files cannot be processed.","A biblioteca de PDF não carregou. Confira sua conexão e tente novamente.":"The PDF library could not load. Check your connection and try again.","Criando uma cópia limpa no seu navegador…":"Creating a cleaned copy in your browser…","Cópia criada e baixada. ":"Cleaned copy created and downloaded. "," entrada(s) comum(ns) de metadados foram removidas; o original ficou intacto.":" common metadata entries were removed; your original is unchanged.","Não foi possível gerar esta cópia. O arquivo original permanece intacto; tente outro PDF sem senha.":"Could not create this copy. Your original is unchanged; try another PDF without a password.","A biblioteca de PDF não carregou. O arquivo original permanece intacto; confira sua conexão e tente novamente.":"The PDF library could not load. Your original is unchanged; check your connection and try again.","Cole um ou mais links para começar.":"Paste one or more links to get started.","Não encontramos links para processar.":"No links to process were found.","Exemplo carregado. Revise-o e clique em limpar.":"Example loaded. Review it, then click Clean."," não parece uma URL válida e foi mantida":" is not a valid URL and was kept"," não usa HTTP ou HTTPS e foi mantida":" does not use HTTP or HTTPS and was kept"," contém credenciais no endereço e foi mantida para revisão manual":" contains credentials and was kept for manual review","Links limpos copiados para a área de transferência.":"Cleaned links copied to the clipboard.","Não foi possível copiar automaticamente. O resultado está selecionado para cópia manual.":"Could not copy automatically. The result is selected for manual copying.","Escolha um documento Office para começar.":"Choose an Office document to get started.","xml":"xml","Escolha um arquivo .docx, .xlsx ou .pptx. Formatos com macros e arquivos antigos não são aceitos.":"Choose a .docx, .xlsx, or .pptx file. Macro-enabled and older formats are not supported.","Este documento passa do limite de 15 MB. Tente uma cópia menor.":"This document exceeds the 15 MB limit. Try a smaller copy.","Arquivo selecionado. Analise os campos de propriedades que esta ferramenta reconhece.":"File selected. Review the property fields this tool recognizes.","Carregando a ferramenta de documentos pela primeira vez…":"Loading the document tool for the first time…","Lendo as propriedades localmente no navegador…":"Reading properties locally in your browser…","Este arquivo parece ter uma assinatura digital. Não vamos regravá-lo para evitar invalidar a assinatura.":"This file appears to have a digital signature. It will not be rewritten to avoid invalidating the signature.","Nenhuma propriedade comum preenchida foi encontrada":"No populated common properties were found","Não foi possível abrir este documento. Ele pode estar danificado, protegido ou usar uma estrutura incompatível.":"Could not open this document. It may be damaged, protected, or use an incompatible structure.","A biblioteca de documentos não carregou. Confira sua conexão e tente novamente.":"The document library could not load. Check your connection and try again.","Limpando propriedades e criando uma cópia no seu navegador…":"Cleaning properties and creating a copy in your browser…"," campo(s) de propriedades reconhecidas foram limpos; o original ficou intacto.":" recognized property fields were cleared; your original is unchanged.","Não foi possível gerar esta cópia. O original permanece intacto; tente outro documento compatível.":"Could not create this copy. Your original is unchanged; try another compatible document."};
  const translate = message => {
    if (!isEnglish) return message;
    if (messages[message]) return messages[message];
    if (message.startsWith('linha ')) return message.replace('linha ', 'line ').replace(' não parece uma URL válida e foi mantida',' is not a valid URL and was kept').replace(' não usa HTTP ou HTTPS e foi mantida',' does not use HTTP or HTTPS and was kept').replace(' contém credenciais no endereço e foi mantida para revisão manual',' contains credentials and was kept for manual review');
    if (message.includes('linha(s) precisam de revisão')) { const marker = ' linha(s) precisam de revisão'; const pos = message.indexOf(marker); const n = Number(message.substring(0, pos).split(' ').pop()); return message.substring(0, pos) + ' ' + (n === 1 ? 'line needs review; check the unchanged addresses in the result.' : 'lines need review; check the unchanged addresses in the result.'); }
    return message;
  };
  const say = (message, state = '') => { status.textContent = translate(message); status.dataset.state = state; };
  const trackingKey = key => key.toLowerCase().startsWith('utm_') || knownTracking.has(key.toLowerCase());
  const updateCount = () => {
    const chars = source.value.length;
    count.textContent = chars.toLocaleString(isEnglish ? 'en-US' : 'pt-BR') + ' / ' + MAX_CHARS.toLocaleString(isEnglish ? 'en-US' : 'pt-BR') + (isEnglish ? ' characters' : ' caracteres');
  };
  const clearOutput = () => {
    output.value = '';
    hasOutput = false;
    copyButton.disabled = true;
  };
  const clearTool = () => {
    source.value = '';
    clearOutput();
    updateCount();
    say('Cole um ou mais links para começar.');
  };

  source.addEventListener('input', () => {
    updateCount();
    clearOutput();
    if (source.value.length > MAX_CHARS) source.value = source.value.slice(0, MAX_CHARS);
  });
  sampleButton.addEventListener('click', () => {
    source.value = 'https://example.com/article?utm_source=social&fbclid=example123&id=42#reading';
    updateCount();
    clearOutput();
    say('Exemplo carregado. Revise-o e clique em limpar.');
  });
  clearButton.addEventListener('click', clearTool);

  cleanButton.addEventListener('click', () => {
    const lines = source.value.split(/\r?\n/);
    const outputLines = [];
    const warnings = [];
    let removedTotal = 0;
    let changedLinks = 0;
    let urlCount = 0;

    lines.forEach((line, index) => {
      if (!line.trim()) { outputLines.push(line); return; }
      const raw = line.trim();
      let parsed;
      try {
        parsed = new URL(raw);
      } catch {
        try { parsed = new URL('https://' + raw); }
        catch { outputLines.push(line); warnings.push('linha ' + (index + 1) + ' não parece uma URL válida e foi mantida'); return; }
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        outputLines.push(line);
        warnings.push('linha ' + (index + 1) + ' não usa HTTP ou HTTPS e foi mantida');
        return;
      }
      if (parsed.username || parsed.password) {
        outputLines.push(line);
        warnings.push('linha ' + (index + 1) + ' contém credenciais no endereço e foi mantida para revisão manual');
        return;
      }
      urlCount += 1;
      const keys = Array.from(parsed.searchParams.keys());
      const remove = keys.filter(trackingKey);
      if (!remove.length) { outputLines.push(line); return; }
      for (const key of remove) parsed.searchParams.delete(key);
      removedTotal += remove.length;
      changedLinks += 1;
      outputLines.push(parsed.toString());
    });

    output.value = outputLines.join('\n');
    hasOutput = true;
    copyButton.disabled = !output.value;
    updateCount();
    window.higienizadorTrack?.('tool_clean_completed', { tool: 'links' });
    const summary = isEnglish ? changedLinks + (changedLinks === 1 ? ' link changed; ' : ' links changed; ') + removedTotal + (removedTotal === 1 ? ' known tracking parameter removed.' : ' known tracking parameters removed.') : changedLinks + ' link(s) alterado(s); ' + removedTotal + ' parâmetro(s) de rastreamento conhecido(s) removido(s).';
    say(warnings.length ? (isEnglish ? summary + ' ' + warnings.length + (warnings.length === 1 ? ' line needs review; check the unchanged addresses in the result.' : ' lines need review; check the unchanged addresses in the result.') : summary + ' ' + warnings.length + ' linha(s) precisam de revisão; veja os endereços mantidos no resultado.') : (urlCount ? summary : (isEnglish ? 'No links to process were found.' : 'Não encontramos links para processar.')), warnings.length ? 'warning' : '');
  });

  copyButton.addEventListener('click', async () => {
    if (!hasOutput || !output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      window.higienizadorTrack?.('tool_result_copied', { tool: 'links' });
      say('Links limpos copiados para a área de transferência.');
    } catch {
      output.focus();
      output.select();
      say('Não foi possível copiar automaticamente. O resultado está selecionado para cópia manual.', 'warning');
    }
  });
  clearTool();
})();
