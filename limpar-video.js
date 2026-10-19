(() => {
  'use strict';

  const IS_ENGLISH = document.documentElement.lang === 'en';
  const ENGLISH_MESSAGES = {
    'Escolha um vídeo MP4 ou MOV. Outros formatos ainda não são compatíveis.': 'Choose an MP4 or MOV video. Other formats are not supported yet.',
    'O limite desta versão é 200 MB por vídeo.': 'The limit is 200 MB per video.',
    'Este arquivo está vazio.': 'This file is empty.',
    'A estrutura do vídeo está incompleta.': 'The video structure is incomplete.',
    'Este vídeo excede o tamanho que o navegador consegue processar com segurança.': 'This video exceeds the size that the browser can safely process.',
    'O arquivo não parece ser um MP4/MOV íntegro.': 'This does not appear to be a valid MP4/MOV file.',
    'Campo de metadados': 'Metadata field',
    'O vídeo tem uma estrutura de metadados complexa demais para esta versão.': 'The video metadata structure is too complex for this version.',
    'O vídeo contém metadados demais para esta versão.': 'The video contains too much metadata for this version.',
    'O vídeo tem fragmentos demais para esta versão.': 'The video has too many fragments for this version.',
    'Não encontramos uma estrutura MP4/MOV compatível neste arquivo.': 'We could not find a compatible MP4/MOV structure in this file.',
    'A seção de metadados deste vídeo é grande demais para esta versão.': 'This video metadata section is too large for this version.',
    'Encontramos campos sobrepostos e interrompemos a limpeza para preservar o vídeo.': 'We found overlapping fields and stopped cleaning to preserve the video.',
    'Nenhum campo comum reconhecido': 'No recognized common fields',
    'Encontramos um indicador de Content Credentials/C2PA na estrutura do arquivo. A ferramenta não altera este vídeo para não interferir em sua procedência. Isso não verifica a validade da credencial.': 'We found a Content Credentials/C2PA indicator in the file structure. The tool will not change this video to avoid interfering with its provenance. This does not verify the credential.',
    'A cópia limpa foi bloqueada para preservar a possível credencial de procedência.': 'Cleaning was blocked to preserve the possible provenance credential.',
    'Há um bloco avançado que não conseguimos inspecionar com segurança. Ele pode conter dados proprietários ou de procedência; por isso, a ferramenta não altera este vídeo.': 'There is an advanced block we cannot safely inspect. It may contain proprietary or provenance data, so the tool will not change this video.',
    'A cópia limpa foi bloqueada porque não foi possível verificar um bloco do arquivo.': 'Cleaning was blocked because we could not inspect one of the file blocks.',
    'Exibimos os tipos de campos, sem revelar seus valores. Blocos desconhecidos são preservados. A análise não encontrou um indicador C2PA reconhecível; isso não detecta marcas invisíveis nos quadros.': 'We show field types without revealing their values. Unknown blocks are preserved. The scan found no recognizable C2PA indicator; it does not detect invisible marks in the video frames.',
    'Não exibimos valores de metadados. Blocos desconhecidos são preservados e a análise não detecta marcas invisíveis nos quadros.': 'Metadata values are not shown. Unknown blocks are preserved, and the scan does not detect invisible marks in the video frames.',
    'Não encontramos campos comuns que esta versão consiga limpar.': 'We found no common fields this version can clean.',
    'Analisando vídeo…': 'Analyzing video…',
    'Lendo a estrutura local do arquivo. Nenhum conteúdo é enviado.': 'Reading the file structure on your device. No content is uploaded.',
    'Não foi possível analisar este arquivo.': 'Could not analyze this file.',
    'Analisar vídeo': 'Analyze video',
    'Cópia criada sem recompactar as faixas de vídeo e áudio. O original permaneceu intacto.': 'Copy created without re-encoding the video or audio tracks. The original was left unchanged.',
    'Título': 'Title',
    'Autor ou artista': 'Author or artist',
    'Álbum': 'Album',
    'Data': 'Date',
    'Programa de edição': 'Editing software',
    'Codificador': 'Encoder',
    'Comentário': 'Comment',
    'Descrição': 'Description',
    'Direitos autorais': 'Copyright',
    'Localização': 'Location',
    'Direção': 'Director',
    'Autor': 'Author',
    'Produtor': 'Producer',
    'Editora': 'Publisher',
    'Palavras-chave': 'Keywords',
    'Artista': 'Performer',
    'Gênero': 'Genre',
    'Ano': 'Year',
  };
  const localized = (text, en) => IS_ENGLISH ? (en || ENGLISH_MESSAGES[text] || text) : text;

  const MAX_FILE_SIZE = 200 * 1024 * 1024;
  const MAX_MOVIE_BOX_SIZE = 32 * 1024 * 1024;
  const MAX_UUID_SCAN_SIZE = 4 * 1024 * 1024;
  const MAX_TOP_LEVEL_BOXES = 5000;
  const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'mvex', 'moof', 'traf', 'udta']);
  const C2PA_UUID = [0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28, 0x87, 0x7e, 0xc4, 0x81];
  const QUICKTIME_TAGS = {
    '©nam': localized('Título'),
    '©ART': localized('Autor ou artista'),
    '©alb': localized('Álbum'),
    '©day': localized('Data'),
    '©too': localized('Programa de edição'),
    '©enc': localized('Codificador'),
    '©cmt': localized('Comentário'),
    '©des': localized('Descrição'),
    '©cpy': localized('Direitos autorais'),
    '©xyz': localized('Localização'),
    '©dir': localized('Direção'),
    '©wrt': localized('Autor'),
    '©prd': localized('Produtor'),
    '©pub': localized('Editora'),
    '©key': localized('Palavras-chave'),
    loci: localized('Localização'),
    cprt: localized('Direitos autorais'),
    auth: localized('Autor'),
    titl: localized('Título'),
    perf: localized('Artista'),
    gnre: localized('Gênero'),
    dscp: localized('Descrição'),
    albm: localized('Álbum'),
    yrrc: localized('Ano')
  };

  const fileInput = document.getElementById('videoFile');
  const dropzone = document.getElementById('videoDropzone');
  const chooseButton = document.getElementById('videoChoose');
  const selected = document.getElementById('videoSelected');
  const fileName = document.getElementById('videoFileName');
  const fileSize = document.getElementById('videoFileSize');
  const removeButton = document.getElementById('videoReset');
  const analyzeButton = document.getElementById('videoAnalyze');
  const downloadButton = document.getElementById('videoDownload');
  const results = document.getElementById('videoResults');
  const fields = document.getElementById('videoFields');
  const note = document.getElementById('videoNote');
  const status = document.getElementById('videoStatus');

  if (!fileInput || !dropzone || !analyzeButton || !downloadButton) return;

  let currentFile = null;
  let analysis = null;
  let busy = false;

  function updateStatus(message, state = '') {
    status.textContent = localized(message);
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) + ' MB';
  }

  function clearAnalysis() {
    analysis = null;
    analyzeButton.disabled = !currentFile;
    downloadButton.disabled = true;
    results.classList.add('utility-hidden');
    fields.replaceChildren();
    note.textContent = '';
  }

  function selectFile(file) {
    clearAnalysis();
    updateStatus('');
    if (!file) {
      currentFile = null;
      analyzeButton.disabled = true;
      selected.classList.add('utility-hidden');
      fileInput.value = '';
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();
    if (!['mp4', 'mov'].includes(extension)) {
      currentFile = null;
      analyzeButton.disabled = true;
      selected.classList.add('utility-hidden');
      fileInput.value = '';
      updateStatus('Escolha um vídeo MP4 ou MOV. Outros formatos ainda não são compatíveis.', 'error');
      return;
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      currentFile = null;
      analyzeButton.disabled = true;
      selected.classList.add('utility-hidden');
      fileInput.value = '';
      updateStatus(file.size ? 'O limite desta versão é 200 MB por vídeo.' : 'Este arquivo está vazio.', 'error');
      return;
    }

    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size) + ' · MP4/MOV';
    selected.classList.remove('utility-hidden');
    analyzeButton.disabled = false;
  }

  function boxType(bytes, offset) {
    return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
  }

  function parseBox(bytes, offset, limit) {
    if (offset + 8 > limit) throw new Error('A estrutura do vídeo está incompleta.');
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, limit - offset);
    const initialSize = view.getUint32(0, false);
    const type = boxType(bytes, offset + 4);
    let size = initialSize;
    let headerSize = 8;
    let extended = false;

    if (initialSize === 1) {
      if (offset + 16 > limit) throw new Error('A estrutura do vídeo está incompleta.');
      const largeSize = view.getBigUint64(8, false);
      if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Este vídeo excede o tamanho que o navegador consegue processar com segurança.');
      size = Number(largeSize);
      headerSize = 16;
      extended = true;
    } else if (initialSize === 0) {
      size = limit - offset;
    }

    if (size < headerSize || offset + size > limit) throw new Error('O arquivo não parece ser um MP4/MOV íntegro.');
    return { offset, size, end: offset + size, headerSize, type, extended };
  }

  async function readFileBox(file, offset) {
    const header = new Uint8Array(await file.slice(offset, Math.min(file.size, offset + 16)).arrayBuffer());
    if (header.length < 8) throw new Error('A estrutura do vídeo está incompleta.');
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const initialSize = view.getUint32(0, false);
    const type = boxType(header, 4);
    let size = initialSize;
    let headerSize = 8;
    let extended = false;

    if (initialSize === 1) {
      if (header.length < 16) throw new Error('A estrutura do vídeo está incompleta.');
      const largeSize = view.getBigUint64(8, false);
      if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Este vídeo excede o tamanho que o navegador consegue processar com segurança.');
      size = Number(largeSize);
      headerSize = 16;
      extended = true;
    } else if (initialSize === 0) {
      size = file.size - offset;
    }

    if (size < headerSize || offset + size > file.size) throw new Error('O arquivo não parece ser um MP4/MOV íntegro.');
    return { offset, size, end: offset + size, headerSize, type, extended };
  }

  function includesAscii(bytes, phrase) {
    const needle = phrase.toLowerCase();
    for (let i = 0; i <= bytes.length - needle.length; i += 1) {
      let matched = true;
      for (let j = 0; j < needle.length; j += 1) {
        let code = bytes[i + j];
        if (code >= 65 && code <= 90) code += 32;
        if (code !== needle.charCodeAt(j)) {
          matched = false;
          break;
        }
      }
      if (matched) return true;
    }
    return false;
  }

  function hasC2paUuid(bytes) {
    return bytes.length >= C2PA_UUID.length && C2PA_UUID.every((byte, index) => bytes[index] === byte);
  }

  function labelFor(type) {
    return QUICKTIME_TAGS[type] || localized('Campo de metadados');
  }

  function addRange(ranges, labels, range) {
    if (range.end <= range.start) return;
    ranges.push(range);
    labels.add(range.label);
  }

  function walkMovieBoxes(bytes, offset, limit, absoluteMovieStart, ranges, labels, depth = 0) {
    if (depth > 14) throw new Error('O vídeo tem uma estrutura de metadados complexa demais para esta versão.');
    let position = offset;
    let count = 0;

    while (position + 8 <= limit) {
      if (count++ > 50000) throw new Error('O vídeo contém metadados demais para esta versão.');
      const box = parseBox(bytes, position, limit);

      if (box.type === 'mvhd' || box.type === 'tkhd' || box.type === 'mdhd') {
        const payload = position + box.headerSize;
        if (payload + 4 <= box.end) {
          const version = bytes[payload];
          const width = version === 1 ? 8 : 4;
          const creationStart = payload + 4;
          const modificationStart = creationStart + width;
          const timeEnd = modificationStart + width;
          if (version <= 1 && timeEnd <= box.end) {
            let nonzero = false;
            for (let i = creationStart; i < timeEnd; i += 1) nonzero ||= bytes[i] !== 0;
            if (nonzero) addRange(ranges, labels, {
              start: absoluteMovieStart + creationStart,
              end: absoluteMovieStart + timeEnd,
              kind: 'bytes',
              label: localized('Datas de criação e alteração', 'Creation and modification dates')
            });
          }
        }
      }

      if (box.type === 'ilst') {
        let itemPosition = position + box.headerSize;
        while (itemPosition + 8 <= box.end) {
          const item = parseBox(bytes, itemPosition, box.end);
          if (QUICKTIME_TAGS[item.type]) {
            addRange(ranges, labels, {
              start: absoluteMovieStart + item.offset,
              end: absoluteMovieStart + item.end,
              kind: 'box',
              extended: item.extended,
              label: labelFor(item.type)
            });
          }
          itemPosition = item.end;
        }
      } else if (QUICKTIME_TAGS[box.type]) {
        addRange(ranges, labels, {
          start: absoluteMovieStart + box.offset,
          end: absoluteMovieStart + box.end,
          kind: 'box',
          extended: box.extended,
          label: labelFor(box.type)
        });
      } else if (CONTAINERS.has(box.type)) {
        walkMovieBoxes(bytes, position + box.headerSize, box.end, absoluteMovieStart, ranges, labels, depth + 1);
      } else if (box.type === 'meta') {
        const childOffset = position + box.headerSize + 4;
        if (childOffset <= box.end) walkMovieBoxes(bytes, childOffset, box.end, absoluteMovieStart, ranges, labels, depth + 1);
      }

      position = box.end;
    }
  }

  function replaceWithFreeBox(bytes, start, end, extended) {
    const size = end - start;
    bytes.fill(0, start, end);
    const view = new DataView(bytes.buffer, bytes.byteOffset + start, size);
    const useExtended = extended || size > 0xffffffff;
    view.setUint32(0, useExtended ? 1 : size, false);
    view.setUint8(4, 102);
    view.setUint8(5, 114);
    view.setUint8(6, 101);
    view.setUint8(7, 101);
    if (useExtended) view.setBigUint64(8, BigInt(size), false);
  }

  async function inspectVideo(file) {
    let movieBox = null;
    let hasFileType = false;
    let credentialMarker = false;
    let oversizedUuid = false;
    let topLevelUuidCount = 0;
    let position = 0;
    let topLevelCount = 0;

    while (position + 8 <= file.size) {
      if (topLevelCount++ >= MAX_TOP_LEVEL_BOXES) throw new Error('O vídeo tem fragmentos demais para esta versão.');
      const box = await readFileBox(file, position);
      if (box.type === 'ftyp') hasFileType = true;
      if (box.type === 'moov') movieBox = box;
      if (box.type === 'uuid') {
        topLevelUuidCount += 1;
        if (box.size - box.headerSize > MAX_UUID_SCAN_SIZE) {
          oversizedUuid = true;
        } else {
          const uuidBytes = new Uint8Array(await file.slice(box.offset + box.headerSize, box.end).arrayBuffer());
          if (hasC2paUuid(uuidBytes) || includesAscii(uuidBytes, 'c2pa')) credentialMarker = true;
        }
      }
      if (box.type === 'c2pa') credentialMarker = true;
      position = box.end;
    }

    if (!hasFileType || !movieBox) throw new Error('Não encontramos uma estrutura MP4/MOV compatível neste arquivo.');
    if (movieBox.size > MAX_MOVIE_BOX_SIZE) throw new Error('A seção de metadados deste vídeo é grande demais para esta versão.');

    const movieBytes = new Uint8Array(await file.slice(movieBox.offset, movieBox.end).arrayBuffer());
    if (includesAscii(movieBytes, 'c2pa')) credentialMarker = true;
    const ranges = [];
    const labels = new Set();
    walkMovieBoxes(movieBytes, movieBox.headerSize, movieBytes.length, movieBox.offset, ranges, labels);

    ranges.sort((a, b) => a.start - b.start);
    for (let i = 1; i < ranges.length; i += 1) {
      if (ranges[i].start < ranges[i - 1].end) throw new Error('Encontramos campos sobrepostos e interrompemos a limpeza para preservar o vídeo.');
    }

    return {
      movieBox,
      movieBytes,
      ranges,
      labels: [...labels],
      credentialMarker,
      oversizedUuid,
      hasUnknownUuid: topLevelUuidCount > 0
    };
  }

  function renderAnalysis(result) {
    fields.replaceChildren();
    result.labels.forEach((label) => {
      const item = document.createElement('li');
      item.textContent = label;
      fields.append(item);
    });
    if (!result.labels.length) {
      const item = document.createElement('li');
      item.textContent = localized('Nenhum campo comum reconhecido');
      fields.append(item);
    }

    if (result.credentialMarker) {
      note.textContent = localized('Encontramos um indicador de Content Credentials/C2PA na estrutura do arquivo. A ferramenta não altera este vídeo para não interferir em sua procedência. Isso não verifica a validade da credencial.');
      updateStatus('A cópia limpa foi bloqueada para preservar a possível credencial de procedência.', 'warning');
    } else if (result.oversizedUuid) {
      note.textContent = localized('Há um bloco avançado que não conseguimos inspecionar com segurança. Ele pode conter dados proprietários ou de procedência; por isso, a ferramenta não altera este vídeo.');
      updateStatus('A cópia limpa foi bloqueada porque não foi possível verificar um bloco do arquivo.', 'warning');
    } else if (result.labels.length) {
      note.textContent = localized('Exibimos os tipos de campos, sem revelar seus valores. Blocos desconhecidos são preservados. A análise não encontrou um indicador C2PA reconhecível; isso não detecta marcas invisíveis nos quadros.');
      downloadButton.disabled = false;
      updateStatus(IS_ENGLISH ? result.labels.length + ' common field type(s) found. Review the limitations before downloading the copy.' : result.labels.length + ' tipo(s) de campo comum(ns) encontrados. Revise as limitações antes de baixar a cópia.', 'busy');
    } else {
      note.textContent = localized('Não exibimos valores de metadados. Blocos desconhecidos são preservados e a análise não detecta marcas invisíveis nos quadros.');
      updateStatus('Não encontramos campos comuns que esta versão consiga limpar.', 'busy');
    }

    results.classList.remove('utility-hidden');
  }

  async function analyze() {
    if (!currentFile || busy) return;
    const file = currentFile;
    busy = true;
    analyzeButton.disabled = true;
    downloadButton.disabled = true;
    analyzeButton.textContent = localized('Analisando vídeo…');
    updateStatus('Lendo a estrutura local do arquivo. Nenhum conteúdo é enviado.', 'busy');

    try {
      analysis = await inspectVideo(file);
      if (currentFile !== file) return;
      renderAnalysis(analysis);
      window.higienizadorTrack?.('tool_analysis_completed', { tool: 'video' });
    } catch (error) {
      if (currentFile !== file) return;
      analysis = null;
      results.classList.add('utility-hidden');
      updateStatus(error instanceof Error ? error.message : 'Não foi possível analisar este arquivo.', 'error');
    } finally {
      busy = false;
      analyzeButton.textContent = localized('Analisar vídeo');
      analyzeButton.disabled = !currentFile;
    }
  }

  function downloadCleanCopy() {
    if (!currentFile || !analysis || !analysis.ranges.length || analysis.credentialMarker || analysis.oversizedUuid || busy) return;
    const movieCopy = analysis.movieBytes.slice();

    analysis.ranges.forEach((range) => {
      const start = range.start - analysis.movieBox.offset;
      const end = range.end - analysis.movieBox.offset;
      if (range.kind === 'box') replaceWithFreeBox(movieCopy, start, end, range.extended);
      else movieCopy.fill(0, start, end);
    });

    const cleaned = new Blob([
      currentFile.slice(0, analysis.movieBox.offset),
      movieCopy,
      currentFile.slice(analysis.movieBox.end)
    ], { type: currentFile.type || 'video/mp4' });
    const extension = currentFile.name.split('.').pop().toLowerCase();
    const baseName = currentFile.name.replace(/\.[^.]+$/, '');
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(cleaned);
    link.href = objectUrl;
    link.download = baseName + (IS_ENGLISH ? '-metadata-cleaned.' : '-metadados-limpos.') + extension;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    updateStatus('Cópia criada sem recompactar as faixas de vídeo e áudio. O original permaneceu intacto.', '');
    window.higienizadorTrack?.('tool_clean_completed', { tool: 'video' });
    window.higienizadorTrack?.('tool_result_downloaded', { tool: 'video' });
  }

  chooseButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => selectFile(fileInput.files?.[0] || null));
  removeButton.addEventListener('click', () => selectFile(null));
  analyzeButton.addEventListener('click', analyze);
  downloadButton.addEventListener('click', downloadCleanCopy);

  ['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
  }));
  dropzone.addEventListener('drop', (event) => selectFile(event.dataTransfer?.files?.[0] || null));
})();
