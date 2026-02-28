import axios from "axios"

const apiKey = import.meta.env.VITE_CONDUIT_API_KEY as string | undefined

const client = axios.create({
  baseURL: import.meta.env.VITE_CONDUIT_API_BASE ?? "https://canvas-data-scraping-production.up.railway.app",
  timeout: 10000,
  headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 401) {
        console.error(
          "[CONDUIT API] 401 Unauthorised — set VITE_CONDUIT_API_KEY in your .env if your Railway backend has API_KEY auth enabled, or remove the API_KEY env var from your Railway backend to disable auth."
        )
      } else {
        console.error(
          "[CONDUIT API Error]",
          status,
          error.response?.data ?? error.message
        )
      }
    }
    return Promise.reject(error)
  }
)

export default client
