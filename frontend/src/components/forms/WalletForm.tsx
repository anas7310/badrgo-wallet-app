import { useForm } from 'react-hook-form';
import { Button } from '../ui/Button';

interface WalletFormProps {
  onSubmit: (data: { currency: string }) => void;
  isPending: boolean;
  onCancel?: () => void;
  userName?: string;
}

export function WalletForm({ onSubmit, isPending, onCancel, userName }: WalletFormProps) {
  const {
    register,
    handleSubmit,
  } = useForm<{ currency: string }>({
    defaultValues: { currency: 'USD' }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {userName && (
        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-soft)' }}>
          Creating a new wallet for <strong>{userName}</strong>.
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Wallet Currency</label>
        <select className="form-select" {...register('currency', { required: true })}>
          <option value="USD">USD ($) - US Dollar</option>
          <option value="QAR">QAR (ر.ق) - Qatari Riyal</option>
          <option value="EUR">EUR (€) - Euro</option>
          <option value="GBP">GBP (£) - British Pound</option>
        </select>
      </div>

      <div className="flex gap-2 justify-end mt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} style={{ marginRight: '8px' }}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={isPending}>
          Create Wallet
        </Button>
      </div>
    </form>
  );
}
