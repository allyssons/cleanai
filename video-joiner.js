(() => {
  'use strict';

  const MAX_FILES = 6;
  const MAX_FILE_BYTES = 200 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
  const MAX_TOTAL_DURATION = 15 * 60;
  const FFmpegBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
  const FFmpegScript = '/vendor/ffmpeg/ffmpeg.js';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    tooMany: 'Choose up to six video files.', tooLarge: 'Each video must be 200 MB or smaller.', totalLarge: 'The combined file size must be 500 MB or smaller.',
    invalid: 'Choose MP4 or MOV files with audio.', empty: 'This file is empty.',
    ready: 'Files are ready. Arrange their order, then analyze the cuts.',
    library: 'Loading the video engine (about 31 MB). This happens only when you start the tool.',
    libraryError: 'The video engine could not be loaded. Check your connection and try again.',
    working: 'Preparing videos in this browser…', analyzing: (i,n) => `Analyzing silence in clip ${i} of ${n}…`,
    creating: 'Joining clips and rendering the MP4 in this browser…', doneAnalysis: 'Cut analysis is ready. Review the proposed clips before creating the video.',
    noAudio: 'We could not find an audio track in this clip. This tool needs audio to detect speech and silence.',
    badVideo: 'We could not read this video. Use a complete MP4 or MOV file with a supported video and audio codec.',
    totalTooLong: 'All selected clips together must be fifteen minutes or shorter in this version.',
    createReady: 'The video is ready. Play the preview and check the audio before sharing.',
    renderError: 'The browser could not finish this video. Try fewer or smaller clips on a computer.',
    memoryError: 'The browser ran out of memory. Try fewer or smaller clips, or close other tabs.',
    analyzingButton: 'Analyzing…', creatingButton: 'Creating video…', loadingButton: 'Preparing…',
    up: 'Move up', down: 'Move down', remove: 'Remove', clip: 'Clip', cut: 'Cut', keeps: 'Keeps', starts: 'from', ends: 'to', full: 'No long silence above the selected limit was found; keeps the full clip.',
    removed: 'removed', noSpeech: 'No clear audio segment was found; keeps the full clip.',
    selectionRequired: 'Add at least two clips to continue.', progress: 'Working locally in your browser. Processing time depends on your device and video length.'
  } : {
    tooMany: 'Escolha até seis vídeos.', tooLarge: 'Cada vídeo precisa ter até 200 MB.', totalLarge: 'O tamanho total dos arquivos precisa ser de até 500 MB.',
    invalid: 'Escolha arquivos MP4 ou MOV com áudio.', empty: 'Este arquivo está vazio.',
    ready: 'Arquivos prontos. Organize a ordem e analise os cortes.',
    library: 'Carregando o mecanismo de vídeo (cerca de 31 MB). Isso acontece somente ao iniciar a ferramenta.',
    libraryError: 'Não foi possível carregar o mecanismo de vídeo. Confira sua conexão e tente novamente.',
    working: 'Preparando os vídeos neste navegador…', analyzing: (i,n) => `Analisando o silêncio no clipe ${i} de ${n}…`,
    creating: 'Juntando os clipes e montando o MP4 neste navegador…', doneAnalysis: 'Análise pronta. Revise os cortes propostos antes de criar o vídeo.',
    noAudio: 'Não encontramos uma faixa de áudio neste clipe. A ferramenta precisa do áudio para detectar fala e silêncio.',
    badVideo: 'Não conseguimos ler este vídeo. Use um arquivo MP4 ou MOV íntegro com codecs de áudio e vídeo compatíveis.',
    totalTooLong: 'Nesta versão, a duração somada dos clipes precisa ser de até quinze minutos.',
    createReady: 'Vídeo pronto. Assista à prévia e confira o áudio antes de compartilhar.',
    renderError: 'O navegador não conseguiu terminar este vídeo. Tente menos clipes ou arquivos menores em um computador.',
    memoryError: 'O navegador ficou sem memória. Tente menos clipes ou arquivos menores e feche outras abas.',
    analyzingButton: 'Analisando…', creatingButton: 'Criando vídeo…', loadingButton: 'Preparando…',
    up: 'Mover para cima', down: 'Mover para baixo', remove: 'Remover', clip: 'Clipe', cut: 'Corte', keeps: 'Mantém', starts: 'de', ends: 'a', full: 'Nenhuma pausa acima do limite escolhido foi encontrada; mantém o clipe inteiro.',
    removed: 'removidos', noSpeech: 'Não encontramos trechos claros com áudio; o clipe inteiro será mantido.',
    selectionRequired: 'Adicione pelo menos dois clipes para continuar.', progress: 'Processamento local no navegador. O tempo depende do aparelho e da duração dos vídeos.'
  };

  const $ = (id) => document.getElementById(id);
  const input = $('joinerFiles');
  const dropzone = $('joinerDropzone');
  if (!input || !dropzone) return;

  const choose = $('joinerChoose');
  const selection = $('joinerSelection');
  const orderList = $('joinerOrder');
  const count = $('joinerCount');
  const analyzeButton = $('joinerAnalyze');
  const createButton = $('joinerCreate');
  const resetButton = $('joinerReset');
  const status = $('joinerStatus');
  const progress = $('joinerProgress');
  const results = $('joinerResults');
  const cutsList = $('joinerCuts');
  const preview = $('joinerPreview');
  const video = $('joinerVideo');
  const downloadLink = $('joinerDownload');
  const fadeInput = $('joinerFade');
  const transitionInput = $('joinerTransition');
  const pauseInput = $('joinerPause');
  const marginStartInput = $('joinerMarginStart');
  const marginEndInput = $('joinerMarginEnd');
  const sensitivityInput = $('joinerSensitivity');
  const sensitivityValue = $('joinerSensitivityValue');
  const reviewSummary = $('joinerReviewSummary');
  const sourcePreviewWrap = $('joinerSourcePreviewWrap');
  const sourceVideo = $('joinerSourceVideo');
  const sourceCaption = $('joinerSourceCaption');

  let clips = [];
  let ffmpeg = null;
  let enginePromise = null;
  let analysis = null;
  let running = false;
  let activeLogs = null;
  let outputUrl = null;
  let previewStopAt = null;
  let previewRequestId = 0;
  let currentRun = 0;

  function setStatus(message, state = '') {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function setWorking(value) {
    running = value;
    progress.classList.toggle('utility-hidden', !value);
    analyzeButton.disabled = value || clips.length < 2;
    createButton.disabled = value || !analysis;
    choose.disabled = value;
    resetButton.disabled = value;
  }

  function bytesLabel(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function invalidateAnalysis() {
    analysis = null;
    results.classList.add('utility-hidden');
    cutsList.replaceChildren();
    previewRequestId += 1;
    previewStopAt = null;
    sourceVideo.pause();
    sourceVideo.removeAttribute('src');
    sourceVideo.load();
    sourcePreviewWrap.hidden = true;
    createButton.disabled = true;
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
      video.removeAttribute('src');
      video.load();
      preview.classList.add('utility-hidden');
    }
  }

  async function removeEngineFiles() {
    if (!ffmpeg) return;
    for (let i = 0; i < MAX_FILES; i += 1) {
      try { await ffmpeg.deleteFile(`clip-${i}.mp4`); } catch (_) {}
      try { await ffmpeg.deleteFile(`clip-${i}.mov`); } catch (_) {}
    }
    try { await ffmpeg.deleteFile('joined-output.mp4'); } catch (_) {}
  }

  function formatSeconds(seconds) {
    const value = Math.max(0, seconds);
    const minutes = Math.floor(value / 60);
    const rest = (value - minutes * 60).toFixed(2).padStart(5, '0');
    return `${minutes}:${rest.padStart(5, '0')}`;
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)} s`;
    return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
  }

  function renderFiles() {
    orderList.replaceChildren();
    clips.forEach((clip, index) => {
      const item = document.createElement('li');
      item.className = 'joiner-file';
      const number = document.createElement('span');
      number.className = 'joiner-file-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const details = document.createElement('span');
      details.className = 'joiner-file-details';
      const name = document.createElement('strong');
      name.textContent = clip.file.name;
      const meta = document.createElement('small');
      meta.textContent = `${bytesLabel(clip.file.size)} · ${clip.file.name.split('.').pop().toUpperCase()}`;
      details.append(name, meta);
      const controls = document.createElement('span');
      controls.className = 'joiner-file-controls';
      const up = document.createElement('button');
      up.type = 'button'; up.className = 'quiet-button'; up.textContent = '↑'; up.setAttribute('aria-label', `${copy.up}: ${clip.file.name}`); up.disabled = index === 0 || running;
      up.addEventListener('click', () => moveClip(index, -1));
      const down = document.createElement('button');
      down.type = 'button'; down.className = 'quiet-button'; down.textContent = '↓'; down.setAttribute('aria-label', `${copy.down}: ${clip.file.name}`); down.disabled = index === clips.length - 1 || running;
      down.addEventListener('click', () => moveClip(index, 1));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'quiet-button joiner-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `${copy.remove}: ${clip.file.name}`); remove.disabled = running;
      remove.addEventListener('click', () => removeClip(index));
      controls.append(up, down, remove);
      item.append(number, details, controls);
      orderList.append(item);
    });

    selection.classList.toggle('utility-hidden', clips.length === 0);
    count.textContent = isEnglish ? `${clips.length} of ${MAX_FILES} clips` : `${clips.length} de ${MAX_FILES} clipes`;
    analyzeButton.disabled = running || clips.length < 2;
  }

  function moveClip(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= clips.length || running) return;
    [clips[index], clips[target]] = [clips[target], clips[index]];
    invalidateAnalysis();
    renderFiles();
    setStatus(copy.ready);
  }

  function removeClip(index) {
    if (running) return;
    const clip = clips[index];
    if (clip?.previewUrl) URL.revokeObjectURL(clip.previewUrl);
    if (ffmpeg && clip?.engineName) ffmpeg.deleteFile(clip.engineName).catch(() => {});
    clips.splice(index, 1);
    invalidateAnalysis();
    renderFiles();
    setStatus(clips.length ? copy.ready : '');
  }

  function resetClips() {
    if (running) return;
    clips.forEach((clip) => {
      if (clip.previewUrl) URL.revokeObjectURL(clip.previewUrl);
      if (ffmpeg && clip.engineName) ffmpeg.deleteFile(clip.engineName).catch(() => {});
    });
    clips = [];
    input.value = '';
    invalidateAnalysis();
    renderFiles();
    setStatus('');
  }

  function addFiles(fileList) {
    if (running) return;
    const incoming = [...fileList];
    if (!incoming.length) return;
    if (clips.length + incoming.length > MAX_FILES) {
      setStatus(copy.tooMany, 'error');
      return;
    }
    const total = clips.reduce((sum, clip) => sum + clip.file.size, 0);
    for (const file of incoming) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (!['mp4', 'mov'].includes(extension) || !file.size) {
        setStatus(file.size ? copy.invalid : copy.empty, 'error');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus(copy.tooLarge, 'error');
        return;
      }
      if (total + incoming.slice(0, incoming.indexOf(file) + 1).reduce((sum, item) => sum + item.size, 0) > MAX_TOTAL_BYTES) {
        setStatus(copy.totalLarge, 'error');
        return;
      }
      if (!['video/mp4', 'video/quicktime', 'application/mp4', ''].includes(file.type)) {
        setStatus(copy.invalid, 'error');
        return;
      }
    }
    incoming.forEach((file) => clips.push({ file, previewUrl: URL.createObjectURL(file), engineName: null }));
    input.value = '';
    invalidateAnalysis();
    renderFiles();
    setStatus(clips.length < 2 ? copy.selectionRequired : copy.ready, clips.length < 2 ? 'warning' : '');
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-video-runtime="${url}"]`);
      if (existing) {
        if (window.FFmpegWASM?.FFmpeg) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.dataset.videoRuntime = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error('runtime-download'));
      document.head.append(script);
    });
  }

  async function toBlobURL(url, type) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error('runtime-download');
    return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type }));
  }

  async function loadEngine() {
    if (ffmpeg) return ffmpeg;
    if (!enginePromise) {
      enginePromise = (async () => {
        setStatus(copy.library, 'busy');
        await loadScript(FFmpegScript);
        const FFmpegClass = window.FFmpegWASM?.FFmpeg;
        if (!FFmpegClass) throw new Error('runtime-api');
        const instance = new FFmpegClass();
        instance.on('log', ({ message }) => {
          if (activeLogs) activeLogs.push(String(message));
        });
        const coreURL = await toBlobURL(`${FFmpegBase}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${FFmpegBase}/ffmpeg-core.wasm`, 'application/wasm');
        await instance.load({ coreURL, wasmURL });
        ffmpeg = instance;
        return instance;
      })().catch((error) => {
        enginePromise = null;
        throw error;
      });
    }
    return enginePromise;
  }

  function parseDuration(log) {
    const match = log.match(/Duration:\s*(\d{2}):(\d{2}):([\d.]+)/);
    return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : NaN;
  }

  function parseProbe(log) {
    const lines = log.split(/\r?\n/);
    const videoLine = lines.find((line) => /Stream #\d+:\d+.*Video:/.test(line));
    const audioLine = lines.find((line) => /Stream #\d+:\d+.*Audio:/.test(line));
    const dimensionMatch = videoLine?.match(/(\d{2,5})x(\d{2,5})(?=\s|,|$)/);
    if (!videoLine || !audioLine || !dimensionMatch) {
      if (videoLine && !audioLine) throw new Error('missing-audio');
      throw new Error('bad-video');
    }
    let width = Number(dimensionMatch[1]);
    let height = Number(dimensionMatch[2]);
    const rotation = log.match(/rotation of\s*(-?[\d.]+) degrees/i);
    if (rotation && Math.round(Math.abs(Number(rotation[1]))) % 180 === 90) [width, height] = [height, width];
    const duration = parseDuration(log);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('bad-video');
    return { duration, width, height };
  }

  async function probeClip(clip) {
    const logs = [];
    activeLogs = logs;
    try { await ffmpeg.exec(['-hide_banner', '-i', clip.engineName]); }
    catch (_) { /* FFmpeg prints stream details before the expected missing-output exit. */ }
    finally { activeLogs = null; }
    return parseProbe(logs.join('\n'));
  }

  async function detectSilences(clip, settings) {
    const logs = [];
    activeLogs = logs;
    try {
      await ffmpeg.exec(['-hide_banner', '-nostats', '-i', clip.engineName, '-vn', '-af', `silencedetect=noise=${settings.noiseDb}dB:d=${settings.minSilence}`, '-f', 'null', '-']);
    } finally { activeLogs = null; }
    const events = [];
    logs.forEach((line) => {
      const start = line.match(/silence_start:\s*(-?[\d.]+)/);
      const end = line.match(/silence_end:\s*(-?[\d.]+)/);
      if (start) events.push({ type: 'start', time: Number(start[1]) });
      if (end) events.push({ type: 'end', time: Number(end[1]) });
    });
    const silences = [];
    let start = null;
    events.forEach((event) => {
      if (event.type === 'start') start = Math.max(0, event.time);
      else {
        silences.push([start === null ? 0 : start, event.time]);
        start = null;
      }
    });
    if (start !== null) silences.push([start, clip.info.duration]);
    return silences;
  }

  function speechRanges(silences, duration, settings) {
    let cursor = 0;
    const speech = [];
    silences.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
      if (start - cursor > 0.001) speech.push([cursor, start]);
      cursor = Math.max(cursor, end);
    });
    if (duration - cursor > 0.001) speech.push([cursor, duration]);
    const usableSpeech = speech.filter(([start, end]) => end - start >= 0.15);
    const merged = [];
    usableSpeech.forEach(([start, end]) => {
      const previous = merged[merged.length - 1];
      if (previous && start - previous[1] < settings.joinPause) previous[1] = end;
      else merged.push([start, end]);
    });
    return merged;
  }

  function keepSegments(speech, duration, settings) {
    if (!speech.length) return [{ start: 0, end: duration }];
    const segments = speech.map(([start, end]) => ({
      start: Math.max(0, start - settings.marginStart),
      end: Math.min(duration, end + settings.marginEnd)
    }));
    const merged = [];
    segments.forEach((segment) => {
      const previous = merged[merged.length - 1];
      if (previous && segment.start <= previous.end) previous.end = Math.max(previous.end, segment.end);
      else merged.push(segment);
    });
    return merged;
  }

  function getSettings() {
    const number = (inputEl, fallback, min, max) => {
      const value = Number(inputEl.value);
      return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    };
    const joinPause = number(pauseInput, 0.8, 0.2, 2);
    return {
      fade: number(fadeInput, 0.5, 0.1, 1.5),
      transition: ['cut', 'fadeblack'].includes(transitionInput.value) ? transitionInput.value : 'fade',
      joinPause,
      marginStart: number(marginStartInput, 0.35, 0, 1.5),
      marginEnd: number(marginEndInput, 0.4, 0, 1.5),
      noiseDb: number(sensitivityInput, -35, -45, -20),
      minSilence: Math.min(0.4, joinPause)
    };
  }

  function createCutsList() {
    cutsList.replaceChildren();
    sourceVideo.pause();
    previewStopAt = null;
    let totalOriginal = 0;
    let totalKept = 0;
    analysis.clips.forEach((clip, index) => {
      const item = document.createElement('li');
      item.className = 'joiner-cut-card';
      const cardHead = document.createElement('div');
      cardHead.className = 'joiner-cut-card-head';
      const heading = document.createElement('strong');
      heading.textContent = `${copy.clip} ${index + 1}: ${clip.file.name}`;
      const detail = document.createElement('span');
      const segments = clip.segments;
      const keptDuration = segments.reduce((sum, segment) => sum + segment.end - segment.start, 0);
      const removedDuration = Math.max(0, clip.info.duration - keptDuration);
      totalOriginal += clip.info.duration;
      totalKept += keptDuration;
      if (clip.fallback) detail.textContent = `${copy.noSpeech} ${formatDuration(clip.info.duration)}`;
      else if (removedDuration < 0.05) detail.textContent = `${copy.full} ${formatDuration(clip.info.duration)}`;
      else {
        detail.textContent = isEnglish
          ? `Keeps ${formatDuration(keptDuration)} · removes ${formatDuration(removedDuration)}`
          : `Mantém ${formatDuration(keptDuration)} · remove ${formatDuration(removedDuration)}`;
      }
      cardHead.append(heading, detail);
      const timeline = document.createElement('div');
      timeline.className = 'joiner-timeline';
      timeline.setAttribute('role', 'img');
      timeline.setAttribute('aria-label', isEnglish ? 'Green sections are kept; gaps are removed.' : 'Trechos verdes são mantidos; os espaços são removidos.');
      segments.forEach((segment) => {
        const kept = document.createElement('span');
        kept.className = 'joiner-timeline-kept';
        kept.style.setProperty('--start', `${(segment.start / clip.info.duration) * 100}%`);
        kept.style.setProperty('--size', `${((segment.end - segment.start) / clip.info.duration) * 100}%`);
        timeline.append(kept);
      });
      const segmentList = document.createElement('div');
      segmentList.className = 'joiner-segments';
      segments.forEach((segment, segmentIndex) => {
        const row = document.createElement('div');
        row.className = 'joiner-segment';
        const segmentName = document.createElement('strong');
        segmentName.className = 'joiner-segment-name';
        segmentName.textContent = `${isEnglish ? 'Keep' : 'Manter'} ${String(segmentIndex + 1).padStart(2, '0')}`;
        const startLabel = document.createElement('label');
        startLabel.textContent = isEnglish ? 'In (seconds)' : 'Entrada (segundos)';
        const startInput = document.createElement('input');
        startInput.type = 'number';
        startInput.inputMode = 'decimal';
        startInput.min = String(segmentIndex ? segments[segmentIndex - 1].end : 0);
        startInput.max = String(Math.max(segment.start, segment.end - 0.15));
        startInput.step = '0.05';
        startInput.value = segment.start.toFixed(2);
        startInput.dataset.clipIndex = String(index);
        startInput.dataset.segmentIndex = String(segmentIndex);
        startInput.dataset.edge = 'start';
        startLabel.append(startInput);
        const endLabel = document.createElement('label');
        endLabel.textContent = isEnglish ? 'Out (seconds)' : 'Saída (segundos)';
        const endInput = document.createElement('input');
        endInput.type = 'number';
        endInput.inputMode = 'decimal';
        endInput.min = String(Math.min(clip.info.duration, segment.start + 0.15));
        endInput.max = String(segmentIndex < segments.length - 1 ? segments[segmentIndex + 1].start : clip.info.duration);
        endInput.step = '0.05';
        endInput.value = segment.end.toFixed(2);
        endInput.dataset.clipIndex = String(index);
        endInput.dataset.segmentIndex = String(segmentIndex);
        endInput.dataset.edge = 'end';
        endLabel.append(endInput);
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'quiet-button joiner-segment-preview';
        play.textContent = isEnglish ? 'Preview' : 'Prévia';
        play.setAttribute('aria-label', isEnglish ? `Preview kept segment ${segmentIndex + 1} in ${clip.file.name}` : `Prévia do trecho mantido ${segmentIndex + 1} de ${clip.file.name}`);
        play.dataset.clipIndex = String(index);
        play.dataset.segmentIndex = String(segmentIndex);
        row.append(segmentName, startLabel, endLabel, play);
        segmentList.append(row);
      });
      item.append(cardHead, timeline, segmentList);
      cutsList.append(item);
    });
    reviewSummary.textContent = isEnglish
      ? `${analysis.clips.length} clips · ${formatDuration(totalOriginal)} original · ${formatDuration(totalKept)} kept · ${formatDuration(Math.max(0, totalOriginal - totalKept))} removed`
      : `${analysis.clips.length} clipes · ${formatDuration(totalOriginal)} originais · ${formatDuration(totalKept)} mantidos · ${formatDuration(Math.max(0, totalOriginal - totalKept))} removidos`;
    results.classList.remove('utility-hidden');
  }

  function updateSegment(inputEl) {
    const clip = analysis?.clips[Number(inputEl.dataset.clipIndex)];
    const segmentIndex = Number(inputEl.dataset.segmentIndex);
    if (!clip || !Number.isInteger(segmentIndex)) return;
    const segments = clip.segments;
    const current = segments[segmentIndex];
    const startInput = cutsList.querySelector(`input[data-clip-index="${inputEl.dataset.clipIndex}"][data-segment-index="${segmentIndex}"][data-edge="start"]`);
    const endInput = cutsList.querySelector(`input[data-clip-index="${inputEl.dataset.clipIndex}"][data-segment-index="${segmentIndex}"][data-edge="end"]`);
    const start = Number(startInput.value);
    const end = Number(endInput.value);
    const lowerBound = segmentIndex ? segments[segmentIndex - 1].end : 0;
    const upperBound = segmentIndex < segments.length - 1 ? segments[segmentIndex + 1].start : clip.info.duration;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < lowerBound || end > upperBound || end - start < 0.15) {
      setStatus(isEnglish ? 'Use valid times, leave at least 0.15 seconds, and keep segments in order.' : 'Use tempos válidos, mantenha ao menos 0,15 segundo e não sobreponha os trechos.', 'warning');
      createCutsList();
      return;
    }
    current.start = start;
    current.end = end;
    createCutsList();
    setStatus(isEnglish ? 'Cut updated. Preview it or continue when ready.' : 'Corte atualizado. Confira a prévia ou continue quando quiser.');
  }

  async function previewSegment(button) {
    const clip = analysis?.clips[Number(button.dataset.clipIndex)];
    const segment = clip?.segments[Number(button.dataset.segmentIndex)];
    if (!clip || !segment) return;
    const requestId = ++previewRequestId;
    previewStopAt = segment.end;
    sourcePreviewWrap.hidden = false;
    sourceCaption.textContent = isEnglish
      ? `Previewing ${clip.file.name} from ${formatSeconds(segment.start)} to ${formatSeconds(segment.end)}.`
      : `Prévia de ${clip.file.name}, de ${formatSeconds(segment.start)} a ${formatSeconds(segment.end)}.`;
    sourceVideo.pause();
    if (sourceVideo.src !== clip.previewUrl) {
      sourceVideo.src = clip.previewUrl;
      sourceVideo.load();
    }
    const play = async () => {
      if (requestId !== previewRequestId) return;
      sourceVideo.currentTime = segment.start;
      try { await sourceVideo.play(); }
      catch (_) { setStatus(isEnglish ? 'Press play in the preview to check this segment.' : 'Use o botão de reprodução da prévia para conferir este trecho.', 'warning'); }
    };
    if (sourceVideo.readyState >= 1) await play();
    else sourceVideo.addEventListener('loadedmetadata', play, { once: true });
  }

  async function analyzeClips() {
    if (running) return;
    if (clips.length < 2) {
      setStatus(copy.selectionRequired, 'warning');
      return;
    }
    const runId = ++currentRun;
    invalidateAnalysis();
    setWorking(true);
    try {
      await loadEngine();
      setStatus(copy.working, 'busy');
      await removeEngineFiles();
      for (let index = 0; index < clips.length; index += 1) {
        const clip = clips[index];
        clip.engineName = `clip-${index}.${clip.file.name.split('.').pop().toLowerCase()}`;
        await ffmpeg.writeFile(clip.engineName, new Uint8Array(await clip.file.arrayBuffer()));
      }
      const settings = getSettings();
      let totalDuration = 0;
      for (let index = 0; index < clips.length; index += 1) {
        if (runId !== currentRun) return;
        const clip = clips[index];
        setStatus(copy.analyzing(index + 1, clips.length), 'busy');
        clip.info = await probeClip(clip);
        totalDuration += clip.info.duration;
        if (totalDuration > MAX_TOTAL_DURATION) throw new Error('total-too-long');
        const silences = await detectSilences(clip, settings);
        const speech = speechRanges(silences, clip.info.duration, settings);
        clip.fallback = speech.length === 0;
        clip.segments = keepSegments(speech, clip.info.duration, settings);
        const keptDuration = clip.segments.reduce((sum, segment) => sum + segment.end - segment.start, 0);
        if (keptDuration < 0.5) {
          clip.segments = [{ start: 0, end: clip.info.duration }];
          clip.fallback = true;
        }
      }
      if (runId !== currentRun) return;
      const minDuration = Math.min(...clips.map((clip) => clip.segments.reduce((sum, segment) => sum + segment.end - segment.start, 0)));
      analysis = { clips: clips.slice(), settings, fade: Math.min(settings.fade, 0.45 * minDuration) };
      createCutsList();
      createButton.disabled = false;
      setStatus(copy.doneAnalysis, '');
      window.higienizadorTrack?.('tool_analysis_completed', { tool: 'video_joiner' });
    } catch (error) {
      const message = error?.message || '';
      if (message === 'missing-audio') setStatus(copy.noAudio, 'error');
      else if (message === 'total-too-long') setStatus(copy.totalTooLong, 'error');
      else if (/memory|allocation/i.test(message)) setStatus(copy.memoryError, 'error');
      else if (message === 'bad-video') setStatus(copy.badVideo, 'error');
      else setStatus(ffmpeg ? (isEnglish ? 'Analysis failed. Try a smaller MP4/MOV with audio.' : 'A análise falhou. Tente um MP4/MOV menor, com áudio.') : copy.libraryError, 'error');
      analysis = null;
    } finally {
      if (runId === currentRun) setWorking(false);
    }
  }

  function buildFilterGraph(items, width, height, fade, transition) {
    const filters = [];
    const durations = [];
    const clipLabels = [];
    items.forEach((clip, index) => {
      const segments = clip.segments;
      const videoInputs = segments.map((_, segmentIndex) => `v${index}in${segmentIndex}`);
      const audioInputs = segments.map((_, segmentIndex) => `a${index}in${segmentIndex}`);
      if (segments.length > 1) {
        filters.push(`[${index}:v]split=${segments.length}${videoInputs.map((label) => `[${label}]`).join('')}`);
        filters.push(`[${index}:a]asplit=${segments.length}${audioInputs.map((label) => `[${label}]`).join('')}`);
      }
      const videoSegments = [];
      const audioSegments = [];
      let clipDuration = 0;
      segments.forEach((segment, segmentIndex) => {
        const start = segment.start.toFixed(3);
        const end = segment.end.toFixed(3);
        clipDuration += segment.end - segment.start;
        const videoInput = segments.length > 1 ? `[${videoInputs[segmentIndex]}]` : `[${index}:v]`;
        const audioInput = segments.length > 1 ? `[${audioInputs[segmentIndex]}]` : `[${index}:a]`;
        const videoOutput = `v${index}s${segmentIndex}`;
        const audioOutput = `a${index}s${segmentIndex}`;
        filters.push(`${videoInput}trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p,settb=AVTB[${videoOutput}]`);
        filters.push(`${audioInput}atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[${audioOutput}]`);
        videoSegments.push(videoOutput);
        audioSegments.push(audioOutput);
      });
      durations.push(clipDuration);
      if (segments.length > 1) {
        const concatInputs = segments.map((_, segmentIndex) => `[${videoSegments[segmentIndex]}][${audioSegments[segmentIndex]}]`).join('');
        filters.push(`${concatInputs}concat=n=${segments.length}:v=1:a=1[cv${index}][ca${index}]`);
        clipLabels.push({ video: `cv${index}`, audio: `ca${index}` });
      } else {
        clipLabels.push({ video: videoSegments[0], audio: audioSegments[0] });
      }
    });
    if (transition === 'cut') {
      const clipInputs = clipLabels.map((labels) => `[${labels.video}][${labels.audio}]`).join('');
      filters.push(`${clipInputs}concat=n=${items.length}:v=1:a=1[vjoined][ajoined]`);
      return { graph: filters.join(';'), videoLabel: 'vjoined', audioLabel: 'ajoined' };
    }
    let videoLabel = clipLabels[0].video;
    let audioLabel = clipLabels[0].audio;
    let totalDuration = durations[0];
    const videoTransition = transition === 'fadeblack' ? 'fadeblack' : 'fade';
    for (let index = 1; index < items.length; index += 1) {
      const offset = Math.max(0, totalDuration - fade);
      filters.push(`[${videoLabel}][${clipLabels[index].video}]xfade=transition=${videoTransition}:duration=${fade.toFixed(3)}:offset=${offset.toFixed(3)}[xv${index}]`);
      filters.push(`[${audioLabel}][${clipLabels[index].audio}]acrossfade=d=${fade.toFixed(3)}[xa${index}]`);
      videoLabel = `xv${index}`;
      audioLabel = `xa${index}`;
      totalDuration += durations[index] - fade;
    }
    return { graph: filters.join(';'), videoLabel, audioLabel };
  }

  async function createVideo() {
    if (running || !analysis || !ffmpeg) return;
    const runId = ++currentRun;
    setWorking(true);
    setStatus(copy.creating, 'busy');
    try {
      const first = analysis.clips[0].info;
      const width = Math.max(2, first.width - (first.width % 2));
      const height = Math.max(2, first.height - (first.height % 2));
      const { graph, videoLabel, audioLabel } = buildFilterGraph(analysis.clips, width, height, analysis.fade, analysis.settings.transition);
      const args = ['-y'];
      analysis.clips.forEach((clip) => args.push('-i', clip.engineName));
      args.push('-filter_complex', graph, '-map', `[${videoLabel}]`, '-map', `[${audioLabel}]`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'joined-output.mp4');
      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile('joined-output.mp4');
      if (runId !== currentRun) return;
      const blob = new Blob([data], { type: 'video/mp4' });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      outputUrl = URL.createObjectURL(blob);
      video.src = outputUrl;
      downloadLink.href = outputUrl;
      preview.classList.remove('utility-hidden');
      setStatus(copy.createReady, '');
      window.higienizadorTrack?.('tool_clean_completed', { tool: 'video_joiner' });
    } catch (error) {
      const message = error?.message || '';
      if (/memory|allocation/i.test(message)) setStatus(copy.memoryError, 'error');
      else setStatus(copy.renderError, 'error');
    } finally {
      if (runId === currentRun) setWorking(false);
    }
  }

  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => addFiles(input.files || []));
  resetButton.addEventListener('click', resetClips);
  analyzeButton.addEventListener('click', analyzeClips);
  createButton.addEventListener('click', createVideo);
  cutsList.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.dataset.edge) updateSegment(event.target);
  });
  cutsList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-segment-index]');
    if (button) previewSegment(button);
  });
  sourceVideo.addEventListener('timeupdate', () => {
    if (previewStopAt !== null && sourceVideo.currentTime >= previewStopAt) {
      sourceVideo.pause();
      previewStopAt = null;
    }
  });
  const updateSensitivityLabel = () => {
    const value = Number(sensitivityInput.value);
    sensitivityValue.textContent = `${value < 0 ? '−' : ''}${Math.abs(value)} dB`;
  };
  sensitivityInput.addEventListener('input', updateSensitivityLabel);
  updateSensitivityLabel();
  const settingsChanged = () => {
    if (!analysis) return;
    invalidateAnalysis();
    setStatus(isEnglish ? 'Settings changed. Analyze the cuts again before creating the video.' : 'Os ajustes mudaram. Analise os cortes novamente antes de criar o vídeo.', 'warning');
  };
  [fadeInput, transitionInput, pauseInput, marginStartInput, marginEndInput, sensitivityInput].forEach((field) => {
    field.addEventListener('input', settingsChanged);
    field.addEventListener('change', settingsChanged);
  });
  ['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
  }));
  dropzone.addEventListener('drop', (event) => addFiles(event.dataTransfer?.files || []));
  downloadLink.addEventListener('click', () => {
    window.higienizadorTrack?.('tool_result_downloaded', { tool: 'video_joiner' });
  });
  window.addEventListener('pagehide', () => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    clips.forEach((clip) => { if (clip.previewUrl) URL.revokeObjectURL(clip.previewUrl); });
    if (ffmpeg) ffmpeg.terminate();
  }, { once: true });
})();


