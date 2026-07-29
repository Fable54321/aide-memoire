import { useEffect, useState } from "react"
import { Link, LoaderCircle, Mail, Search, Unlink } from "lucide-react"
import { fetchWithAuth } from "../../../Utils/fetchWithAuth"

export type OutlookMessage = {
  id: string
  subject: string
  receivedDateTime: string
  webLink: string
  from?: {
    emailAddress?: {
      name?: string
      address?: string
    }
  }
}

type ConnectionStatus = {
  connected: boolean
  email?: string
  displayName?: string
}

type OutlookMessagePickerProps = {
  selectedMessages: OutlookMessage[]
  onChange: (messages: OutlookMessage[]) => void
}

const OutlookMessagePicker = ({
  selectedMessages,
  onChange,
}: OutlookMessagePickerProps) => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [messages, setMessages] = useState<OutlookMessage[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const loadStatus = async () => {
    try {
      setStatus(await fetchWithAuth<ConnectionStatus>("/sales/outlook/status"))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de vérifier Outlook.")
    }
  }

  useEffect(() => {
    // The initial remote connection lookup initializes the picker state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus()
  }, [])

  const loadMessages = async () => {
    setIsLoading(true)
    setError("")
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
      const response = await fetchWithAuth<{ messages: OutlookMessage[] }>(
        `/sales/outlook/messages${query}`,
      )
      setMessages(response.messages)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les courriels.")
    } finally {
      setIsLoading(false)
    }
  }

  const connect = async () => {
    setError("")
    try {
      const { url } = await fetchWithAuth<{ url: string }>("/sales/outlook/connect")
      window.location.assign(url)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Impossible de connecter Outlook.")
    }
  }

  const disconnect = async () => {
    await fetchWithAuth("/sales/outlook/connection", { method: "DELETE" })
    setStatus({ connected: false })
    setMessages([])
    onChange([])
  }

  const toggleMessage = (message: OutlookMessage) => {
    const isSelected = selectedMessages.some((selected) => selected.id === message.id)
    onChange(
      isSelected
        ? selectedMessages.filter((selected) => selected.id !== message.id)
        : [...selectedMessages, message].slice(0, 5),
    )
  }

  if (!status) {
    return <p className="mt-2 text-sm text-gray-600">Vérification de la connexion Outlook…</p>
  }

  if (!status.connected) {
    return (
      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 shrink-0 text-blue-700" size={22} />
          <div>
            <p className="text-sm font-bold text-blue-950">Lier un courriel de votre boîte Outlook</p>
            <p className="mt-1 text-xs text-blue-900">
              Connectez votre compte Microsoft pour retrouver et ouvrir le message original plus tard.
            </p>
            <button className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800" onClick={() => void connect()} type="button">
              <Link size={16} /> Connecter Outlook
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-blue-950">
          Outlook connecté : <strong>{status.email || status.displayName}</strong>
        </p>
        <button className="inline-flex cursor-pointer items-center gap-1 text-xs text-gray-600 underline" onClick={() => void disconnect()} type="button">
          <Unlink size={13} /> Déconnecter
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void loadMessages()
            }
          }}
          placeholder="Sujet, expéditeur ou mots-clés"
          value={search}
        />
        <button className="inline-flex cursor-pointer items-center gap-1 rounded bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={isLoading} onClick={() => void loadMessages()} type="button">
          {isLoading ? <LoaderCircle className="animate-spin" size={16} /> : <Search size={16} />}
          Rechercher
        </button>
      </div>
      {messages.length === 0 && !isLoading && (
        <button className="mt-2 cursor-pointer text-xs font-bold text-blue-800 underline" onClick={() => void loadMessages()} type="button">
          Afficher les courriels récents
        </button>
      )}
      {messages.length > 0 && (
        <div className="mt-3 max-h-56 space-y-1 overflow-y-auto" aria-label="Courriels Outlook">
          {messages.map((message) => {
            const selected = selectedMessages.some((item) => item.id === message.id)
            return (
              <button
                aria-pressed={selected}
                className={`block w-full cursor-pointer rounded border p-2 text-left text-sm transition ${selected ? "border-blue-700 bg-blue-100" : "border-gray-200 bg-white hover:border-blue-400"}`}
                key={message.id}
                onClick={() => toggleMessage(message)}
                type="button"
              >
                <span className="block truncate font-bold">{message.subject || "(Sans objet)"}</span>
                <span className="block truncate text-xs text-gray-600">
                  {message.from?.emailAddress?.name || message.from?.emailAddress?.address || "Expéditeur inconnu"}
                  {" · "}
                  {new Date(message.receivedDateTime).toLocaleString("fr-CA")}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {selectedMessages.length > 0 && (
        <p className="mt-2 text-xs font-bold text-blue-900">
          {selectedMessages.length} courriel{selectedMessages.length > 1 ? "s" : ""} à lier lors de l’enregistrement.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  )
}

export default OutlookMessagePicker
