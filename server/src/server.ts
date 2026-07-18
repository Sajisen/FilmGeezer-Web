import 'dotenv/config'
import app from './app.js'

const PORT = Number(process.env.PORT) || 5000
const HOST = process.env.HOST || '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log('FilmGeezer API is running')
  console.log(`Local:   http://localhost:${PORT}`)
  console.log(`Listening on all network interfaces at port ${PORT}`)
})