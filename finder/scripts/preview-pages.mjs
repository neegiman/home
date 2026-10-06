import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const outputRoot = fileURLToPath(new URL('../pages-site/out/', import.meta.url))
const port = Number(process.env.PORT ?? 3001)
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (pathname === '/' || pathname === '/finder') {
      response.writeHead(302, { Location: '/finder/' }).end()
      return
    }
    if (pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    if (!pathname.startsWith('/finder/') || pathname.includes('\\')) {
      response.writeHead(404).end('Not found')
      return
    }
    let filePath = path.resolve(outputRoot, '.' + pathname.slice('/finder'.length))
    if (filePath !== path.resolve(outputRoot) && !filePath.startsWith(outputRoot)) {
      response.writeHead(403).end('Forbidden')
      return
    }
    if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath, 'index.html')
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    createReadStream(filePath).on('error', () => response.destroy()).pipe(response)
  } catch {
    response.writeHead(404).end('Not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Static Pages preview: http://127.0.0.1:${port}/finder/`)
})
