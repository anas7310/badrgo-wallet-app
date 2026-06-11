import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/Button';

interface TransactionFormProps {
  type: 'credit' | 'debit';
  onSubmit: (data: { amountDollars: string; referenceId: string; description?: string }) => void;
  isPending: boolean;
  onCancel?: () => void;
}

export function TransactionForm({ type, onSubmit, isPending, onCancel }: TransactionFormProps) {
  const [defaultRefId] = useState(() => `${type.toUpperCase()}-${Date.now()}`);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ amountDollars: string; referenceId: string; description?: string }>({
    defaultValues: {
      referenceId: defaultRefId
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-group">
        <label className="form-label">Amount</label>
        <input
          className="form-input"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="e.g. 50.00"
          {...register('amountDollars', {
            required: 'Amount is required',
            min: { value: 0.01, message: 'Minimum amount is 0.01' },
          })}
        />
        {errors.amountDollars && <span className="form-error">{errors.amountDollars.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Reference ID (Idempotency Key)</label>
        <input
          className="form-input"
          placeholder="e.g. TXN-2026-001 (must be unique)"
          {...register('referenceId', { required: 'Reference ID is required' })}
        />
        {errors.referenceId && <span className="form-error">{errors.referenceId.message}</span>}
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Idempotent Key: Repeating requests with the same Reference ID is safe and will not process money twice.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Description (optional)</label>
        <input
          className="form-input"
          placeholder="e.g. Initial deposit, Ride payment..."
          {...register('description')}
        />
      </div>

      <div className="flex gap-2 justify-end mt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} style={{ marginRight: '8px' }}>
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          variant={type === 'credit' ? 'success' : 'danger'} 
          isLoading={isPending}
        >
          {type === 'credit' ? 'Apply Credit' : 'Apply Debit'}
        </Button>
      </div>
    </form>
  );
}
