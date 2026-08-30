import React, { useState } from 'react'
import Attachments from './Attachments'

export default function AttachmentButton({ entityType, entityId, title }: { entityType: string; entityId: string | null | undefined; title?: string }) {
  const [open, setOpen] = useState(false)
  if (!entityId) return <button className="att-chip att-chip-off" title="Save the record first to attach files" disabled>📎</button>
  return (
    <>
      <button className="att-chip" title="Attachments" onClick={() => setOpen(true)}>📎</button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal att-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>📎 {title || 'Attachments'}</h3>
              <button className="btn-cancel" onClick={() => setOpen(false)}>✕</button>
            </div>
            <Attachments entityType={entityType} entityId={entityId} />
          </div>
        </div>
      )}
    </>
  )
}
