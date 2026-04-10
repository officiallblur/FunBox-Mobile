const { createServer } = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 4000;
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'ce1a0db13c99a45fd7effb86ab82f78f';
const BASE = 'https://api.themoviedb.org/3';

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/api/tmdb/search') {
      const q = url.searchParams.get('query') || '';
      const resp = await fetch(
        `${BASE}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(q)}&page=1`
      );
      const json = await resp.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(json));
      return;
    }

    if (url.pathname === '/api/tmdb/details') {
      const id = url.searchParams.get('id');
      const type = url.searchParams.get('type') || 'movie';
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing id' }));
        return;
      }
      const resp = await fetch(`${BASE}/${type}/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
      const json = await resp.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(json));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`TMDB proxy listening on http://localhost:${PORT}`);
});
