
import { createContext, useContext, useState, useEffect ,type ReactNode, useCallback } from "react"


export type Client = {
    id: string,
    name: string,
}


type Quotation = {
    id: string,
    client_id: string,
    vegetable_id: number,
    price: number | string,
    quotation_date: string,
}

type SalesContextType = {
    clients: Client[],
    setClients: React.Dispatch<React.SetStateAction<Client[]>>,
    getQuotations: () => Promise<Quotation[]>,
    postQuotation: (
        clientId: string,
        vegetableId: number,
        price: number,
        date: string,
    ) => Promise<Quotation>,
    patchQuotation: (
        quotationId: string,
        clientId: string,
        vegetableId: number,
        price: number,
        date: string,
    ) => Promise<Quotation>,
    deleteQuotation: (
        quotationId: string,
    ) => Promise<Quotation>
}


type SalesProviderProps = {
    children: ReactNode
}

const SalesContext = createContext<SalesContextType>({} as SalesContextType)

const parseJsonResponse = async <T,>(response: Response): Promise<T> => {
    const data = await response.json()

    if (!response.ok) {
        throw new Error(data?.error ?? "Request failed")
    }

    return data
}


export const SalesProvider = ({children}: SalesProviderProps) => {
    const [clients, setClients] = useState<Client[]>([])

    useEffect(() => {
        fetch("https://api.vegibec-portail.com/unprotected/clients")
        .then(res => res.json())
        .then(data => setClients(data))
    }, [])


    useEffect(() => {
        console.log(clients)
    },[clients])

    const getQuotations = useCallback(() => {
        return fetch("https://api.vegibec-portail.com/unprotected/quotations")
        .then(res => parseJsonResponse<Quotation[]>(res))
    },[])

    const postQuotation = useCallback((clientId: string, vegetableId: number, price: number, date: string) => {
        return fetch("https://api.vegibec-portail.com/unprotected/quotations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                client_id: clientId,
                vegetable_id: vegetableId,
                price: price,
                quotation_date: date
            })
        }).then(res => parseJsonResponse<Quotation>(res))
    },[])

    const patchQuotation = useCallback((quotationId: string, clientId: string, vegetableId: number, price: number, date: string) => {
        return fetch(`https://api.vegibec-portail.com/unprotected/quotations/${encodeURIComponent(quotationId)}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                client_id: clientId,
                vegetable_id: vegetableId,
                price: price,
                quotation_date: date
            })
        }).then(res => parseJsonResponse<Quotation>(res))
    },[])

    const deleteQuotation = useCallback((quotationId: string) => {
        return fetch(`https://api.vegibec-portail.com/unprotected/quotations/${encodeURIComponent(quotationId)}`, {
            method: "DELETE"
        })
        .then(res => parseJsonResponse<{ deleted: Quotation }>(res))
        .then(data => data.deleted)
    },[])

    return (
        <SalesContext.Provider value={{clients, setClients, getQuotations, postQuotation, patchQuotation, deleteQuotation}}>
            {children}
        </SalesContext.Provider>
    )
}


// eslint-disable-next-line react-refresh/only-export-components
export const useSales = () => useContext(SalesContext)




