import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useRfq } from "../../Contexts/rfqContext"

type AttachmentPreviewModalProps = {
  attachment: {
    id: number
    fileName: string
  }
  onClose: () => void
}

const AttachmentPreviewModal = ({ attachment, onClose }: AttachmentPreviewModalProps) => {
  const { getAttachmentUrl } = useRfq()
  const [imageUrl, setImageUrl] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let isCancelled = false
    void getAttachmentUrl(attachment.id)
      .then((url) => {
        if (!isCancelled) setImageUrl(url)
      })
      .catch((loadError) => {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger l’image.")
        }
      })
    return () => {
      isCancelled = true
    }
  }, [attachment.id, getAttachmentUrl])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
      <div aria-labelledby="attachment-preview-title" aria-modal="true" className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
          <h3 className="truncate font-bold" id="attachment-preview-title">{attachment.fileName}</h3>
          <button aria-label="Fermer l’aperçu" className="shrink-0 cursor-pointer rounded p-1 hover:bg-gray-100" onClick={onClose} type="button"><X /></button>
        </div>
        <div className="flex min-h-48 flex-1 items-center justify-center overflow-auto bg-gray-950 p-4">
          {error ? (
            <p className="rounded bg-white p-4 text-sm text-red-700" role="alert">{error}</p>
          ) : imageUrl ? (
            <img alt={attachment.fileName} className="max-h-[calc(95vh-5rem)] max-w-full object-contain" src={imageUrl} />
          ) : (
            <p className="text-sm text-white">Chargement de l’image…</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AttachmentPreviewModal
