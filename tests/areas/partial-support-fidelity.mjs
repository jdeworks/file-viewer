const cases = [
  { file: 'sample.blend', type: 'blend', terms: ['scene geometry', 'not decoded or rendered'] },
  { file: 'sample.dcm', type: 'dicom', terms: ['pixel data', 'diagnostic image'] },
  { file: 'sample.dwg', type: 'dwg', terms: ['drawing entities', 'geometry'] },
  { file: 'sample.exr', type: 'exr', terms: ['pixel channels', 'hdr image'] },
  { file: 'sample.fbx', type: 'fbx', terms: ['mesh geometry', 'animation payloads'] },
  { file: 'sample.fits', type: 'fits', terms: ['header-card metadata', 'table-hdu'] },
  { file: 'sample.nc', type: 'netcdf', terms: ['metadata, dimensions', 'variable payload values are omitted'] },
  { file: 'sample.nii', type: 'nifti', terms: ['voxel values', 'orientation transforms'] },
  { file: 'sample.pages', type: 'iwork', terms: ['heuristic text', 'complete document structure'] },
  { file: 'sample.rtf', type: 'rtf', terms: ['basic bold', 'embedded images'] },
  { file: 'sample.sketch', type: 'sketch', terms: ['page/artboard names', 'vector layers'] },
  { file: 'sample.eps', type: 'postscript', terms: ['dsc metadata', 'page artwork'] },
];

async function noticeSnapshot(page, frameOf) {
  const parent = await page.$('#previewHost [data-partial-support]');
  const target = parent ? page : await frameOf('iframe.fv-preview-frame', 12000);
  const selector = parent ? '#previewHost [data-partial-support]' : '[data-partial-support]';
  await target.waitForSelector(selector, { state: 'visible', timeout: 12000 });
  return target.$eval(selector, (notice) => {
    const rect = notice.getBoundingClientRect();
    const style = getComputedStyle(notice);
    const viewportWidth = document.documentElement.clientWidth;
    return {
      text: notice.textContent || '',
      visible: rect.width > 0 && rect.height > 0 && style.display !== 'none'
        && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0,
      inViewport: rect.bottom > 0 && rect.top < innerHeight,
      overflow: Math.max(0, rect.right - viewportWidth, -rect.left),
      pageOverflow: Math.max(0, document.documentElement.scrollWidth - viewportWidth),
    };
  });
}

