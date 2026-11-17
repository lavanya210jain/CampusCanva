import { useAuth } from "./AuthContext";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { DBMSInspectData } from "../types";
import { api } from "../services/api";
import { useToast } from "./ToastContext";

interface DemoContextValue {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  inspectorData: DBMSInspectData | null;
  openInspector: (
    type: "space" | "media" | "user" | "comment",
    id: number,
  ) => void;
  closeInspector: () => void;
  resetDemoData: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false); // SQL tools are opt-in.
  const [inspectorData, setInspectorData] = useState<DBMSInspectData | null>(
    null,
  );
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const enabled = useRef(false);
  const sequence = useRef(0);
  useEffect(() => {
    enabled.current = false;
    sequence.current++;
    setIsDemoMode(false);
    setInspectorData(null);
  }, [currentUser?.user_id]);

  const toggleDemoMode = () => {
    const next = !enabled.current;
    enabled.current = next;
    sequence.current++;
    setIsDemoMode(next);
    if (!next) setInspectorData(null);
  };

  const openInspector = async (
    type: "space" | "media" | "user" | "comment",
    id: number,
  ) => {
    if (!enabled.current) return;
    const request = ++sequence.current;
    try {
      const data = await api.getDBMSMeta(type, id);
      if (!enabled.current || sequence.current !== request) return;
      // Ensure password_hash is scrubbed if present
      if (data.attributes && "password_hash" in data.attributes) {
        delete (data.attributes as Record<string, unknown>).password_hash;
      }
      setInspectorData(data);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Cannot inspect this record",
        "error",
      );
    }
  };

  const closeInspector = () => {
    sequence.current++;
    setInspectorData(null);
  };

  const resetDemoData = () => {
    api.resetDemoDatabase();
    showToast("Database reset to initial NSUT seed state!", "success");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        inspectorData,
        openInspector,
        closeInspector,
        resetDemoData,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
};
