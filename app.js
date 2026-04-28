// Entry point untuk cPanel Passenger / Node.js Selector
// Passenger akan set process.env.PORT otomatis.
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false // force production di cPanel
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT, 10) || 3000

process.env.NODE_ENV = 'production'

const nextApp = next({ dev, hostname, port, dir: __dirname })
const handle = nextApp.getRequestHandler()

nextApp
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    }).listen(port, (err) => {
      if (err) throw err
      console.log(`> Next.js ready on port ${port}`)
    })
  })
  .catch((err) => {
    console.error('Failed to start Next.js:', err)
    process.exit(1)
  })