async function openMalformed(page, filename, type) {
  const textLike = type === 'rtf' || type === 'postscript' || type === 'fbx';
  await page.evaluate(async ({ filename: name, type: expected, textLike: text }) => {
    const bytes = text
      ? new TextEncoder().encode('not valid source')
      : expected === 'iwork'
        ? Uint8Array.of(0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0)
        : Uint8Array.of(0, 1, 2, 3);
    await window.__fv.openBlobFile(new Blob([bytes], { type: text ? 'text/plain' : 'application/octet-stream' }), name);
    if (window.__fv.state.type?.id !== expected) {
      const select = document.getElementById('typeSelect');
      if (select?.querySelector(`option[value="${expected}"]`)) {
        select.value = expected;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, { filename, type, textLike });
  await page.waitForFunction((expected) => window.__fv.state.type?.id === expected, type, { timeout: 12000 });
}

async function verifyPagesFixture(page, pass, fail) {
  try {
    await page.waitForFunction(() => {
      const image = document.querySelector('#previewHost .iwork-thumbnail');
      return image?.complete && image.naturalWidth > 0;
    }, null, { timeout: 12000 });
    const thumbnail = await page.$eval('#previewHost .iwork-thumbnail', (image) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
      type: image.src.startsWith('blob:') ? 'blob' : image.src.split(':')[0],
    }));
    if (thumbnail.width === 640 && thumbnail.height === 360 && thumbnail.type === 'blob') {
      pass('Pages fixture renders a meaningful 640x360 embedded thumbnail');
    } else fail('Pages thumbnail is not meaningful: ' + JSON.stringify(thumbnail));

    await page.click('#previewHost .iwork-tab-text');
    await page.waitForFunction(() => document.querySelector('#previewHost .iwork-text-content')
      ?.textContent?.includes('File Viewer Pages Fidelity Sample'), null, { timeout: 12000 });
    const extracted = await page.$eval('#previewHost .iwork-text-content', (node) => node.textContent || '');
    const status = await page.$eval('#previewHost .iwork-text-status', (node) => node.textContent || '');
    if (/meaningful document thumbnail/.test(extracted) && /words extracted from 1 IWA file/.test(status)) {
      pass('Pages fixture exercises heuristic IWA text extraction');
    } else fail('Pages text extraction is incomplete: ' + JSON.stringify({ extracted, status }));
  } catch (error) {
    fail('Pages fixture fidelity check failed: ' + error.message);
  }
}

async function verifyEpsMobileLayout(frameOf, pass, fail) {
  try {
    const frame = await frameOf('iframe.fv-preview-frame', 12000);
    const layout = await frame.$eval('.ps-table', (table) => {
      const viewportWidth = document.documentElement.clientWidth;
      const cells = [...table.querySelectorAll('td')].map((cell) => {
        const rect = cell.getBoundingClientRect();
        return {
          text: (cell.textContent || '').slice(0, 80),
          left: rect.left,
          right: rect.right,
          scrollWidth: cell.scrollWidth,
          clientWidth: cell.clientWidth,
          whiteSpace: getComputedStyle(cell).whiteSpace,
          overflowWrap: getComputedStyle(cell).overflowWrap,
        };
      });
      return {
        viewportWidth,
        pageOverflow: document.documentElement.scrollWidth - viewportWidth,
        cellOverflow: Math.max(0, ...cells.map((cell) => cell.right - viewportWidth),
          ...cells.map((cell) => -cell.left)),
        clippedCells: cells.filter((cell) => cell.scrollWidth > cell.clientWidth + 1),
      };
    });
    if (layout.pageOverflow <= 1 && layout.cellOverflow <= 1 && layout.clippedCells.length === 0) {
      pass('sample.eps: metadata table wraps without clipping on mobile');
    } else fail('sample.eps mobile layout clips metadata: ' + JSON.stringify(layout));
  } catch (error) {
    fail('sample.eps mobile layout check failed: ' + error.message);
  }
}

export async function run(ctx) {
  const { page, openExample, frameOf, pass, fail } = ctx;
  const originalViewport = page.viewportSize() || { width: 1280, height: 720 };
  const offOriginStart = ctx.offOrigin.length;
  const consoleStart = ctx.consoleErrors.length;

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const item of cases) {
      await openExample(item.file);
      await page.waitForFunction(({ filename, type }) => window.__fv.state.intake?.filename === filename
        && window.__fv.state.type?.id === type, { filename: item.file, type: item.type }, { timeout: 15000 });
      const snapshot = await noticeSnapshot(page, frameOf);
      const lower = snapshot.text.toLowerCase();
      const termsPresent = item.terms.every((term) => lower.includes(term));
      if (snapshot.visible && snapshot.inViewport && snapshot.overflow <= 1
        && snapshot.pageOverflow <= 1 && termsPresent) {
        pass(`${item.file}: format-specific partial notice is visible and in bounds on ${viewport.name}`);
      } else {
        fail(`${item.file} ${viewport.name} partial notice: ` + JSON.stringify(snapshot));
      }
      if (viewport.name === 'mobile' && item.file === 'sample.eps') {
        await verifyEpsMobileLayout(frameOf, pass, fail);
      }
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await openExample('sample.pages');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'sample.pages'
    && window.__fv.state.type?.id === 'iwork', null, { timeout: 15000 });
  await verifyPagesFixture(page, pass, fail);

  for (const item of cases) {
    await openMalformed(page, `broken.${item.file.split('.').pop()}`, item.type);
    const snapshot = await noticeSnapshot(page, frameOf);
    if (snapshot.visible && snapshot.text.toLowerCase().includes('partial preview')) {
      pass(`${item.type}: malformed/unsupported path retains its capability notice`);
    } else {
      fail(`${item.type} malformed partial notice: ` + JSON.stringify(snapshot));
    }
  }

  await page.evaluate(async () => {
    const bytes = Uint8Array.of(0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a);
    await window.__fv.openBlobFile(new Blob([bytes], { type: 'application/x-netcdf' }), 'unsupported.nc');
  });
  await page.waitForFunction(() => window.__fv.state.type?.id === 'netcdf');
  const nc4Frame = await frameOf('iframe.fv-preview-frame');
  const nc4Text = await nc4Frame.$eval('body', (body) => body.textContent || '');
  if (/NetCDF-4/.test(nc4Text) && /Variable payload values are omitted/i.test(nc4Text)) {
    pass('NetCDF-4 unsupported path discloses both container and omitted payload values');
  } else fail('NetCDF-4 partial disclosure missing: ' + nc4Text.slice(0, 500));

  await page.evaluate(async () => {
    const source = '; FBX 7.4.0 project file\nObjects: {\n}\n';
    await window.__fv.openBlobFile(new Blob([source], { type: 'text/plain' }), 'ascii.fbx');
  });
  await page.waitForFunction(() => window.__fv.state.type?.id === 'fbx');
  const asciiFrame = await frameOf('iframe.fv-preview-frame');
  const asciiText = await asciiFrame.$eval('body', (body) => body.textContent || '');
  if (/ASCII FBX source detected/.test(asciiText) && /Mesh geometry/.test(asciiText)) {
    pass('ASCII FBX variant is identified without promising an unavailable Raw escape');
  } else fail('ASCII FBX partial disclosure missing: ' + asciiText.slice(0, 500));

  await page.setViewportSize(originalViewport);
  if (ctx.offOrigin.length === offOriginStart) pass('partial-support viewers made zero off-origin requests');
  else fail('partial-support viewers made off-origin requests: ' + ctx.offOrigin.slice(offOriginStart).join(', '));
  if (ctx.consoleErrors.length === consoleStart) pass('partial-support viewers produced no console/page errors');
  else fail('partial-support viewer errors: ' + ctx.consoleErrors.slice(consoleStart).join(' | '));
}
