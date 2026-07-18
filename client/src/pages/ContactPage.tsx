import { useState } from 'react'

function ContactPage() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    console.log({
      name,
      message,
    })

    setName('')
    setMessage('')
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <section className="grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
            Contact
          </p>

          <h1 className="text-4xl font-bold">Contact FilmGeezer Web</h1>

          <p className="mt-4 max-w-xl text-slate-300">
            This form is only a frontend placeholder for now. Later, we can send
            this message to the backend and store it in MongoDB or email it to
            the admin.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-bold">Current status</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The form does not send real messages yet. It only logs the form
              data in the browser console for learning purposes.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <div>
            <label htmlFor="name" className="text-sm font-semibold text-slate-300">
              Your name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="message"
              className="text-sm font-semibold text-slate-300"
            >
              Message
            </label>

            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your message..."
              rows={6}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="mt-6 rounded-full bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400"
          >
            Send Message
          </button>
        </form>
      </section>
    </main>
  )
}

export default ContactPage