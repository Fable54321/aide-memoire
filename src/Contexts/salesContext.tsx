
import { createContext, useContext, useState, useEffect ,type ReactNode, useCallback } from "react"


export type Client = {
    id: string,
    name: string,
}


type Quotation = {
    id: number,
    client_id: string,
    vegetable_id: number,
    price: number,
    quotation_date: string,
}

type SalesContextType = {
    clients: Client[],
    setClients: React.Dispatch<React.SetStateAction<Client[]>>,
    postQuotation: (
        clientId: string,
        vegetableId: number,
        price: number,
        date: string,
    ) => Promise<Quotation>
}


type SalesProviderProps = {
    children: ReactNode
}

const SalesContext = createContext<SalesContextType>({} as SalesContextType)


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
        }).then(res => res.json())
    },[])

    return (
        <SalesContext.Provider value={{clients, setClients, postQuotation}}>
            {children}
        </SalesContext.Provider>
    )
}


// eslint-disable-next-line react-refresh/only-export-components
export const useSales = () => useContext(SalesContext)




