import { useContext, type ContextType } from "react";
import { SocketContext } from "@/contexts/SocketContext";

export function useSocket(): NonNullable<ContextType<typeof SocketContext>> {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}