/**
 * Browser side of Drive uploads: PUT a file to a resumable session the portal
 * opened (lib/portal/drive.ts openUploadSession). Used by the Brand manager and
 * onboarding uploads.
 */

// Google wants chunks in multiples of 256 KB; 16 MB keeps progress smooth and retries cheap.
const DRIVE_CHUNK = 64 * 256 * 1024;

function drivePut(url: string, body: Blob | null, range: string, onProgress?: (loaded: number) => void): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Range', range);
    if (onProgress) xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(xhr);
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(body);
  });
}

/**
 * Resumable upload straight to the client's Drive folder. A dropped connection
 * asks Google how much arrived and carries on from there, up to six times.
 * Returns the new Drive file id.
 */
export async function uploadToDrive(sessionUrl: string, file: File, onProgress: (pct: number) => void): Promise<string> {
  let offset = 0;
  let failures = 0;
  const done = (xhr: XMLHttpRequest) => {
    const id = (JSON.parse(xhr.responseText || '{}') as { id?: string }).id;
    if (!id) throw new Error('Upload finished but Google did not return the file.');
    return id;
  };
  const nextOffset = (xhr: XMLHttpRequest, fallback: number) => {
    const range = xhr.getResponseHeader('Range');
    return range ? Number(range.split('-')[1]) + 1 : fallback;
  };
  while (true) {
    const end = Math.min(offset + DRIVE_CHUNK, file.size);
    try {
      const xhr = await drivePut(sessionUrl, file.slice(offset, end), `bytes ${offset}-${end - 1}/${file.size}`, (loaded) =>
        onProgress(Math.min(99, Math.round(((offset + loaded) / file.size) * 100))),
      );
      if (xhr.status === 200 || xhr.status === 201) return done(xhr);
      if (xhr.status === 308) {
        offset = nextOffset(xhr, end);
        failures = 0;
        continue;
      }
      if (xhr.status === 404 || xhr.status === 410) throw new Error('The upload expired. Try that file again.');
      if (xhr.status < 500) throw new Error(`Google refused the upload (${xhr.status}).`);
    } catch (err) {
      if (err instanceof Error && err.message !== 'network') throw err;
    }
    // Network drop or a 5xx: back off, ask Google where it got to, carry on.
    if (++failures > 6) throw new Error('Connection kept dropping. Try that file again on a steadier connection.');
    await new Promise((r) => setTimeout(r, Math.min(30_000, 1000 * 2 ** failures)));
    try {
      const status = await drivePut(sessionUrl, null, `bytes */${file.size}`);
      if (status.status === 200 || status.status === 201) return done(status);
      if (status.status === 308) offset = nextOffset(status, 0);
    } catch {
      // Still offline; the loop will try again.
    }
  }
}
