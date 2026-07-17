import {
    createContext,
    useState,
    useContext,
    type ReactNode,
    useEffect,
    useCallback,
} from "react";

import { fetchWithAuth } from "../utils/fetchWithAuth";

import type {
    WorkBlockResponse,
    ActiveSessionResponse,
    StartSessionResponse,
    StopSessionResponse, 
    AddNoteResponse,
    WorkSessionNote,
    WorkSession,
    UpdateBlockPayload,
    OriginalBlockTimes,
} from "../Types/WorkSession";

type BlocksContextType = {
    workBlocks: WorkBlockResponse;
    setWorkBlocks: React.Dispatch<React.SetStateAction<WorkBlockResponse>>;
    activeSessionObject: ActiveSessionResponse | null;
    loadingBlocks: boolean;
    loadingActiveSession: boolean;
    actionLoading: boolean;
    error: string | null;
    refreshBlocks: (date: string) => Promise<void>;
    refreshActiveSession: () => Promise<ActiveSessionResponse | null>;
    startSession: (description?: string) => Promise<StartSessionResponse>;
    stopSession: (description?: string) => Promise<StopSessionResponse>;
    addSessionNote: (description: string) => Promise<AddNoteResponse>;
    updateSessionNote: (noteId: number, note: string) => Promise<WorkSessionNote>;
    updateBlock: (
        blockId: number,
        payload: UpdateBlockPayload
    ) => Promise<WorkSession>;
    getOriginalBlockTimes: (blockId: number) => Promise<OriginalBlockTimes>;
    createBlock: (startTime: string, endTime: string) => Promise<{session: WorkSession, totalMinutes: number}>;
    addBlockNote: (blockId: number, note: string) => Promise<WorkSessionNote>;
    lunchDuration: string;
    setlunchDuration: React.Dispatch<React.SetStateAction<string>>;
    updateActiveLunchDuration: () => Promise<WorkSession>;
};

const BlocksContext = createContext<BlocksContextType>({
    workBlocks: { date: "", blocks: [] },
    setWorkBlocks: () => { },
    activeSessionObject: null,
    loadingBlocks: false,
    loadingActiveSession: false,
    actionLoading: false,
    error: null,
    refreshBlocks: async () => { },
    refreshActiveSession: async () => null,
    startSession: async () => {
        throw new Error("startSession not implemented");
    },
    stopSession: async () => {
        throw new Error("stopSession not implemented");
    },
    addSessionNote: async () => {
        throw new Error("addSessionNote not implemented");
    },
    updateSessionNote: async () => {
        throw new Error("updateSessionNote not implemented");
    },
    updateBlock: async () => {
        throw new Error("updateBlock not implemented");
    },
    getOriginalBlockTimes: async () => {
        throw new Error("getOriginalBlockTimes not implemented");
    },
    createBlock: async () => {
        throw new Error("createBlock not implemented");
    },
    addBlockNote: async () => {
        throw new Error("addBlockNote not implemented");
    },
    lunchDuration: "",
    setlunchDuration: () => { },
    updateActiveLunchDuration: async () => {
        throw new Error("updateActiveLunchDuration not implemented");
    }
});

