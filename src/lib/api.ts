import type { AppData } from "../types";

const STORE = import.meta.env.VITE_JSON_SERVER_STORE as string;
const KEY = import.meta.env.VITE_JSON_SERVER_KEY as string;

// Dev: requests go through Vite proxy → no CORS
// Prod: direct call (server must allow CORS from your domain)
const API_PATH = `${import.meta.env.VITE_API_ENDPOINT as string}/${STORE}`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${KEY}`,
};

export const api = {
  async getData(): Promise<AppData> {
    const res = await fetch(API_PATH, { headers });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<AppData>;
  },

  async put(data: object): Promise<void> {
    const res = await fetch(API_PATH, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },

  async putFull(data: AppData): Promise<void> {
    const res = await fetch(API_PATH, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
};
