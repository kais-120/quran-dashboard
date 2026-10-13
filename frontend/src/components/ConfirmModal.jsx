import Modal from './Modal.jsx';

export default function ConfirmModal({
  title = 'تأكيد',
  message = 'هل أنت متأكد؟',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal title={title} onClose={loading ? () => {} : onClose}>
      <div className="confirm-body">
        <p>{message}</p>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'danger' : 'primary'}`}
          onClick={onConfirm}
          disabled={loading}
          autoFocus
        >
          {loading ? '...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}