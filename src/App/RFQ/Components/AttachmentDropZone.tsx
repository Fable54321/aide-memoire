import { useState, type DragEvent } from "react"
import { Mail, Upload } from "lucide-react"
import PendingAttachmentPreview from "../PendingAttachmentPreview"

const supportedExtensions = [
  ".eml",
  ".msg",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]

const fileInputAccept = `image/*,${supportedExtensions.join(",")},message/rfc822,application/vnd.ms-outlook`

const isSupportedFile = (file: File) => {
  if (file.type.startsWith("image/")) return true
  const fileName = file.name.toLowerCase()
  return supportedExtensions.some((extension) => fileName.endsWith(extension))
}

type AttachmentDropZoneProps = {
  files: File[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  getDisplayName: (fileName: string, contentType: string) => string
}

const AttachmentDropZone = ({
  files,
  onAddFiles,
  onRemoveFile,
  getDisplayName,
}: AttachmentDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dropError, setDropError] = useState("")

  const addSupportedFiles = (incomingFiles: File[]) => {
    const supportedFiles = incomingFiles.filter(isSupportedFile)
    setDropError(
      supportedFiles.length === incomingFiles.length
        ? ""
        : "Certains fichiers ne sont pas pris en charge.",
    )
    if (supportedFiles.length) onAddFiles(supportedFiles)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(event.dataTransfer.files)
    if (!droppedFiles.length) {
      setDropError(
        "Outlook n’a pas fourni le courriel comme fichier. Enregistrez-le en .eml ou .msg, puis déposez ce fichier ici.",
      )
      return
    }
    addSupportedFiles(droppedFiles)
  }

  return (
    <div>
      <div
        className={`mt-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
          isDragging
            ? "border-secondary bg-secondary/10"
            : "border-gray-300 bg-gray-50"
        }`}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false)
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = "copy"
        }}
        onDrop={handleDrop}
      >
        <Mail aria-hidden="true" className="mx-auto text-secondary" size={28} />
        <p className="mt-2 text-sm font-bold text-gray-800">
          Glissez un courriel Outlook ou un document ici
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Courriels .eml et .msg, images, PDF et documents Office
        </p>
        <label
          className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-secondary bg-white px-4 py-2 text-sm font-bold text-secondary transition hover:bg-secondary/10"
          htmlFor="rfq-files"
        >
          <Upload size={17} /> Choisir des fichiers
        </label>
        <input
          accept={fileInputAccept}
          className="sr-only"
          id="rfq-files"
          multiple
          onChange={(event) => {
            addSupportedFiles(Array.from(event.target.files ?? []))
            event.target.value = ""
          }}
          type="file"
        />
      </div>

      {dropError && <p className="mt-2 text-sm text-red-700" role="alert">{dropError}</p>}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""} :
          </p>
          {files.map((file, index) => (
            <PendingAttachmentPreview
              displayName={getDisplayName(file.name, file.type)}
              file={file}
              key={`${file.name}-${file.lastModified}-${index}`}
              onRemove={() => onRemoveFile(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AttachmentDropZone
