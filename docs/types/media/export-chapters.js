export function chapterZipFilename(base) {
  return String(base || 'audio')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    + '_ACX_chapters.zip';
}

export function chaptersReady(chapters) {
  return chapters.length > 0
    && chapters.every((chapter) => Number.isFinite(Number(chapter.start))
      && Number.isFinite(Number(chapter.end))
      && Number(chapter.end) > Number(chapter.start));
}

export function buildChapterZipControls(makeButton) {
  const chapterWrap = document.createElement('div');
  chapterWrap.className = 'media-export-chapter-card';

  const chapterCopy = document.createElement('div');
  chapterCopy.className = 'media-export-chapter-copy';

  const chapterTitle = document.createElement('div');
  chapterTitle.className = 'media-export-chapter-title';
  chapterTitle.textContent = 'Chapter ACX ZIP';

  const chapterDetail = document.createElement('div');
  chapterDetail.className = 'media-export-chapter-detail';
  chapterDetail.textContent = 'Exports one ACX MP3 per chapter and packages them as a ZIP.';

  const chapterStatus = document.createElement('div');
  chapterStatus.className = 'media-export-chapter-status';

  chapterCopy.append(chapterTitle, chapterDetail);
  const chapterBtn = makeButton('Export chapter ACX ZIP', 'media-ed-run media-export-chapter-run');
  chapterWrap.append(chapterCopy, chapterBtn, chapterStatus);

  function sync(nextChapters) {
    const list = Array.isArray(nextChapters) ? nextChapters : [];
    chapterWrap.hidden = list.length === 0;
    if (!list.length) return;

    const count = list.length;
    const ready = chaptersReady(list);
    chapterBtn.disabled = !ready;
    chapterStatus.textContent = ready
      ? `${count} chapter${count === 1 ? '' : 's'} ready; output is mono 44.1 kHz MP3 192k CBR.`
      : 'Waiting for media duration before chapter ZIP export.';
  }

  return {
    el: chapterWrap,
    button: chapterBtn,
    status: chapterStatus,
    sync,
  };
}
