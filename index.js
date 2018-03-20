const fs = require('fs')
const path = require('path')
const https = require('https')
const http2 = require('http2')

const ContentTypes = {
  '.js': 'application/x-javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.jpg': 'image/jpeg'
}

const keys = {
  key: fs.readFileSync('keys/localhost-private.pem'),
  cert: fs.readFileSync('keys/localhost-cert.pem')
}

const pushFiles = [
  'index.css', 'a.css', 'b.css', 'c.css', 'd.css',
  'index.js', 'a.js', 'b.js', 'c.js', 'd.js',
  '1.jpg', '2.jpg', '3.jpg', '4.jpg'
]


/* HTTP/1 server */

const h1server = https.createServer(keys, h1Handler)

h1server.listen(8001, () => console.log('HTTP/1 on https://localhost:8001/'))

function h1Handler(req, res) {
  let path = req.url
  if (path === '/') path = '/index.html'
  path = path.substr(1) // remove '/'
  respondWithFileForH1(res, path)
}


/* HTTP/2 server */

const h2server = http2.createSecureServer(keys)

h2server.on('stream', h2Handler)

h2server.listen(8002, () => console.log('HTTP/2 on https://localhost:8002/'))

function h2Handler(stream, headers) {
  let path = headers[':path']

  if (path === '/') {
    // push files to client
    pushFiles.forEach((file) => pushStreamWithFile(stream, file))

    respondWithFileForH2(stream, 'index.html')
    return
  }

  path = path.substr('/') // remove '/'
  respondWithFileForH2(stream, path)
}


/* util */

function respondWithFileForH1(res, file) {
  res.writeHead(200, {
    'Content-Type': getContentTypeByName(file)
  })
  res.write(fs.readFileSync(getFilePathByName(file)))
  res.end()
}

function pushStreamWithFile(stream, file) {
  stream.pushStream({':path': `/${file}`}, (pushStream) => {
    respondWithFileForH2(pushStream, file)
  })
}

function respondWithFileForH2(stream, file) {
  stream.respondWithFile(getFilePathByName(file), {
    'content-type': getContentTypeByName(file)
  })
}

function getContentTypeByName(file) {
  const ext = path.extname(file)
  return ContentTypes[ext] || 'text/plain'
}

function getFilePathByName(file) {
  if (file.endsWith('.jpg')) {
    return './files/demo.jpg'
  }
  return `./files/${file}`
}