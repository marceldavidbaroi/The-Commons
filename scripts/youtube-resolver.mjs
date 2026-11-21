import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as XLSX from 'xlsx';

const execFileAsync = promisify(execFile);
const PORT = 4321;
const CONCURRENCY = 8;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>YouTube URL Resolver</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 3rem auto; padding: 0 1rem; color: #111; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { font-size: 0.875rem; color: #555; margin: 0 0 1rem; }
    input[type="file"] { margin-bottom: 1rem; display: block; }
    button { background: #111; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .progress-wrap { margin-top: 1rem; display: none; }
    .bar-bg { width: 100%; height: 8px; background: #eee; border-radius: 999px; overflow: hidden; margin-bottom: 0.5rem; }
    .bar-fill { height: 100%; background: #111; width: 0%; transition: width 0.2s ease; }
    #status { font-size: 0.8125rem; color: #444; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="card">
    <h1>YouTube URL Resolver (Local yt-dlp · ${CONCURRENCY}x parallel)</h1>
    <p>Upload an <code>.xlsx</code> or <code>.csv</code> file. Missing <code>youtube_url</code> cells are resolved in parallel and returned as a new <code>.xlsx</code>.</p>
    <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" />
    <button id="runBtn">Resolve & Download .xlsx</button>
    <div id="progressWrap" class="progress-wrap">
      <div class="bar-bg"><div id="barFill" class="bar-fill"></div></div>
      <div id="status"></div>
    </div>
  </div>
  <script>
    const fileInput = document.getElementById('fileInput');
    const runBtn = document.getElementById('runBtn');
    const progressWrap = document.getElementById('progressWrap');
    const barFill = document.getElementById('barFill');
    const status = document.getElementById('status');

    runBtn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) { progressWrap.style.display = 'block'; status.textContent = 'Please select a file first.'; return; }
      runBtn.disabled = true;
      progressWrap.style.display = 'block';
      barFill.style.width = '0%';
      status.textContent = 'Starting...';

      try {
        const buf = await file.arrayBuffer();
        const res = await fetch('/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: buf
        });
        if (!res.ok) throw new Error(await res.text());

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            const msg = JSON.parse(line);
            if (msg.type === 'progress') {
              const pct = msg.total ? Math.round((msg.completed / msg.total) * 100) : 100;
              barFill.style.width = pct + '%';
              status.textContent = '[' + msg.completed + '/' + msg.total + '] ' + msg.label;
            } else if (msg.type === 'done') {
              const bytes = Uint8Array.from(atob(msg.base64), (c) => c.charCodeAt(0));
              const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = file.name.replace(/\\.(xlsx|xls|csv)$/i, '') + '_with_urls.xlsx';
              a.click();
              URL.revokeObjectURL(url);
              barFill.style.width = '100%';
              status.textContent = 'Done! Downloaded ' + a.download;
            } else if (msg.type === 'error') {
              throw new Error(msg.message);
            }
          }
        }
      } catch (err) {
        status.textContent = 'Error: ' + err.message;
      } finally {
        runBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

async function ensureYtDlp() {
	try {
		await execFileAsync('yt-dlp', ['--version'], { timeout: 5000 });
	} catch {
		throw new Error('yt-dlp is not installed or not in PATH. Install with: brew install yt-dlp');
	}
}

async function resolveYoutubeUrl(title, artist) {
	const base = `${title} ${artist || ''} audio`.trim();
	try {
		// Prefer embeddable videos from top 5 results
		const { stdout } = await execFileAsync(
			'yt-dlp',
			['--get-id', '--no-warnings', '--max-downloads', '1', '--match-filter', 'playable_in_embed', `ytsearch5:${base}`],
			{ timeout: 20000 }
		);
		const id = stdout.trim().split('\n')[0]?.trim();
		if (id) return `https://www.youtube.com/watch?v=${id}`;
	} catch {
		// Fallback to first search result if match-filter finds none
	}

	try {
		const { stdout } = await execFileAsync('yt-dlp', ['--get-id', '--no-warnings', `ytsearch1:${base}`], {
			timeout: 15000
		});
		const id = stdout.trim().split('\n')[0]?.trim();
		return id ? `https://www.youtube.com/watch?v=${id}` : '';
	} catch (err) {
		console.error(`Failed to resolve "${title}":`, err instanceof Error ? err.message : err);
		return '';
	}
}

const server = http.createServer(async (req, res) => {
	if (req.method === 'GET' && req.url === '/') {
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(HTML);
		return;
	}

	if (req.method === 'POST' && req.url === '/resolve') {
		res.writeHead(200, {
			'Content-Type': 'application/x-ndjson; charset=utf-8',
			'Cache-Control': 'no-cache'
		});

		const send = (obj) => res.write(JSON.stringify(obj) + '\n');

		try {
			await ensureYtDlp();
			const chunks = [];
			for await (const chunk of req) chunks.push(chunk);
			const buffer = Buffer.concat(chunks);

			const wb = XLSX.read(buffer, { type: 'buffer' });
			const sheetName = wb.SheetNames[0];
			const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

			const targets = rows
				.map((row, idx) => ({ row, idx }))
				.filter(({ row }) => !String(row.youtube_url || row.youtube_id || '').trim() && row.title);

			const total = targets.length;
			let completed = 0;
			let cursor = 0;

			async function worker() {
				while (cursor < targets.length) {
					const { row } = targets[cursor++];
					row.youtube_url = await resolveYoutubeUrl(row.title, row.artist);
					completed++;
					const label = `${row.title}${row.artist ? ' - ' + row.artist : ''}`;
					console.log(`[${completed}/${total}] ${label}`);
					send({ type: 'progress', completed, total, label });
				}
			}

			await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total || 1) }, () => worker()));

			const outWs = XLSX.utils.json_to_sheet(rows);
			const outWb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(outWb, outWs, 'Songs');
			const outBuf = XLSX.write(outWb, { type: 'buffer', bookType: 'xlsx' });

			send({ type: 'done', base64: outBuf.toString('base64') });
			res.end();
		} catch (err) {
			send({ type: 'error', message: err instanceof Error ? err.message : 'Failed to resolve URLs' });
			res.end();
		}
		return;
	}

	res.writeHead(404);
	res.end('Not found');
});

server.listen(PORT, () => {
	console.log(`YouTube URL Resolver running at http://localhost:${PORT}`);
});
