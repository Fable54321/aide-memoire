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
  const [magnifier, setMagnifier] = useState<{
    x: number
    y: number
    imageWidth: number
    imageHeight: number
  } | null>(null)

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
        <div className="flex min-h-48 flex-1 flex-col items-center justify-center overflow-auto bg-gray-950 p-4">
          {error ? (
            <p className="rounded bg-white p-4 text-sm text-red-700" role="alert">{error}</p>
          ) : imageUrl ? (
            <>
              <p className="mb-2 rounded bg-black/70 px-3 py-1 text-xs text-white">
                Survolez l’image avec la souris pour utiliser la loupe.
              </p>
              <div
                className="relative inline-block cursor-zoom-in leading-none"
                onMouseLeave={() => setMagnifier(null)}
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect()
                  setMagnifier({
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                    imageWidth: bounds.width,
                    imageHeight: bounds.height,
                  })
                }}
              >
                <img alt={attachment.fileName} className="block max-h-[calc(95vh-7rem)] max-w-full object-contain" src={imageUrl} />
                {magnifier && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute z-10 h-44 w-44 rounded-full border-4 border-white bg-no-repeat shadow-2xl"
                    style={{
                      left: magnifier.x - 88,
                      top: magnifier.y - 88,
                      backgroundImage: `url("${imageUrl}")`,
                      backgroundSize: `${magnifier.imageWidth * 2.5}px ${magnifier.imageHeight * 2.5}px`,
                      backgroundPosition: `${88 - magnifier.x * 2.5}px ${88 - magnifier.y * 2.5}px`,
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-white">Chargement de l’image…</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AttachmentPreviewModal
