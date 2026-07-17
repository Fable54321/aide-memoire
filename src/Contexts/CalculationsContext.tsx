import {
    createContext,
    useState,
    useContext,
    type ReactNode,
    useCallback,

} from "react";

import { fetchWithAuth } from "../utils/fetchWithAuth";




import type {
    DailySummary
} from "../Types/Calculations";


type CalculationsContextType = {
    dailySummary: DailySummary[];
    setDailySummary: React.Dispatch<React.SetStateAction<DailySummary[]>>
    getDailyTotals: (date?: string) => Promise<void>;
    calculationsLoading: boolean;
    setCalculationsLoading: React.Dispatch<React.SetStateAction<boolean>>
};



const CalculationsContext = createContext<CalculationsContextType>({
    dailySummary: [],
    setDailySummary: () => { },
    getDailyTotals: async () => { },
    calculationsLoading: false,
    setCalculationsLoading: () => false,
});

export const CalculationsProvider = ({ children }: { children: ReactNode }) => {
    const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
    const [calculationsLoading, setCalculationsLoading] = useState(false);


    const getDailyTotals = useCallback(async () => {

        setCalculationsLoading(true);

        const data = await fetchWithAuth<DailySummary[]>(`/timesheets/calculations/daily-duration`, {
            method: "GET",
        });
        setDailySummary(data);
        setCalculationsLoading(false);
    }, []);



    return (
        <CalculationsContext.Provider value={{ dailySummary, setDailySummary, getDailyTotals, calculationsLoading, setCalculationsLoading }}>
            {children}
        </CalculationsContext.Provider>
    );
};


// eslint-disable-next-line react-refresh/only-export-components
export const useCalculations = () => useContext(CalculationsContext);


