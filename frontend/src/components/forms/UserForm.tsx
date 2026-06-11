import { useForm } from 'react-hook-form';
import type { CreateUserPayload } from '../../types/user.types';
import { Button } from '../ui/Button';

interface UserFormProps {
  onSubmit: (data: CreateUserPayload) => void;
  isPending: boolean;
  onCancel?: () => void;
}

export function UserForm({ onSubmit, isPending, onCancel }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserPayload>();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input
          className="form-input"
          placeholder="e.g. Anas Khan"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && <span className="form-error">{errors.name.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input
          className="form-input"
          type="email"
          placeholder="anas@example.com"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email format' },
          })}
        />
        {errors.email && <span className="form-error">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Phone Number</label>
        <input
          className="form-input"
          placeholder="+923001234567"
          {...register('phone', { required: 'Phone is required' })}
        />
        {errors.phone && <span className="form-error">{errors.phone.message}</span>}
      </div>

      <div className="flex gap-2 justify-end mt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} style={{ marginRight: '8px' }}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={isPending}>
          Create User
        </Button>
      </div>
    </form>
  );
}
