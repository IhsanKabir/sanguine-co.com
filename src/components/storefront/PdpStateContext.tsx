"use client";
import { createContext, useContext, useState } from "react";

type PdpState = {
  activePhotoIndex: number;
  setActivePhotoIndex: (i: number) => void;
};

const PdpStateContext = createContext<PdpState>({ activePhotoIndex: 0, setActivePhotoIndex: () => {} });

export function PdpStateProvider({ children }: { children: React.ReactNode }) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  return (
    <PdpStateContext.Provider value={{ activePhotoIndex, setActivePhotoIndex }}>
      {children}
    </PdpStateContext.Provider>
  );
}

export function usePdpState() { return useContext(PdpStateContext); }
