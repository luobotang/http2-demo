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
    pushStreamWithFile(stream, 'index.css')
    pushStreamWithFile(stream, 'index.js')
    pushStreamWithFile(stream, '1.jpg')
    pushStreamWithFile(stream, '2.jpg')
    pushStreamWithFile(stream, '3.jpg')
    pushStreamWithFile(stream, '4.jpg')
    pushStreamWithFile(stream, '5.jpg')
    pushStreamWithFile(stream, '6.jpg')

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