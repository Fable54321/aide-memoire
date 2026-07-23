import { useEffect, useState } from "react"
import { FileText } from "lucide-react"

type PendingAttachmentPreviewProps = {
  file: File
  displayName: string
}

const PendingAttachmentPreview = ({ file, displayName }: PendingAttachmentPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState("")

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
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-gray-200 bg-white text-gray-500">
          <FileText size={24} />
        </div>
      )}
      <p className="min-w-0 truncate text-sm text-gray-700">{displayName}</p>
    </div>
  )
}

export default PendingAttachmentPreview
