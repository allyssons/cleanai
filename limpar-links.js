(() => {
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

  const say = (message, state = '') => { status.textContent = message; status.dataset.state = state; };
  const trackingKey = key => key.toLowerCase().startsWith('utm_') || knownTracking.has(key.toLowerCase());
  const updateCount = () => {
    const chars = source.value.length;
    count.textContent = chars.toLocaleString('pt-BR') + ' / ' + MAX_CHARS.toLocaleString('pt-BR') + ' caracteres';
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
    source.value = 'https://exemplo.com/artigo?utm_source=rede-social&fbclid=exemplo123&id=42#leitura';
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
    const summary = changedLinks + ' link(s) alterado(s); ' + removedTotal + ' parâmetro(s) de rastreamento conhecido(s) removido(s).';
    say(warnings.length ? summary + ' ' + warnings.length + ' linha(s) precisam de revisão; veja os endereços mantidos no resultado.' : (urlCount ? summary : 'Não encontramos links para processar.'), warnings.length ? 'warning' : '');
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
