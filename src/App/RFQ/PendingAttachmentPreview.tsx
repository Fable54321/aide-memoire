import { useEffect, useState } from "react"
import { FileText, Mail, X } from "lucide-react"

type PendingAttachmentPreviewProps = {
  file: File
  displayName: string
  onRemove: () => void
}

const PendingAttachmentPreview = ({ file, displayName, onRemove }: PendingAttachmentPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState("")
  const isEmail = /\.(eml|msg)$/i.test(file.name)

  useEffect(() => {
    if (!file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setPreviewUrl(reader.result)
    })
    reader.readAsDataURL(file)

    return () => {
      reader.abort()
    }
  }, [file])

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
      {previewUrl ? (
        <img alt={`Aperçu de ${displayName}`} className="h-16 w-16 shrink-0 rounded border border-gray-200 bg-white object-cover" src={previewUrl} />
      ) : isEmail ? (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-secondary/30 bg-secondary/5 text-secondary">
          <Mail size={24} />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-gray-200 bg-white text-gray-500">
          <FileText size={24} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-700">{displayName}</p>
        {isEmail && <p className="text-xs font-medium text-secondary">Courriel Outlook</p>}
      </div>
      <button
        aria-label={`Retirer ${displayName}`}
        className="shrink-0 cursor-pointer rounded p-1 text-gray-500 transition hover:bg-red-50 hover:text-red-700"
        onClick={onRemove}
        type="button"
      >
        <X size={18} />
      </button>
    </div>
  )
}

export default PendingAttachmentPreview
