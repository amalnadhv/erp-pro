import { useState } from 'react'

export const ReportRetrieveButton = ({ onClick, busy = false }: { onClick: () => void; busy?: boolean }) => (
  <button type="button" className="btn-retrieve noprint" onClick={onClick} disabled={busy} title="Retrieve the latest data from the server">
    {busy ? '⏳ Retrieving…' : '🔄 Retrieve'}
  </button>
)

export const useRetrieve = (loader: () => Promise<unknown> | unknown) => {
  const [retrieving, setRetrieving] = useState(false)
  const retrieve = async () => {
    setRetrieving(true)
    try { await loader() } finally { setRetrieving(false) }
  }
  return { retrieving, retrieve }
}
