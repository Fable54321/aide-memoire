import { type Vegetable } from "../../Contexts/vegetablesContext"
import { type suppliers } from "./suppliers"

export type Supplier = (typeof suppliers)[number]

export type QuotationDay = {
  key: string
  label: string
  shortDate: string
}

export type Quotation = {
  id: string
  savedQuotationId: string | null
  isSaving: boolean
  saveError: string | null
  hasUnsavedChanges: boolean
  supplier: Supplier | null
  vegetable: Vegetable | null
  price: string
  createdAt: string | null
}

export type QuotationsByDay = Record<string, Quotation[]>

export type SavedQuotation = {
  id: string
  client_id: string
  vegetable_id: number
  price: number | string
  quotation_date: string
  created_at?: string
  updated_at?: string
}

export type DuplicateWarning = {
  supplier: Supplier
  vegetable: Vegetable
  quotation: Quotation
  dayKey: string
  dayLabel: string
}

export type UndoAction =
  | { type: "add"; quotationId: string }
  | { type: "replace"; dayKey: string; previousQuotation: Quotation }

