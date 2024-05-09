"use client";

import { useState } from "react";
import { getIDmStr } from "@/app/lib/nfc/rcs300.mjs";

export default function Home() {
  const [idm, setIdm] = useState<string | undefined>(undefined);

  const handleClick = async () => {
    try {
      await getIDmStr(navigator).then((idm) => {
        console.log("getIDmStr: " + idm);
        setIdm(idm);
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container m-auto">
      <div className="flex flex-col h-screen items-center justify-center">
        <button
          onClick={handleClick}
          className="bg-black border-4 border-gray-500 rounded-full text-white px-2 py-2 hover:bg-white hover:text-black"
        >
          read IDm
        </button>
        <p className="pt-5">{idm && `IDm: ${idm}`}</p>
      </div>
    </div>
  );
}
