/**
 * Task Edit Dialog
 *
 * Modal dialog for editing task details.
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Slider } from '../../ui/slider';
import type { GanttTask, TaskStatus, TaskPriority } from '../types';

export interface TaskEditDialogProps {
  task: GanttTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Await persistence before closing. Return false or reject to keep the editor open. */
  onSave: (task: GanttTask) => void | boolean | Promise<void | boolean>;
  /** Optional error from the owning chart or application. */
  error?: string | null;
  onDelete?: (taskId: string) => void;
  editableFields?: string[];
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'doing', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/**
 * ガントチャート上のタスクの詳細（タイトル、説明、期間、ステータス、優先度、進捗率、担当者等）を編集・削除するためのモーダルダイアログコンポーネント。
 */
export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
  editableFields,
  error,
}: TaskEditDialogProps) {
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update the task details below.</DialogDescription>
        </DialogHeader>
        {(error || localError) && (
          <div role='alert' className='text-sm text-destructive'>
            {error || localError}
          </div>
        )}

        {task && (
          <fieldset disabled={pending} className='min-w-0' aria-busy={pending}>
            <TaskEditForm
              key={task.id}
              task={task}
              onSave={async (updatedTask) => {
                if (pending) return;
                setPending(true);
                setLocalError(null);
                try {
                  const saved = await onSave(updatedTask);
                  if (saved !== false) onOpenChange(false);
                  else setLocalError('Unable to save task changes.');
                } catch (error) {
                  setLocalError(
                    error instanceof Error ? error.message : 'Unable to save task changes.',
                  );
                } finally {
                  setPending(false);
                }
              }}
              onCancel={() => onOpenChange(false)}
              onDelete={
                onDelete
                  ? (id) => {
                      onDelete(id);
                      onOpenChange(false);
                    }
                  : undefined
              }
              editableFields={editableFields}
            />
          </fieldset>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TaskEditFormProps {
  task: GanttTask;
  onSave: (task: GanttTask) => void;
  onCancel: () => void;
  onDelete?: (taskId: string) => void;
  editableFields?: string[];
}

function TaskEditForm({ task, onSave, onCancel, onDelete, editableFields }: TaskEditFormProps) {
  const [formData, setFormData] = useState<Partial<GanttTask>>({
    title: task.title,
    description: task.description,
    start_date: task.start_date,
    due_date: task.due_date,
    status: task.status,
    priority: task.priority,
    progress: task.progress ?? 0,
    assignee_name: task.assignee_name,
  });

  // Check if field is editable
  const isEditable = (field: string): boolean => {
    if (!editableFields) return true; // All editable if not specified
    return editableFields.includes(field);
  };

  const handleSave = () => {
    onSave({
      ...task,
      ...formData,
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
  };

  return (
    <>
      <div className='grid gap-4 py-4'>
        {/* Title */}
        {isEditable('title') && (
          <div className='grid gap-2'>
            <Label htmlFor='title'>Title</Label>
            <Input
              id='title'
              value={formData.title ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
        )}

        {/* Description */}
        {isEditable('description') && (
          <div className='grid gap-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              value={formData.description ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        )}

        {/* Date Row */}
        <div className='grid grid-cols-2 gap-4'>
          {/* Start Date */}
          {isEditable('start_date') && (
            <div className='grid gap-2'>
              <Label htmlFor='start_date'>Start Date</Label>
              <Input
                id='start_date'
                type='date'
                value={formatDate(formData.start_date)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_date: e.target.value || null,
                  }))
                }
              />
            </div>
          )}

          {/* Due Date */}
          {isEditable('due_date') && (
            <div className='grid gap-2'>
              <Label htmlFor='due_date'>Due Date</Label>
              <Input
                id='due_date'
                type='date'
                value={formatDate(formData.due_date)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    due_date: e.target.value || null,
                  }))
                }
              />
            </div>
          )}
        </div>

        {/* Status & Priority Row */}
        <div className='grid grid-cols-2 gap-4'>
          {/* Status */}
          {isEditable('status') && (
            <div className='grid gap-2'>
              <Label>Status</Label>
              <Select
                value={formData.status as string}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority */}
          {isEditable('priority') && (
            <div className='grid gap-2'>
              <Label>Priority</Label>
              <Select
                value={(formData.priority as string) ?? ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Progress */}
        {isEditable('progress') && (
          <div className='grid gap-2'>
            <div className='flex justify-between'>
              <Label>Progress</Label>
              <span className='text-sm text-muted-foreground'>{formData.progress ?? 0}%</span>
            </div>
            <Slider
              value={[formData.progress ?? 0]}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  progress: Array.isArray(value) ? value[0] : value,
                }))
              }
              max={100}
              step={5}
            />
          </div>
        )}

        {/* Assignee */}
        {isEditable('assignee_name') && (
          <div className='grid gap-2'>
            <Label htmlFor='assignee'>Assignee</Label>
            <Input
              id='assignee'
              value={formData.assignee_name ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, assignee_name: e.target.value }))}
              placeholder='Enter assignee name'
            />
          </div>
        )}
      </div>

      <DialogFooter className='flex justify-between'>
        {onDelete && (
          <Button variant='destructive' onClick={handleDelete}>
            Delete
          </Button>
        )}
        <div className='flex gap-2'>
          <Button variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogFooter>
    </>
  );
}
