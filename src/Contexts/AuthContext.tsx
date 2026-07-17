// src/context/AuthContext.tsx
import {
    createContext,
    useState,
    useContext,
    type ReactNode,
    useEffect,
    useCallback,
} from "react";
import { resetSessionExpiredFlag } from "../Utils/fetchWithAuth";

type App = {
    slug: string;
    role: string;
}

type AppAccess = App[];

export type User = {
    id: number;
    username: string;
    role?: string;
    appAccess: AppAccess;
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authChecked: boolean;
    checkAuth: () => Promise<void>;
    clearAuth: () => void;
    isAuthorized: boolean;
    setIsAuthorized: (authorized: boolean) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    authChecked: false,
    checkAuth: async () => { },
    clearAuth: () => { },
    isAuthorized: false,
    setIsAuthorized: () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    const clearAuth = useCallback(() => {
        setUser(null);
        setIsAuthorized(false);
        setAuthChecked(true);
        setLoading(false);
    }, []);

    const fetchMe = async (): Promise<User | null> => {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            credentials: "include",
        });

        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        return data.user ?? null;
    };

    const tryRefresh = async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });

            return res.ok;
        } catch {
            return false;
        }
    };

    const checkAuth = useCallback(async () => {
        setLoading(true);

        try {
            let me = await fetchMe();

            if (!me) {
                const refreshed = await tryRefresh();

                if (refreshed) {
                    me = await fetchMe();
                }
            }

            setUser(me);
            setIsAuthorized(false);
            if (me) {
                resetSessionExpiredFlag();
            }
        } catch (err) {
            console.warn("Auth check failed:", err);
            setUser(null);
        } finally {
            setLoading(false);
            setAuthChecked(true);
        }
    }, []);

    useEffect(() => {
        // The initial session lookup intentionally initializes provider state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                authChecked,
                checkAuth,
                clearAuth,
                isAuthorized,
                setIsAuthorized,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
