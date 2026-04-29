// app/dashboard/components/DeleteGuardModal.tsx
import { FC } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
};

export const DeleteGuardModal: FC<Props> = ({ open, onClose, onConfirm, title, body }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-lg p-6 max-w-md w-full border">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{body}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-input rounded-lg hover:bg-secondary"
          >
            No
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  );
};