export const BlocksProvider = ({ children }: { children: ReactNode }) => {
    const [workBlocks, setWorkBlocks] = useState<WorkBlockResponse>({
        date: "",
        blocks: [],
    });

    const [activeSessionObject, setActiveSessionObject] =
        useState<ActiveSessionResponse | null>(null);

    const [loadingBlocks, setLoadingBlocks] = useState(false);
    const [loadingActiveSession, setLoadingActiveSession] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lunchDuration, setlunchDuration] = useState("");

    const refreshBlocks = useCallback(async (date: string) => {
        if (!date) return;

        try {
            setError(null);
            setLoadingBlocks(true);

            const data = await fetchWithAuth<WorkBlockResponse>(
                `/timesheets/session/blocks?date=${date}`,
                { method: "GET" },
            );

            setWorkBlocks(data);
        } catch (err) {
            console.error("Error fetching blocks:", err);
            setError(err instanceof Error ? err.message : "Error fetching blocks");
        } finally {
            setLoadingBlocks(false);
        }
    }, []);

    const refreshActiveSession = useCallback(async () => {
        try {
            setError(null);
            setLoadingActiveSession(true);

            const data = await fetchWithAuth<ActiveSessionResponse>(
                "/timesheets/session/active",
                { method: "GET" },
            );

            setActiveSessionObject(data);
            return data;
        } catch (err) {
            console.error("Error fetching active session:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Error fetching active session",
            );
            return null;
        } finally {
            setLoadingActiveSession(false);
        }
    }, []);

    const startSession = useCallback(async (description?: string) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<StartSessionResponse>(
                "/timesheets/session/start",
                {
                    method: "POST",
                    body: {
                        description: description?.trim() || "",
                    },
                },
            );

            await refreshActiveSession();
            return data;
        } catch (err) {
            console.error("Erreur démarrage session :", err);
            const message =
                err instanceof Error
                    ? err.message
                    : "Erreur lors du démarrage de la session.";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, [refreshActiveSession]);

    const stopSession = useCallback(async (description?: string) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<StopSessionResponse>(
                "/timesheets/session/stop",
                {
                    method: "POST",
                    body: {
                        description: description?.trim() || "",
                    },
                },
            );

            await refreshActiveSession();
            return data;
        } catch (err) {
            console.error("Erreur arrêt session :", err);
            const message =
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'arrêt de la session.";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, [refreshActiveSession]);

    const addSessionNote = useCallback(async (description: string) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<AddNoteResponse>(
                "/timesheets/tasks/description",
                {
                    method: "POST",
                    body: {
                        description: description.trim(),
                    },
                },
            );

            await refreshActiveSession();
            return data;
        } catch (err) {
            console.error("Erreur ajout note session :", err);
            const message =
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'ajout de la note.";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, [refreshActiveSession]);

    useEffect(() => {
        refreshActiveSession();
    }, [refreshActiveSession]);

    const updateSessionNote = useCallback(async (noteId: number, note: string) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<WorkSessionNote>(
                `/timesheets/tasks/notes/${noteId}`,
                {
                    method: "PATCH",
                    body: { note: note.trim() },
                },
            );

            await refreshActiveSession();
            return data;
        } catch (err) {
            console.error("Erreur modification note session :", err);
            const message =
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la modification de la note.";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, [refreshActiveSession]);

    const updateBlock = useCallback(async (blockId: number, payload: UpdateBlockPayload) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<WorkSession>(
                `/timesheets/session/blocks/${blockId}`,
                {
                    method: "PATCH",
                    body: payload,
                },
            );

            await refreshActiveSession();
            return data;
        } catch (err) {
            console.error("Erreur modification bloc session :", err);
            const message =
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la modification du bloc.";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, [refreshActiveSession]);

    const getOriginalBlockTimes = useCallback(async (blockId: number) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<OriginalBlockTimes>(
                `/timesheets/session/blocks/${blockId}/edits`,
                {
                    method: "GET",
                },
            );

            return data;
        } catch (err) {
            console.error("Erreur récupération heures originales :", err);
            const message =
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la récupération des heures originales.";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, []);

    const createBlock = useCallback(async (startTime: string, endTime: string) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<{session: WorkSession, totalMinutes: number}>(
                "/timesheets/session/blocks",
                {
                    method: "POST",
                    body: {
                        start_time: startTime,
                        end_time: endTime,
                    },
                },
            );

            return data;
        } catch (err) {
            console.error("Error creating block:", err);
            const message = err instanceof Error ? err.message : "Error creating block";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, []);

    const addBlockNote = useCallback(async (blockId: number, note: string) => {
        try {
            setError(null);
            setActionLoading(true);

            const data = await fetchWithAuth<WorkSessionNote>(
                `/timesheets/session/blocks/${blockId}/notes`,
                {
                    method: "POST",
                    body: {
                        note: note.trim(),
                    },
                },
            );

            return data;
        } catch (err) {
            console.error("Error adding note to block:", err);
            const message = err instanceof Error ? err.message : "Error adding note to block";
            setError(message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    }, []);

    const updateActiveLunchDuration = useCallback(async () => {
    try {
        setError(null);
        setActionLoading(true);

        const parsedLunchDuration = Number(lunchDuration);

        if (
            lunchDuration === "" ||
            !Number.isInteger(parsedLunchDuration) ||
            parsedLunchDuration < 0
        ) {
            throw new Error("Durée du dîner invalide");
        }

        const data = await fetchWithAuth<WorkSession>(
            "/timesheets/session/active/lunch-duration",
            {
                method: "PATCH",
                body: {
                    lunch_duration: parsedLunchDuration,
                },
            },
        );

        // refresh active session so UI stays in sync
        await refreshActiveSession();

        return data;
    } catch (err) {
        console.error("Erreur mise à jour lunch duration :", err);
        const message =
            err instanceof Error
                ? err.message
                : "Erreur lors de la mise à jour du lunch.";
        setError(message);
        throw err;
    } finally {
        setActionLoading(false);
    }
}, [lunchDuration, refreshActiveSession]);




useEffect(() => {
    if (activeSessionObject && activeSessionObject.hasActiveSession && activeSessionObject.session.lunch_duration !== undefined) {
        setlunchDuration(
            String(activeSessionObject.session.lunch_duration ?? "")
        );
    }
}, [activeSessionObject]);

    return (
        <BlocksContext.Provider
            value={{
                workBlocks,
                setWorkBlocks,
                activeSessionObject,
                loadingBlocks,
                loadingActiveSession,
                actionLoading,
                error,
                refreshBlocks,
                refreshActiveSession,
                startSession,
                stopSession,
                addSessionNote,
                updateSessionNote,
                updateBlock,
                getOriginalBlockTimes,
                createBlock,
                addBlockNote,
                lunchDuration,
                setlunchDuration,
                updateActiveLunchDuration,
            }}
        >
            {children}
        </BlocksContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBlocks = () => useContext(BlocksContext);